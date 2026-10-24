import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { bidTemplate } from "./church-spend.ts";
import { createBid, readDesk, setBidStatus } from "./source-store.ts";
import {
  bidLinkPath,
  cleanVendorCategories,
  cleanVendorSignup,
  createVendor,
  hashInviteToken,
  inviteEmail,
  listInvites,
  listVendors,
  matchVendors,
  newInviteToken,
  previewInvites,
  readInvitedBid,
  sendInvites,
  submitOnlineQuote,
  updateVendor,
  vendorCategoryOptions,
  type SendMail,
  type VendorSignupInput,
} from "./vendor-store.ts";
import { VENDOR_TERMS_VERSION } from "./vendor-terms.ts";
import { ATTESTED } from "./program-test-db.ts";

const SITE = "https://www.unitedundergod.org";

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
  for (const file of [
    "0004_source_buying.sql",
    "0006_source_bid_category.sql",
    "0007_source_vendors.sql",
    "0012_program_price_honor.sql",
  ]) {
    await pg.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  }
  return toSql(pg);
}

function signup(overrides: Partial<VendorSignupInput> = {}): VendorSignupInput {
  return {
    company: "Coastal Office Supply",
    contactName: "Dana Reed",
    email: "Dana@Coastal.example",
    phone: "(912) 555-0100",
    website: "coastal.example",
    categories: ["printing-copiers/toner-ink", "office-supplies"],
    states: ["GA", "sc"],
    places: "Savannah, 31401",
    nationwide: false,
    insured: "yes",
    notes: "Next-day delivery in Chatham County.",
    agreed: true,
    termsVersion: VENDOR_TERMS_VERSION,
    ...overrides,
  };
}

/** A mail stub that records what would have been sent. Nothing leaves the test. */
function mailbox() {
  const sent: { to: string; subject: string; text: string }[] = [];
  const send: SendMail = async (args) => {
    sent.push(args);
    return { ok: true, error: "" };
  };
  return { sent, send };
}

async function approvedVendor(sql: Sql, overrides: Partial<VendorSignupInput> = {}) {
  const { id } = await createVendor(sql, cleanVendorSignup(signup(overrides)), {
    ip: "203.0.113.9",
  });
  await updateVendor(sql, id, { status: "approved" }, "lincoln");
  return id;
}

async function tonerBid(sql: Sql, area = "") {
  const template = bidTemplate("printing-copiers", "toner-ink");
  const bidId = await createBid(sql, { ...template, area }, "lincoln");
  return bidId;
}

// --- sign-up validation and terms acceptance ---------------------------------

test("sign-up refuses without agreeing to the Vendor Terms", () => {
  assert.throws(
    () => cleanVendorSignup(signup({ agreed: false })),
    /I agree to the Vendor Covenant and Vendor Terms/,
  );
  assert.throws(() => cleanVendorSignup(signup({ termsVersion: "2020-01-01" })), /were updated/);
});

test("sign-up validation: required fields, email, phone, area, insurance", () => {
  assert.throws(() => cleanVendorSignup(signup({ company: " " })), /company name/);
  assert.throws(() => cleanVendorSignup(signup({ contactName: "" })), /contact name/);
  assert.throws(() => cleanVendorSignup(signup({ email: "not-an-email" })), /working email/);
  assert.throws(() => cleanVendorSignup(signup({ phone: "12" })), /working phone/);
  assert.throws(() => cleanVendorSignup(signup({ categories: [] })), /at least one category/);
  assert.throws(
    () => cleanVendorSignup(signup({ states: [] })),
    /states you serve, or choose nationwide/,
  );
  assert.throws(() => cleanVendorSignup(signup({ states: ["ZZ"] })), /not a state code/);
  assert.throws(() => cleanVendorSignup(signup({ insured: "" })), /general liability/);
  assert.throws(() => cleanVendorSignup(signup({ website: "not a site" })), /website/);

  const clean = cleanVendorSignup(signup());
  assert.equal(clean.email, "dana@coastal.example");
  assert.equal(clean.website, "https://coastal.example");
  assert.deepEqual(clean.states, ["GA", "SC"]);
  assert.deepEqual(clean.places, ["Savannah", "31401"]);
  assert.equal(clean.insured, true);
  // A whole category expands to its subcategories.
  assert.ok(clean.categories.includes("office-supplies/office-paper"));

  const anywhere = cleanVendorSignup(signup({ nationwide: true, states: [] }));
  assert.equal(anywhere.nationwide, true);
  assert.deepEqual(anywhere.states, []);
});

