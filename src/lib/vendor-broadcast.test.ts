import assert from "node:assert/strict";
import { test } from "node:test";
import type { Sql } from "./db.ts";
import { freshProgramDb, mailbox } from "./program-test-db.ts";
import { cleanVendorSignup, createVendor, updateVendor, type VendorSignupInput } from "./vendor-store.ts";
import { VENDOR_TERMS_VERSION } from "./vendor-terms.ts";
import {
  broadcastRecipients,
  cleanTarget,
  listBroadcasts,
  previewBroadcast,
  sendBroadcast,
} from "./vendor-broadcast.ts";
import { listVendors } from "./vendor-store.ts";

const SITE = "https://www.unitedundergod.org";

async function add(sql: Sql, overrides: Partial<VendorSignupInput>, status = "approved") {
  const { id } = await createVendor(
    sql,
    cleanVendorSignup({
      company: "Vendor",
      contactName: "Pat",
      email: "pat@vendor.example",
      phone: "404-555-0100",
      categories: ["janitorial-supplies/restroom"],
      states: ["GA"],
      nationwide: false,
      insured: "yes",
      agreed: true,
      termsVersion: VENDOR_TERMS_VERSION,
      ...overrides,
    }),
    { ip: "" },
  );
  if (status !== "pending") await updateVendor(sql, id, { status }, "lincoln");
  return id;
}

test("catalog message targeting: approved vendors serving the catalog, subcategory, and area", async () => {
  const sql = await freshProgramDb();
  const paperGa = await add(sql, { company: "Paper GA", email: "a@a.example" });
  const chemsSc = await add(sql, {
    company: "Chems SC",
    email: "b@b.example",
    categories: ["janitorial-supplies/cleaning"],
    states: ["SC"],
  });
  const nationwide = await add(sql, { company: "Anywhere", email: "c@c.example", nationwide: true, states: [] });
  await add(sql, { company: "Pending", email: "d@d.example" }, "pending");
  await add(sql, { company: "Paused", email: "e@e.example" }, "paused");
  const suspended = await add(sql, { company: "Suspended", email: "f@f.example" });
  await sql`update source_vendors set consequence = 'suspension' where id = ${suspended}`;
  await add(sql, { company: "Toner only", email: "g@g.example", categories: ["printing-copiers/toner-ink"] });
  const probation = await add(sql, { company: "Probation", email: "h@h.example" });
  await sql`update source_vendors set consequence = 'probation' where id = ${probation}`;

  // Look up a real subcategory id so the test follows the spend list.
  const vendors = await listVendors(sql);
  const ids = (target: Parameters<typeof cleanTarget>[0]) =>
    broadcastRecipients(vendors, cleanTarget(target))
      .map((vendor) => vendor.id)
      .sort();

  assert.deepEqual(ids({ category: "janitorial-supplies" }), [paperGa, chemsSc, nationwide, probation].sort());
  assert.deepEqual(ids({ category: "janitorial-supplies", subcategory: "cleaning" }), [chemsSc]);
  assert.deepEqual(ids({ category: "janitorial-supplies", area: "GA" }), [paperGa, nationwide, probation].sort());
  assert.deepEqual(ids({ category: "janitorial-supplies", subcategory: "cleaning", area: "GA" }), []);
  assert.throws(() => cleanTarget({ category: "insurance" }), /catalog vendors serve/);
  assert.throws(() => cleanTarget({ category: "janitorial-supplies", subcategory: "nope" }), /not in this catalog/);
  assert.throws(() => cleanTarget({ category: "janitorial-supplies", area: "ZZ" }), /not a state code/);
});

test("catalog message: preview shows the exact email; Send sends once per vendor and logs each", async () => {
  const sql = await freshProgramDb();
  await add(sql, { company: "Paper GA", contactName: "Ann", email: "a@a.example" });
  await add(sql, { company: "Anywhere", email: "c@c.example", nationwide: true, states: [] });
  const input = {
    category: "janitorial-supplies",
    subject: "We're refreshing Janitorial Supplies",
    body: "We're refreshing Janitorial Supplies — please update your pricing in your portal.",
  };
  const preview = await previewBroadcast(sql, input, SITE);
  assert.equal(preview.recipients.length, 2);
  assert.equal(preview.email.subject, input.subject);
  assert.match(preview.email.text, /please update your pricing in your portal/);
  assert.match(preview.email.text, /https:\/\/www\.unitedundergod\.org\/buying\/portal/);
  assert.match(preview.email.text, /serves Janitorial and restroom supplies in the United Under God buying program/);
  assert.match(preview.sendKey, /^[0-9a-f-]{36}$/);

  const box = mailbox();
  const first = await sendBroadcast(sql, { ...input, sendKey: preview.sendKey }, { userId: "lincoln", siteUrl: SITE, send: box.send });
  assert.equal(first.sent.length, 2);
  assert.equal(box.sent.length, 2);
  assert.match(box.sent.find((mail) => mail.to === "a@a.example")!.text, /^Hello Ann,/);

  // Pressing Send again with the same preview sends nothing new.
  const again = await sendBroadcast(sql, { ...input, sendKey: preview.sendKey }, { userId: "lincoln", siteUrl: SITE, send: box.send });
  assert.equal(again.sent.length, 0);
  assert.equal(again.skipped.length, 2);
  assert.equal(box.sent.length, 2);
  assert.equal(again.broadcastId, first.broadcastId);

  const log = await listBroadcasts(sql);
  assert.equal(log.length, 1);
  assert.equal(log[0]!.sent, 2);
  assert.equal(log[0]!.target, "Janitorial and restroom supplies");
  const sends = await sql`select * from source_broadcast_sends`;
  assert.equal(sends.length, 2);

  // A failed send is logged as failed.
  const failing = await previewBroadcast(sql, input, SITE);
  const out = await sendBroadcast(sql, { ...input, sendKey: failing.sendKey }, { userId: "lincoln", siteUrl: SITE, send: mailbox(true).send });
  assert.equal(out.failed.length, 2);
  assert.equal((await listBroadcasts(sql))[0]!.failed, 2);
  await assert.rejects(
    sendBroadcast(sql, { ...input, sendKey: "not-a-key" }, { userId: "lincoln", siteUrl: SITE, send: box.send }),
    /Preview the message again/,
  );
});
