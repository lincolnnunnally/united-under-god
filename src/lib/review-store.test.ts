import assert from "node:assert/strict";
import { test } from "node:test";
import type { Sql } from "./db.ts";
import { freshProgramDb, linkIn, mailbox } from "./program-test-db.ts";
import { cleanVendorSignup, createVendor, updateVendor } from "./vendor-store.ts";
import { VENDOR_TERMS_VERSION } from "./vendor-terms.ts";
import {
  HIDE_REASONS,
  approveReviewRequest,
  declineReviewRequest,
  listReviewRequests,
  queueReportedReviewRequest,
  REVIEW_PAGE_PATH,
  hideReview,
  listModeration,
  listReviews,
  previewReviewRequest,
  readReviewPage,
  sendReviewRequest,
  submitReview,
  unhideReview,
  vendorReviewSummary,
  type ReviewInput,
} from "./review-store.ts";
import { loadRankingData, rankFor } from "./vendor-rank.ts";

const SITE = "https://www.unitedundergod.org";

async function vendor(sql: Sql) {
  const { id } = await createVendor(
    sql,
    cleanVendorSignup({
      company: "Shine Janitorial",
      contactName: "Sam Cole",
      email: "sam@shine.example",
      phone: "404-555-0100",
      categories: ["janitorial-supplies"],
      states: ["GA"],
      nationwide: false,
      insured: "yes",
      agreed: true,
      termsVersion: VENDOR_TERMS_VERSION,
    }),
    { ip: "" },
  );
  await updateVendor(sql, id, { status: "approved" }, "lincoln");
  return id;
}

async function request(sql: Sql, vendorId: string, church = "Grace Chapel") {
  const box = mailbox();
  const out = await sendReviewRequest(
    sql,
    { vendorId, category: "janitorial-supplies", churchName: church, contactName: "Pat Lee", email: "pat@grace.example", job: "Monthly supplies" },
    { sentBy: "lincoln", siteUrl: SITE, send: box.send },
  );
  const { url, token } = linkIn(box.sent[0]!.text, REVIEW_PAGE_PATH);
  return { id: out.id, token, url, box };
}

function review(id: string, token: string, overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {
    requestId: id,
    token,
    overall: 5,
    quality: 5,
    onTime: "yes",
    billMatched: "yes",
    hireAgain: "yes",
    comment: "On time every month and the bill matched the quote.",
    showChurchName: false,
    ...overrides,
  };
}

test("the review request: preview shows the exact email; only the token's hash is stored", async () => {
  const sql = await freshProgramDb();
  const vendorId = await vendor(sql);
  const preview = await previewReviewRequest(
    sql,
    { vendorId, churchName: "Grace Chapel", contactName: "Pat", email: "PAT@grace.example", job: "Floors" },
    SITE,
  );
  assert.equal(preview.to, "pat@grace.example");
  assert.match(preview.email.subject, /How did Shine Janitorial do for Grace Chapel\?/);
  assert.match(preview.email.text, /Only churches that bought through the program can review/);
  assert.match(preview.email.text, /good or bad/);
  assert.match(preview.email.text, /name is shown only if you choose/);
  await assert.rejects(
    previewReviewRequest(sql, { vendorId, churchName: "", email: "pat@grace.example", job: "x" }, SITE),
    /church's name/,
  );
  await assert.rejects(
    previewReviewRequest(sql, { vendorId, churchName: "G", email: "nope", job: "x" }, SITE),
    /working email/,
  );

  const { id, token, url } = await request(sql, vendorId);
  assert.equal(url.pathname, `${REVIEW_PAGE_PATH}/${id}`);
  const rows = await sql<{ token_hash: string; email_status: string }>`select token_hash, email_status from source_review_requests`;
  assert.notEqual(rows[0]!.token_hash, token);
  assert.equal(rows[0]!.email_status, "sent");

  // A failed send stays on the desk as failed.
  const failed = await sendReviewRequest(
    sql,
    { vendorId, churchName: "Hope", email: "a@hope.example", job: "x" },
    { sentBy: "lincoln", siteUrl: SITE, send: mailbox(true).send },
  );
  assert.equal(failed.ok, false);
});

