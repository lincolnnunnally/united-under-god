import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { bidTemplate } from "./church-spend.ts";
import { ATTESTED } from "./program-test-db.ts";
import {
  addBusinessDays,
  addCaseEntry,
  addCommitteePerson,
  assignMediators,
  churchDecisionEmail,
  cleanDecision,
  cleanReport,
  createCase,
  decideCase,
  escalateCase,
  listReportVendors,
  markRemedy,
  mediatorEmail,
  readCases,
  readMediatorCase,
  readVendorCase,
  reportNotice,
  sendChurchDecision,
  sendMediatorLinks,
  sendVendorNotice,
  setCaseStatus,
  submitRecommendation,
  submitVendorResponse,
  vendorNoticeEmail,
  vendorStanding,
  type ReportInput,
} from "./case-store.ts";
import { createBid, listBook, publishAward, readDesk, setItemWinners } from "./source-store.ts";
import {
  acceptCovenant,
  cleanVendorSignup,
  createVendor,
  hashInviteToken,
  listVendors,
  newInviteToken,
  previewInvites,
  readCovenantLink,
  sendCovenantLink,
  sendInvites,
  submitOnlineQuote,
  readInvitedBid,
  updateVendor,
  vendorsNeedingCovenant,
  type SendMail,
  type VendorSignupInput,
} from "./vendor-store.ts";
import { VENDOR_TERMS_VERSION } from "./vendor-terms.ts";

const SITE = "https://www.unitedundergod.org";
const LINCOLN = "United Under God (lincoln@unitedundergod.org)";

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

const MIGRATIONS = [
  "0004_source_buying.sql",
  "0006_source_bid_category.sql",
  "0007_source_vendors.sql",
  "0008_source_vendor_cases.sql",
  "0012_program_price_honor.sql",
];

async function fresh() {
  const pg = new PGlite();
  await pg.waitReady;
  for (const file of MIGRATIONS) {
    await pg.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  }
  return toSql(pg);
}

function signup(overrides: Partial<VendorSignupInput> = {}): VendorSignupInput {
  return {
    company: "Joyful Sound Co.",
    contactName: "Sam Ortiz",
    email: "sam@joyful.example",
    phone: "(912) 555-0144",
    categories: ["printing-copiers/toner-ink"],
    states: ["GA"],
    nationwide: false,
    insured: "yes",
    agreed: true,
    termsVersion: VENDOR_TERMS_VERSION,
    ...overrides,
  };
}

async function approvedVendor(sql: Sql, overrides: Partial<VendorSignupInput> = {}) {
  const { id } = await createVendor(sql, cleanVendorSignup(signup(overrides)), {
    ip: "203.0.113.9",
  });
  await updateVendor(sql, id, { status: "approved" }, "lincoln");
  return id;
}

function report(vendorId: string, overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    churchName: "Grace Chapel",
    contactName: "Ruth Hale",
    email: "Ruth@GraceChapel.example",
    phone: "(912) 555-0199",
    vendorId,
    purchase: "Toner for the office copier",
    purchasedOn: "September 2026",
    problem: "Two of the four cartridges leaked and the copier needed service.",
    wanted: "Replace the two cartridges and cover the service call.",
    ...overrides,
  };
}

function mailbox() {
  const sent: { to: string; subject: string; text: string }[] = [];
  const send: SendMail = async (args) => {
    sent.push(args);
    return { ok: true, error: "" };
  };
  return { sent, send };
}

function tokenFrom(text: string, path: string) {
  const match = text.match(new RegExp(`${path}[^?\\s]*\\?t=([A-Za-z0-9_-]+)`));
  assert.ok(match, `email carries a ${path} link`);
  return match![1]!;
}

const MONDAY = new Date("2026-10-26T15:00:00.000Z");

// --- report intake ------------------------------------------------------------

test("report intake: every field is required and checked", () => {
  assert.throws(() => cleanReport(report("v", { churchName: " " })), /church’s name/);
  assert.throws(() => cleanReport(report("v", { contactName: "" })), /your name/);
  assert.throws(() => cleanReport(report("v", { email: "nope" })), /working email/);
  assert.throws(() => cleanReport(report("v", { phone: "12" })), /working phone/);
  assert.throws(() => cleanReport(report("")), /vendor you bought from/);
  assert.throws(() => cleanReport(report("v", { purchase: "" })), /what you bought/);
  assert.throws(() => cleanReport(report("v", { purchasedOn: "" })), /when you bought/);
  assert.throws(() => cleanReport(report("v", { problem: "" })), /what went wrong/);
  assert.throws(() => cleanReport(report("v", { wanted: "" })), /make it right/);
  assert.throws(() => cleanReport(report("v", { problem: "x".repeat(4001) })), /too long/);
  assert.equal(cleanReport(report("v")).email, "ruth@gracechapel.example");
});

