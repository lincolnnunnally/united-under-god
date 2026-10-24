import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DbUnavailableError, getSql } from "@/lib/db";
import { INQUIRY_UNREACHABLE } from "@/lib/desk";
import { sendHardcodedOwnerEmail } from "@/lib/desk-mail";
import { isBuyingDbUnavailable } from "@/lib/source-store";
import {
  cleanVendorSignup,
  createVendor,
  readInvitedBid,
  submitOnlineQuote,
  vendorSignupNotice,
  type InvitedBidView,
} from "@/lib/vendor-store";

/** Public: vendor sign-up, the invited vendor's bid page, and its online quote. */

const signupInput = z.object({
  company: z.string(),
  contactName: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string().optional().default(""),
  categories: z.array(z.string()).max(200),
  states: z.array(z.string()).max(60),
  places: z.string().optional().default(""),
  nationwide: z.boolean(),
  insured: z.string(),
  notes: z.string().optional().default(""),
  agreed: z.boolean(),
  termsVersion: z.string(),
  /** Honeypot: people never see this field; a bot fills it. */
  hp: z.string().optional().default(""),
});

const bidPageInput = z.object({ bidId: z.string().max(80), token: z.string().max(200) });

const quoteInput = z.object({
  bidId: z.string().max(80),
  token: z.string().max(200),
  notes: z.string().optional().default(""),
  lines: z
    .array(
      z.object({
        itemId: z.string(),
        unitPrice: z.string().optional().default(""),
        notes: z.string().optional().default(""),
      }),
    )
    .max(60),
});

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

export type VendorSignupResult =
  { ok: true; saved: boolean; emailed: boolean } | { ok: false; error: string };

export const submitVendorSignup = createServerFn({ method: "POST" })
  .validator(signupInput)
  .handler(async ({ data }): Promise<VendorSignupResult> => {
    if (data.hp) return { ok: true, saved: true, emailed: false };
    let vendor;
    try {
      vendor = cleanVendorSignup(data);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Check the form and try again.",
      };
    }
    const ip = await callerIp();
    const now = new Date();
    const mail = (notice: { subject: string; text: string }) =>
      sendHardcodedOwnerEmail({
        subject: notice.subject,
        text: notice.text,
        apiKey: process.env.RESEND_API_KEY,
        logKind: "vendor",
        logLabel: "routes",
      });

    let saved: { id: string; duplicate: boolean };
    try {
      saved = await createVendor(await publicSql(), vendor, { ip, now });
    } catch {
      console.error("[vendors] sign-up not saved");
      const notice = vendorSignupNotice(vendor, {
        id: "(not saved)",
        duplicate: false,
        ip,
        acceptedAt: now.toISOString(),
      });
      const sent = await mail({ subject: `NOT SAVED: ${notice.subject}`, text: notice.text }).catch(
        () => ({ sent: 0 }),
      );
      return sent.sent > 0
        ? { ok: true, saved: false, emailed: true }
        : { ok: false, error: INQUIRY_UNREACHABLE };
    }
    const notice = vendorSignupNotice(vendor, { ...saved, ip, acceptedAt: now.toISOString() });
    const sent = await mail(notice).catch(() => ({ sent: 0 }));
    return { ok: true, saved: true, emailed: sent.sent > 0 };
  });

/** Public, but a wrong or missing token returns { state: "denied" } and nothing of the bid. */
export const readVendorBid = createServerFn({ method: "GET" })
  .validator(bidPageInput)
  .handler(async ({ data }): Promise<InvitedBidView | { state: "unavailable" }> => {
    try {
      return await readInvitedBid(await publicSql(), data.bidId, data.token);
    } catch (err) {
      if (err instanceof DbUnavailableError || isBuyingDbUnavailable(err)) {
        return { state: "unavailable" };
      }
      throw err;
    }
  });

export const submitVendorQuote = createServerFn({ method: "POST" })
  .validator(quoteInput)
  .handler(async ({ data }) => {
    try {
      const saved = await submitOnlineQuote(await publicSql(), data);
      return { ok: true as const, revised: saved.revised };
    } catch (err) {
      // Our own checks throw plain Errors; a database error carries a code
      // and is not shown to the vendor.
      const plain = err instanceof Error && !("code" in err);
      if (!plain) console.error("[vendors] online quote not saved");
      return {
        ok: false as const,
        error: plain
          ? (err as Error).message
          : "Your quote did not save. Please try again shortly.",
      };
    }
  });
