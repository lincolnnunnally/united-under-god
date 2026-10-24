import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import {
  applyStripeEvent,
  cleanChurchDetails,
  isMemberUser,
  readMemberChurch,
  saveChurchDetails,
  type ChurchDetailsInput,
  type StripeEvent,
} from "./membership-store.ts";

function toSql(pg: PGlite): Sql {
  const run = async <T>(text: string, params: unknown[]): Promise<T[]> =>
    (await pg.query<T>(text, params)).rows;
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run<T>(text, values);
  }) as Sql;
  sql.query = (text, params = []) => run(text, params);
  return sql;
}

const MIGRATION = readFileSync(new URL("../../migrations/0011_church_membership.sql", import.meta.url), "utf8");

async function fresh() {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(MIGRATION);
  return toSql(pg);
}

const DETAILS: ChurchDetailsInput = {
  churchName: "Grace Chapel",
  contactName: "Pastor Ruth",
  email: "ruth@grace.example",
  phone: "",
  address: "1 Church St",
  city: "Vidalia",
  state: "ga",
  zip: "30474",
  website: "",
};

async function church(sql: Sql, userId = "user-1") {
  const clean = cleanChurchDetails(DETAILS);
  assert.ok(!("error" in clean));
  return saveChurchDetails(sql, userId, clean);
}

let seq = 0;
function event(type: string, object: Record<string, unknown>, created: number, id?: string): StripeEvent {
  seq += 1;
  return { id: id ?? `evt_${seq}`, type, created, data: { object } };
}

const checkout = (created: number, over: Record<string, unknown> = {}) =>
  event(
    "checkout.session.completed",
    {
      id: "cs_1",
      mode: "subscription",
      client_reference_id: "user-1",
      customer: "cus_1",
      subscription: "sub_1",
      payment_status: "paid",
      ...over,
    },
    created,
  );
const subscription = (type: string, status: string, created: number, id?: string) =>
  event(
    type,
    { id: "sub_1", customer: "cus_1", status, items: { data: [{ current_period_end: 1_900_000_000 }] } },
    created,
    id,
  );

test("the migration is idempotent: it runs twice cleanly", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(MIGRATION);
  await pg.exec(MIGRATION);
});

test("the migration is strictly additive", () => {
  const sql = MIGRATION.split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.ok(!/\b(drop|rename|truncate|delete|update|alter)\b/i.test(sql), "nothing destructive");
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    assert.match(stmt, /if not exists/i, `not idempotent: ${stmt.slice(0, 60)}`);
  }
});

test("a saved church is pending and not a member until Stripe says so", async () => {
  const sql = await fresh();
  const saved = await church(sql);
  assert.equal(saved.status, "pending");
  assert.equal(saved.state, "GA");
  assert.equal(await isMemberUser(sql, "user-1"), false);
  assert.equal(await isMemberUser(sql, null), false);
  assert.equal(await isMemberUser(sql, "nobody"), false);
});

test("checkout completed (paid) makes the church a member and records the Stripe ids", async () => {
  const sql = await fresh();
  await church(sql);
  const result = await applyStripeEvent(sql, checkout(100));
  assert.deepEqual(result, { applied: true, userId: "user-1", status: "active" });
  const row = await readMemberChurch(sql, "user-1");
  assert.equal(row?.status, "active");
  assert.equal(row?.stripeCustomerId, "cus_1");
  assert.equal(row?.stripeSubscriptionId, "sub_1");
  assert.ok(row?.memberSince);
  assert.equal(await isMemberUser(sql, "user-1"), true);
});

test("status follows the subscription: created, past_due, back to active, deleted", async () => {
  const sql = await fresh();
  await church(sql);
  await applyStripeEvent(sql, checkout(100));
  assert.equal((await applyStripeEvent(sql, subscription("customer.subscription.created", "active", 101))).applied, true);
  const end = (await readMemberChurch(sql, "user-1"))?.currentPeriodEnd;
  assert.equal(new Date(end ?? "").getTime(), 1_900_000_000 * 1000);

  await applyStripeEvent(sql, subscription("customer.subscription.updated", "past_due", 200));
  assert.equal((await readMemberChurch(sql, "user-1"))?.status, "past_due");
  assert.equal(await isMemberUser(sql, "user-1"), true, "past_due keeps access while Stripe retries");

  await applyStripeEvent(sql, subscription("customer.subscription.updated", "active", 300));
  assert.equal((await readMemberChurch(sql, "user-1"))?.status, "active");

  await applyStripeEvent(sql, subscription("customer.subscription.updated", "unpaid", 400));
  assert.equal((await readMemberChurch(sql, "user-1"))?.status, "canceled");

  await applyStripeEvent(sql, subscription("customer.subscription.updated", "active", 500));
  await applyStripeEvent(sql, subscription("customer.subscription.deleted", "canceled", 600));
  assert.equal((await readMemberChurch(sql, "user-1"))?.status, "canceled");
  assert.equal(await isMemberUser(sql, "user-1"), false);
});

