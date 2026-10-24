import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { stripeConfig, entriesForViewer } from "@/lib/membership";
import {
  applyStripeEvent,
  cleanChurchDetails,
  isMissingTable,
  listMemberChurches,
  readMemberChurch,
  saveChurchDetails,
  setStripeCustomer,
  type MemberChurch,
} from "@/lib/membership-store";
import {
  createBillingPortal,
  createMemberCheckout,
  ensureMemberPrice,
  readCheckoutSession,
} from "@/lib/stripe-api";
import { readBuyingBook, readBuyingCatalog, type BuyingCatalogRead } from "@/lib/source-store";
import type { PublicBookEntry } from "@/lib/source-store";

/** A buying-book entry as a viewer receives it; `locked` means vendor and price were withheld. */
export type ViewerBookEntry = PublicBookEntry & { locked?: boolean };
import { SITE_URL } from "@/lib/seo";

/**
 * Optional viewer for public pages: forwards the live-preview bearer token
 * like `authMiddleware`, but a signed-out visitor is allowed through (as a
 * non-member) instead of rejected.
 */
export const viewerMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("./auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { memberAccess } = await import("./membership.server");
    const access = await memberAccess(getRequest(), context.bearerToken);
    return next({ context: { access } });
  });

async function viewerAccess(bearerToken?: string) {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { memberAccess } = await import("./membership.server");
  return memberAccess(getRequest(), bearerToken);
}

// ---------------------------------------------------------------------------
// The member gate for the buying pages (server side)
// ---------------------------------------------------------------------------

/**
 * /buying/<category>: the published book with vendor names, prices, notes,
 * and vendor standing removed unless the viewer is a member church (or
 * staff). The withheld fields never leave the server.
 */
export const listCatalogBookForViewer = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .handler(
    async ({ context }): Promise<Omit<BuyingCatalogRead, "entries"> & { entries: ViewerBookEntry[]; member: boolean }> => {
    const read = await readBuyingCatalog(() => getSql());
    const member = context.access.canView;
    return { ...read, entries: entriesForViewer(read.entries, member), member };
  },
  );

/** /buying: the same gate on the published book. */
export const listPublishedBookForViewer = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .handler(
    async ({ context }): Promise<{ entries: ViewerBookEntry[]; unavailable: boolean; member: boolean }> => {
      const read = await readBuyingBook(() => getSql());
      const member = context.access.canView;
      return { ...read, entries: entriesForViewer(read.entries, member), member };
    },
  );

// ---------------------------------------------------------------------------
// /membership
// ---------------------------------------------------------------------------

export type MembershipView = {
  /** Stripe keys are set: checkout is open. False shows "Membership opens soon". */
  open: boolean;
  signedIn: boolean;
  member: boolean;
  staff: boolean;
  church: MemberChurch | null;
  /** migrations/0011 is not applied yet. */
  notReady: boolean;
};

/** Public: what /membership, /account, and /fellowship show this viewer. */
export const readMembership = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .handler(async ({ context }): Promise<MembershipView> => {
    const { access } = context;
    const open = stripeConfig().ready;
    const base = { open, signedIn: Boolean(access.userId), member: access.member, staff: access.staff };
    if (!access.userId) return { ...base, church: null, notReady: false };
    try {
      const church = await readMemberChurch(await getSql(), access.userId);
      return { ...base, church, notReady: false };
    } catch (err) {
      if (!isMissingTable(err) && !(err instanceof Error && err.name === "DbUnavailableError")) throw err;
      return { ...base, church: null, notReady: true };
    }
  });

const churchInput = z.object({
  churchName: z.string().max(400),
  contactName: z.string().max(400),
  email: z.string().max(400),
  phone: z.string().max(100).optional().default(""),
  address: z.string().max(400).optional().default(""),
  city: z.string().max(200),
  state: z.string().max(100),
  zip: z.string().max(40).optional().default(""),
  website: z.string().max(400).optional().default(""),
});

