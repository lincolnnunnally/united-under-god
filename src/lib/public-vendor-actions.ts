import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DbUnavailableError, getSql } from "@/lib/db";
import { isBuyingDbUnavailable } from "@/lib/source-store";
import { canViewVendorFiles } from "@/lib/vendor-file-access";
import {
  catalogVendorsForViewer,
  vendorProfileForViewer,
  type CatalogVendorsForViewer,
  type ViewerVendorProfile,
} from "@/lib/vendor-listing";
import { readReviewPage, submitReview, type ReviewPageView } from "@/lib/review-store";

/**
 * Public reads: each catalog's ranked vendors and each vendor's profile, plus
 * the church's private review page. A missing database is an empty read.
 *
 * The member gate is applied here, on the server: a viewer who is not a member
 * church (or staff) gets vendor names, the Preferred badge, and standing only.
 * Contacts, phone, website, files, and reviews never leave the server for them.
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

/** Member church or staff, decided by the same gate that guards vendor files. */
async function viewerIsMember(): Promise<boolean> {
  return canViewVendorFiles(await currentRequest());
}

export type CatalogVendorsView = CatalogVendorsForViewer & { unavailable: boolean };

export const readCatalogVendorsFn = createServerFn({ method: "GET" })
  .validator(z.object({ categoryId: z.string().max(80) }))
  .handler(async ({ data }): Promise<CatalogVendorsView> => {
    const member = await viewerIsMember();
    try {
      const read = await catalogVendorsForViewer(await publicSql(), data.categoryId, { member });
      return { ...read, unavailable: false };
    } catch (err) {
      if (!unavailable(err)) throw err;
      console.error("[vendors] catalog vendors unavailable");
      return { vendors: [], count: 0, ranked: false, unavailable: true, filesVisible: false, member };
    }
  });

export const readVendorProfileFn = createServerFn({ method: "GET" })
  .validator(z.object({ vendorId: z.string().max(80) }))
  .handler(
    async ({
      data,
    }): Promise<
      { state: "ok"; profile: ViewerVendorProfile; member: boolean } | { state: "missing" | "unavailable" }
    > => {
      const member = await viewerIsMember();
      try {
        const profile = await vendorProfileForViewer(await publicSql(), data.vendorId, { member });
        return profile ? { state: "ok", profile, member } : { state: "missing" };
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