test("a report becomes an open case with the church's report first on the timeline", async () => {
  const sql = await fresh();
  const vendorId = await approvedVendor(sql);
  const pending = (
    await createVendor(
      sql,
      cleanVendorSignup(signup({ email: "new@pending.example", company: "Pending Co" })),
      { ip: "" },
    )
  ).id;

  // The picker lists approved (and paused) vendors only, by name.
  assert.deepEqual(await listReportVendors(sql), [{ id: vendorId, company: "Joyful Sound Co." }]);
  await assert.rejects(
    () => createCase(sql, cleanReport(report(pending)), { ip: "" }),
    /on the list/,
  );
  await assert.rejects(
    () => createCase(sql, cleanReport(report("nobody")), { ip: "" }),
    /on the list/,
  );

  const saved = await createCase(sql, cleanReport(report(vendorId)), {
    ip: "198.51.100.4",
    now: MONDAY,
  });
  assert.equal(saved.vendorName, "Joyful Sound Co.");
  const { cases } = await readCases(sql, MONDAY);
  assert.equal(cases.length, 1);
  const row = cases[0]!;
  assert.equal(row.status, "open");
  assert.equal(row.churchName, "Grace Chapel");
  assert.equal(row.events.length, 1);
  assert.equal(row.events[0]!.kind, "report");
  assert.equal(row.events[0]!.author, "Church: Ruth Hale, Grace Chapel");
  assert.ok(row.events[0]!.createdAt, "timed");
  assert.match(row.events[0]!.body, /What went wrong: Two of the four/);

  const notice = reportNotice(cleanReport(report(vendorId)), { ...saved, saved: true });
  assert.match(notice.subject, /^Problem reported with Joyful Sound Co\.: Grace Chapel$/);
  assert.match(notice.text, /\/buying\/desk/);
  assert.match(notice.text, /Phone: \(912\) 555-0199/);
  assert.match(
    reportNotice(cleanReport(report(vendorId)), { ...saved, saved: false }).subject,
    /^NOT SAVED/,
  );
});

// --- the whole case lifecycle -----------------------------------------------------

