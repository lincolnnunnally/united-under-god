import assert from "node:assert/strict";
import { test } from "node:test";
import type { Sql } from "./db.ts";
import {
  NEED_IP_LIMIT,
  addNeedToBid,
  chooseNeedQuote,
  closeNeed,
  createNeed,
  declineNeedQuotes,
  needConfirmationEmail,
  needLinkPath,
  readNeedByToken,
  readNeedsDesk,
  sendNeedQuotes,
  startNeedBid,
  cleanNeed,
  type NeedInput,
} from "./church-needs.ts";
import { ATTESTED, PROGRAM_MIGRATIONS, freshProgramDb, mailbox } from "./program-test-db.ts";
import { addQuote, readDesk } from "./source-store.ts";

const SITE = "https://www.unitedundergod.org";

async function fresh() {
  return freshProgramDb([...PROGRAM_MIGRATIONS, "0013_source_church_needs.sql"]);
}

function posted(overrides: Partial<NeedInput> = {}): NeedInput {
  return {
    churchName: "Grace Chapel",
    contactName: "Ruth Hale",
    email: "Ruth@GraceChapel.example",
    phone: "(912) 555-0144",
    city: "Vidalia",
    state: "ga",
    zip: "30474",
    category: "furniture",
    title: "Stackable chairs",
    details: "Padded, for the fellowship hall.",
    quantity: "120",
    neededBy: "2026-12-01",
    ...overrides,
  };
}

async function post(sql: Sql, overrides: Partial<NeedInput> = {}, ip = "203.0.113.9") {
  const saved = await createNeed(sql, posted(overrides), { ip });
  assert.ok(saved, "the need saved");
  return saved;
}

async function needOf(sql: Sql, id: string) {
  const row = (await readNeedsDesk(sql)).needs.find((need) => need.id === id);
  assert.ok(row, "the need is on the desk");
  return row;
}

test("a posted need is cleaned, and its confirmation carries the private link", () => {
  const clean = cleanNeed(posted());
  assert.equal(clean.email, "ruth@gracechapel.example");
  assert.equal(clean.state, "GA");
  assert.throws(() => cleanNeed(posted({ email: "nope" })), /working email/);
  assert.throws(() => cleanNeed(posted({ state: "Georgia" })), /state/);
  assert.throws(() => cleanNeed(posted({ category: "no-such-thing" })), /category/);
  assert.equal(cleanNeed(posted({ phone: "", zip: "", category: "" })).category, "");

  const mail = needConfirmationEmail(clean, "x".repeat(43), SITE);
  assert.ok(mail.text.includes(`${SITE}${needLinkPath("x".repeat(43))}`));
  assert.ok(!/\bfree\b|guarantee|\bAI\b/i.test(`${mail.subject}\n${mail.text}`));
});

test("the honeypot saves nothing", async () => {
  const sql = await fresh();
  const saved = await createNeed(sql, posted({ hp: "http://spam.example" }), { ip: "198.51.100.1" });
  assert.equal(saved, null);
  assert.equal((await readNeedsDesk(sql)).needs.length, 0);
});

test("one IP address is held to a few needs an hour", async () => {
  const sql = await fresh();
  for (let index = 0; index < NEED_IP_LIMIT; index += 1) {
    await post(sql, { title: `Need ${index}` }, "198.51.100.7");
  }
  await assert.rejects(() => post(sql, {}, "198.51.100.7"), /last hour/);
  await post(sql, {}, "198.51.100.8");
});

test("a church's page shows its own need and nothing about another church", async () => {
  const sql = await fresh();
  const grace = await post(sql);
  await post(sql, { churchName: "Hope Fellowship", contactName: "Amos Reed", email: "amos@hope.example" });

  assert.deepEqual(await readNeedByToken(sql, "not-a-token"), { state: "denied" });
  assert.deepEqual(await readNeedByToken(sql, "A".repeat(43)), { state: "denied" });

  const view = await readNeedByToken(sql, grace.token);
  assert.equal(view.state, "open");
  if (view.state !== "open") return;
  assert.equal(view.status, "new");
  assert.equal(view.churchName, "Grace Chapel");
  assert.deepEqual(view.quotes, []);
  const page = JSON.stringify(view);
  assert.ok(!page.includes("Hope Fellowship"));
  assert.ok(!page.includes("amos@hope.example"));
  // The church's own contact is not echoed back on the page either.
  assert.ok(!page.includes("gracechapel.example"));
});

