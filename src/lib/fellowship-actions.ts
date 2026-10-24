import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { sendHardcodedOwnerEmail } from "@/lib/desk-mail";
import { sendDeskEmails } from "@/lib/desk-mail.server";
import {
  addFellowshipInterest,
  cleanFellowshipInput,
  fellowshipThreshold,
  listAreaPastors,
  listFellowshipAreas,
  markAreaEmailed,
  markAreaStarted,
  meetupEmail,
  type FellowshipArea,
} from "@/lib/fellowship";
import { viewerMiddleware } from "@/lib/membership-actions";
import { isMissingTable } from "@/lib/membership-store";

const interestInput = z.object({
  name: z.string().max(400),
  church: z.string().max(400).optional().default(""),
  email: z.string().max(400).optional().default(""),
  phone: z.string().max(100).optional().default(""),
  city: z.string().max(200).optional().default(""),
  state: z.string().max(100).optional().default(""),
  zip: z.string().max(40).optional().default(""),
  preferredDay: z.string().max(100).optional().default(""),
  preferredTime: z.string().max(100).optional().default(""),
  hp: z.string().optional().default(""),
});

/** Public: a pastor says "I'm in." Members and non-members alike. */
export const submitFellowshipInterest = createServerFn({ method: "POST" })
  .middleware([viewerMiddleware])
  .validator(interestInput)
  .handler(async ({ data, context }) => {
    if (data.hp) return { ok: true as const, areaLabel: "" };
    const clean = cleanFellowshipInput(data);
    if ("error" in clean) return { ok: false as const, error: clean.error };
    try {
      await addFellowshipInterest(await getSql(), clean, {
        userId: context.access.userId,
        isMember: context.access.member,
        threshold: fellowshipThreshold(),
        notifyOwner: (notice) =>
          sendHardcodedOwnerEmail({
            subject: notice.subject,
            text: notice.text,
            apiKey: process.env.RESEND_API_KEY,
            logKind: "fellowship",
            logLabel: "routes",
          }),
      });
      return { ok: true as const, areaLabel: clean.area.label };
    } catch (err) {
      console.error("[fellowship] interest not saved:", err instanceof Error ? err.message : err);
      return {
        ok: false as const,
        error: "We could not take that in. Email lincoln@unitedundergod.org and we will add you.",
      };
    }
  });

async function requireStaff(bearerToken?: string) {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { memberAccess } = await import("./membership.server");
  const access = await memberAccess(getRequest(), bearerToken);
  if (!access.staff) {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}

export type FellowshipDesk = { ready: boolean; threshold: number; areas: FellowshipArea[] };

export const readFellowshipDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<FellowshipDesk> => {
    await requireStaff(context.bearerToken);
    const threshold = fellowshipThreshold();
    try {
      return { ready: true, threshold, areas: await listFellowshipAreas(await getSql(), threshold) };
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      return { ready: false, threshold, areas: [] };
    }
  });

export const startFellowshipGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ areaKey: z.string().max(200), place: z.string().max(400), time: z.string().max(400) }))
  .handler(async ({ data, context }) => {
    await requireStaff(context.bearerToken);
    const ok = await markAreaStarted(await getSql(), data.areaKey, { place: data.place, time: data.time });
    return ok ? { ok: true as const } : { ok: false as const, error: "Give a meeting place and a time." };
  });

/** Email every pastor in a started area the place and time. */
export const emailFellowshipGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ areaKey: z.string().max(200), note: z.string().max(4000).optional().default("") }))
  .handler(async ({ data, context }) => {
    await requireStaff(context.bearerToken);
    const sql = await getSql();
    const areas = await listFellowshipAreas(sql, fellowshipThreshold());
    const area = areas.find((a) => a.key === data.areaKey);
    if (!area || area.status !== "started") {
      return { ok: false as const, error: "Mark the group started with a place and time first." };
    }
    const pastors = await listAreaPastors(sql, area.key);
    const to = pastors.map((p) => p.email).filter((e) => e.includes("@"));
    if (!to.length) return { ok: false as const, error: "No one in this area left an email." };
    const mail = meetupEmail(area, data.note);
    const result = await sendDeskEmails({ inquiryId: `fellowship:${area.key}`, to, ...mail });
    if (result.sent > 0) await markAreaEmailed(sql, area.key);
    return { ok: true as const, sent: result.sent, attempted: result.attempted };
  });