test("review token access: the right link opens once; a wrong one sees nothing", async () => {
  const sql = await freshProgramDb();
  const vendorId = await vendor(sql);
  const { id, token } = await request(sql, vendorId);
  const other = await request(sql, vendorId, "Hope Church");

  assert.deepEqual(await readReviewPage(sql, id, ""), { state: "denied" });
  assert.deepEqual(await readReviewPage(sql, id, "z".repeat(43)), { state: "denied" });
  assert.deepEqual(await readReviewPage(sql, id, other.token), { state: "denied" }, "another church's token");
  const open = await readReviewPage(sql, id, token);
  assert.equal(open.state, "open");
  assert.equal(open.state === "open" && open.company, "Shine Janitorial");

  await assert.rejects(submitReview(sql, review(id, other.token)), /not valid/);
  await assert.rejects(submitReview(sql, review(id, token, { overall: 6 })), /1 to 5/);
  await assert.rejects(submitReview(sql, review(id, token, { onTime: "maybe" })), /yes or no/);
  await assert.rejects(submitReview(sql, review(id, token, { comment: " " })), /sentence or two/);

  await submitReview(sql, review(id, token));
  assert.deepEqual(await readReviewPage(sql, id, token), { state: "done", company: "Shine Janitorial" });
  await assert.rejects(submitReview(sql, review(id, token)), /already sent/);
  assert.equal((await listReviews(sql)).length, 1, "one review per request");
});

test("review author: the church's name only if it opts in, otherwise 'A program church'", async () => {
  const sql = await freshProgramDb();
  const vendorId = await vendor(sql);
  const quiet = await request(sql, vendorId, "Quiet Chapel");
  const named = await request(sql, vendorId, "Named Church");
  await submitReview(sql, review(quiet.id, quiet.token));
  await submitReview(sql, review(named.id, named.token, { showChurchName: true }));
  const summary = await vendorReviewSummary(sql, vendorId);
  const authors = summary.published.map((row) => row.author).sort();
  assert.deepEqual(authors, ["A program church", "Named Church"]);
  const json = JSON.stringify(summary);
  assert.ok(!json.includes("Quiet Chapel"), "an anonymous church's name never leaves");
  assert.ok(!json.includes("pat@grace.example") && !json.includes("Pat Lee"), "no contact");
});

test("hiding: only for abuse, profanity, or private information; logged; never suppresses a negative review", async () => {
  const sql = await freshProgramDb();
  const vendorId = await vendor(sql);
  const ids: string[] = [];
  for (const [index, overall] of [5, 5, 1].entries()) {
    const r = await request(sql, vendorId, `Church ${index}`);
    const saved = await submitReview(
      sql,
      review(r.id, r.token, {
        overall,
        quality: overall,
        onTime: overall > 2 ? "yes" : "no",
        billMatched: overall > 2 ? "yes" : "no",
        hireAgain: overall > 2 ? "yes" : "no",
        comment: overall > 2 ? "Good work." : "Late, and the bill was higher than the quote.",
      }),
    );
    ids.push(saved.id);
  }
  const negative = ids[2]!;
  const before = rankFor(await loadRankingData(sql), "janitorial-supplies")[0]!.breakdown.total;

  // Not a reason: being negative, or anything outside the three.
  for (const reason of ["negative", "inaccurate", "competitor", "", "other"]) {
    await assert.rejects(
      hideReview(sql, negative, { reason, note: "The vendor disputes it." }, "lincoln"),
      /only for abuse, profanity, or private information/,
      reason,
    );
  }
  await assert.rejects(hideReview(sql, negative, { reason: "abuse", note: " " }, "lincoln"), /Say what/);
  assert.equal((await listModeration(sql)).length, 0, "refused hides are not applied");
  assert.equal((await listReviews(sql)).find((row) => row.id === negative)!.status, "published");

  assert.deepEqual([...HIDE_REASONS], ["abuse", "profanity", "private_information"]);
  await hideReview(sql, negative, { reason: "private_information", note: "Names a staff member's phone number." }, "lincoln");
  const log = await listModeration(sql);
  assert.equal(log.length, 1);
  assert.equal(log[0]!.action, "hide");
  assert.equal(log[0]!.reason, "private_information");
  assert.match(log[0]!.note, /phone number/);
  assert.equal(log[0]!.author, "lincoln");

  // Hidden from the profile, but its rating still counts: hiding never helps the vendor.
  const summary = await vendorReviewSummary(sql, vendorId);
  assert.equal(summary.count, 3);
  assert.equal(summary.published.length, 2);
  assert.equal(summary.average, Math.round(((5 + 5 + 1) / 3) * 10) / 10);
  const after = rankFor(await loadRankingData(sql), "janitorial-supplies")[0]!.breakdown.total;
  assert.equal(after, before, "the score does not change when a review is hidden");

  await assert.rejects(hideReview(sql, negative, { reason: "abuse", note: "again" }, "lincoln"), /not published/);
  await unhideReview(sql, negative, "Edited out the phone number with the church.", "lincoln");
  const full = await listModeration(sql);
  assert.deepEqual(full.map((row) => row.action).sort(), ["hide", "unhide"]);
  assert.equal((await vendorReviewSummary(sql, vendorId)).published.length, 3);
});

