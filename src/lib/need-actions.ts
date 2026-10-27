import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { DbUnavailableError, getSql, type Sql } from "@/lib/db";
import { INQUIRY_UNREACHABLE } from "@/lib/desk";
import { sendHardcodedOwnerEmail, sendResendText } from "@/lib/desk-mail";
import { forwardInquiryToDashboard } from "@/lib/ops-report.server";
import { SITE_URL } from "@/lib/seo";
import { assertStaff, deskSql } from "@/lib/source-actions";
import { isBuyingDbUnavailable } from "@/lib/source-store";
import {
  addNeedToBid,
  chooseNeedQuote,
  cleanNeed,
  closeNeed,
  createNeed,
  declineNeedQuotes,
  needConfirmationEmail,
  needDecisionNotice,
  needIntroToChurch,
  needIntroToSupplier,
  needInquiry,
  needNotice,
  readNeedByToken,
  readNeedsDesk,
  sendNeedQuotes,
  startNeedBid,
  type CleanNeed,
  type NeedView,
  type NeedsDesk,
} from "@/lib/church-needs";

/**
 * Church needs: the public "Post a need" form and the church's private page
 * (token-addressed, no account), plus the desk's actions on each need (staff
 * only). A church's name and contact go only to the owner, the desk, and the
 * engine inbox; never onto a bid.
 */

const mail = ({ to, subject, text }: { to: string; subject: string; text: string }) =>
  sendResendText({ to, subject, text, apiKey: process.env.RESEND_API_KEY });

function ownerMail(notice: { subject: string; text: string }) {
  return sendHardcodedOwnerEmail({
    subject: notice.subject,
    text: notice.text,
    apiKey: process.env.RESEND_API_KEY,
    logKind: "buying",
    logLabel: "routes",
  }).catch(() => ({ sent: 0, attempted: 1 }));
}

async function publicSql() {
  try {
    return await getSql();
  } catch (err) {
    if (!isBuyingDbUnavailable(err)) throw err;
    throw new DbUnavailableError("The database is not available, so this was not saved.");
  }
}

async function callerIp() {
  const { requestIp } = await import("@/lib/request-ip.server");
  return requestIp();
}

/** Our own checks throw plain Errors; a database error carries a code and is not shown. */
function plainError(err: unknown, fallback: string) {
  const plain = err instanceof Error && !("code" in err) && !(err instanceof DbUnavailableError);
  if (!plain) console.error("[needs] write failed");
  return plain ? (err as Error).message : fallback;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

const needInput = z.object({
  churchName: z.string().max(400),
  contactName: z.string().max(400),
  email: z.string().max(400),
  phone: z.string().max(100).optional().default(""),
  city: z.string().max(400),
  state: z.string().max(40),
  zip: z.string().max(40).optional().default(""),
  category: z.string().max(80).optional().default(""),
  title: z.string().max(400),
  details: z.string().max(8000).optional().default(""),
  quantity: z.string().max(400).optional().default(""),
  neededBy: z.string().max(80).optional().default(""),
  /** Honeypot: people never see this field; a bot fills it. */
  hp: z.string().optional().default(""),
});

export type NeedResult =
  | { ok: true; saved: boolean; emailed: boolean }
  | { ok: false; error: string };

export const submitNeedFn = createServerFn({ method: "POST" })
  .validator(needInput)
  .handler(async ({ data }): Promise<NeedResult> => {
    if (data.hp) return { ok: true, saved: true, emailed: false };
    let clean: CleanNeed;
    try {
      clean = cleanNeed(data);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Check the form and try again." };
    }
    const ip = await callerIp();
    let saved;
    try {
      saved = await createNeed(await publicSql(), data, { ip });
    } catch (err) {
      if (err instanceof Error && !("code" in err) && !(err instanceof DbUnavailableError)) {
        return { ok: false, error: err.message };
      }
      console.error("[needs] need not saved");
      const sent = await ownerMail(needNotice(clean, { id: "(not saved)", saved: false }));
      return sent.sent > 0
        ? { ok: true, saved: false, emailed: true }
        : { ok: false, error: INQUIRY_UNREACHABLE };
    }
    if (!saved) return { ok: true, saved: true, emailed: false };
    const confirmation = needConfirmationEmail(clean, saved.token, SITE_URL);
    const confirmed = await mail({ to: clean.email, ...confirmation }).catch(() => ({
      ok: false,
      error: "",
    }));
    if (!confirmed.ok) console.error(`[needs] confirmation email failed need=${saved.id}`);
    await ownerMail(needNotice(clean, { id: saved.id, saved: true }));
    await forwardInquiryToDashboard(needInquiry(clean, saved.id)).catch(() => undefined);
    return { ok: true, saved: true, emailed: confirmed.ok };
  });

const tokenInput = z.object({ token: z.string().max(200) });

export const readNeedFn = createServerFn({ method: "GET" })
  .validator(tokenInput)
  .handler(async ({ data }): Promise<NeedView | { state: "unavailable" }> => {
    try {
      return await readNeedByToken(await publicSql(), data.token);
    } catch (err) {
      if (err instanceof DbUnavailableError || isBuyingDbUnavailable(err)) {
        return { state: "unavailable" };
      }
      throw err;
    }
  });

export const chooseNeedQuoteFn = createServerFn({ method: "POST" })
  .validator(tokenInput.extend({ quoteId: z.string().max(80) }))
  .handler(async ({ data }) => {
    try {
      const chosen = await chooseNeedQuote(await publicSql(), data);
      // The church's page promises the introduction: make it now, both ways.
      const church = await mail(needIntroToChurch(chosen)).catch(() => ({ ok: false, error: "" }));
      const supplier = chosen.supplierEmail
        ? await mail(needIntroToSupplier(chosen)).catch(() => ({ ok: false, error: "" }))
        : { ok: false, error: "" };
      await ownerMail(needDecisionNotice(chosen, true, { church: church.ok, supplier: supplier.ok }));
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: plainError(err, "Your choice did not save. Please try again shortly.") };
    }
  });

