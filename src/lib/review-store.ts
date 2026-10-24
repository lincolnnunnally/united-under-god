import type { Sql } from "./db.ts";
import { getSpendCategory } from "./church-spend.ts";
import {
  TOKEN_SHAPE,
  hashInviteToken,
  newInviteToken,
  type SendMail,
} from "./vendor-store.ts";
import { ANONYMOUS_CHURCH } from "./vendor-rank.ts";

/**
 * Verified church reviews of program vendors. A church can review a vendor
 * only from a private link sent after a real program job: the owner sends it
 * from the desk, or it goes out when a vendor reports a closed job. Only a
 * SHA-256 of the link token is stored.
 *
 * The owner can hide a review only for abuse, profanity, or private
 * information, never for being negative. Every hide and unhide is logged with
 * its reason, and a hidden review's ratings still count in the vendor's score,
 * so hiding can never improve a ranking.
 *
 * Imported by node's test runner: relative imports, no framework code. Mail is
 * passed in as a function, so nothing here sends on its own.
 */

export const REVIEW_PAGE_PATH = "/buying/review";

export function reviewLinkPath(requestId: string, token: string) {
  return `${REVIEW_PAGE_PATH}/${encodeURIComponent(requestId)}?t=${token}`;
}

/** The only reasons a review may be hidden. Being negative is not one of them. */
export const HIDE_REASONS = ["abuse", "profanity", "private_information"] as const;
export type HideReason = (typeof HIDE_REASONS)[number];

export const HIDE_REASON_LABELS: Record<HideReason, string> = {
  abuse: "Abusive or harassing",
  profanity: "Profanity",
  private_information: "Shares private information",
};

/** Vendor-reported jobs: at most this many review requests per vendor per 30 days. */
export const REPORT_REQUESTS_PER_MONTH = 20;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown) {
  return String(value ?? "");
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return text(value);
}

function bool(value: unknown) {
  return value === true || value === "t" || value === "true";
}

function need(value: string | undefined, message: string, max: number) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) throw new Error(message);
  if (trimmed.length > max) throw new Error("That is too long to store.");
  return trimmed;
}

// ---------------------------------------------------------------------------
// Review requests
// ---------------------------------------------------------------------------

export type ReviewRequestInput = {
  vendorId: string;
  /** A catalog category id the job was in ('' when not known). */
  category?: string;
  churchName: string;
  contactName?: string;
  email: string;
  /** What the job was, in a few words. */
  job: string;
};

export type CleanReviewRequest = {
  vendorId: string;
  category: string;
  churchName: string;
  contactName: string;
  email: string;
  job: string;
};

export function cleanReviewRequest(input: ReviewRequestInput): CleanReviewRequest {
  const vendorId = need(input.vendorId, "Pick the vendor.", 80);
  const category = (input.category ?? "").trim();
  if (category && !getSpendCategory(category)) throw new Error("That catalog is not on the list.");
  const churchName = need(input.churchName, "Enter the church's name.", 200);
  const contactName = (input.contactName ?? "").trim().slice(0, 160);
  const email = need(input.email, "Enter the church contact's email.", 200).toLowerCase();
  if (!EMAIL.test(email)) throw new Error("Enter a working email address for the church contact.");
  const job = need(input.job, "Say what the job was.", 400);
  return { vendorId, category, churchName, contactName, email, job };
}

/** The review request email. The desk shows this exact text before anything is sent. */
export function reviewRequestEmail(args: {
  request: Pick<CleanReviewRequest, "churchName" | "contactName" | "job">;
  company: string;
  origin: "desk" | "report";
  link: string;
}) {
  const { request } = args;
  return {
    subject: `How did ${args.company} do for ${request.churchName}?`,
    text: [
      request.contactName ? `Hello ${request.contactName},` : "Hello,",
      "",
      args.origin === "report"
        ? `${args.company} told us it finished a job for ${request.churchName} through the United Under God buying program: ${request.job}.`
        : `${args.company} did a job for ${request.churchName} through the United Under God buying program: ${request.job}.`,
      "",
      "Would you take two minutes to tell other churches how it went? Only churches that bought through the program can review a vendor, and this link is only for you:",
      args.link,
      "",
      "We publish honest reviews, good or bad. Your church's name is shown only if you choose; otherwise the review says it came from a program church. Your name and email are never shown.",
      "",
      "If this job did not happen, or was not yours, please reply and tell us.",
      "",
      "United Under God, Inc.",
    ].join("\n"),
  };
}

