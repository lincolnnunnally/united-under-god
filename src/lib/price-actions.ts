import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { sendResendText } from "@/lib/desk-mail";
import { viewerMiddleware } from "@/lib/membership-actions";
import { SITE_URL } from "@/lib/seo";
import { assertStaff, deskSql } from "@/lib/source-actions";
import { setBidStatus } from "@/lib/source-store";
import { ensureBookTerms } from "@/lib/price-term";
import {
  decideConfirmation,
  extendPriceTerm,
  previewPriceReviewRequest,
  publishUpdatedPrices,
  readMemberOrders,
  readPriceReviews,
  recordMemberOrder,
  sendPriceReviewRequest,
  type PriceReviewDesk,
  type VendorOrderComparison,
} from "@/lib/price-program";

/**
 * Program prices on the desk (staff only): prices up for review, the one-click
 * actions on each, and the member orders log beside the vendors' reports.
 * Plus the one member-church write: "We ordered this".
 */

export type PriceDesk = {
  /** False when migrations/0012_program_price_honor.sql is not applied yet. */
  ready: boolean;
  reviews: PriceReviewDesk;
  orders: VendorOrderComparison[];
};

const EMPTY: PriceDesk = {
  ready: false,
  reviews: { dueSoon: [], current: [], reviewDays: 45 },
  orders: [],
};

/** 42P01 (no table) or 42703 (no column): 0012 is not applied yet. */
function notMigrated(err: unknown) {
  const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
  return code === "42P01" || code === "42703";
}

async function priceView(sql: Sql): Promise<PriceDesk> {
  try {
    // Entries published before references existed get theirs now.
    await ensureBookTerms(sql);
    return { ready: true, reviews: await readPriceReviews(sql), orders: await readMemberOrders(sql) };
  } catch (err) {
    if (notMigrated(err)) return EMPTY;
    throw err;
  }
}

const mail = ({ to, subject, text }: { to: string; subject: string; text: string }) =>
  sendResendText({ to, subject, text, apiKey: process.env.RESEND_API_KEY });

async function priceWrite(userId: string, work: (sql: Sql) => Promise<unknown>): Promise<PriceDesk> {
  await assertStaff(userId);
  const sql = await deskSql();
  await work(sql);
  return priceView(sql);
}

export const readPriceDeskFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    return priceView(await deskSql());
  });

const bookInput = z.object({ bookId: z.string().max(80) });

/** Who the confirm-or-update request goes to, and its exact text. Sends nothing. */
export const previewPriceRequestFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(bookInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return previewPriceReviewRequest(await deskSql(), data.bookId, SITE_URL);
  });

/** One click: "Please confirm or update your program prices" to the price contact and the vendor. */
export const sendPriceRequestFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(bookInput)
  .handler(async ({ data, context }) => {
    let result: { sent: string[]; failed: { to: string; error: string }[] } = { sent: [], failed: [] };
    const desk = await priceWrite(context.userId, async (sql) => {
      result = await sendPriceReviewRequest(sql, {
        bookId: data.bookId,
        userId: context.userId,
        siteUrl: SITE_URL,
        send: mail,
      });
    });
    return { desk, result };
  });

/** One click: reopen the bid the price came from, so vendors can quote again. */
export const reopenPriceBidFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ bidId: z.string().max(80) }))
  .handler(async ({ data, context }) =>
    priceWrite(context.userId, (sql) => setBidStatus(sql, data.bidId, "open")),
  );

/** One click, after the vendor confirmed by phone or email: extend the term at the same price. */
export const extendPriceTermFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(bookInput)
  .handler(async ({ data, context }) =>
    priceWrite(context.userId, (sql) => extendPriceTerm(sql, { bookId: data.bookId, userId: context.userId })),
  );

/** Approve (extends the term) or decline a confirmation the vendor sent from its portal. */
export const decidePriceConfirmationFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ reviewId: z.string().max(80), approve: z.boolean() }))
  .handler(async ({ data, context }) =>
    priceWrite(context.userId, (sql) =>
      decideConfirmation(sql, { reviewId: data.reviewId, approve: data.approve, userId: context.userId }),
    ),
  );

/** Publish the updated prices a vendor sent: new price, new reference, new term. */
export const publishUpdatedPricesFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ quoteId: z.string().max(80) }))
  .handler(async ({ data, context }) =>
    priceWrite(context.userId, (sql) => publishUpdatedPrices(sql, { quoteId: data.quoteId, userId: context.userId })),
  );

// ---------------------------------------------------------------------------
// "We ordered this" (member churches; staff may test it)
// ---------------------------------------------------------------------------

export type MemberOrderResult = { ok: true } | { ok: false; error: string };

export const recordMemberOrderFn = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .validator(
    z.object({
      bookId: z.string().max(80),
      quantity: z.string().max(80),
      orderedOn: z.string().max(20),
      amount: z.string().max(40).optional().default(""),
    }),
  )
  .handler(async ({ data, context }): Promise<MemberOrderResult> => {
    const { access } = context;
    if (!access.userId || !access.canView) {
      return { ok: false, error: "Sign in as a member church to tell us you ordered." };
    }
    try {
      const sql = await getSql();
      let churchName = "";
      try {
        const rows = await sql`select church_name from uug_member_churches where user_id = ${access.userId}`;
        churchName = String(rows[0]?.church_name ?? "");
      } catch {
        // No church row (a staff account): the order is still logged.
      }
      if (!churchName && access.staff) churchName = "(staff account)";
      await recordMemberOrder(sql, data, { userId: access.userId, churchName });
      return { ok: true };
    } catch (err) {
      const plain = err instanceof Error && !("code" in err);
      if (!plain) console.error("[prices] member order not saved");
      return { ok: false, error: plain ? (err as Error).message : "That did not save. Please try again shortly." };
    }
  });

export type { PriceReviewDesk, PriceReviewItem, VendorOrderComparison } from "@/lib/price-program";