test("a redelivered event id is applied once", async () => {
  const sql = await fresh();
  await church(sql);
  await applyStripeEvent(sql, checkout(100));
  const first = await applyStripeEvent(sql, subscription("customer.subscription.updated", "past_due", 200, "evt_dupe"));
  assert.equal(first.applied, true);
  // Another event moves it on; the old one arriving again must not undo that.
  await applyStripeEvent(sql, subscription("customer.subscription.updated", "active", 300));
  const again = await applyStripeEvent(sql, subscription("customer.subscription.updated", "past_due", 200, "evt_dupe"));
  assert.deepEqual(again, { applied: false, reason: "duplicate" });
  assert.equal((await readMemberChurch(sql, "user-1"))?.status, "active");
  const rows = await sql`select count(*)::int as n from uug_stripe_events where id = 'evt_dupe'`;
  assert.equal(rows[0].n, 1);
});

test("an older event delivered late never overwrites a newer status", async () => {
  const sql = await fresh();
  await church(sql);
  await applyStripeEvent(sql, checkout(100));
  await applyStripeEvent(sql, subscription("customer.subscription.deleted", "canceled", 500));
  const late = await applyStripeEvent(sql, subscription("customer.subscription.updated", "active", 300));
  assert.deepEqual(late, { applied: false, reason: "stale" });
  assert.equal((await readMemberChurch(sql, "user-1"))?.status, "canceled");
});

test("an unpaid checkout waits; it does not demote an active church", async () => {
  const sql = await fresh();
  await church(sql);
  await applyStripeEvent(sql, checkout(100, { payment_status: "unpaid" }));
  assert.equal((await readMemberChurch(sql, "user-1"))?.status, "pending");
  await applyStripeEvent(sql, subscription("customer.subscription.updated", "active", 200));
  await applyStripeEvent(sql, checkout(200, { payment_status: "unpaid" }));
  assert.equal((await readMemberChurch(sql, "user-1"))?.status, "active");
});

test("events for no church, other modes, and other types change nothing", async () => {
  const sql = await fresh();
  await church(sql);
  assert.deepEqual(await applyStripeEvent(sql, checkout(100, { mode: "payment" })), {
    applied: false,
    reason: "ignored",
  });
  assert.deepEqual(await applyStripeEvent(sql, event("invoice.paid", { id: "in_1" }, 100)), {
    applied: false,
    reason: "ignored",
  });
  assert.deepEqual(
    await applyStripeEvent(
      sql,
      event("customer.subscription.updated", { id: "sub_other", customer: "cus_other", status: "active" }, 100),
    ),
    { applied: false, reason: "no-church" },
  );
  assert.equal((await readMemberChurch(sql, "user-1"))?.status, "pending");
});

test("the subscription event alone finds the church by its metadata user id", async () => {
  const sql = await fresh();
  await church(sql, "user-2");
  const result = await applyStripeEvent(
    sql,
    event(
      "customer.subscription.created",
      { id: "sub_9", customer: "cus_9", status: "active", metadata: { user_id: "user-2" } },
      100,
    ),
  );
  assert.deepEqual(result, { applied: true, userId: "user-2", status: "active" });
  assert.equal((await readMemberChurch(sql, "user-2"))?.stripeSubscriptionId, "sub_9");
});

test("church details are required before checkout", () => {
  assert.deepEqual(cleanChurchDetails({ ...DETAILS, churchName: " " }), { error: "Please give the church’s name." });
  assert.deepEqual(cleanChurchDetails({ ...DETAILS, email: "nope" }), { error: "Please give an email we can reach." });
  assert.deepEqual(cleanChurchDetails({ ...DETAILS, city: "" }), { error: "Please give the church’s city and state." });
});