test("lifecycle: open → vendor notified → response → mediation → decision → remedy done", async () => {
  const sql = await fresh();
  const vendorId = await approvedVendor(sql);
  const { id } = await createCase(sql, cleanReport(report(vendorId)), { ip: "", now: MONDAY });

  // Notify the vendor: the email, a 2-business-day response date, a hashed token.
  const box = mailbox();
  const notified = await sendVendorNotice(sql, {
    caseId: id,
    author: LINCOLN,
    siteUrl: SITE,
    send: box.send,
    now: MONDAY,
  });
  assert.equal(notified.ok, true);
  assert.equal(box.sent.length, 1);
  assert.equal(box.sent[0]!.to, "sam@joyful.example");
  assert.match(box.sent[0]!.subject, /A church has raised a concern with Joyful Sound Co\./);
  assert.match(box.sent[0]!.text, /within 2 business days, by 2026-10-28/);
  const vendorToken = tokenFrom(box.sent[0]!.text, "/buying/cases/");
  const stored = await sql<{
    vendor_token_hash: string;
  }>`select vendor_token_hash from source_cases`;
  assert.equal(stored[0]!.vendor_token_hash, await hashInviteToken(vendorToken));
  assert.ok(
    !JSON.stringify(await sql`select * from source_cases`).includes(vendorToken),
    "only the hash",
  );

  let row = (await readCases(sql, MONDAY)).cases[0]!;
  assert.equal(row.status, "waiting_vendor");
  assert.equal(row.vendorResponseDue, "2026-10-28");
  assert.equal(row.responseOverdue, false);
  assert.equal(
    (await readCases(sql, new Date("2026-10-29T12:00:00Z"))).cases[0]!.responseOverdue,
    true,
  );

  // The vendor's page: wrong token sees nothing; the right one sees the concern.
  assert.deepEqual(await readVendorCase(sql, id, ""), { state: "denied" });
  assert.deepEqual(await readVendorCase(sql, id, newInviteToken()), { state: "denied" });
  assert.deepEqual(await readVendorCase(sql, "other-case", vendorToken), { state: "denied" });
  const page = await readVendorCase(sql, id, vendorToken);
  assert.equal(page.state, "open");
  if (page.state !== "open") return;
  assert.equal(page.report.churchName, "Grace Chapel");
  assert.equal(page.due, "2026-10-28");
  assert.ok(
    !("email" in page.report) && !("phone" in page.report),
    "the church's email and phone stay on the desk",
  );

  await assert.rejects(
    () => submitVendorResponse(sql, { caseId: id, token: newInviteToken(), body: "x" }),
    /not valid/,
  );
  await submitVendorResponse(sql, {
    caseId: id,
    token: vendorToken,
    body: "We will replace both cartridges and pay the service call.",
  });
  row = (await readCases(sql, MONDAY)).cases[0]!;
  assert.ok(row.vendorRespondedAt);
  const response = row.events.find((event) => event.kind === "vendor_response")!;
  assert.equal(response.author, "Vendor: Joyful Sound Co.");

  // Notes and messages, each with time and author.
  await addCaseEntry(
    sql,
    id,
    { kind: "note", body: "Called Ruth; she is fine with a credit too." },
    LINCOLN,
  );
  await addCaseEntry(
    sql,
    id,
    { kind: "message", body: "Emailed Sam to confirm the date." },
    LINCOLN,
  );
  await assert.rejects(
    () => addCaseEntry(sql, id, { kind: "note", body: " " }, LINCOLN),
    /Write something/,
  );

  // Committee: a reusable list, some chosen per case, each with a private link.
  const anna = await addCommitteePerson(sql, { name: "Anna Bell", email: "anna@example.org" });
  const joe = await addCommitteePerson(sql, { name: "Joe Park", email: "joe@example.org" });
  assert.equal(
    await addCommitteePerson(sql, { name: "Anna B.", email: "ANNA@example.org" }),
    anna,
    "same email, same person",
  );
  await assignMediators(sql, id, [anna], LINCOLN);
  row = (await readCases(sql, MONDAY)).cases[0]!;
  assert.equal(row.status, "mediation");
  assert.deepEqual(
    row.mediators.map((m) => m.name),
    ["Anna B."],
  );

  const mbox = mailbox();
  const out = await sendMediatorLinks(sql, {
    caseId: id,
    personIds: [anna, joe],
    author: LINCOLN,
    siteUrl: SITE,
    send: mbox.send,
  });
  assert.deepEqual(out.sent, [anna]);
  assert.deepEqual(out.failed, [{ personId: joe, error: "not assigned to this case" }]);
  assert.equal(mbox.sent.length, 1);
  const mediatorToken = tokenFrom(mbox.sent[0]!.text, "/buying/mediate/");
  const mrow = await sql<{ token_hash: string }>`select token_hash from source_case_mediators`;
  assert.equal(mrow[0]!.token_hash, await hashInviteToken(mediatorToken));

  // Lincoln records the decision.
  await decideCase(
    sql,
    id,
    {
      finding: "at_fault",
      remedyKind: "redo",
      remedyText: "Replace both cartridges and pay the service call",
      remedyDue: "2026-11-06",
      consequence: "warning",
      note: "The cartridges were from a bad lot.",
    },
    { userId: "lincoln", author: LINCOLN, now: MONDAY },
  );
  row = (await readCases(sql, MONDAY)).cases[0]!;
  assert.equal(row.status, "decided");
  assert.equal(row.finding, "at_fault");
  assert.equal(row.remedyStatus, "pending");
  assert.equal(row.remedyOverdue, false);
  assert.equal((await listVendors(sql))[0]!.consequence, "warning");
  assert.equal(
    (await listVendors(sql))[0]!.status,
    "approved",
    "a warning leaves the vendor approved",
  );

  // Overdue after the due date is flagged.
  assert.equal(
    (await readCases(sql, new Date("2026-11-07T12:00:00Z"))).cases[0]!.remedyOverdue,
    true,
  );

  // Remedy done on time.
  await markRemedy(sql, id, true, LINCOLN, new Date("2026-11-04T12:00:00Z"));
  row = (await readCases(sql, new Date("2026-11-10T12:00:00Z"))).cases[0]!;
  assert.equal(row.remedyStatus, "done");
  assert.equal(row.remedyOverdue, false);

  // The church is told, by preview then Send.
  const cbox = mailbox();
  await sendChurchDecision(sql, { caseId: id, author: LINCOLN, send: cbox.send });
  assert.equal(cbox.sent[0]!.to, "ruth@gracechapel.example");
  assert.match(cbox.sent[0]!.text, /We found that Joyful Sound Co\. was at fault\./);
  assert.match(
    cbox.sent[0]!.text,
    /Redo the work: Replace both cartridges and pay the service call \(due by 2026-11-06\)/,
  );
  assert.match(cbox.sent[0]!.text, /mediators who reviewed the case/);

  await setCaseStatus(sql, id, "closed", LINCOLN);
  const final = (await readCases(sql, MONDAY)).cases[0]!;
  assert.equal(final.status, "closed");
  // Every timeline entry has a time and an author.
  assert.ok(final.events.every((event) => event.createdAt && event.author));
  assert.deepEqual(
    // (Sorted: some entries above carry a fixed test clock, the rest the real one.)
    [...new Set(final.events.map((event) => event.kind))].sort(),
    [
      "report",
      "vendor_notified",
      "vendor_response",
      "note",
      "message",
      "mediators",
      "mediator_notified",
      "decision",
      "remedy",
      "church_told",
      "status",
    ].sort(),
  );

  // Standing on the vendor list.
  const vendor = (await listVendors(sql))[0]!;
  const standing = vendorStanding(vendor, (await readCases(sql, MONDAY)).cases);
  assert.deepEqual(standing, {
    covenantVersion: VENDOR_TERMS_VERSION,
    needsCovenant: false,
    openCases: 0,
    decidedAgainst: 1,
    remediesOwed: 1,
    remediesOnTime: 1,
    overdue: 0,
    consequence: "warning",
  });

  // A closed case refuses the vendor's link.
  assert.deepEqual(await readVendorCase(sql, id, vendorToken), {
    state: "closed",
    vendor: "Joyful Sound Co.",
  });
});