test("a vendor-reported job waits for the owner: approval sends exactly once, decline sends nothing", async () => {
  const sql = await freshProgramDb();
  const vendorId = await vendor(sql);
  const input = {
    vendorId,
    category: "janitorial-supplies",
    churchName: "Grace Chapel",
    contactName: "Pat Lee",
    email: "pat@grace.example",
    job: "Floor care kit",
  };
  const pending = await queueReportedReviewRequest(sql, input, { reportId: "r1", vendorLabel: `vendor:${vendorId}` });
  const other = await queueReportedReviewRequest(sql, { ...input, email: "friend@accomplice.example" }, {
    reportId: "r2",
    vendorLabel: `vendor:${vendorId}`,
  });
  const rows = await listReviewRequests(sql);
  assert.deepEqual(rows.map((row) => row.emailStatus), ["pending", "pending"]);
  // A pending request has no working link: no token can open it.
  const stored = await sql<{ token_hash: string }>`select token_hash from source_review_requests where id = ${pending.id}`;
  assert.match(stored[0]!.token_hash, /^pending:/);
  assert.deepEqual(await readReviewPage(sql, pending.id, "a".repeat(43)), { state: "denied" });

  const box = mailbox();
  const sent = await approveReviewRequest(sql, pending.id, { approvedBy: "lincoln", siteUrl: SITE, send: box.send });
  assert.equal(sent.ok, true);
  assert.equal(box.sent.length, 1);
  assert.equal(box.sent[0]!.to, "pat@grace.example");
  assert.match(box.sent[0]!.text, /told us it finished a job for Grace Chapel/);
  // Approving again sends nothing more.
  await assert.rejects(
    approveReviewRequest(sql, pending.id, { approvedBy: "lincoln", siteUrl: SITE, send: box.send }),
    /not waiting for approval/,
  );
  assert.equal(box.sent.length, 1, "exactly once");
  // The link in that one email works.
  const { token } = linkIn(box.sent[0]!.text, REVIEW_PAGE_PATH);
  assert.equal((await readReviewPage(sql, pending.id, token)).state, "open");

  // Declined: nothing sent, and it cannot be approved afterwards.
  await declineReviewRequest(sql, other.id, "lincoln");
  await assert.rejects(
    approveReviewRequest(sql, other.id, { approvedBy: "lincoln", siteUrl: SITE, send: box.send }),
    /not waiting for approval/,
  );
  assert.equal(box.sent.length, 1);
  const after = await listReviewRequests(sql);
  assert.equal(after.find((row) => row.id === other.id)!.emailStatus, "declined");
  assert.equal(after.find((row) => row.id === pending.id)!.emailStatus, "sent");
});
