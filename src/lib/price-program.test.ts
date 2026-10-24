import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { ATTESTED, PROGRAM_MIGRATIONS, freshProgramDb, linkIn, mailbox, pgliteSql } from "./program-test-db.ts";
import { bidTemplate } from "./church-spend.ts";
import { addQuote, createBid, listBook, publishAward, readDesk, setBidTerm, setItemWinners } from "./source-store.ts";
import {
  cleanVendorSignup,
  createVendor,
  readInvitedBid,
  sendInvites,
  submitOnlineQuote,
  updateVendor,
} from "./vendor-store.ts";
import { VENDOR_TERMS_VERSION } from "./vendor-terms.ts";
import { entriesForViewer } from "./membership.ts";
import { attestationText, cleanPriceContact, orderDetailsText } from "./price-contact.ts";
import {
  REFERENCE_SHAPE,
  addMonths,
  cleanReference,
  cleanTermMonths,
  ensureBookTerms,
  nextReference,
  priceEnded,
  termDates,
} from "./price-term.ts";
import {
  confirmPricesUnchanged,
  decideConfirmation,
  extendPriceTerm,
  listVendorPrices,
  priceReviewEmail,
  publishUpdatedPrices,
  readMemberOrders,
  readPriceReviews,
  recordMemberOrder,
  reviewRecipients,
  runPriceReminders,
  sendPriceReviewRequest,
  submitUpdatedPrices,
} from "./price-program.ts";
import { cleanReport, createCase, readCases, reportNotice } from "./case-store.ts";
import { submitReport } from "./vendor-portal-store.ts";

const SITE = "https://www.unitedundergod.org";
const PUBLISHED = "2026-10-24";

async function vendor(sql: Awaited<ReturnType<typeof freshProgramDb>>, company = "Coastal Office Supply", email = "dana@coastal.example") {
  const { id } = await createVendor(
    sql,
    cleanVendorSignup({
      company,
      contactName: "Dana Reed",
      email,
      phone: "(912) 555-0100",
      website: "coastal.example",
      categories: ["printing-copiers/toner-ink"],
      states: ["GA"],
      places: "",
      nationwide: false,
      insured: "yes",
      notes: "",
      agreed: true,
      termsVersion: VENDOR_TERMS_VERSION,
    }),
    { ip: "" },
  );
  await updateVendor(sql, id, { status: "approved" }, "lincoln");
  return id;
}

/** A toner bid with one program vendor's quote awarded and published on PUBLISHED. */
async function published(options: { months?: number } = {}) {
  const sql = await freshProgramDb();
  const vendorId = await vendor(sql);
  const bidId = await createBid(sql, bidTemplate("printing-copiers", "toner-ink"), "lincoln");
  if (options.months) await setBidTerm(sql, bidId, options.months);
  const items = (await readDesk(sql)).bids[0]!.items;
  const quoteId = await addQuote(
    sql,
    { bidId, vendorName: "Coastal Office Supply", ...ATTESTED, lines: items.map((item) => ({ itemId: item.id, unitPrice: "61.00" })) },
    "lincoln",
  );
  // Tie the quote to the program vendor, as an online quote is.
  await sql`update source_quotes set vendor_id = ${vendorId}, source = 'online' where id = ${quoteId}`;
  await setItemWinners(sql, items[0]!.id, [quoteId], "lincoln");
  const award = (await readDesk(sql)).bids[0]!.awards[0]!;
  const bookId = await publishAward(sql, award.id, "lincoln", { today: PUBLISHED });
  return { sql, vendorId, bidId, quoteId, items, bookId };
}

// --- the authorized price contact ----------------------------------------------------