export const saveMyChurch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(churchInput)
  .handler(async ({ data, context }) => {
    const clean = cleanChurchDetails(data);
    if ("error" in clean) return { ok: false as const, error: clean.error };
    const church = await saveChurchDetails(await getSql(), context.userId, clean);
    return { ok: true as const, church };
  });

/** Signed in, details saved, keys set: a Stripe Checkout URL to send the church to. */
export const startMemberCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const config = stripeConfig();
    if (!config.ready) {
      return { ok: false as const, error: "Membership opens soon. Tell us you’re interested and we will write." };
    }
    const sql = await getSql();
    const church = await readMemberChurch(sql, context.userId);
    if (!church) return { ok: false as const, error: "Add your church’s details first." };
    if (church.status === "active" || church.status === "past_due") {
      return { ok: false as const, error: "Your church is already a member. Manage billing below." };
    }
    try {
      const priceId = await ensureMemberPrice({ secretKey: config.secretKey, priceId: config.priceId });
      const session = await createMemberCheckout({
        secretKey: config.secretKey,
        priceId,
        userId: context.userId,
        email: church.email,
        customerId: church.stripeCustomerId,
        churchName: church.churchName,
        siteUrl: SITE_URL,
      });
      return { ok: true as const, url: session.url };
    } catch (err) {
      console.error("[membership] checkout failed:", err instanceof Error ? err.message : err);
      return { ok: false as const, error: "Payment could not start just now. Please try again in a minute." };
    }
  });

/** The Stripe customer portal for the signed-in church. */
export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const config = stripeConfig();
    if (!config.ready) return { ok: false as const, error: "Billing is not open yet." };
    const church = await readMemberChurch(await getSql(), context.userId);
    if (!church?.stripeCustomerId) return { ok: false as const, error: "There is no billing on file yet." };
    try {
      const portal = await createBillingPortal({
        secretKey: config.secretKey,
        customerId: church.stripeCustomerId,
        returnUrl: `${SITE_URL}/membership`,
      });
      return { ok: true as const, url: portal.url };
    } catch (err) {
      console.error("[membership] portal failed:", err instanceof Error ? err.message : err);
      return { ok: false as const, error: "Billing could not open just now. Please try again in a minute." };
    }
  });

/**
 * The welcome page reads its checkout session back so the church sees its
 * membership right away, even if the webhook is a few seconds behind. Only
 * the session's own account can confirm it, and it applies as the oldest
 * possible event, so it never overrides a status a webhook already set.
 */
export const confirmMemberCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ sessionId: z.string().regex(/^cs_[A-Za-z0-9_]+$/).max(255) }))
  .handler(async ({ data, context }) => {
    const config = stripeConfig();
    const sql = await getSql();
    if (config.ready) {
      try {
        const session = await readCheckoutSession({ secretKey: config.secretKey, sessionId: data.sessionId });
        if (session.client_reference_id === context.userId && session.mode === "subscription") {
          if (session.customer) await setStripeCustomer(sql, context.userId, session.customer);
          await applyStripeEvent(sql, {
            id: `confirm:${session.id}`,
            type: "checkout.session.completed",
            created: 0,
            data: { object: session as unknown as Record<string, unknown> },
          });
        }
      } catch (err) {
        console.error("[membership] confirm failed:", err instanceof Error ? err.message : err);
      }
    }
    return { church: await readMemberChurch(sql, context.userId) };
  });

/** Staff: every church that started or finished signing up. */
export const listMemberChurchesForDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const access = await viewerAccess(context.bearerToken);
    if (!access.staff) {
      const err = new Error("Forbidden");
      (err as Error & { status?: number }).status = 403;
      throw err;
    }
    try {
      return { ready: true, churches: await listMemberChurches(await getSql()) };
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      return { ready: false, churches: [] as MemberChurch[] };
    }
  });