test("a remedy not done is flagged and one click escalates up the ladder", async () => {
  const sql = await fresh();
  const vendorId = await approvedVendor(sql);
  const { id } = await createCase(sql, cleanReport(report(vendorId)), { ip: "" });
  await assert.rejects(() => escalateCase(sql, id, LINCOLN), /Record the decision/);
  await decideCase(
    sql,
    id,
    {
      finding: "partly",
      remedyKind: "credit",
      remedyText: "$80 credit",
      remedyDue: "2026-11-02",
      consequence: "none",
    },
    { userId: "lincoln", author: LINCOLN },
  );
  await markRemedy(sql, id, false, LINCOLN);
  assert.equal((await readCases(sql)).cases[0]!.remedyOverdue, true);

  assert.equal(await escalateCase(sql, id, LINCOLN), "warning");
  assert.equal(await escalateCase(sql, id, LINCOLN), "probation");
  let vendor = (await listVendors(sql))[0]!;
  assert.equal(vendor.consequence, "probation");
  assert.equal(vendor.status, "approved", "probation keeps the vendor listed");

  // Probation: still matched, but not ticked by default.
  const bidId = await createBid(
    sql,
    { ...bidTemplate("printing-copiers", "toner-ink"), area: "GA" },
    "lincoln",
  );
  const preview = await previewInvites(sql, bidId, SITE);
  assert.equal(preview.vendors[0]!.probation, true);

  assert.equal(await escalateCase(sql, id, LINCOLN), "suspension");
  vendor = (await listVendors(sql))[0]!;
  assert.equal(vendor.status, "paused", "suspension pauses the vendor");
  assert.equal(await escalateCase(sql, id, LINCOLN), "revocation");
  vendor = (await listVendors(sql))[0]!;
  assert.equal(vendor.status, "removed", "revocation removes the vendor");
  await assert.rejects(() => escalateCase(sql, id, LINCOLN), /already revoked/);
  const escalations = (await readCases(sql)).cases[0]!.events.filter(
    (e) => e.kind === "escalation",
  );
  assert.equal(escalations.length, 4);
  assert.match(escalations[0]!.body, /not done by its due date/);
});