test("a desk quote is refused without the authorized price contact and the attestation", async () => {
  const sql = await freshProgramDb();
  const bidId = await createBid(sql, bidTemplate("printing-copiers", "toner-ink"), "lincoln");
  const item = (await readDesk(sql)).bids[0]!.items[0]!;
  const base = { bidId, vendorName: "Alpha Supply", lines: [{ itemId: item.id, unitPrice: "10" }] };
  await assert.rejects(() => addQuote(sql, base, "lincoln"), /authorized to commit/);
  await assert.rejects(
    () => addQuote(sql, { ...base, priceContact: { ...ATTESTED.priceContact, title: "" }, attested: true }, "lincoln"),
    /title/,
  );
  await assert.rejects(
    () => addQuote(sql, { ...base, priceContact: { ...ATTESTED.priceContact, email: "nope" }, attested: true }, "lincoln"),
    /email/,
  );
  await assert.rejects(
    () => addQuote(sql, { ...base, priceContact: { ...ATTESTED.priceContact, phone: "12" }, attested: true }, "lincoln"),
    /phone/,
  );
  await assert.rejects(
    () => addQuote(sql, { ...base, priceContact: ATTESTED.priceContact, attested: false }, "lincoln"),
    /Tick “I am authorized to commit Alpha Supply to these prices for member churches of United Under God for the price term\.”/,
  );
  assert.equal((await sql`select count(*)::int as n from source_quotes`)[0]!.n, 0, "nothing saved");

  await addQuote(sql, { ...base, ...ATTESTED }, "lincoln");
  const quote = (await readDesk(sql)).bids[0]!.quotes[0]!;
  assert.deepEqual(quote.priceContact, {
    name: "Pat Owner",
    title: "President",
    email: "pat@vendor.example",
    phone: "(404) 555-0199",
  });
  assert.equal(quote.attestation, attestationText("Alpha Supply"));
  assert.ok(quote.attestedAt, "stored with a timestamp");
});

test("an online quote is refused without the contact and attestation, and stores the time and IP", async () => {
  const sql = await freshProgramDb();
  const vendorId = await vendor(sql);
  await sql`
    update source_vendors set price_contact_name = 'Pat Owner', price_contact_title = 'President',
      price_contact_email = 'pat@coastal.example', price_contact_phone = '912-555-0101'
    where id = ${vendorId}
  `;
  const bidId = await createBid(sql, { ...bidTemplate("printing-copiers", "toner-ink"), area: "GA" }, "lincoln");
  const box = mailbox();
  await sendInvites(sql, { bidId, vendorIds: [vendorId], userId: "lincoln", siteUrl: SITE, send: box.send });
  assert.match(box.sent[0]!.text, /authorized to commit it to the quoted prices/);
  const { token } = linkIn(box.sent[0]!.text, "/buying/bids/");
  const view = await readInvitedBid(sql, bidId, token);
  assert.equal(view.state, "open");
  if (view.state !== "open") return;
  // The portal default is prefilled on the bid page.
  assert.equal(view.vendor.priceContact.name, "Pat Owner");
  const lines = [{ itemId: view.bid.items[0]!.id, unitPrice: "61" }];
  await assert.rejects(() => submitOnlineQuote(sql, { bidId, token, lines }), /authorized to commit/);
  await assert.rejects(
    () => submitOnlineQuote(sql, { bidId, token, lines, priceContact: view.vendor.priceContact, attested: false }),
    /Tick “I am authorized to commit Coastal Office Supply/,
  );
  await submitOnlineQuote(sql, {
    bidId,
    token,
    lines,
    priceContact: view.vendor.priceContact,
    attested: true,
    ip: "203.0.113.9",
  });
  const row = (await sql`select * from source_quotes`)[0]!;
  assert.equal(row.price_contact_email, "pat@coastal.example");
  assert.equal(row.price_attested_ip, "203.0.113.9");
  assert.ok(row.price_attested_at, "timestamp");
  assert.match(String(row.price_attestation), /for member churches of United Under God for the price term/);
});

test("price contact rules", () => {
  assert.throws(() => cleanPriceContact({}), /Name the person/);
  assert.deepEqual(cleanPriceContact({ name: " Pat ", title: "Owner", email: "PAT@X.EXAMPLE", phone: "404 555 0100" }), {
    name: "Pat",
    title: "Owner",
    email: "pat@x.example",
    phone: "404 555 0100",
  });
});

// --- references and terms ------------------------------------------------------------

