import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DbUnavailableError, getSql } from "@/lib/db";
import { isBuyingDbUnavailable } from "@/lib/source-store";
import { canViewVendorFiles } from "@/lib/vendor-file-access";
import {
  readCatalogVendors,
  readVendorProfile,
  type CatalogVendorsRead,
  type VendorProfile,
} from "@/lib/vendor-listing";
import { readReviewPage, submitReview, type ReviewPageView } from "@/lib/review-store";

/**
 * Public reads: each catalog's ranked vendors and each vendor's profile, plus
 * the church's private review page. A missing database is an empty read.
 */

async function publicSql() {
  try {
    return await getSql();
  } catch (err) {
    if (!isBuyingDbUnavailable(err)) throw err;
    throw new DbUnavailableError("The database is not available, so this was not saved.");
  }
}

async function currentRequest(): Promise<Request | null> {
  const { currentRequest: read } = await import("@/lib/vendor-session.server");
  return read();
}

function unavailable(err: unknown) {
  return err instanceof DbUnavailableError || isBuyingDbUnavailable(err);
}

export const readCatalogVendorsFn = createServerFn({ method: "GET" })
  .validator(z.object({ categoryId: z.string().max(80) }))
  .handler(async ({ data }): Promise<CatalogVendorsRead> => {
    const canViewFiles = await canViewVendorFiles(await currentRequest());
    try {
      const read = await readCatalogVendors(await publicSql(), data.categoryId, { canViewFiles });
      return { ...read, unavailable: false };
    } catch (err) {
      if (!unavailable(err)) throw err;
      console.error("[vendors] catalog vendors unavailable");
      return { vendors: [], ranked: false, unavailable: true, filesVisible: canViewFiles };
    }
  });

export const readVendorProfileFn = createServerFn({ method: "GET" })
  .validator(z.object({ vendorId: z.string().max(80) }))
  .handler(
    async ({ data }): Promise<{ state: "ok"; profile: VendorProfile } | { state: "missing" | "unavailable" }> => {
      const canViewFiles = await canViewVendorFiles(await currentRequest());
      try {
        const profile = await readVendorProfile(await publicSql(), data.vendorId, { canViewFiles });
        return profile ? { state: "ok", profile } : { state: "missing" };
      } catch (err) {
        if (!unavailable(err)) throw err;
        return { state: "unavailable" };
      }
    },
  );

/** Public, but a wrong or missing token returns { state: "denied" } and nothing else. */
export const readReviewPageFn = createServerFn({ method: "GET" })
  .validator(z.object({ requestId: z.string().max(80), token: z.string().max(200) }))
  .handler(async ({ data }): Promise<ReviewPageView | { state: "unavailable" }> => {
    try {
      return await readReviewPage(await publicSql(), data.requestId, data.token);
    } catch (err) {
      if (!unavailable(err)) throw err;
      return { state: "unavailable" };
    }
  });

export const submitReviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestId: z.string().max(80),
      token: z.string().max(200),
      overall: z.number().int(),
      quality: z.number().int(),
      onTime: z.string().max(4),
      billMatched: z.string().max(4),
      hireAgain: z.string().max(4),
      comment: z.string().max(8000),
      showChurchName: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      await submitReview(await publicSql(), data);
      return { ok: true };
    } catch (err) {
      const plain = err instanceof Error && !("code" in err);
      if (!plain) console.error("[reviews] review not saved");
      return {
        ok: false,
        error: plain ? (err as Error).message : "Your review did not save. Please try again shortly.",
      };
    }
  });
