import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import {
  DEFAULT_FELLOWSHIP_THRESHOLD,
  addFellowshipInterest,
  areaFor,
  cleanFellowshipInput,
  fellowshipThreshold,
  listFellowshipAreas,
  markAreaStarted,
  meetupEmail,
  type FellowshipInput,
  type ThresholdNotice,
} from "./fellowship.ts";

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

async function fresh() {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(readFileSync(new URL("../../migrations/0011_church_membership.sql", import.meta.url), "utf8"));
  return toSql(pg);
}

function pastor(n: number, over: Partial<FellowshipInput> = {}): FellowshipInput {
  return {
    name: `Pastor ${n}`,
    church: `Church ${n}`,
    email: `pastor${n}@church.example`,
    phone: "",
    city: "Vidalia",
    state: "GA",
    zip: "30474",
    preferredDay: "Tuesday",
    preferredTime: "Morning (8–11)",
    ...over,
  };
}

function clean(input: FellowshipInput) {
  const out = cleanFellowshipInput(input);
  assert.ok(!("error" in out), JSON.stringify(out));
  return out;
}

test("pastors group by ZIP3 when a ZIP is given, else by city and state", () => {
  assert.deepEqual(areaFor({ city: "Vidalia", state: "GA", zip: "30474" }), { key: "zip3:304", label: "ZIP 304xx" });
  assert.equal(areaFor({ city: "Lyons", state: "GA", zip: "30436-1234" })?.key, "zip3:304");
  assert.deepEqual(areaFor({ city: " savannah ", state: "ga", zip: "" }), {
    key: "city:savannah-ga",
    label: "Savannah, GA",
  });
  assert.equal(areaFor({ city: "Savannah", state: "GA", zip: "314" })?.key, "city:savannah-ga");
  assert.equal(areaFor({ city: "", state: "GA", zip: "" }), null);
});

test("an area or a way to reach the pastor is required", () => {
  assert.deepEqual(cleanFellowshipInput(pastor(1, { zip: "", city: "" })), {
    error: "Please give a ZIP code, or your city and state.",
  });
  assert.deepEqual(cleanFellowshipInput(pastor(1, { email: "", phone: "" })), {
    error: "An email or phone lets us reach you.",
  });
  assert.deepEqual(cleanFellowshipInput(pastor(1, { name: " " })), { error: "Please give your name." });
});

test("the threshold defaults to 5 and is configurable", () => {
  assert.equal(fellowshipThreshold({}), DEFAULT_FELLOWSHIP_THRESHOLD);
  assert.equal(DEFAULT_FELLOWSHIP_THRESHOLD, 5);
  assert.equal(fellowshipThreshold({ FELLOWSHIP_THRESHOLD: "3" }), 3);
  assert.equal(fellowshipThreshold({ FELLOWSHIP_THRESHOLD: "1" }), 5);
  assert.equal(fellowshipThreshold({ FELLOWSHIP_THRESHOLD: "lots" }), 5);
});

test("the owner is emailed once, when an area first reaches the threshold", async () => {
  const sql = await fresh();
  const sent: ThresholdNotice[] = [];
  const notifyOwner = async (notice: ThresholdNotice) => {
    sent.push(notice);
  };
  const opts = { userId: null, isMember: false, threshold: 5, notifyOwner };

  for (let n = 1; n <= 4; n += 1) await addFellowshipInterest(sql, clean(pastor(n)), opts);
  // The same pastor twice is still one pastor.
  await addFellowshipInterest(sql, clean(pastor(4, { name: "Pastor Four again" })), opts);
  // Another area does not count toward this one.
  await addFellowshipInterest(sql, clean(pastor(99, { zip: "31401", city: "Savannah" })), opts);
  assert.equal(sent.length, 0);

  const fifth = await addFellowshipInterest(sql, clean(pastor(5)), { ...opts, isMember: true });
  assert.equal(fifth.count, 5);
  assert.equal(fifth.notified, true);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /5 pastors near ZIP 304xx/);
  assert.match(sent[0].text, /pastor5@church\.example/);
  assert.match(sent[0].text, /\/admin\/fellowship/);

  // The sixth and seventh do not email again.
  await addFellowshipInterest(sql, clean(pastor(6)), opts);
  await addFellowshipInterest(sql, clean(pastor(7)), opts);
  assert.equal(sent.length, 1);

  const areas = await listFellowshipAreas(sql, 5);
  const area = areas.find((a) => a.key === "zip3:304");
  assert.equal(area?.count, 7);
  assert.equal(area?.members, 1);
  assert.equal(area?.ready, true);
  assert.ok(area?.notifiedAt);
  assert.equal(areas.find((a) => a.key === "zip3:314")?.ready, false);
});

test("two sign-ups that reach the threshold together still send one email", async () => {
  const sql = await fresh();
  let sent = 0;
  const opts = { userId: null, isMember: false, threshold: 2, notifyOwner: async () => void (sent += 1) };
  await Promise.all([
    addFellowshipInterest(sql, clean(pastor(1)), opts),
    addFellowshipInterest(sql, clean(pastor(2)), opts),
    addFellowshipInterest(sql, clean(pastor(3)), opts),
  ]);
  assert.equal(sent, 1);
});

test("the owner marks a group started with a place and time, and the email says them", async () => {
  const sql = await fresh();
  const opts = { userId: null, isMember: false, threshold: 5, notifyOwner: async () => undefined };
  await addFellowshipInterest(sql, clean(pastor(1)), opts);
  assert.equal(await markAreaStarted(sql, "zip3:304", { place: "", time: "Tuesdays" }), false);
  assert.equal(await markAreaStarted(sql, "zip3:999", { place: "Cafe", time: "Tuesdays" }), false);
  assert.equal(
    await markAreaStarted(sql, "zip3:304", { place: "Daily Grind, 101 Main St", time: "Tuesdays at 7:30 a.m." }),
    true,
  );
  const [area] = await listFellowshipAreas(sql, 5);
  assert.equal(area.status, "started");
  const mail = meetupEmail(area, "Parking is behind the building.");
  assert.match(mail.text, /Where: Daily Grind, 101 Main St/);
  assert.match(mail.text, /When: Tuesdays at 7:30 a\.m\./);
  assert.match(mail.text, /Parking is behind the building\./);
});