test("reference codes are unique and read UUG-<year>-<number>", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  for (const file of PROGRAM_MIGRATIONS) {
    await pg.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  }
  const sql = pgliteSql(pg);
  const codes = await Promise.all(Array.from({ length: 25 }, () => nextReference(sql, 2026)));
  assert.equal(new Set(codes).size, 25, "no two alike, even at once");
  for (const code of codes) assert.match(code, REFERENCE_SHAPE);
  assert.ok(codes.includes("UUG-2026-0001") && codes.includes("UUG-2026-0025"));
  assert.equal(await nextReference(sql, 2027), "UUG-2027-0001", "numbers restart each year");

  // Every published entry gets its own; the database refuses a duplicate.
  const { sql: db, items, quoteId, bookId } = await published();
  await setItemWinners(db, items[1]!.id, [quoteId], "lincoln");
  const awards = (await readDesk(db)).bids[0]!.awards;
  for (const award of awards) await publishAward(db, award.id, "lincoln", { today: PUBLISHED });
  const book = (await readDesk(db)).bids[0]!.book;
  assert.equal(book.length, 2);
  assert.equal(new Set(book.map((row) => row.referenceCode)).size, 2);
  assert.equal(book.find((row) => row.id === bookId)!.referenceCode, "UUG-2026-0001");
  await assert.rejects(
    () => db`update source_buying_book set reference_code = 'UUG-2026-0001' where id <> ${bookId}`,
    /unique|duplicate/i,
  );
  assert.equal(cleanReference(" uug-2026-0142 "), "UUG-2026-0142");
  assert.equal(cleanReference(""), "");
  assert.throws(() => cleanReference("UUG-26-1"), /looks like UUG-2026-0142/);
});

test("the owner sets the term per bid: 12 months by default, 6, or custom", async () => {
  assert.equal(cleanTermMonths(""), 12);
  assert.equal(cleanTermMonths("6"), 6);
  assert.equal(cleanTermMonths(18), 18);
  assert.throws(() => cleanTermMonths("0"), /1 to 36/);
  assert.throws(() => cleanTermMonths("2.5"), /whole number/);
  assert.deepEqual(termDates("2026-10-24", 12), { effectiveOn: "2026-10-24", expiresOn: "2027-10-23" });
  assert.deepEqual(termDates("2026-10-24", 6), { effectiveOn: "2026-10-24", expiresOn: "2027-04-23" });
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");

  const twelve = await published();
  const book = (await readDesk(twelve.sql)).bids[0]!.book[0]!;
  assert.equal(book.effectiveOn, PUBLISHED);
  assert.equal(book.expiresOn, "2027-10-23");
  assert.equal(book.termMonths, 12);
  assert.equal(book.priceContact.name, "Pat Owner", "the contact is kept with the published price");

  const six = await published({ months: 6 });
  assert.equal((await readDesk(six.sql)).bids[0]!.book[0]!.expiresOn, "2027-04-23");
});

test("members see the reference, the term, and the price contact; non-members the locked line only", async () => {
  const { sql } = await published();
  const [entry] = await listBook(sql, { today: "2026-11-01" });
  assert.equal(entry!.priceStatus, "current");
  assert.equal(entry!.referenceCode, "UUG-2026-0001");
  assert.equal(entry!.goodThrough, "2027-10-23");
  assert.equal(entry!.priceContact.title, "President");
  assert.equal(entry!.vendorEmail, "dana@coastal.example");
  const [locked] = entriesForViewer([entry!], false);
  const wire = JSON.stringify(locked);
  for (const secret of ["UUG-2026", "2027-10-23", "Pat Owner", "pat@vendor", "dana@coastal", "61.00", "Coastal"]) {
    assert.ok(!wire.includes(secret), `non-member sees ${secret}`);
  }
  assert.equal((locked as { locked?: boolean }).locked, true);
  const text = orderDetailsText(entry!);
  for (const part of [
    "Vendor: Coastal Office Supply",
    "Program price: $61.00",
    "Reference: UUG-2026-0001",
    "Good through: October 23, 2027",
    "Price contact: Pat Owner, President, pat@vendor.example, (404) 555-0199",
  ]) {
    assert.ok(text.includes(part), part);
  }
});

