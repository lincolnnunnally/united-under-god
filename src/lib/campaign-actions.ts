import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { readCampaignDesk, type CampaignView } from "@/lib/campaign-desk";
import { assertStaff, deskSql } from "@/lib/source-actions";

/** The staff desk's Campaigns page. Staff only; church contact stays on the desk. */

export type CampaignsDesk = {
  campaigns: CampaignView[];
  /** False until migrations/0015_need_campaign.sql is applied. */
  ready: boolean;
};

export const readCampaignsDeskFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CampaignsDesk> => {
    await assertStaff(context.userId);
    try {
      return { campaigns: await readCampaignDesk(await deskSql()), ready: true };
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      // 42P01: no needs table yet; 42703: no campaign column yet.
      if (code === "42P01" || code === "42703") return { campaigns: [], ready: false };
      throw err;
    }
  });

export type { CampaignView } from "@/lib/campaign-desk";