test("a suspension or revocation decision changes the vendor's status", async () => {
  const sql = await fresh();
  const suspended = await approvedVendor(sql);
  const revoked = await approvedVendor(sql, { email: "b@other.example", company: "Other Co" });
  const one = await createCase(sql, cleanReport(report(suspended)), { ip: "" });
  const two = await createCase(sql, cleanReport(report(revoked)), { ip: "" });
  const decision = { finding: "at_fault", remedyKind: "refund", remedyDue: "2026-11-30" };
  await decideCase(
    sql,
    one.id,
    { ...decision, consequence: "suspension" },
    { userId: "l", author: LINCOLN },
  );
  await decideCase(
    sql,
    two.id,
    { ...decision, consequence: "revocation" },
    { userId: "l", author: LINCOLN },
  );
  const byId = new Map((await listVendors(sql)).map((v) => [v.id, v]));
  assert.equal(byId.get(suspended)!.status, "paused");
  assert.equal(byId.get(suspended)!.consequence, "suspension");
  assert.equal(byId.get(suspended)!.consequenceCaseId, one.id);
  assert.equal(byId.get(revoked)!.status, "removed");
  assert.equal(byId.get(revoked)!.consequence, "revocation");

  // A suspended vendor gets no invitations.
  const bidId = await createBid(
    sql,
    { ...bidTemplate("printing-copiers", "toner-ink"), area: "GA" },
    "lincoln",
  );
  const box = mailbox();
  const sent = await sendInvites(sql, {
    bidId,
    vendorIds: [suspended, revoked],
    userId: "l",
    siteUrl: SITE,
    send: box.send,
  });
  assert.equal(box.sent.length, 0);
  assert.deepEqual(sent.skipped.map((row) => row.reason).sort(), ["is paused", "is removed"]);

  // Approving the suspended vendor again lifts the suspension; the case keeps its record.
  await updateVendor(sql, suspended, { status: "approved" }, "lincoln");
  assert.equal((await listVendors(sql)).find((v) => v.id === suspended)!.consequence, "none");
  assert.equal(
    (await readCases(sql)).cases.find((c) => c.id === one.id)!.consequence,
    "suspension",
  );
});

test("decision rules: finding, remedy and due date, no consequence when not at fault", () => {
  assert.throws(
    () => cleanDecision({ finding: "", remedyKind: "none", consequence: "none" }),
    /finding/,
  );
  assert.throws(
    () => cleanDecision({ finding: "at_fault", remedyKind: "repair", consequence: "none" }),
    /date the remedy is due/,
  );
  assert.throws(
    () =>
      cleanDecision({
        finding: "at_fault",
        remedyKind: "other",
        remedyDue: "2026-11-01",
        consequence: "none",
      }),
    /Describe the remedy/,
  );
  assert.throws(
    () =>
      cleanDecision({
        finding: "not_at_fault",
        remedyKind: "refund",
        remedyDue: "2026-11-01",
        consequence: "none",
      }),
    /owes no remedy/,
  );
  assert.throws(
    () => cleanDecision({ finding: "not_at_fault", remedyKind: "none", consequence: "warning" }),
    /no consequence/,
  );
  assert.throws(
    () => cleanDecision({ finding: "at_fault", remedyKind: "none", consequence: "fine" }),
    /consequence/,
  );
  const clean = cleanDecision({
    finding: "not_at_fault",
    remedyKind: "none",
    remedyDue: "2026-11-01",
    consequence: "none",
  });
  assert.equal(clean.remedyDue, "");
});

test("business days skip the weekend", () => {
  assert.equal(addBusinessDays(new Date("2026-10-23T18:00:00Z"), 2), "2026-10-27"); // Fri → Tue
  assert.equal(addBusinessDays(new Date("2026-10-26T09:00:00Z"), 2), "2026-10-28"); // Mon → Wed
  assert.equal(addBusinessDays(new Date("2026-10-24T09:00:00Z"), 1), "2026-10-26"); // Sat → Mon
});

// --- mediator access ------------------------------------------------------------