test("an ended term is not shown as current: no price, no reference; the desk keeps it", async () => {
  const { sql, bookId } = await published();
  assert.equal(priceEnded("2027-10-23", "2027-10-23"), false, "good through the last day");
  assert.equal(priceEnded("2027-10-23", "2027-10-24"), true);
  const [entry] = await listBook(sql, { today: "2027-10-24" });
  assert.equal(entry!.priceStatus, "ended");
  assert.equal(entry!.unitPrice, "");
  assert.equal(entry!.referenceCode, "");
  assert.equal(entry!.goodThrough, "");
  assert.equal(entry!.priceContact.name, "");
  assert.ok(!JSON.stringify(entry).includes("61.00"));
  // A non-member learns only that it is being refreshed.
  const [locked] = entriesForViewer([entry!], false);
  assert.equal(locked!.priceStatus, "ended");
  // The desk still has it, with its history.
  const desk = await readPriceReviews(sql, "2027-10-24");
  const item = desk.dueSoon.find((row) => row.bookId === bookId)!;
  assert.equal(item.ended, true);
  assert.equal(item.unitPrice, "61.00");
});

test("older book entries get a reference and a term from their publish date", async () => {
  const { sql, bookId } = await published();
  await sql`update source_buying_book set reference_code = '', effective_on = '', expires_on = '', published_at = '2026-03-02T10:00:00Z'`;
  assert.equal(await ensureBookTerms(sql), 1);
  assert.equal(await ensureBookTerms(sql), 0, "a no-op once assigned");
  const row = (await sql`select * from source_buying_book where id = ${bookId}`)[0]!;
  assert.match(String(row.reference_code), REFERENCE_SHAPE);
  assert.equal(row.effective_on, "2026-03-02");
  assert.equal(row.expires_on, "2027-03-01");
});

// --- reminders ---------------------------------------------------------------------