test("start a bid, group a second church on it, compare, choose", async () => {
  const sql = await fresh();
  const grace = await post(sql);
  const hope = await post(sql, {
    churchName: "Hope Fellowship",
    contactName: "Amos Reed",
    email: "amos@hope.example",
    title: "Folding tables",
    quantity: "20",
  });
  const elsewhere = await post(sql, { churchName: "North Church", state: "SC", title: "Lecterns" });

  // The hint: one other open need in the same category and state.
  assert.equal((await needOf(sql, grace.id)).similar, 1);
  assert.equal((await needOf(sql, elsewhere.id)).similar, 0);

  // Start a bid from the first need.
  const bidId = await startNeedBid(sql, grace.id, "operator-1");
  const started = await needOf(sql, grace.id);
  assert.equal(started.status, "bidding");
  assert.equal(started.bidId, bidId);
  await assert.rejects(() => startNeedBid(sql, grace.id, "operator-1"), /already on a bid/);

  // The bid carries the need, never the church.
  const bid = (await readDesk(sql)).bids.find((row) => row.id === bidId)!;
  assert.equal(bid.category, "furniture");
  assert.equal(bid.area, "GA");
  assert.equal(bid.items.length, 1);
  assert.equal(bid.items[0]?.description, "Stackable chairs");
  assert.ok(!JSON.stringify(bid).includes("Grace Chapel"));

  // A need in another category cannot join this bid.
  const other = await post(sql, { category: "office-supplies", title: "Copy paper" });
  await assert.rejects(() => addNeedToBid(sql, other.id, bidId), /same category/);

  // Group the second church's need on the same bid.
  const hopeItem = await addNeedToBid(sql, hope.id, bidId);
  const grouped = (await readDesk(sql)).bids.find((row) => row.id === bidId)!;
  assert.equal(grouped.items.length, 2);
  assert.equal((await needOf(sql, hope.id)).itemId, hopeItem);
  assert.equal((await readNeedsDesk(sql)).openBids.find((row) => row.id === bidId)?.lines, 2);

  // Nothing to send until this church's own line has a price.
  const box = mailbox();
  await assert.rejects(
    () => sendNeedQuotes(sql, { needId: grace.id, siteUrl: SITE, send: box.send }),
    /No quote/,
  );

  const chairs = started.itemId;
  const alpha = await addQuote(
    sql,
    {
      bidId,
      vendorName: "Alpha Seating",
      notes: "Delivery included.",
      ...ATTESTED,
      lines: [
        { itemId: chairs, unitPrice: "31.50", notes: "Charcoal fabric" },
        { itemId: hopeItem, unitPrice: "88" },
      ],
    },
    "operator-1",
  );
  await addQuote(
    sql,
    {
      bidId,
      vendorName: "Beta Tables",
      ...ATTESTED,
      lines: [
        { itemId: chairs, unitPrice: "" },
        { itemId: hopeItem, unitPrice: "79.99" },
      ],
    },
    "operator-1",
  );
  assert.equal((await needOf(sql, grace.id)).pricedQuotes, 1);
  assert.equal((await needOf(sql, hope.id)).pricedQuotes, 2);

  // Quotes stay with the desk until it sends them.
  const before = await readNeedByToken(sql, grace.token);
  assert.equal(before.state === "open" && before.quotes.length, 0);

  const sent = await sendNeedQuotes(sql, { needId: grace.id, siteUrl: SITE, send: box.send });
  assert.deepEqual(sent, { ok: true, error: "" });
  assert.equal(box.sent.length, 1);
  assert.equal(box.sent[0]?.to, "ruth@gracechapel.example");
  assert.ok(box.sent[0]?.text.includes(`${SITE}/buying/need/${grace.token}`));
  assert.equal((await needOf(sql, grace.id)).status, "quotes_sent");

  // The comparison shows only this church's line: one priced quote, its price.
  const view = await readNeedByToken(sql, grace.token);
  assert.equal(view.state, "open");
  if (view.state !== "open") return;
  assert.equal(view.status, "quotes_sent");
  assert.deepEqual(
    view.quotes.map((quote) => [quote.vendorName, quote.unitPrice, quote.termMonths]),
    [["Alpha Seating", "31.50", 12]],
  );
  assert.equal(view.quotes[0]?.notes, "Charcoal fabric Delivery included.");
  const page = JSON.stringify(view);
  assert.ok(!page.includes("79.99"), "no price from another church's line");
  assert.ok(!page.includes("Folding tables"));
  assert.ok(!page.includes("Hope Fellowship"));

  // Choose: only a quote on this church's own line.
  const hopeQuotes = await sendNeedQuotes(sql, { needId: hope.id, siteUrl: SITE, send: box.send });
  assert.equal(hopeQuotes.ok, true);
  const betaId = (await readDesk(sql)).bids[0]!.quotes.find((q) => q.vendorName === "Beta Tables")!.id;
  await assert.rejects(() => chooseNeedQuote(sql, { token: grace.token, quoteId: betaId }), /not one of yours/);
  const chosen = await chooseNeedQuote(sql, { token: grace.token, quoteId: alpha });
  assert.equal(chosen.vendorName, "Alpha Seating");
  assert.equal(chosen.churchName, "Grace Chapel");
  const after = await needOf(sql, grace.id);
  assert.equal(after.status, "chosen");
  assert.equal(after.chosenQuoteId, alpha);
  assert.equal(after.chosenVendor, "Alpha Seating");
  assert.ok(after.chosenAt);
  await assert.rejects(() => chooseNeedQuote(sql, { token: grace.token, quoteId: alpha }), /already chose/);

  // The other church says none of these work.
  const declined = await declineNeedQuotes(sql, { token: hope.token, note: "Over our budget." });
  assert.equal(declined.note, "Over our budget.");
  const hopeAfter = await needOf(sql, hope.id);
  assert.equal(hopeAfter.status, "closed");
  assert.equal(hopeAfter.churchNote, "Over our budget.");
  assert.equal(hopeAfter.similar, 0);
});

test("the desk can close a need, and a closed need takes no bid", async () => {
  const sql = await fresh();
  const saved = await post(sql);
  await closeNeed(sql, saved.id);
  assert.equal((await needOf(sql, saved.id)).status, "closed");
  await assert.rejects(() => startNeedBid(sql, saved.id, "operator-1"), /closed/);
});
