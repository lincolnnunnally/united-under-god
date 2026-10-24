/**
 * The few Stripe API calls membership needs, over plain fetch (no SDK).
 *
 * Stripe here is LIVE. Tests pass a fake `fetchImpl` and never reach Stripe.
 */
import {
  MEMBER_PRICE_CENTS,
  MEMBER_PRICE_LOOKUP_KEY,
  MEMBER_PRODUCT_NAME,
  STRIPE_METADATA,
} from "./membership.ts";

const API = "https://api.stripe.com/v1";

type Params = Record<string, string | number | boolean | undefined | null>;

export class StripeApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "StripeApiError";
    this.status = status;
  }
}

/** Stripe takes form encoding with bracketed keys, e.g. `line_items[0][price]`. */
export function formEncode(params: Params): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    body.append(key, String(value));
  }
  return body.toString();
}

export function metadataParams(prefix: string, extra: Record<string, string> = {}): Params {
  const out: Params = {};
  for (const [key, value] of Object.entries({ ...STRIPE_METADATA, ...extra })) {
    out[`${prefix}[${key}]`] = value;
  }
  return out;
}

export async function stripeRequest<T = Record<string, unknown>>(args: {
  secretKey: string;
  method: "GET" | "POST";
  path: string;
  params?: Params;
  idempotencyKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<T> {
  const query = args.method === "GET" && args.params ? `?${formEncode(args.params)}` : "";
  const headers: Record<string, string> = { Authorization: `Bearer ${args.secretKey}` };
  if (args.method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (args.idempotencyKey) headers["Idempotency-Key"] = args.idempotencyKey;
  const res = await (args.fetchImpl ?? fetch)(`${API}${args.path}${query}`, {
    method: args.method,
    headers,
    body: args.method === "POST" ? formEncode(args.params ?? {}) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!res.ok) {
    throw new StripeApiError(res.status, json?.error?.message || `Stripe answered ${res.status}`);
  }
  return json;
}

const priceCache = globalThis as typeof globalThis & { __uugMemberPriceId__?: string };

/**
 * The recurring monthly price. STRIPE_MEMBER_PRICE_ID wins; otherwise find
 * the price by lookup key, and create it ($20/month) on first use.
 */
export async function ensureMemberPrice(args: {
  secretKey: string;
  priceId: string | null;
  fetchImpl?: typeof fetch;
  cache?: boolean;
}): Promise<string> {
  if (args.priceId) return args.priceId;
  const useCache = args.cache !== false;
  if (useCache && priceCache.__uugMemberPriceId__) return priceCache.__uugMemberPriceId__;
  const found = await stripeRequest<{ data: { id: string; unit_amount: number; recurring?: { interval?: string } }[] }>({
    secretKey: args.secretKey,
    method: "GET",
    path: "/prices",
    params: { "lookup_keys[]": MEMBER_PRICE_LOOKUP_KEY, active: true, limit: 1 },
    fetchImpl: args.fetchImpl,
  });
  let id = found.data?.[0]?.id;
  if (!id) {
    const created = await stripeRequest<{ id: string }>({
      secretKey: args.secretKey,
      method: "POST",
      path: "/prices",
      params: {
        currency: "usd",
        unit_amount: MEMBER_PRICE_CENTS,
        "recurring[interval]": "month",
        lookup_key: MEMBER_PRICE_LOOKUP_KEY,
        "product_data[name]": MEMBER_PRODUCT_NAME,
        ...metadataParams("metadata"),
      },
      // Two first visitors at once must not make two prices.
      idempotencyKey: `uug-member-price-${MEMBER_PRICE_LOOKUP_KEY}`,
      fetchImpl: args.fetchImpl,
    });
    id = created.id;
  }
  if (useCache) priceCache.__uugMemberPriceId__ = id;
  return id;
}

/** A hosted Checkout session for one church's monthly membership. */
export async function createMemberCheckout(args: {
  secretKey: string;
  priceId: string;
  userId: string;
  email: string;
  customerId: string;
  churchName: string;
  siteUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<{ id: string; url: string }> {
  const extra = { user_id: args.userId, church: args.churchName.slice(0, 450) };
  const session = await stripeRequest<{ id: string; url: string }>({
    secretKey: args.secretKey,
    method: "POST",
    path: "/checkout/sessions",
    params: {
      mode: "subscription",
      "line_items[0][price]": args.priceId,
      "line_items[0][quantity]": 1,
      client_reference_id: args.userId,
      ...(args.customerId ? { customer: args.customerId } : { customer_email: args.email }),
      success_url: `${args.siteUrl}/membership/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${args.siteUrl}/membership?checkout=canceled`,
      ...metadataParams("metadata", extra),
      ...metadataParams("subscription_data[metadata]", extra),
    },
    fetchImpl: args.fetchImpl,
  });
  return { id: session.id, url: session.url };
}

/** The Stripe customer portal, where a church updates its card or cancels. */
export async function createBillingPortal(args: {
  secretKey: string;
  customerId: string;
  returnUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<{ url: string }> {
  const portal = await stripeRequest<{ url: string }>({
    secretKey: args.secretKey,
    method: "POST",
    path: "/billing_portal/sessions",
    params: { customer: args.customerId, return_url: args.returnUrl },
    fetchImpl: args.fetchImpl,
  });
  return { url: portal.url };
}

/** Read a finished checkout session back (the welcome page). */
export async function readCheckoutSession(args: {
  secretKey: string;
  sessionId: string;
  fetchImpl?: typeof fetch;
}) {
  return stripeRequest<{
    id: string;
    client_reference_id: string | null;
    customer: string | null;
    subscription: string | null;
    status: string;
    payment_status: string;
    mode: string;
  }>({
    secretKey: args.secretKey,
    method: "GET",
    path: `/checkout/sessions/${encodeURIComponent(args.sessionId)}`,
    fetchImpl: args.fetchImpl,
  });
}