test("licensed referral-only parts cannot be picked", () => {
  for (const key of [
    "insurance",
    "insurance/church-coverage",
    "hr-benefits/health-benefits",
    "hr-benefits/retirement",
    "financial-services/banking",
    "financial-services/payroll-and-tax",
    "financial-services/audit-tax",
    "transportation/vehicle-insurance",
  ]) {
    assert.throws(() => cleanVendorCategories([key]), /handled separately/, key);
  }
  const offered = vendorCategoryOptions().flatMap((option) =>
    option.subcategories.map((row) => row.key),
  );
  assert.ok(!offered.includes("professional-services/legal"));
  assert.ok(!offered.some((key) => key.startsWith("insurance/")));
  assert.ok(offered.includes("professional-services/design"));
  // Whole financial-services keeps only its non-licensed parts.
  const finance = cleanVendorCategories(["financial-services"]);
  assert.ok(finance.length > 0);
  assert.ok(!finance.includes("financial-services/banking"));
});

test("terms acceptance is stored with version, time, and IP; no duplicate rows", async () => {
  const sql = await fresh();
  const at = new Date("2026-10-24T15:00:00.000Z");
  const first = await createVendor(sql, cleanVendorSignup(signup()), {
    ip: "198.51.100.7",
    now: at,
  });
  assert.equal(first.duplicate, false);
  const [row] = await listVendors(sql);
  assert.equal(row?.status, "pending");
  assert.equal(row?.termsVersion, VENDOR_TERMS_VERSION);
  assert.equal(new Date(row!.termsAcceptedAt).toISOString(), at.toISOString());
  assert.equal(row?.termsIp, "198.51.100.7");
  assert.deepEqual(row?.states, ["GA", "SC"]);

  const again = await createVendor(
    sql,
    cleanVendorSignup(signup({ email: "dana@coastal.example" })),
    {
      ip: "198.51.100.7",
    },
  );
  assert.equal(again.duplicate, true);
  assert.equal(again.id, first.id);
  assert.equal((await listVendors(sql)).length, 1);
});

// --- matching ----------------------------------------------------------------

test("matching: approved only, by category/subcategory and by state", () => {
  const base = {
    status: "approved" as const,
    categories: ["printing-copiers/toner-ink"],
    states: ["GA"],
    nationwide: false,
  };
  const vendors = [
    { ...base, id: "ga-toner" },
    { ...base, id: "pending", status: "pending" as const },
    { ...base, id: "paused", status: "paused" as const },
    { ...base, id: "tx-toner", states: ["TX"] },
    { ...base, id: "anywhere", states: [], nationwide: true },
    { ...base, id: "paper-only", categories: ["office-supplies/office-paper"] },
    { ...base, id: "copiers", categories: ["printing-copiers/copiers"] },
  ];
  const ids = (bid: { category: string; subcategory: string; area: string }) =>
    matchVendors(vendors, bid)
      .map((row) => row.id)
      .sort();

  assert.deepEqual(ids({ category: "printing-copiers", subcategory: "toner-ink", area: "GA" }), [
    "anywhere",
    "ga-toner",
  ]);
  assert.deepEqual(ids({ category: "printing-copiers", subcategory: "toner-ink", area: "" }), [
    "anywhere",
    "ga-toner",
    "tx-toner",
  ]);
  // A whole-category bid matches any subcategory in it.
  assert.deepEqual(ids({ category: "printing-copiers", subcategory: "", area: "GA, SC" }), [
    "anywhere",
    "copiers",
    "ga-toner",
  ]);
  assert.deepEqual(ids({ category: "", subcategory: "", area: "" }), []);
});

// --- invitations -------------------------------------------------------------