export const declineNeedQuotesFn = createServerFn({ method: "POST" })
  .validator(tokenInput.extend({ note: z.string().max(4000).optional().default("") }))
  .handler(async ({ data }) => {
    try {
      const declined = await declineNeedQuotes(await publicSql(), data);
      await ownerMail(needDecisionNotice(declined, false));
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: plainError(err, "That did not save. Please try again shortly.") };
    }
  });

// ---------------------------------------------------------------------------
// The desk (staff only)
// ---------------------------------------------------------------------------

export type NeedsDeskView = NeedsDesk & {
  /** False when migrations/0013_source_church_needs.sql is not applied yet. */
  ready: boolean;
};

async function needsView(sql: Sql): Promise<NeedsDeskView> {
  try {
    return { ...(await readNeedsDesk(sql)), ready: true };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code === "42P01") return { needs: [], openBids: [], ready: false };
    throw err;
  }
}

async function needWrite(userId: string, work: (sql: Sql) => Promise<unknown>) {
  await assertStaff(userId);
  const sql = await deskSql();
  await work(sql);
  return needsView(sql);
}

const needIdInput = z.object({ needId: z.string().max(80) });

export const readNeedsDeskFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    return needsView(await deskSql());
  });

export const startNeedBidFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(needIdInput)
  .handler(async ({ data, context }) =>
    needWrite(context.userId, (sql) => startNeedBid(sql, data.needId, context.userId)),
  );

export const addNeedToBidFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(needIdInput.extend({ bidId: z.string().max(80) }))
  .handler(async ({ data, context }) =>
    needWrite(context.userId, (sql) => addNeedToBid(sql, data.needId, data.bidId)),
  );

export const sendNeedQuotesFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(needIdInput)
  .handler(async ({ data, context }) => {
    let result = { ok: false, error: "" };
    const desk = await needWrite(context.userId, async (sql) => {
      result = await sendNeedQuotes(sql, { needId: data.needId, siteUrl: SITE_URL, send: mail });
    });
    return { desk, result };
  });

export const closeNeedFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(needIdInput)
  .handler(async ({ data, context }) =>
    needWrite(context.userId, (sql) => closeNeed(sql, data.needId)),
  );

export type { NeedQuote, NeedRow, NeedStatus, NeedView } from "@/lib/church-needs";
