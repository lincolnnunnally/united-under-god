/**
 * Member churches: the paid program ($20 a month, per church).
 *
 * Pure, dependency-free pieces shared by the server functions, the Stripe
 * webhook, the pages, and the tests (`node --experimental-strip-types`), so
 * no `@/` imports here.
 */

/** The price, stated once. Pages print MEMBER_PRICE_LABEL; Stripe gets the cents. */
export const MEMBER_PRICE_CENTS = 2000;
export const MEMBER_PRICE_LABEL = "$20 a month, per church";
/** Stripe price lookup key used when STRIPE_MEMBER_PRICE_ID is not set. */
export const MEMBER_PRICE_LOOKUP_KEY = "uug_member_church_monthly";
export const MEMBER_PRODUCT_NAME = "United Under God member church";

/** Stripe metadata so the owner desk can attribute the money (AGENTS.project.md rule 4). */
export const APP_SLUG = "united-under-god";
export const STRIPE_METADATA = { app: APP_SLUG, app_slug: APP_SLUG, program: "member-church" };

export type MemberStatus = "none" | "pending" | "active" | "past_due" | "canceled";

/** What a member church receives. One list, used by /membership, /account, and the gate. */
export const MEMBER_BENEFITS = [
  {
    title: "The full buying catalogs",
    body: "Vendor contacts, awarded group prices, brochures, reviews from other churches, and a direct “Request a quote” line to the vendor.",
  },
  {
    title: "A church website, included",
    body: "A website for your church on a unitedundergod.org address, built and kept up for you. Ask for it once you are a member.",
  },
  {
    title: "Pastor fellowship",
    body: "Pastors often lead alone. When enough pastors near you are in, we start a weekly coffee meetup.",
  },
  {
    title: "Help when a vendor falls short",
    body: "If a program vendor doesn’t make it right, report it. We will hear it and see it through.",
  },
] as const;

/** Statuses that can see member content. past_due keeps access while Stripe retries the card. */
export function hasMemberAccess(status: string | null | undefined): boolean {
  return status === "active" || status === "past_due";
}

/**
 * Stripe subscription status -> our membership status.
 * https://docs.stripe.com/api/subscriptions/object#subscription_object-status
 */
export function statusFromStripe(subscriptionStatus: string): Exclude<MemberStatus, "none"> {
  switch (subscriptionStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      // incomplete, paused, anything new: not paid yet.
      return "pending";
  }
}

export type StripeEnv = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_MEMBER_PRICE_ID?: string;
};

export type StripeConfig =
  | { ready: false }
  | { ready: true; secretKey: string; webhookSecret: string; priceId: string | null };

/**
 * Membership is dormant until both keys exist. Checkout without the webhook
 * secret would take money and never mark the church a member, so one key alone
 * is still dormant.
 */
export function stripeConfig(env: StripeEnv = process.env as StripeEnv): StripeConfig {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secretKey || !webhookSecret) return { ready: false };
  return { ready: true, secretKey, webhookSecret, priceId: env.STRIPE_MEMBER_PRICE_ID?.trim() || null };
}

// ---------------------------------------------------------------------------
// The member gate (server side): what a non-member may receive
// ---------------------------------------------------------------------------

/**
 * A published buying-book entry, as the catalog pages read it. `locked` marks
 * an entry whose vendor and price were withheld because the viewer is not a
 * member church.
 */
export type GateableEntry = {
  id: string;
  title: string;
  vendorName: string;
  unitPrice: string;
  unit: string;
  quantity: string;
  notes: string;
  category: string;
  catalogItem: string;
  covenant?: boolean;
  locked?: boolean;
  [key: string]: unknown;
};

/** Fields a non-member may receive: what was priced, never by whom or for how much. */
const OPEN_FIELDS = ["id", "title", "unit", "quantity", "category", "catalogItem", "publishedAt"];

/**
 * Strip vendor, price, notes, and vendor standing from one entry. Built from
 * an allow-list, so a field added to the book later is withheld by default.
 */
export function lockEntry<T extends GateableEntry>(entry: T): T {
  const open: Record<string, unknown> = {};
  for (const key of OPEN_FIELDS) if (key in entry) open[key] = entry[key];
  return {
    ...open,
    vendorName: "",
    unitPrice: "",
    notes: "",
    covenant: false,
    locked: true,
  } as unknown as T;
}

/** Entries for a viewer: untouched for a member church, locked otherwise. */
export function entriesForViewer<T extends GateableEntry>(entries: T[], member: boolean): T[] {
  return member ? entries : entries.map(lockEntry);
}

// ---------------------------------------------------------------------------
// Stripe webhook signature (https://docs.stripe.com/webhooks#verify-manually)
// ---------------------------------------------------------------------------

export const SIGNATURE_TOLERANCE_SECONDS = 300;

export type HmacHex = (secret: string, payload: string) => string;
export type SafeEqual = (a: string, b: string) => boolean;

/**
 * Verify a `Stripe-Signature` header against the raw body. Returns false for
 * a missing, malformed, stale, or wrong signature. The HMAC and the
 * constant-time compare are passed in so this file stays free of node imports.
 */
export function verifyStripeSignature(args: {
  payload: string;
  header: string | null;
  secret: string;
  hmacHex: HmacHex;
  safeEqual: SafeEqual;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  if (!args.header || !args.secret) return false;
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of args.header.split(",")) {
    const [key, value] = part.split("=", 2).map((s) => s?.trim() ?? "");
    if (key === "t") timestamp = value;
    if (key === "v1" && value) signatures.push(value);
  }
  if (!/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = args.toleranceSeconds ?? SIGNATURE_TOLERANCE_SECONDS;
  if (Math.abs(now - Number(timestamp)) > tolerance) return false;
  const expected = args.hmacHex(args.secret, `${timestamp}.${args.payload}`);
  return signatures.some((sig) => sig.length === expected.length && args.safeEqual(sig, expected));
}

/** The header Stripe sends, for tests and local tooling. */
export function stripeSignatureHeader(args: {
  payload: string;
  secret: string;
  timestamp: number;
  hmacHex: HmacHex;
}): string {
  return `t=${args.timestamp},v1=${args.hmacHex(args.secret, `${args.timestamp}.${args.payload}`)}`;
}

/** Only same-site paths may be a post-sign-in destination. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