test("an invitation sends once per vendor per bid, only to matching approved vendors", async () => {
  const sql = await fresh();
  const match = await approvedVendor(sql);
  const elsewhere = await approvedVendor(sql, { email: "tx@far.example", states: ["TX"] });
  const pending = (
    await createVendor(sql, cleanVendorSignup(signup({ email: "new@pending.example" })), { ip: "" })
  ).id;
  const bidId = await tonerBid(sql, "GA");

  const preview = await previewInvites(sql, bidId, SITE);
  assert.deepEqual(
    preview.vendors.map((row) => row.id),
    [match],
  );
  assert.match(preview.email.subject, /^Bid invitation: /);

  const box = mailbox();
  const first = await sendInvites(sql, {
    bidId,
    vendorIds: [match, elsewhere, pending],
    userId: "lincoln",
    siteUrl: SITE,
    send: box.send,
  });
  assert.deepEqual(first.sent, [match]);
  assert.equal(box.sent.length, 1);
  assert.equal(box.sent[0]?.to, "dana@coastal.example");
  assert.deepEqual(first.skipped.map((row) => row.reason).sort(), [
    "does not match this bid",
    "is pending",
  ]);

  const second = await sendInvites(sql, {
    bidId,
    vendorIds: [match, match],
    userId: "lincoln",
    siteUrl: SITE,
    send: box.send,
  });
  assert.deepEqual(second.sent, []);
  assert.deepEqual(second.skipped, [{ vendorId: match, reason: "already invited" }]);
  assert.equal(box.sent.length, 1, "no second email");

  const log = await listInvites(sql);
  assert.equal(log.length, 1);
  assert.equal(log[0]?.emailStatus, "sent");
  assert.equal(log[0]?.vendorId, match);
  // The link token is never stored, only its hash.
  const link = box.sent[0]!.text.match(/\/buying\/bids\/[^?\s]+\?t=([A-Za-z0-9_-]+)/);
  assert.ok(link, "email carries the bid link");
  const raw = await sql`select token_hash from source_bid_invites`;
  assert.equal(raw[0]?.token_hash, await hashInviteToken(link![1]!));
  assert.ok(!JSON.stringify(raw).includes(link![1]!));
});

test("a failed send is logged and can be retried with a fresh link", async () => {
  const sql = await fresh();
  const vendor = await approvedVendor(sql);
  const bidId = await tonerBid(sql);
  const failing: SendMail = async () => ({ ok: false, error: "" });
  const out = await sendInvites(sql, {
    bidId,
    vendorIds: [vendor],
    userId: "lincoln",
    siteUrl: SITE,
    send: failing,
  });
  assert.equal(out.failed.length, 1);
  assert.match(out.failed[0]!.error, /RESEND_API_KEY/);
  assert.equal((await listInvites(sql))[0]?.emailStatus, "failed");

  const box = mailbox();
  const retry = await sendInvites(sql, {
    bidId,
    vendorIds: [vendor],
    userId: "lincoln",
    siteUrl: SITE,
    send: box.send,
  });
  assert.deepEqual(retry.sent, [vendor]);
  assert.equal((await listInvites(sql)).length, 1);
});

test("a closed bid sends no invitations", async () => {
  const sql = await fresh();
  const vendor = await approvedVendor(sql);
  const bidId = await tonerBid(sql);
  await setBidStatus(sql, bidId, "closed");
  const box = mailbox();
  await assert.rejects(
    () =>
      sendInvites(sql, {
        bidId,
        vendorIds: [vendor],
        userId: "lincoln",
        siteUrl: SITE,
        send: box.send,
      }),
    /closed/,
  );
  assert.equal(box.sent.length, 0);
});

// --- token access and online quotes -------------------------------------------

async function invited(sql: Sql) {
  const vendor = await approvedVendor(sql);
  const bidId = await tonerBid(sql);
  const box = mailbox();
  await sendInvites(sql, {
    bidId,
    vendorIds: [vendor],
    userId: "lincoln",
    siteUrl: SITE,
    send: box.send,
  });
  const token = box.sent[0]!.text.match(/\?t=([A-Za-z0-9_-]+)/)![1]!;
  return { vendor, bidId, token };
}

test("token access: wrong or missing token gets nothing; a closed bid refuses", async () => {
  const sql = await fresh();
  const { bidId, token, vendor } = await invited(sql);

  assert.deepEqual(await readInvitedBid(sql, bidId, ""), { state: "denied" });
  assert.deepEqual(await readInvitedBid(sql, bidId, newInviteToken()), { state: "denied" });
  assert.deepEqual(await readInvitedBid(sql, bidId, "short"), { state: "denied" });
  const otherBid = await tonerBid(sql);
  assert.deepEqual(
    await readInvitedBid(sql, otherBid, token),
    { state: "denied" },
    "a token is for one bid",
  );

  const open = await readInvitedBid(sql, bidId, token);
  assert.equal(open.state, "open");
  if (open.state !== "open") return;
  assert.ok(open.bid.items.length > 0);
  assert.ok(open.bid.items.every((item) => item.unit));
  assert.ok(
    open.bid.items.some((item) => item.specs.length > 0),
    "spec lines from the spend list",
  );
  assert.equal(open.quote, null);

  await assert.rejects(
    () =>
      submitOnlineQuote(sql, {
        bidId,
        token: newInviteToken(),
        lines: [{ itemId: open.bid.items[0]!.id, unitPrice: "10" }],
      }),
    /not valid/,
  );

  await setBidStatus(sql, bidId, "closed");
  const closed = await readInvitedBid(sql, bidId, token);
  assert.equal(closed.state, "closed");
  assert.equal("bid" in closed, false, "a closed bid shows no form");
  await assert.rejects(
    () =>
      submitOnlineQuote(sql, {
        bidId,
        token,
        lines: [{ itemId: open.bid.items[0]!.id, unitPrice: "10" }],
      }),
    /closed/,
  );

  await setBidStatus(sql, bidId, "open");
  await updateVendor(sql, vendor, { status: "removed" }, "lincoln");
  assert.deepEqual(await readInvitedBid(sql, bidId, token), { state: "inactive" });
});