test("mediator token access: wrong token gets nothing; desk-only notes stay hidden", async () => {
  const sql = await fresh();
  const vendorId = await approvedVendor(sql);
  const { id } = await createCase(sql, cleanReport(report(vendorId)), { ip: "" });
  const other = await createCase(
    sql,
    cleanReport(report(vendorId, { churchName: "Hope Church" })),
    { ip: "" },
  );
  await addCaseEntry(sql, id, { kind: "note", body: "PRIVATE desk note" }, LINCOLN);
  const anna = await addCommitteePerson(sql, { name: "Anna Bell", email: "anna@example.org" });
  await assignMediators(sql, id, [anna], LINCOLN);
  const box = mailbox();
  await sendMediatorLinks(sql, {
    caseId: id,
    personIds: [anna],
    author: LINCOLN,
    siteUrl: SITE,
    send: box.send,
  });
  const token = tokenFrom(box.sent[0]!.text, "/buying/mediate/");

  assert.deepEqual(await readMediatorCase(sql, id, ""), { state: "denied" });
  assert.deepEqual(await readMediatorCase(sql, id, "short"), { state: "denied" });
  assert.deepEqual(await readMediatorCase(sql, id, newInviteToken()), { state: "denied" });
  assert.deepEqual(
    await readMediatorCase(sql, other.id, token),
    { state: "denied" },
    "a link is for one case",
  );
  await assert.rejects(
    () => submitRecommendation(sql, { caseId: id, token: newInviteToken(), body: "x" }),
    /not valid/,
  );

  const view = await readMediatorCase(sql, id, token);
  assert.equal(view.state, "open");
  if (view.state !== "open") return;
  assert.equal(view.mediator, "Anna Bell");
  assert.equal(view.canRecommend, true);
  assert.ok(!JSON.stringify(view).includes("PRIVATE desk note"), "internal notes are not shown");
  assert.ok(!JSON.stringify(view).includes("ruth@gracechapel.example"), "no church email");

  await submitRecommendation(sql, {
    caseId: id,
    token,
    body: "Replace the cartridges; no further step.",
  });
  const rec = (await readCases(sql)).cases
    .find((c) => c.id === id)!
    .events.find((e) => e.kind === "recommendation")!;
  assert.equal(rec.author, "Mediator: Anna Bell");

  await decideCase(
    sql,
    id,
    { finding: "at_fault", remedyKind: "redo", remedyDue: "2026-11-30", consequence: "none" },
    { userId: "l", author: LINCOLN },
  );
  await assert.rejects(
    () => submitRecommendation(sql, { caseId: id, token, body: "late" }),
    /decided/,
  );
});

// --- emails ---------------------------------------------------------------------

test("sample emails keep the owner's copy rules", () => {
  const row = {
    churchName: "Grace Chapel",
    contactName: "Ruth Hale",
    vendorName: "Joyful Sound Co.",
    purchase: "Toner for the office copier",
    purchasedOn: "September 2026",
    problem: "Two cartridges leaked.",
    wanted: "Replace them.",
    finding: "partly" as const,
    remedyKind: "credit" as const,
    remedyText: "Credit for two cartridges",
    remedyDue: "2026-11-06",
    decisionNote: "",
    mediators: [],
  };
  const emails = [
    vendorNoticeEmail({
      row,
      vendor: { company: "Joyful Sound Co.", contactName: "Sam" },
      link: `${SITE}/buying/cases/c1?t=T`,
      due: "2026-10-28",
      siteUrl: SITE,
    }),
    mediatorEmail({ row, name: "Anna", link: `${SITE}/buying/mediate/c1?t=T` }),
    churchDecisionEmail(row),
  ];
  for (const email of emails) {
    assert.ok(!/\bAI\b/.test(email.text));
    assert.ok(!/guarantee/i.test(email.text), "no guaranteed refunds");
    assert.ok(!/\bmembers?(hip)?\b/i.test(email.text));
    assert.ok(!new RegExp(["mes", "sen", "ger"].join(""), "i").test(email.text));
  }
  assert.match(emails[0]!.text, /\/buying\/vendor-terms/);
  assert.match(emails[1]!.text, /keep the details of the case private/);
  assert.match(emails[2]!.text, /It is not legal advice\./);
  assert.match(emails[2]!.text, /partly at fault/);
  assert.ok(!/\.\./.test(emails[2]!.text), "a name ending in a period does not double it");
});

// --- covenant re-acceptance -------------------------------------------------------