test("the 45-day reminder fires once, in at most one digest a day", async () => {
  const { sql, bookId } = await published();
  const sent: { subject: string; text: string }[] = [];
  const send = async (notice: { subject: string; text: string }) => {
    sent.push(notice);
    return { ok: true, error: "" };
  };
  // 46 days out: not yet.
  assert.equal((await runPriceReminders(sql, { send, siteUrl: SITE, today: "2027-09-07" })).skipped, "nothing_due");
  // 45 days out: one digest.
  const first = await runPriceReminders(sql, { send, siteUrl: SITE, today: "2027-09-08" });
  assert.deepEqual(first, { due: 1, sent: true, skipped: "", error: "" });
  assert.equal(sent.length, 1);
  assert.match(sent[0]!.subject, /^Prices up for review: 1 price$/);
  assert.match(sent[0]!.text, /Coastal Office Supply: .*UUG-2026-0001 · good through October 23, 2027 \(45 days\)/);
  assert.match(sent[0]!.text, /\/buying\/desk#price-review/);
  // Again the same day, the next day, and after it ended: never again for this term.
  for (const today of ["2027-09-08", "2027-09-09", "2027-10-30"]) {
    assert.equal((await runPriceReminders(sql, { send, siteUrl: SITE, today })).skipped, "nothing_due", today);
  }
  assert.equal(sent.length, 1);
  // It is on the desk list the whole time.
  assert.equal((await readPriceReviews(sql, "2027-09-10")).dueSoon[0]!.bookId, bookId);
  assert.equal((await readPriceReviews(sql, "2027-01-10")).dueSoon.length, 0);

  // A new term gets its own reminder, 45 days before it ends.
  await extendPriceTerm(sql, { bookId, userId: "lincoln", today: "2027-10-01" });
  assert.equal((await runPriceReminders(sql, { send, siteUrl: SITE, today: "2028-09-08" })).sent, true);
  assert.equal(sent.length, 2);
});

test("a second newly due price waits for tomorrow's digest; a failed send is retried", async () => {
  const { sql, items, quoteId } = await published();
  const sent: string[] = [];
  const ok = async (notice: { subject: string }) => {
    sent.push(notice.subject);
    return { ok: true, error: "" };
  };
  const failing = async () => ({ ok: false, error: "" });
  assert.equal((await runPriceReminders(sql, { send: failing, siteUrl: SITE, today: "2027-09-08" })).skipped, "failed");
  // Today's digest is spent even though it failed: no second email today.
  assert.equal((await runPriceReminders(sql, { send: ok, siteUrl: SITE, today: "2027-09-08" })).skipped, "already_sent_today");
  assert.equal((await runPriceReminders(sql, { send: ok, siteUrl: SITE, today: "2027-09-09" })).sent, true);
  assert.equal(sent.length, 1);
  // Another price published later comes due on its own day.
  await setItemWinners(sql, items[1]!.id, [quoteId], "lincoln");
  const award = (await readDesk(sql)).bids[0]!.awards.find((row) => row.itemId === items[1]!.id)!;
  await publishAward(sql, award.id, "lincoln", { today: "2026-11-01" });
  assert.equal((await runPriceReminders(sql, { send: ok, siteUrl: SITE, today: "2027-09-09" })).skipped, "nothing_due");
  assert.equal((await runPriceReminders(sql, { send: ok, siteUrl: SITE, today: "2027-09-17" })).due, 1);
  assert.equal(sent.length, 2);
});

// --- confirm or update ------------------------------------------------------------------

test("asking the vendor goes to the price contact and the vendor's main email, each once", async () => {
  const { sql, bookId } = await published();
  const box = mailbox();
  const out = await sendPriceReviewRequest(sql, { bookId, userId: "lincoln", siteUrl: SITE, send: box.send, today: "2027-09-10" });
  assert.deepEqual(out.sent, ["pat@vendor.example", "dana@coastal.example"]);
  assert.equal(box.sent.length, 2);
  assert.equal(box.sent[0]!.subject, "Please confirm or update your program prices");
  assert.match(box.sent[0]!.text, /UUG-2026-0001 · good through October 23, 2027/);
  assert.match(box.sent[0]!.text, /\/buying\/portal#prices/);
  assert.deepEqual(
    reviewRecipients({ priceContact: { name: "", title: "", email: "Same@x.example", phone: "" }, vendorEmail: "same@x.example" }),
    ["same@x.example"],
  );
  const desk = await readPriceReviews(sql, "2027-09-10");
  assert.equal(desk.dueSoon[0]!.lastRequest?.status, "sent");
  // A desk-typed vendor with no portal is asked to reply instead.
  assert.match(
    priceReviewEmail({ vendorName: "V", contactName: "", entries: [], portal: false, siteUrl: SITE }).text,
    /Please reply to this email/,
  );
});

test("confirm-unchanged needs the owner's approval before the term is extended", async () => {
  const { sql, vendorId, bookId } = await published();
  const today = "2027-09-15";
  await assert.rejects(
    () => confirmPricesUnchanged(sql, vendorId, { bookId, priceContact: ATTESTED.priceContact, attested: false }, today),
    /Tick/,
  );
  await assert.rejects(
    () => confirmPricesUnchanged(sql, "someone-else", { bookId, ...ATTESTED }, today),
    /not one of yours/,
  );
  const { id } = await confirmPricesUnchanged(sql, vendorId, { bookId, ...ATTESTED, ip: "198.51.100.4" }, today);
  // Nothing changed yet.
  assert.equal((await sql`select expires_on from source_buying_book`)[0]!.expires_on, "2027-10-23");
  assert.equal((await listVendorPrices(sql, vendorId, today))[0]!.pendingConfirmation, true);
  const desk = await readPriceReviews(sql, today);
  assert.equal(desk.dueSoon[0]!.pendingConfirmation?.id, id);
  // A second confirmation does not stack.
  await confirmPricesUnchanged(sql, vendorId, { bookId, ...ATTESTED }, today);
  assert.equal((await sql`select count(*)::int as n from source_price_reviews where kind = 'confirm'`)[0]!.n, 1);

  const approved = await decideConfirmation(sql, { reviewId: id, approve: true, userId: "lincoln", today });
  assert.deepEqual(approved, { status: "approved", expiresOn: "2028-10-23" });
  const row = (await sql`select * from source_buying_book`)[0]!;
  assert.equal(row.effective_on, "2027-10-24", "the new term starts the day after the old one ends");
  assert.equal(row.reference_code, "UUG-2026-0001", "same price, same reference");
  await assert.rejects(() => decideConfirmation(sql, { reviewId: id, approve: true, userId: "lincoln" }), /already decided/);
  const history = (await readPriceReviews(sql, today)).current[0]!.history;
  assert.equal(history.length, 1);
  assert.equal(history[0]!.expiresOn, "2027-10-23");
  assert.equal(history[0]!.reason, "extended");

  // A declined confirmation leaves the term alone.
  const again = await confirmPricesUnchanged(sql, vendorId, { bookId, ...ATTESTED }, "2028-09-10");
  await decideConfirmation(sql, { reviewId: again.id, approve: false, userId: "lincoln" });
  assert.equal((await sql`select expires_on from source_buying_book`)[0]!.expires_on, "2028-10-23");
});

test("updated prices from the portal become the quote again and are published with a new reference", async () => {
  const { sql, vendorId, bidId, items, quoteId, bookId } = await published();
  await assert.rejects(
    () => submitUpdatedPrices(sql, vendorId, { bidId, lines: [{ itemId: items[1]!.id, unitPrice: "1" }], ...ATTESTED }),
    /only the prices you were awarded/,
  );
  await assert.rejects(
    () => submitUpdatedPrices(sql, vendorId, { bidId, lines: [{ itemId: items[0]!.id, unitPrice: "63" }] }),
    /authorized to commit/,
  );
  await submitUpdatedPrices(sql, vendorId, { bidId, lines: [{ itemId: items[0]!.id, unitPrice: "63.50" }], ...ATTESTED });
  // Until the owner publishes, churches still see the current price.
  assert.equal((await listBook(sql, { today: "2027-09-20" }))[0]!.unitPrice, "61.00");
  const waiting = (await readPriceReviews(sql, "2027-01-01")).dueSoon[0]!;
  assert.equal(waiting.updatedPricesWaiting, true);
  assert.equal(waiting.updatedPrice, "63.50");
  assert.equal((await readDesk(sql)).bids[0]!.quotes[0]!.refreshStatus, "updated");

  assert.deepEqual(await publishUpdatedPrices(sql, { quoteId, userId: "lincoln", today: "2027-09-20" }), { updated: 1 });
  const [entry] = await listBook(sql, { today: "2027-09-20" });
  assert.equal(entry!.unitPrice, "63.50");
  assert.equal(entry!.referenceCode, "UUG-2027-0001");
  assert.equal(entry!.goodThrough, "2028-09-19");
  const history = (await readPriceReviews(sql, "2027-09-20")).current.find((row) => row.bookId === bookId)!.history;
  assert.equal(history[0]!.unitPrice, "61.00");
  assert.equal(history[0]!.referenceCode, "UUG-2026-0001");
  assert.equal(history[0]!.reason, "updated");
});

// --- "Program price not honored" -----------------------------------------------------------

test("'Program price not honored' is a report type that links the reference", async () => {
  const { sql, vendorId } = await published();
  const report = {
    problemType: "price_not_honored",
    referenceCode: "uug-2026-0001",
    churchName: "Grace Chapel",
    contactName: "Ruth Ames",
    email: "ruth@grace.example",
    phone: "912-555-0123",
    vendorId,
    purchase: "Toner",
    purchasedOn: "October 2027",
    problem: "Charged $75 instead of the program price.",
    wanted: "Charge the program price.",
  };
  const clean = cleanReport(report);
  assert.equal(clean.problemType, "price_not_honored");
  assert.equal(clean.referenceCode, "UUG-2026-0001");
  const { id } = await createCase(sql, clean, { ip: "" });
  const row = (await readCases(sql)).cases.find((c) => c.id === id)!;
  assert.equal(row.problemType, "price_not_honored");
  assert.equal(row.referenceCode, "UUG-2026-0001");
  assert.match(row.events[0]!.body, /Problem: Program price not honored\nProgram reference: UUG-2026-0001/);
  const notice = reportNotice(clean, { id, vendorName: "Coastal Office Supply", saved: true });
  assert.match(notice.subject, /^Program price not honored with Coastal Office Supply: Grace Chapel$/);
  assert.match(notice.text, /Program reference: UUG-2026-0001/);

  // An unknown reference is refused; a bad one never reaches the database; none is fine.
  await assert.rejects(
    () => createCase(sql, cleanReport({ ...report, referenceCode: "UUG-2026-9999" }), { ip: "" }),
    /could not find that program reference/,
  );
  assert.throws(() => cleanReport({ ...report, referenceCode: "1234" }), /looks like UUG-2026-0142/);
  const plain = cleanReport({ ...report, problemType: "", referenceCode: "" });
  assert.equal(plain.problemType, "");
  assert.match(reportNotice(plain, { id: "x", vendorName: "V", saved: true }).subject, /^Problem reported with V/);
  assert.equal(cleanReport({ ...report, problemType: "made-up" }).problemType, "");
});

// --- "We ordered this" -----------------------------------------------------------------------

test("member orders: logged per vendor for the owner, compared with vendor reports, never shown to churches", async () => {
  const { sql, vendorId, bookId } = await published();
  const today = "2026-11-20";
  await assert.rejects(
    () => recordMemberOrder(sql, { bookId, quantity: "4", orderedOn: today }, { userId: "", churchName: "", today }),
    /Sign in as a member church/,
  );
  await assert.rejects(
    () => recordMemberOrder(sql, { bookId, quantity: "", orderedOn: today }, { userId: "u1", churchName: "A", today }),
    /how many/,
  );
  await assert.rejects(
    () => recordMemberOrder(sql, { bookId, quantity: "2", orderedOn: "2026-12-01" }, { userId: "u1", churchName: "A", today }),
    /already come/,
  );
  const mine = await recordMemberOrder(
    sql,
    { bookId, quantity: "4", orderedOn: "2026-11-03", amount: "244.00" },
    { userId: "u1", churchName: "Grace Chapel", today },
  );
  assert.deepEqual(Object.keys(mine), ["id"], "a church gets back only its own receipt");
  await recordMemberOrder(sql, { bookId, quantity: "2", orderedOn: "2026-11-10" }, { userId: "u2", churchName: "Hope Church", today });
  await recordMemberOrder(sql, { bookId, quantity: "1", orderedOn: "2026-10-28", amount: "61" }, { userId: "u2", churchName: "Hope Church", today });
  await submitReport(sql, vendorId, { month: "2026-10", kind: "sales", category: "printing-copiers", amount: "500.00" }, { now: new Date("2026-11-20T00:00:00Z") });

  const [group] = await readMemberOrders(sql);
  assert.equal(group!.vendorId, vendorId);
  assert.equal(group!.orders.length, 3);
  assert.equal(group!.orders[0]!.referenceCode, "UUG-2026-0001");
  const november = group!.months.find((row) => row.month === "2026-11")!;
  assert.equal(november.memberOrders, 2);
  assert.equal(november.memberAmount, 244);
  assert.equal(november.vendorReported, null);
  assert.equal(november.check, true, "members ordered, the vendor has not reported");
  const october = group!.months.find((row) => row.month === "2026-10")!;
  assert.equal(october.vendorReported, 500);
  assert.equal(october.check, false);

  // No church sees another church's orders: nothing public carries them.
  const book = JSON.stringify(await listBook(sql, { today }));
  for (const secret of ["Grace Chapel", "Hope Church", "244"]) assert.ok(!book.includes(secret), secret);
  const portal = JSON.stringify(await listVendorPrices(sql, vendorId, today));
  for (const secret of ["Grace Chapel", "Hope Church"]) assert.ok(!portal.includes(secret), secret);
});

test("migration 0012 applies twice without change and only adds", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  for (const file of [...PROGRAM_MIGRATIONS, "0012_program_price_honor.sql"]) {
    await pg.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  }
  // It also applies on a database with only the first buying tables.
  const bare = new PGlite();
  await bare.waitReady;
  for (const file of ["0004_source_buying.sql", "0012_program_price_honor.sql", "0012_program_price_honor.sql"]) {
    await bare.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  }
  const cols = await bare.query<{ column_name: string }>(
    "select column_name from information_schema.columns where table_name = 'source_buying_book'",
  );
  assert.ok(cols.rows.some((row) => row.column_name === "reference_code"));
});
