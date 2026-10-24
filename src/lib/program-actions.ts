import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Sql } from "@/lib/db";
import { sendResendText } from "@/lib/desk-mail";
import { SITE_URL } from "@/lib/seo";
import { assertStaff, deskSql } from "@/lib/source-actions";
import {
  approveReviewRequest,
  declineReviewRequest,
  hideReview,
  listModeration,
  listReviewRequests,
  listReviews,
  previewReviewRequest,
  sendReviewRequest,
  unhideReview,
  type ModerationRow,
  type ReviewRequestRow,
  type ReviewRow,
} from "@/lib/review-store";
import {
  decideCategoryRequest,
  listCategoryRequests,
  listReports,
  type CategoryRequest,
  type ReportRow,
} from "@/lib/vendor-portal-store";
import {
  listBroadcasts,
  previewBroadcast,
  sendBroadcast,
  type BroadcastLogRow,
  type BroadcastResult,
} from "@/lib/vendor-broadcast";
import { loadRankingData, rankFor, vendorCatalogs, type RankedVendor } from "@/lib/vendor-rank";

/**
 * The desk's vendor program (staff only): review requests and moderation,
 * category changes waiting for approval, monthly reports, catalog messages,
 * and each catalog's ranking with its full breakdown.
 */

export type ProgramDesk = {
  /** False when migrations/0010_source_vendor_portal.sql is not applied yet. */
  ready: boolean;
  vendors: { id: string; company: string; status: string; catalogs: string[] }[];
  requests: ReviewRequestRow[];
  reviews: ReviewRow[];
  moderation: ModerationRow[];
  categoryRequests: CategoryRequest[];
  reports: ReportRow[];
  broadcasts: BroadcastLogRow[];
  rankings: { category: string; rows: RankedVendor[] }[];
};

const EMPTY: ProgramDesk = {
  ready: false,
  vendors: [],
  requests: [],
  reviews: [],
  moderation: [],
  categoryRequests: [],
  reports: [],
  broadcasts: [],
  rankings: [],
};

function missingTable(err: unknown) {
  return Boolean(err && typeof err === "object" && "code" in err && String(err.code) === "42P01");
}

async function programView(sql: Sql): Promise<ProgramDesk> {
  try {
    const data = await loadRankingData(sql);
    const catalogs = [...new Set(data.vendors.flatMap((vendor) => vendorCatalogs(vendor.categories)))];
    return {
      ready: true,
      vendors: data.vendors.map((vendor) => ({
        id: vendor.id,
        company: vendor.company,
        status: vendor.status,
        catalogs: vendorCatalogs(vendor.categories),
      })),
      requests: await listReviewRequests(sql),
      reviews: await listReviews(sql),
      moderation: await listModeration(sql),
      categoryRequests: await listCategoryRequests(sql),
      reports: await listReports(sql),
      broadcasts: await listBroadcasts(sql),
      rankings: catalogs.map((category) => ({ category, rows: rankFor(data, category) })),
    };
  } catch (err) {
    if (missingTable(err)) return EMPTY;
    throw err;
  }
}

const mail = ({ to, subject, text }: { to: string; subject: string; text: string }) =>
  sendResendText({ to, subject, text, apiKey: process.env.RESEND_API_KEY });

async function programWrite(userId: string, work: (sql: Sql, author: string) => Promise<unknown>) {
  const author = await assertStaff(userId);
  const sql = await deskSql();
  await work(sql, author);
  return programView(sql);
}

export const readProgramDeskFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    return programView(await deskSql());
  });

const reviewRequestInput = z.object({
  vendorId: z.string().max(80),
  category: z.string().max(80).optional().default(""),
  churchName: z.string().max(400),
  contactName: z.string().max(400).optional().default(""),
  email: z.string().max(400),
  job: z.string().max(1000),
});

/** The exact email to the church. Sends nothing. */
export const previewReviewRequestFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(reviewRequestInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return previewReviewRequest(await deskSql(), data, SITE_URL);
  });

export const sendReviewRequestFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(reviewRequestInput)
  .handler(async ({ data, context }) => {
    let result = { ok: false, error: "" };
    const desk = await programWrite(context.userId, async (sql, author) => {
      const out = await sendReviewRequest(sql, data, {
        sentBy: author,
        siteUrl: SITE_URL,
        send: mail,
      });
      result = { ok: out.ok, error: out.error };
    });
    return { desk, result };
  });

/** One click on a request a vendor's report left waiting: approve sends it once; decline sends nothing. */
export const decideReviewRequestFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ requestId: z.string().max(80), approve: z.boolean() }))
  .handler(async ({ data, context }) => {
    let result = { ok: true, error: "" };
    const desk = await programWrite(context.userId, async (sql, author) => {
      if (!data.approve) return declineReviewRequest(sql, data.requestId, author);
      const out = await approveReviewRequest(sql, data.requestId, {
        approvedBy: author,
        siteUrl: SITE_URL,
        send: mail,
      });
      result = { ok: out.ok, error: out.error };
    });
    return { desk, result };
  });

export const hideReviewFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ reviewId: z.string().max(80), reason: z.string().max(40), note: z.string().max(2000) }))
  .handler(async ({ data, context }) =>
    programWrite(context.userId, (sql, author) =>
      hideReview(sql, data.reviewId, { reason: data.reason, note: data.note }, author),
    ),
  );

export const unhideReviewFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ reviewId: z.string().max(80), note: z.string().max(2000).optional().default("") }))
  .handler(async ({ data, context }) =>
    programWrite(context.userId, (sql, author) => unhideReview(sql, data.reviewId, data.note, author)),
  );

export const decideCategoryRequestFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ vendorId: z.string().max(80), approve: z.boolean() }))
  .handler(async ({ data, context }) =>
    programWrite(context.userId, (sql) =>
      decideCategoryRequest(sql, data.vendorId, data.approve, context.userId),
    ),
  );

const broadcastInput = z.object({
  category: z.string().max(80),
  subcategory: z.string().max(80).optional().default(""),
  area: z.string().max(400).optional().default(""),
  subject: z.string().max(400),
  body: z.string().max(8000),
});

/** Who would get the message and the exact email. Sends nothing. */
export const previewBroadcastFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(broadcastInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return previewBroadcast(await deskSql(), data, SITE_URL);
  });

/** Sends only when staff press Send; the preview's key makes a second press send nothing. */
export const sendBroadcastFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(broadcastInput.extend({ sendKey: z.string().max(80) }))
  .handler(async ({ data, context }): Promise<{ desk: ProgramDesk; result: BroadcastResult }> => {
    let result: BroadcastResult = { broadcastId: "", sent: [], failed: [], skipped: [] };
    const desk = await programWrite(context.userId, async (sql, author) => {
      result = await sendBroadcast(sql, data, { userId: author, siteUrl: SITE_URL, send: mail });
    });
    return { desk, result };
  });
