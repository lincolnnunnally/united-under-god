import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DbUnavailableError, getSql } from "@/lib/db";
import { sendResendText } from "@/lib/desk-mail";
import { SITE_URL } from "@/lib/seo";
import { isBuyingDbUnavailable } from "@/lib/source-store";
import {
  acceptTermsInPortal,
  endSession,
  portalBidLink,
  readPortal,
  redeemLoginLink,
  requestLoginLink,
  saveProfile,
  sessionVendorId,
  setOffer,
  submitReport,
  type PortalView,
} from "@/lib/vendor-portal-store";
import { deleteVendorFile, listOwnFiles, type VendorFileRow } from "@/lib/vendor-files";

/**
 * The vendor portal's server functions. Signing in is public; everything else
 * needs the portal session cookie and acts only on that vendor's own record.
 */

async function portalSql() {
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

const mail = ({ to, subject, text }: { to: string; subject: string; text: string }) =>
  sendResendText({ to, subject, text, apiKey: process.env.RESEND_API_KEY });

/** Our own checks throw plain Errors; a database error carries a code and is not shown. */
function plainError(err: unknown, fallback: string) {
  const plain = err instanceof Error && !("code" in err);
  if (!plain) console.error("[portal] write failed");
  return plain ? (err as Error).message : fallback;
}

/** The signed-in vendor's id, or null. */
async function currentVendor(): Promise<string | null> {
  const { readPortalCookie } = await import("@/lib/vendor-session.server");
  const token = readPortalCookie();
  if (!token) return null;
  return sessionVendorId(await portalSql(), token);
}

async function requireVendor(): Promise<string> {
  const vendorId = await currentVendor();
  if (!vendorId) throw new Error("Your portal session ended. Sign in again.");
  return vendorId;
}

export type PortalRead =
  | { state: "signed_out" }
  | { state: "unavailable" }
  | { state: "ok"; view: PortalView; files: VendorFileRow[] };

async function readAll(vendorId: string): Promise<PortalRead> {
  const sql = await portalSql();
  return { state: "ok", view: await readPortal(sql, vendorId), files: await listOwnFiles(sql, vendorId) };
}

/** Public. The same answer whether or not the email is on the vendor list. */
export const requestPortalLinkFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().max(400), hp: z.string().optional().default("") }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (data.hp) return { ok: true };
    try {
      const out = await requestLoginLink(await portalSql(), {
        email: data.email,
        ip: await callerIp(),
        siteUrl: SITE_URL,
        send: mail,
      });
      if (out.reason === "failed") console.error("[portal] sign-in email failed");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: plainError(err, "That did not go through. Please try again shortly.") };
    }
  });

/** Trade the emailed link for a session cookie. POST, so a mail scanner's GET cannot spend it. */
export const redeemPortalLinkFn = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().max(200) }))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const session = await redeemLoginLink(await portalSql(), data.token);
      const { writePortalCookie } = await import("@/lib/vendor-session.server");
      writePortalCookie(session.sessionToken);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: plainError(err, "Sign-in did not go through. Please try again.") };
    }
  });

export const readPortalFn = createServerFn({ method: "GET" }).handler(async (): Promise<PortalRead> => {
  try {
    const vendorId = await currentVendor();
    if (!vendorId) return { state: "signed_out" };
    return await readAll(vendorId);
  } catch (err) {
    if (err instanceof DbUnavailableError || isBuyingDbUnavailable(err)) return { state: "unavailable" };
    throw err;
  }
});

export const signOutPortalFn = createServerFn({ method: "POST" }).handler(async () => {
  const { clearPortalCookie, readPortalCookie } = await import("@/lib/vendor-session.server");
  const token = readPortalCookie();
  if (token) await endSession(await portalSql(), token).catch(() => undefined);
  clearPortalCookie();
  return { ok: true as const };
});

type WriteResult<T = undefined> = { ok: true; read: PortalRead; result?: T } | { ok: false; error: string };

async function portalWrite<T>(work: (vendorId: string) => Promise<T>): Promise<WriteResult<T>> {
  try {
    const vendorId = await requireVendor();
    const result = await work(vendorId);
    return { ok: true, read: await readAll(vendorId), result };
  } catch (err) {
    return { ok: false, error: plainError(err, "That did not save. Please try again shortly.") };
  }
}

export const savePortalProfileFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      description: z.string().max(4000),
      website: z.string().max(400),
      phone: z.string().max(100),
      nationwide: z.boolean(),
      states: z.array(z.string().max(4)).max(60),
      places: z.string().max(8000),
      categories: z.array(z.string().max(120)).max(200),
    }),
  )
  .handler(async ({ data }) =>
    portalWrite(async (vendorId) => saveProfile(await portalSql(), vendorId, data)),
  );

export const setPortalOfferFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      category: z.string().max(80),
      rebate: z.string().max(20).optional().default(""),
      referral: z.string().max(20).optional().default(""),
    }),
  )
  .handler(async ({ data }) => portalWrite(async (vendorId) => setOffer(await portalSql(), vendorId, data)));

export const acceptPortalTermsFn = createServerFn({ method: "POST" })
  .validator(z.object({ agreed: z.boolean(), termsVersion: z.string().max(20) }))
  .handler(async ({ data }) =>
    portalWrite(async (vendorId) =>
      acceptTermsInPortal(await portalSql(), vendorId, { ...data, ip: await callerIp() }),
    ),
  );

export const submitPortalReportFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      month: z.string().max(10),
      kind: z.string().max(10),
      category: z.string().max(80).optional().default(""),
      amount: z.string().max(40).optional().default(""),
      description: z.string().max(2000).optional().default(""),
      churchName: z.string().max(400).optional().default(""),
      contactName: z.string().max(400).optional().default(""),
      email: z.string().max(400).optional().default(""),
      closedOn: z.string().max(20).optional().default(""),
    }),
  )
  .handler(async ({ data }) =>
    portalWrite(async (vendorId) =>
      submitReport(await portalSql(), vendorId, data, { siteUrl: SITE_URL, send: mail }),
    ),
  );

/** A private link to an invited bid, minted for the portal. */
export const openPortalBidFn = createServerFn({ method: "POST" })
  .validator(z.object({ inviteId: z.string().max(80) }))
  .handler(async ({ data }): Promise<{ ok: true; path: string } | { ok: false; error: string }> => {
    try {
      const vendorId = await requireVendor();
      return { ok: true, path: await portalBidLink(await portalSql(), vendorId, data.inviteId) };
    } catch (err) {
      return { ok: false, error: plainError(err, "That bid did not open. Please try again.") };
    }
  });

export const deletePortalFileFn = createServerFn({ method: "POST" })
  .validator(z.object({ fileId: z.string().max(80) }))
  .handler(async ({ data }) =>
    portalWrite(async (vendorId) => deleteVendorFile(await portalSql(), vendorId, data.fileId)),
  );
