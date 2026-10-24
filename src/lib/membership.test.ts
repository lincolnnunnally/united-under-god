import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import { test } from "node:test";
import {
  MEMBER_PRICE_CENTS,
  MEMBER_PRICE_LOOKUP_KEY,
  entriesForViewer,
  hasMemberAccess,
  lockEntry,
  safeNextPath,
  statusFromStripe,
  stripeConfig,
  stripeSignatureHeader,
  verifyStripeSignature,
  type GateableEntry,
} from "./membership.ts";
import { createMemberCheckout, ensureMemberPrice, formEncode } from "./stripe-api.ts";

const hmacHex = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload, "utf8").digest("hex");
const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const SECRET = "whsec_test_only";
const NOW = 1_800_000_000;

function entry(overrides: Partial<GateableEntry> = {}): GateableEntry {
  return {
    id: "book-1",
    title: "Black toner, 58A",
    vendorName: "Acme Office Supply (555) 010-2000 sales@acme.example",
    unitPrice: "61.25",
    unit: "each",
    quantity: "10",
    notes: "Call Dana at Acme for net-30 terms",
    category: "office-supplies",
    catalogItem: "toner",
    publishedAt: "2026-10-01T00:00:00.000Z",
    covenant: true,
    vendorId: "vendor-42",
    vendorEmail: "dana@acme.example",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// The member gate, server side
// ---------------------------------------------------------------------------

test("a non-member never receives the vendor, the price, notes, or vendor standing", () => {
  const [locked] = entriesForViewer([entry()], false);
  const wire = JSON.stringify(locked);
  for (const secret of ["Acme", "61.25", "555", "acme.example", "Dana", "net-30", "vendor-42"]) {
    assert.ok(!wire.includes(secret), `leaked ${secret}: ${wire}`);
  }
  assert.equal(locked.locked, true);
  assert.equal(locked.covenant, false);
  // What was priced stays public, so the catalog can say "Group price".
  assert.equal(locked.title, "Black toner, 58A");
  assert.equal(locked.catalogItem, "toner");
  assert.equal(locked.category, "office-supplies");
});

test("fields added to the book later are withheld by default (allow-list)", () => {
  const locked = lockEntry(entry({ brochureUrl: "https://acme.example/brochure.pdf", rating: 4.8 }));
  assert.ok(!("brochureUrl" in locked));
  assert.ok(!("rating" in locked));
});

test("a member church receives the entries untouched", () => {
  const original = [entry()];
  assert.deepEqual(entriesForViewer(original, true), original);
});

test("access: active and past_due (Stripe retrying) only", () => {
  assert.equal(hasMemberAccess("active"), true);
  assert.equal(hasMemberAccess("past_due"), true);
  for (const status of ["pending", "canceled", "none", "", null, undefined]) {
    assert.equal(hasMemberAccess(status), false, String(status));
  }
});

test("Stripe subscription statuses map onto ours", () => {
  assert.equal(statusFromStripe("active"), "active");
  assert.equal(statusFromStripe("trialing"), "active");
  assert.equal(statusFromStripe("past_due"), "past_due");
  assert.equal(statusFromStripe("unpaid"), "canceled");
  assert.equal(statusFromStripe("canceled"), "canceled");
  assert.equal(statusFromStripe("incomplete_expired"), "canceled");
  assert.equal(statusFromStripe("incomplete"), "pending");
  assert.equal(statusFromStripe("paused"), "pending");
});

// ---------------------------------------------------------------------------
// Dormant until the keys exist
// ---------------------------------------------------------------------------

test("membership is dormant without both Stripe keys", () => {
  assert.deepEqual(stripeConfig({}), { ready: false });
  assert.deepEqual(stripeConfig({ STRIPE_SECRET_KEY: "sk_x" }), { ready: false });
  assert.deepEqual(stripeConfig({ STRIPE_WEBHOOK_SECRET: "whsec_x" }), { ready: false });
  assert.deepEqual(stripeConfig({ STRIPE_SECRET_KEY: "  ", STRIPE_WEBHOOK_SECRET: "whsec_x" }), {
    ready: false,
  });
  assert.deepEqual(stripeConfig({ STRIPE_SECRET_KEY: "sk_x", STRIPE_WEBHOOK_SECRET: "whsec_x" }), {
    ready: true,
    secretKey: "sk_x",
    webhookSecret: "whsec_x",
    priceId: null,
  });
  const withPrice = stripeConfig({
    STRIPE_SECRET_KEY: "sk_x",
    STRIPE_WEBHOOK_SECRET: "whsec_x",
    STRIPE_MEMBER_PRICE_ID: "price_123",
  });
  assert.equal(withPrice.ready && withPrice.priceId, "price_123");
});

// ---------------------------------------------------------------------------
// Webhook signature
// ---------------------------------------------------------------------------

test("a correctly signed payload verifies", () => {
  const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated" });
  const header = stripeSignatureHeader({ payload, secret: SECRET, timestamp: NOW, hmacHex });
  assert.equal(verifyStripeSignature({ payload, header, secret: SECRET, hmacHex, safeEqual, nowSeconds: NOW }), true);
});

test("a wrong secret, an edited body, a stale timestamp, or no header is refused", () => {
  const payload = '{"id":"evt_1"}';
  const header = stripeSignatureHeader({ payload, secret: SECRET, timestamp: NOW, hmacHex });
  const check = (over: Partial<Parameters<typeof verifyStripeSignature>[0]>) =>
    verifyStripeSignature({ payload, header, secret: SECRET, hmacHex, safeEqual, nowSeconds: NOW, ...over });
  assert.equal(check({ secret: "whsec_other" }), false);
  assert.equal(check({ payload: '{"id":"evt_2"}' }), false);
  assert.equal(check({ nowSeconds: NOW + 301 }), false);
  assert.equal(check({ header: null }), false);
  assert.equal(check({ header: "" }), false);
  assert.equal(check({ header: `t=${NOW}` }), false);
  assert.equal(check({ header: `v1=${hmacHex(SECRET, `${NOW}.${payload}`)}` }), false);
  assert.equal(check({ header: `t=abc,v1=${hmacHex(SECRET, `abc.${payload}`)}` }), false);
});

test("any one matching v1 signature is enough (secret rotation)", () => {
  const payload = '{"id":"evt_1"}';
  const good = hmacHex(SECRET, `${NOW}.${payload}`);
  const header = `t=${NOW},v1=${"0".repeat(64)},v1=${good},v0=ignored`;
  assert.equal(verifyStripeSignature({ payload, header, secret: SECRET, hmacHex, safeEqual, nowSeconds: NOW }), true);
});

// ---------------------------------------------------------------------------
// Stripe API calls (fake fetch only: Stripe here is LIVE)
// ---------------------------------------------------------------------------

type Call = { url: string; method: string; body: string; headers: Record<string, string> };

function fakeStripe(responses: unknown[]) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: String(init.method),
      body: String(init.body ?? ""),
      headers: init.headers as Record<string, string>,
    });
    const next = responses.shift() ?? {};
    return new Response(JSON.stringify(next), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

test("STRIPE_MEMBER_PRICE_ID is used as-is, with no API call", async () => {
  const { calls, fetchImpl } = fakeStripe([]);
  assert.equal(await ensureMemberPrice({ secretKey: "sk_x", priceId: "price_set", fetchImpl, cache: false }), "price_set");
  assert.equal(calls.length, 0);
});

test("the price is found by lookup key, and created ($20/month) only when missing", async () => {
  const found = fakeStripe([{ data: [{ id: "price_found", unit_amount: 2000 }] }]);
  assert.equal(
    await ensureMemberPrice({ secretKey: "sk_x", priceId: null, fetchImpl: found.fetchImpl, cache: false }),
    "price_found",
  );
  assert.equal(found.calls.length, 1);
  assert.match(decodeURIComponent(found.calls[0].url), new RegExp(`lookup_keys\\[\\]=${MEMBER_PRICE_LOOKUP_KEY}`));

  const created = fakeStripe([{ data: [] }, { id: "price_new" }]);
  assert.equal(
    await ensureMemberPrice({ secretKey: "sk_x", priceId: null, fetchImpl: created.fetchImpl, cache: false }),
    "price_new",
  );
  const body = new URLSearchParams(created.calls[1].body);
  assert.equal(created.calls[1].method, "POST");
  assert.equal(body.get("unit_amount"), String(MEMBER_PRICE_CENTS));
  assert.equal(body.get("currency"), "usd");
  assert.equal(body.get("recurring[interval]"), "month");
  assert.equal(body.get("lookup_key"), MEMBER_PRICE_LOOKUP_KEY);
  assert.equal(body.get("metadata[app]"), "united-under-god");
  assert.ok(created.calls[1].headers["Idempotency-Key"]);
});

test("checkout is a subscription tied to the account, tagged for the owner desk", async () => {
  const { calls, fetchImpl } = fakeStripe([{ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }]);
  const session = await createMemberCheckout({
    secretKey: "sk_x",
    priceId: "price_1",
    userId: "user-1",
    email: "pastor@church.example",
    customerId: "",
    churchName: "Grace Chapel",
    siteUrl: "https://www.unitedundergod.org",
    fetchImpl,
  });
  assert.equal(session.url, "https://checkout.stripe.com/c/pay/cs_test_1");
  const body = new URLSearchParams(calls[0].body);
  assert.equal(calls[0].url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(body.get("mode"), "subscription");
  assert.equal(body.get("line_items[0][price]"), "price_1");
  assert.equal(body.get("client_reference_id"), "user-1");
  assert.equal(body.get("customer_email"), "pastor@church.example");
  assert.equal(body.get("metadata[app]"), "united-under-god");
  assert.equal(body.get("subscription_data[metadata][user_id]"), "user-1");
  assert.equal(
    body.get("success_url"),
    "https://www.unitedundergod.org/membership/welcome?session_id={CHECKOUT_SESSION_ID}",
  );
});

test("form encoding drops empty values", () => {
  assert.equal(formEncode({ a: "1", b: "", c: undefined, d: null, e: 0 }), "a=1&e=0");
});

test("only same-site paths are a post-sign-in destination", () => {
  assert.equal(safeNextPath("/membership#become"), "/membership#become");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "membership", "", null]) {
    assert.equal(safeNextPath(bad), null, String(bad));
  }
});