test("an online quote lands on the desk next to typed-in quotes and can be revised", async () => {
  const sql = await fresh();
  const { bidId, token, vendor } = await invited(sql);
  const view = await readInvitedBid(sql, bidId, token);
  assert.equal(view.state, "open");
  if (view.state !== "open") return;
  const [first, second] = view.bid.items;

  await assert.rejects(
    () => submitOnlineQuote(sql, { bidId, token, lines: [{ itemId: first!.id, unitPrice: "" }] }),
    /at least one item/,
  );
  await assert.rejects(
    () =>
      submitOnlineQuote(sql, { bidId, token, lines: [{ itemId: "not-on-bid", unitPrice: "5" }] }),
    /does not belong/,
  );

  const saved = await submitOnlineQuote(sql, {
    bidId,
    token,
    ...ATTESTED,
    notes: "Prices hold 90 days.",
    lines: [
      { itemId: first!.id, unitPrice: "$61.00", notes: "OEM" },
      { itemId: second!.id, unitPrice: "" },
    ],
  });
  assert.equal(saved.revised, false);

  const desk = await readDesk(sql);
  const quote = desk.bids.find((bid) => bid.id === bidId)!.quotes[0]!;
  assert.equal(quote.source, "online");
  assert.equal(quote.vendorId, vendor);
  assert.equal(quote.vendorName, "Coastal Office Supply");
  assert.equal(quote.status, "received");
  assert.equal(quote.notes, "Prices hold 90 days.");
  assert.equal(quote.lines.find((line) => line.itemId === first!.id)?.unitPrice, "61.00");
  assert.equal(quote.lines.find((line) => line.itemId === first!.id)?.notes, "OEM");

  const revised = await submitOnlineQuote(sql, {
    bidId,
    token,
    ...ATTESTED,
    lines: [
      { itemId: first!.id, unitPrice: "59.5" },
      { itemId: second!.id, unitPrice: "12" },
    ],
  });
  assert.equal(revised.revised, true);
  assert.equal(revised.quoteId, saved.quoteId);
  const after = (await readDesk(sql)).bids.find((bid) => bid.id === bidId)!;
  assert.equal(after.quotes.length, 1, "a revision replaces, it does not add");
  assert.equal(after.quotes[0]!.lines.find((line) => line.itemId === first!.id)?.unitPrice, "59.5");

  const reopened = await readInvitedBid(sql, bidId, token);
  assert.equal(
    reopened.state === "open" && reopened.quote?.lines.length,
    view.bid.items.length > 1 ? 2 : 1,
  );
});

test("invitation email: link, terms, fees from config, and the owner's copy rules", () => {
  const email = inviteEmail({
    bid: {
      id: "b1",
      title: "Printing and copiers: Toner and ink",
      summary: "Group bid for toner.",
      neededBy: "2026-11-15",
      itemCount: 4,
    },
    vendor: { company: "Coastal Office Supply", contactName: "Dana Reed" },
    link: `${SITE}${bidLinkPath("b1", "TOKEN")}`,
    siteUrl: SITE,
  });
  assert.match(email.text, /\/buying\/bids\/b1\?t=TOKEN/);
  assert.match(email.text, /\/buying\/vendor-terms/);
  assert.match(email.text, /rebate of at least 2%/);
  assert.match(email.text, /referral fee of at least 10%/);
  assert.match(email.text, /These are minimums; you may offer more by category/);
  assert.match(email.text, /https:\/\/www\.unitedundergod\.org\/buying\/portal/);
  assert.match(email.text, /Needed by: 2026-11-15/);
  assert.ok(!/\bAI\b/.test(email.text));
  assert.ok(!/lowest|cheapest|best price|guarantee/i.test(email.text));
  assert.ok(!/\bmembers?(hip)?\b/i.test(email.text));
});