export type ReviewRequestRow = {
  id: string;
  vendorId: string;
  category: string;
  churchName: string;
  contactName: string;
  email: string;
  job: string;
  origin: string;
  reportId: string;
  emailStatus: string;
  emailError: string;
  sentBy: string;
  sentAt: string;
  usedAt: string;
};

function mapRequest(row: Record<string, unknown>): ReviewRequestRow {
  return {
    id: text(row.id),
    vendorId: text(row.vendor_id),
    category: text(row.category),
    churchName: text(row.church_name),
    contactName: text(row.contact_name),
    email: text(row.email),
    job: text(row.job),
    origin: text(row.origin),
    reportId: text(row.report_id),
    emailStatus: text(row.email_status),
    emailError: text(row.email_error),
    sentBy: text(row.sent_by),
    sentAt: iso(row.sent_at),
    usedAt: row.used_at ? iso(row.used_at) : "",
  };
}

async function vendorCompany(sql: Sql, vendorId: string) {
  const rows = await sql<{ company: string; status: string }>`
    select company, status from source_vendors where id = ${vendorId}
  `;
  if (!rows[0]) throw new Error("That vendor is not on the list.");
  if (rows[0].status === "removed") throw new Error("That vendor was removed from the program.");
  return text(rows[0].company);
}

export async function previewReviewRequest(sql: Sql, input: ReviewRequestInput, siteUrl: string) {
  const request = cleanReviewRequest(input);
  const company = await vendorCompany(sql, request.vendorId);
  return {
    to: request.email,
    email: reviewRequestEmail({
      request,
      company,
      origin: "desk",
      link: `${siteUrl}${REVIEW_PAGE_PATH}/(a private link for this church)`,
    }),
  };
}

/**
 * Save and send one review request. Only the token's hash is stored; the token
 * is only in the email. A failed send stays on the desk as failed.
 */
export async function sendReviewRequest(
  sql: Sql,
  input: ReviewRequestInput,
  args: {
    origin: "desk" | "report";
    reportId?: string;
    sentBy: string;
    siteUrl: string;
    send: SendMail;
  },
): Promise<{ id: string; ok: boolean; error: string }> {
  const request = cleanReviewRequest(input);
  const company = await vendorCompany(sql, request.vendorId);
  const token = newInviteToken();
  const id = crypto.randomUUID();
  const email = reviewRequestEmail({
    request,
    company,
    origin: args.origin,
    link: `${args.siteUrl}${reviewLinkPath(id, token)}`,
  });
  await sql`
    insert into source_review_requests (
      id, vendor_id, category, church_name, contact_name, email, job, origin, report_id,
      token_hash, email_status, sent_by
    ) values (
      ${id}, ${request.vendorId}, ${request.category}, ${request.churchName},
      ${request.contactName}, ${request.email}, ${request.job}, ${args.origin},
      ${args.reportId ?? ""}, ${await hashInviteToken(token)}, ${"sending"}, ${args.sentBy}
    )
  `;
  let outcome: { ok: boolean; error: string };
  try {
    outcome = await args.send({ to: request.email, subject: email.subject, text: email.text });
  } catch {
    outcome = { ok: false, error: "send failed" };
  }
  const error = outcome.ok ? "" : outcome.error || "mail is not set up (no RESEND_API_KEY)";
  await sql`
    update source_review_requests set
      email_status = ${outcome.ok ? "sent" : "failed"}, email_error = ${error.slice(0, 500)}
    where id = ${id}
  `;
  return { id, ok: outcome.ok, error };
}

export async function listReviewRequests(sql: Sql): Promise<ReviewRequestRow[]> {
  const rows = await sql`select * from source_review_requests order by sent_at desc`;
  return rows.map(mapRequest);
}