test("vendors on an older version are flagged and can re-accept by private link", async () => {
  const sql = await fresh();
  const vendorId = await approvedVendor(sql);
  await sql`update source_vendors set terms_version = '2026-10-24' where id = ${vendorId}`;
  let vendor = (await listVendors(sql))[0]!;
  assert.equal(vendor.needsCovenant, true);
  assert.deepEqual(
    vendorsNeedingCovenant([vendor]).map((v) => v.id),
    [vendorId],
  );

  const box = mailbox();
  const sent = await sendCovenantLink(sql, {
    vendorId,
    userId: "lincoln",
    siteUrl: SITE,
    send: box.send,
  });
  assert.equal(sent.ok, true);
  assert.match(box.sent[0]!.subject, /Vendor Covenant/);
  assert.match(box.sent[0]!.text, /accepted the Vendor Terms version 2026-10-24/);
  const token = tokenFrom(box.sent[0]!.text, "/buying/covenant");
  const stored = await sql<{ token_hash: string }>`select token_hash from source_covenant_links`;
  assert.equal(stored[0]!.token_hash, await hashInviteToken(token));

  assert.deepEqual(await readCovenantLink(sql, ""), { state: "denied" });
  assert.deepEqual(await readCovenantLink(sql, newInviteToken()), { state: "denied" });
  assert.deepEqual(await readCovenantLink(sql, token), {
    state: "open",
    company: "Joyful Sound Co.",
    acceptedVersion: "2026-10-24",
  });
  await assert.rejects(
    () => acceptCovenant(sql, { token, agreed: false, termsVersion: VENDOR_TERMS_VERSION, ip: "" }),
    /I agree to the Vendor Covenant and Vendor Terms/,
  );
  await assert.rejects(
    () => acceptCovenant(sql, { token, agreed: true, termsVersion: "2026-10-24", ip: "" }),
    /updated again/,
  );
  await acceptCovenant(sql, {
    token,
    agreed: true,
    termsVersion: VENDOR_TERMS_VERSION,
    ip: "198.51.100.8",
  });
  vendor = (await listVendors(sql))[0]!;
  assert.equal(vendor.needsCovenant, false);
  assert.equal(vendor.termsVersion, VENDOR_TERMS_VERSION);
  assert.equal(vendor.termsIp, "198.51.100.8");
  assert.equal((await readCovenantLink(sql, token)).state, "accepted");
  await assert.rejects(
    () => sendCovenantLink(sql, { vendorId, userId: "lincoln", siteUrl: SITE, send: box.send }),
    /already accepted/,
  );
});

// --- nothing leaks to public pages -------------------------------------------------

test("the public book shows only 'stands behind the covenant' and hides suspended vendors", async () => {
  const sql = await fresh();
  const vendorId = await approvedVendor(sql);
  const bidId = await createBid(
    sql,
    { ...bidTemplate("printing-copiers", "toner-ink"), area: "GA" },
    "lincoln",
  );
  const box = mailbox();
  await sendInvites(sql, {
    bidId,
    vendorIds: [vendorId],
    userId: "l",
    siteUrl: SITE,
    send: box.send,
  });
  const token = tokenFrom(box.sent[0]!.text, "/buying/bids/");
  const view = await readInvitedBid(sql, bidId, token);
  assert.equal(view.state, "open");
  if (view.state !== "open") return;
  const item = view.bid.items[0]!;
  const { quoteId } = await submitOnlineQuote(sql, {
    bidId,
    token,
    ...ATTESTED,
    lines: [{ itemId: item.id, unitPrice: "61" }],
  });
  await setItemWinners(sql, item.id, [quoteId], "lincoln");
  const award = (await readDesk(sql)).bids[0]!.awards[0]!;
  await publishAward(sql, award.id, "lincoln");

  let book = await listBook(sql);
  assert.equal(book.length, 1);
  assert.equal(book[0]!.covenant, true);

  // A case against the vendor: nothing of it reaches the public book.
  const { id } = await createCase(sql, cleanReport(report(vendorId)), { ip: "" });
  book = await listBook(sql);
  const json = JSON.stringify(book);
  for (const secret of ["Grace Chapel", "Ruth", "leaked", id])
    assert.ok(!json.includes(secret), secret);

  // An older acceptance loses the line.
  await sql`update source_vendors set terms_version = '2026-10-24'`;
  assert.equal((await listBook(sql))[0]!.covenant, false);
  await sql`update source_vendors set terms_version = ${VENDOR_TERMS_VERSION}`;

  // Suspended: off the catalogs. Approved again: back.
  await decideCase(
    sql,
    id,
    {
      finding: "at_fault",
      remedyKind: "refund",
      remedyDue: "2026-11-30",
      consequence: "suspension",
    },
    { userId: "l", author: LINCOLN },
  );
  assert.equal((await listBook(sql)).length, 0);
  await updateVendor(sql, vendorId, { status: "approved" }, "lincoln");
  assert.equal((await listBook(sql)).length, 1);
});
