import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DbUnavailableError, getSql } from "@/lib/db";
import { INQUIRY_UNREACHABLE } from "@/lib/desk";
import { sendHardcodedOwnerEmail } from "@/lib/desk-mail";
import { isBuyingDbUnavailable } from "@/lib/source-store";
import {
  cleanReport,
  createCase,
  listReportVendors,
  readMediatorCase,
  readVendorCase,
  reportNotice,
  submitRecommendation,
  submitVendorResponse,
  type MediatorCaseView,
  type VendorCaseView,
} from "@/lib/case-store";
import { acceptCovenant, readCovenantLink, type CovenantLinkView } from "@/lib/vendor-store";

/**
 * Public: a church's "Report a problem", and the private pages behind the
 * links sent to a vendor, a mediator, or a vendor asked to accept the new
 * covenant. A wrong or missing token sees nothing.
 */

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

function ownerMail(notice: { subject: string; text: string }) {
  return sendHardcodedOwnerEmail({
    subject: notice.subject,
    text: notice.text,
    apiKey: process.env.RESEND_API_KEY,
    logKind: "case",
    logLabel: "routes",
  }).catch(() => ({ sent: 0, attempted: 1 }));
}

/** Our own checks throw plain Errors; a database error carries a code and is not shown. */
function plainError(err: unknown, fallback: string) {
  const plain = err instanceof Error && !("code" in err);
  if (!plain) console.error("[cases] write failed");
  return plain ? (err as Error).message : fallback;
}

/** The vendor picker on /buying/report: names of program vendors only. */
export const listReportVendorsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ vendors: { id: string; company: string }[]; unavailable: boolean }> => {
    try {
      return { vendors: await listReportVendors(await publicSql()), unavailable: false };
    } catch (err) {
      if (err instanceof DbUnavailableError || isBuyingDbUnavailable(err)) {
        return { vendors: [], unavailable: true };
      }
      throw err;
    }
  },
);

const reportInput = z.object({
  churchName: z.string().max(400),
  contactName: z.string().max(400),
  email: z.string().max(400),
  phone: z.string().max(100),
  vendorId: z.string().max(80),
  purchase: z.string().max(1000),
  purchasedOn: z.string().max(200),
  problem: z.string().max(8000),
  wanted: z.string().max(4000),
  /** Honeypot: people never see this field; a bot fills it. */
  hp: z.string().optional().default(""),
});

export type ReportResult =
  { ok: true; saved: boolean; emailed: boolean } | { ok: false; error: string };

export const submitReport = createServerFn({ method: "POST" })
  .validator(reportInput)
  .handler(async ({ data }): Promise<ReportResult> => {
    if (data.hp) return { ok: true, saved: true, emailed: false };
    let report;
    try {
      report = cleanReport(data);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Check the form and try again.",
      };
    }
    const ip = await callerIp();
    let saved: { id: string; vendorName: string };
    try {
      saved = await createCase(await publicSql(), report, { ip });
    } catch (err) {
      if (err instanceof Error && !("code" in err) && !(err instanceof DbUnavailableError)) {
        return { ok: false, error: err.message };
      }
      console.error("[cases] report not saved");
      const sent = await ownerMail(
        reportNotice(report, {
          id: "(not saved)",
          vendorName: `vendor id ${report.vendorId}`,
          saved: false,
        }),
      );
      return sent.sent > 0
        ? { ok: true, saved: false, emailed: true }
        : { ok: false, error: INQUIRY_UNREACHABLE };
    }
    const sent = await ownerMail(reportNotice(report, { ...saved, saved: true }));
    return { ok: true, saved: true, emailed: sent.sent > 0 };
  });

const tokenInput = z.object({ caseId: z.string().max(80), token: z.string().max(200) });

export const readVendorCaseFn = createServerFn({ method: "GET" })
  .validator(tokenInput)
  .handler(async ({ data }): Promise<VendorCaseView | { state: "unavailable" }> => {
    try {
      return await readVendorCase(await publicSql(), data.caseId, data.token);
    } catch (err) {
      if (err instanceof DbUnavailableError || isBuyingDbUnavailable(err)) {
        return { state: "unavailable" };
      }
      throw err;
    }
  });

export const submitVendorResponseFn = createServerFn({ method: "POST" })
  .validator(tokenInput.extend({ body: z.string().max(8000) }))
  .handler(async ({ data }) => {
    try {
      const saved = await submitVendorResponse(await publicSql(), data);
      await ownerMail({
        subject: `Vendor responded: ${saved.vendor} on ${saved.churchName}'s concern`,
        text: `${saved.vendor} responded to ${saved.churchName}'s concern. Read it on the desk: https://www.unitedundergod.org/buying/desk\n\n${data.body.trim()}`,
      });
      return { ok: true as const };
    } catch (err) {
      return {
        ok: false as const,
        error: plainError(err, "Your response did not save. Please try again shortly."),
      };
    }
  });

export const readMediatorCaseFn = createServerFn({ method: "GET" })
  .validator(tokenInput)
  .handler(async ({ data }): Promise<MediatorCaseView | { state: "unavailable" }> => {
    try {
      return await readMediatorCase(await publicSql(), data.caseId, data.token);
    } catch (err) {
      if (err instanceof DbUnavailableError || isBuyingDbUnavailable(err)) {
        return { state: "unavailable" };
      }
      throw err;
    }
  });

export const submitRecommendationFn = createServerFn({ method: "POST" })
  .validator(tokenInput.extend({ body: z.string().max(8000) }))
  .handler(async ({ data }) => {
    try {
      const saved = await submitRecommendation(await publicSql(), data);
      await ownerMail({
        subject: `Mediator recommendation: ${saved.churchName} and ${saved.vendorName}`,
        text: `${saved.mediator} added a recommendation. Read it on the desk: https://www.unitedundergod.org/buying/desk\n\n${data.body.trim()}`,
      });
      return { ok: true as const };
    } catch (err) {
      return {
        ok: false as const,
        error: plainError(err, "Your recommendation did not save. Please try again shortly."),
      };
    }
  });

export const readCovenantLinkFn = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().max(200) }))
  .handler(async ({ data }): Promise<CovenantLinkView | { state: "unavailable" }> => {
    try {
      return await readCovenantLink(await publicSql(), data.token);
    } catch (err) {
      if (err instanceof DbUnavailableError || isBuyingDbUnavailable(err)) {
        return { state: "unavailable" };
      }
      throw err;
    }
  });

export const acceptCovenantFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string().max(200), agreed: z.boolean(), termsVersion: z.string().max(20) }),
  )
  .handler(async ({ data }) => {
    try {
      const accepted = await acceptCovenant(await publicSql(), { ...data, ip: await callerIp() });
      await ownerMail({
        subject: `Vendor Covenant accepted: ${accepted.company}`,
        text: `${accepted.company} accepted the Vendor Covenant and Vendor Terms version ${accepted.version}.`,
      });
      return { ok: true as const, version: accepted.version };
    } catch (err) {
      return {
        ok: false as const,
        error: plainError(err, "That did not save. Please try again shortly."),
      };
    }
  });