/** How many vendor-reported review requests this vendor sent in the last 30 days. */
export async function recentReportRequests(sql: Sql, vendorId: string, now = new Date()) {
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from source_review_requests
    where vendor_id = ${vendorId} and origin = 'report' and sent_at >= ${since}
  `;
  return Number(rows[0]?.n ?? 0);
}

// ---------------------------------------------------------------------------
// The church's review page
// ---------------------------------------------------------------------------

export type ReviewPageView =
  | { state: "denied" }
  | { state: "inactive" }
  | { state: "done"; company: string }
  | { state: "open"; company: string; churchName: string; job: string };

async function findRequest(sql: Sql, requestId: string, token: string) {
  if (!requestId || !token || !TOKEN_SHAPE.test(token)) return null;
  const rows = await sql`
    select * from source_review_requests
    where id = ${requestId} and token_hash = ${await hashInviteToken(token)}
  `;
  return rows[0] ? mapRequest(rows[0]) : null;
}

/** What a link holder sees. A wrong or missing token sees nothing. */
export async function readReviewPage(
  sql: Sql,
  requestId: string,
  token: string,
): Promise<ReviewPageView> {
  const request = await findRequest(sql, requestId, token);
  if (!request) return { state: "denied" };
  const vendors = await sql<{ company: string; status: string }>`
    select company, status from source_vendors where id = ${request.vendorId}
  `;
  const vendor = vendors[0];
  if (!vendor || vendor.status === "removed") return { state: "inactive" };
  if (request.usedAt) return { state: "done", company: text(vendor.company) };
  return {
    state: "open",
    company: text(vendor.company),
    churchName: request.churchName,
    job: request.job,
  };
}

export type ReviewInput = {
  requestId: string;
  token: string;
  overall: number;
  quality: number;
  /** "yes" | "no" */
  onTime: string;
  billMatched: string;
  hireAgain: string;
  comment: string;
  showChurchName: boolean;
};

function stars(value: number, label: string) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`Choose 1 to 5 for ${label}.`);
  return n;
}

function yesNo(value: string, label: string) {
  if (value !== "yes" && value !== "no") throw new Error(`Answer yes or no: ${label}`);
  return value === "yes";
}

export function cleanReview(input: Omit<ReviewInput, "requestId" | "token">) {
  return {
    overall: stars(input.overall, "overall"),
    quality: stars(input.quality, "quality of the work"),
    onTime: yesNo(input.onTime, "was it on time?"),
    billMatched: yesNo(input.billMatched, "did the final bill match the quote?"),
    hireAgain: yesNo(input.hireAgain, "would you hire them again?"),
    comment: need(input.comment, "Write a sentence or two about how it went.", 4000),
    showChurchName: Boolean(input.showChurchName),
  };
}

/** One review per request. The link stops working once it is used. */
export async function submitReview(sql: Sql, input: ReviewInput): Promise<{ id: string }> {
  const request = await findRequest(sql, input.requestId, input.token);
  if (!request) throw new Error("This link is not valid.");
  const review = cleanReview(input);
  const vendors = await sql<{ status: string }>`
    select status from source_vendors where id = ${request.vendorId}
  `;
  if (!vendors[0] || vendors[0].status === "removed") {
    throw new Error("This vendor is no longer in the program.");
  }
  const claimed = await sql<{ id: string }>`
    update source_review_requests set used_at = now()
    where id = ${request.id} and used_at is null
    returning id
  `;
  if (!claimed[0]) throw new Error("This review was already sent. Thank you.");
  const id = crypto.randomUUID();
  await sql`
    insert into source_vendor_reviews (
      id, request_id, vendor_id, category, overall, quality, on_time, bill_matched,
      hire_again, comment, show_church_name, church_name, status
    ) values (
      ${id}, ${request.id}, ${request.vendorId}, ${request.category}, ${review.overall},
      ${review.quality}, ${review.onTime}, ${review.billMatched}, ${review.hireAgain},
      ${review.comment}, ${review.showChurchName}, ${request.churchName}, ${"published"}
    )
  `;
  return { id };
}

// ---------------------------------------------------------------------------
// Reviews: the desk, moderation, and the public profile
// ---------------------------------------------------------------------------

export type ReviewRow = {
  id: string;
  requestId: string;
  vendorId: string;
  category: string;
  overall: number;
  quality: number;
  onTime: boolean;
  billMatched: boolean;
  hireAgain: boolean;
  comment: string;
  showChurchName: boolean;
  /** Private: shown publicly only when showChurchName. */
  churchName: string;
  status: "published" | "hidden";
  hiddenReason: string;
  hiddenAt: string;
  createdAt: string;
};

export type ModerationRow = {
  id: string;
  reviewId: string;
  action: string;
  reason: string;
  note: string;
  author: string;
  createdAt: string;
};

function mapReview(row: Record<string, unknown>): ReviewRow {
  return {
    id: text(row.id),
    requestId: text(row.request_id),
    vendorId: text(row.vendor_id),
    category: text(row.category),
    overall: Number(row.overall),
    quality: Number(row.quality),
    onTime: bool(row.on_time),
    billMatched: bool(row.bill_matched),
    hireAgain: bool(row.hire_again),
    comment: text(row.comment),
    showChurchName: bool(row.show_church_name),
    churchName: text(row.church_name),
    status: text(row.status) === "hidden" ? "hidden" : "published",
    hiddenReason: text(row.hidden_reason),
    hiddenAt: row.hidden_at ? iso(row.hidden_at) : "",
    createdAt: iso(row.created_at),
  };
}

export async function listReviews(sql: Sql): Promise<ReviewRow[]> {
  const rows = await sql`select * from source_vendor_reviews order by created_at desc`;
  return rows.map(mapReview);
}

export async function listModeration(sql: Sql): Promise<ModerationRow[]> {
  const rows = await sql`select * from source_review_moderation order by created_at desc`;
  return rows.map((row) => ({
    id: text(row.id),
    reviewId: text(row.review_id),
    action: text(row.action),
    reason: text(row.reason),
    note: text(row.note),
    author: text(row.author),
    createdAt: iso(row.created_at),
  }));
}

/**
 * Hide a review. Only for abuse, profanity, or private information, with a
 * note saying what was wrong. Logged. The ratings keep counting.
 */
export async function hideReview(
  sql: Sql,
  reviewId: string,
  input: { reason: string; note: string },
  author: string,
) {
  if (!(HIDE_REASONS as readonly string[]).includes(input.reason)) {
    throw new Error(
      "A review can be hidden only for abuse, profanity, or private information. Honest reviews stay up, good or bad.",
    );
  }
  const note = need(input.note, "Say what in the review is abusive, profane, or private.", 1000);
  const rows = await sql<{ id: string }>`
    update source_vendor_reviews set
      status = 'hidden', hidden_reason = ${input.reason}, hidden_at = now()
    where id = ${reviewId} and status = 'published'
    returning id
  `;
  if (!rows[0]) throw new Error("That review is not published.");
  await sql`
    insert into source_review_moderation (id, review_id, action, reason, note, author)
    values (${crypto.randomUUID()}, ${reviewId}, ${"hide"}, ${input.reason}, ${note}, ${author})
  `;
}

/** Publish a hidden review again. Logged. */
export async function unhideReview(sql: Sql, reviewId: string, note: string, author: string) {
  const rows = await sql<{ id: string }>`
    update source_vendor_reviews set status = 'published', hidden_reason = '', hidden_at = null
    where id = ${reviewId} and status = 'hidden'
    returning id
  `;
  if (!rows[0]) throw new Error("That review is not hidden.");
  await sql`
    insert into source_review_moderation (id, review_id, action, reason, note, author)
    values (${crypto.randomUUID()}, ${reviewId}, ${"unhide"}, ${""}, ${note.trim().slice(0, 1000)}, ${author})
  `;
}

export type PublicReview = {
  id: string;
  overall: number;
  quality: number;
  onTime: boolean;
  billMatched: boolean;
  hireAgain: boolean;
  comment: string;
  /** The church's name only when it chose to be named. */
  author: string;
  catalog: string;
  createdAt: string;
};

/** What a public profile shows: published reviews only, never a contact. */
export function publicReview(row: ReviewRow): PublicReview {
  return {
    id: row.id,
    overall: row.overall,
    quality: row.quality,
    onTime: row.onTime,
    billMatched: row.billMatched,
    hireAgain: row.hireAgain,
    comment: row.comment,
    author: row.showChurchName && row.churchName ? row.churchName : ANONYMOUS_CHURCH,
    catalog: getSpendCategory(row.category)?.name ?? "",
    createdAt: row.createdAt.slice(0, 10),
  };
}

export type ReviewSummary = {
  /** Every verified review, hidden ones included: hiding never changes the numbers. */
  count: number;
  average: number;
  published: PublicReview[];
};

export async function vendorReviewSummary(sql: Sql, vendorId: string): Promise<ReviewSummary> {
  const rows = (
    await sql`select * from source_vendor_reviews where vendor_id = ${vendorId} order by created_at desc`
  ).map(mapReview);
  const average = rows.length ? rows.reduce((sum, row) => sum + row.overall, 0) / rows.length : 0;
  return {
    count: rows.length,
    average: Math.round(average * 10) / 10,
    published: rows.filter((row) => row.status === "published").map(publicReview),
  };
}
