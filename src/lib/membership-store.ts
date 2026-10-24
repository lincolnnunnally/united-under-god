/**
 * Member church rows and Stripe webhook events (migrations/0011_church_membership.sql).
 *
 * Every function takes the `Sql` surface, so tests run against PGLite with the
 * real migration and production runs against Supabase LPL Postgres.
 */
import type { Sql } from "./db.ts";
import { hasMemberAccess, statusFromStripe, type MemberStatus } from "./membership.ts";

export type MemberChurch = {
  userId: string;
  churchName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  status: MemberStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodEnd: string;
  memberSince: string;
  createdAt: string;
};

export type ChurchDetailsInput = {
  churchName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
};

const text = (value: unknown) => (value == null ? "" : String(value));
const iso = (value: unknown) =>
  value instanceof Date ? value.toISOString() : value == null ? "" : String(value);

function mapChurch(row: Record<string, unknown>): MemberChurch {
  return {
    userId: text(row.user_id),
    churchName: text(row.church_name),
    contactName: text(row.contact_name),
    email: text(row.email),
    phone: text(row.phone),
    address: text(row.address),
    city: text(row.city),
    state: text(row.state),
    zip: text(row.zip),
    website: text(row.website),
    status: (text(row.status) || "pending") as MemberStatus,
    stripeCustomerId: text(row.stripe_customer_id),
    stripeSubscriptionId: text(row.stripe_subscription_id),
    currentPeriodEnd: iso(row.current_period_end),
    memberSince: iso(row.member_since),
    createdAt: iso(row.created_at),
  };
}

/** 42P01: migrations/0011 is not applied yet. */
export function isMissingTable(err: unknown) {
  return Boolean(err && typeof err === "object" && "code" in err && String(err.code) === "42P01");
}

export async function readMemberChurch(sql: Sql, userId: string): Promise<MemberChurch | null> {
  const rows = await sql`select * from uug_member_churches where user_id = ${userId}`;
  return rows[0] ? mapChurch(rows[0]) : null;
}

/** The server-side member check: an active (or past-due, still retrying) member church. */
export async function isMemberUser(sql: Sql, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const rows = await sql<{ status: string }>`
    select status from uug_member_churches where user_id = ${userId}
  `;
  return hasMemberAccess(rows[0]?.status);
}

export function cleanChurchDetails(input: ChurchDetailsInput): ChurchDetailsInput | { error: string } {
  const clip = (value: string, max = 200) => (value ?? "").trim().slice(0, max);
  const out: ChurchDetailsInput = {
    churchName: clip(input.churchName),
    contactName: clip(input.contactName),
    email: clip(input.email).toLowerCase(),
    phone: clip(input.phone, 40),
    address: clip(input.address),
    city: clip(input.city, 100),
    state: clip(input.state, 40).toUpperCase(),
    zip: clip(input.zip, 10),
    website: clip(input.website),
  };
  if (!out.churchName) return { error: "Please give the church’s name." };
  if (!out.contactName) return { error: "Please give a contact name." };
  if (!out.email.includes("@")) return { error: "Please give an email we can reach." };
  if (!out.city || !out.state) return { error: "Please give the church’s city and state." };
  return out;
}

/** Save the church's details. Never touches status or Stripe ids. */
export async function saveChurchDetails(
  sql: Sql,
  userId: string,
  details: ChurchDetailsInput,
): Promise<MemberChurch> {
  await sql`
    insert into uug_member_churches (
      user_id, church_name, contact_name, email, phone, address, city, state, zip, website
    ) values (
      ${userId}, ${details.churchName}, ${details.contactName}, ${details.email},
      ${details.phone}, ${details.address}, ${details.city}, ${details.state},
      ${details.zip}, ${details.website}
    )
    on conflict (user_id) do update set
      church_name = excluded.church_name,
      contact_name = excluded.contact_name,
      email = excluded.email,
      phone = excluded.phone,
      address = excluded.address,
      city = excluded.city,
      state = excluded.state,
      zip = excluded.zip,
      website = excluded.website,
      updated_at = now()
  `;
  return (await readMemberChurch(sql, userId)) as MemberChurch;
}

export async function setStripeCustomer(sql: Sql, userId: string, customerId: string) {
  await sql`
    update uug_member_churches set stripe_customer_id = ${customerId}, updated_at = now()
    where user_id = ${userId}
  `;
}

export async function listMemberChurches(sql: Sql): Promise<MemberChurch[]> {
  const rows = await sql`select * from uug_member_churches order by created_at desc`;
  return rows.map(mapChurch);
}

// ---------------------------------------------------------------------------
// Stripe webhook events
// ---------------------------------------------------------------------------

/** The slice of a Stripe event this program reads. */
export type StripeEvent = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

export type ApplyResult =
  | { applied: true; userId: string; status: MemberStatus }
  | { applied: false; reason: "duplicate" | "ignored" | "no-church" | "stale" };

function idOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return text((value as { id: unknown }).id);
  return "";
}

function metadataUser(object: Record<string, unknown>): string {
  const meta = object.metadata;
  if (meta && typeof meta === "object" && "user_id" in meta) return text((meta as { user_id: unknown }).user_id);
  return "";
}

/** current_period_end moved onto subscription items in newer API versions; read either. */
function periodEnd(subscription: Record<string, unknown>): string | null {
  let seconds = Number(subscription.current_period_end ?? 0);
  const items = subscription.items as { data?: { current_period_end?: number }[] } | undefined;
  if (!seconds && items?.data?.length) seconds = Number(items.data[0]?.current_period_end ?? 0);
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

/** Which church an event is about: subscription id, then customer id, then our user id. */
async function findChurch(
  sql: Sql,
  ids: { subscriptionId: string; customerId: string; userId: string },
): Promise<string | null> {
  if (ids.subscriptionId) {
    const rows = await sql<{ user_id: string }>`
      select user_id from uug_member_churches where stripe_subscription_id = ${ids.subscriptionId}
    `;
    if (rows[0]) return rows[0].user_id;
  }
  if (ids.userId) {
    const rows = await sql<{ user_id: string }>`
      select user_id from uug_member_churches where user_id = ${ids.userId}
    `;
    if (rows[0]) return rows[0].user_id;
  }
  if (ids.customerId) {
    const rows = await sql<{ user_id: string }>`
      select user_id from uug_member_churches where stripe_customer_id = ${ids.customerId}
      order by updated_at desc limit 1
    `;
    if (rows[0]) return rows[0].user_id;
  }
  return null;
}

async function alreadyProcessed(sql: Sql, eventId: string) {
  const rows = await sql`select id from uug_stripe_events where id = ${eventId}`;
  return rows.length > 0;
}

async function markProcessed(sql: Sql, event: StripeEvent) {
  await sql`
    insert into uug_stripe_events (id, type) values (${event.id}, ${event.type})
    on conflict (id) do nothing
  `;
}

/**
 * Apply one verified Stripe event. Idempotent twice over: a redelivered event
 * id is skipped (uug_stripe_events), and an event older than the last one applied
 * to that church never overwrites a newer status (stripe_event_at). The event
 * is recorded only after it applies, so a failure is retried by Stripe.
 */
export async function applyStripeEvent(sql: Sql, event: StripeEvent): Promise<ApplyResult> {
  if (await alreadyProcessed(sql, event.id)) return { applied: false, reason: "duplicate" };
  if (!(HANDLED_EVENTS as readonly string[]).includes(event.type)) {
    await markProcessed(sql, event);
    return { applied: false, reason: "ignored" };
  }
  const object = event.data.object;
  const created = Math.floor(Number(event.created) || 0);

  let status: Exclude<MemberStatus, "none">;
  let subscriptionId: string;
  let customerId = idOf(object.customer);
  let userId = metadataUser(object);
  let end: string | null = null;

  if (event.type === "checkout.session.completed") {
    if (text(object.mode) !== "subscription") {
      await markProcessed(sql, event);
      return { applied: false, reason: "ignored" };
    }
    subscriptionId = idOf(object.subscription);
    userId = text(object.client_reference_id) || userId;
    customerId = customerId || "";
    // "paid" for a card; "no_payment_required" for a 100%-off code. Anything
    // else (an async payment still clearing) waits for the subscription event.
    const paid = ["paid", "no_payment_required"].includes(text(object.payment_status));
    status = paid ? "active" : "pending";
  } else {
    subscriptionId = text(object.id);
    status =
      event.type === "customer.subscription.deleted" ? "canceled" : statusFromStripe(text(object.status));
    end = periodEnd(object);
  }

  const church = await findChurch(sql, { subscriptionId, customerId, userId });
  if (!church) {
    // Not ours to record (or a church row that was never made). Record it so a
    // retry storm does not follow; the owner sees the payment in Stripe.
    console.error(`[membership] stripe event ${event.type} matched no church`);
    await markProcessed(sql, event);
    return { applied: false, reason: "no-church" };
  }

  const rows = await sql<{ status: string; stripe_event_at: number }>`
    select status, stripe_event_at from uug_member_churches where user_id = ${church}
  `;
  const current = rows[0];
  if (current && Number(current.stripe_event_at) > created) {
    // A newer event already set this church's status. Ids still fill in.
    await sql`
      update uug_member_churches set
        stripe_customer_id = case when stripe_customer_id = '' then ${customerId} else stripe_customer_id end,
        stripe_subscription_id = case when stripe_subscription_id = '' then ${subscriptionId} else stripe_subscription_id end,
        updated_at = now()
      where user_id = ${church}
    `;
    await markProcessed(sql, event);
    return { applied: false, reason: "stale" };
  }
  // checkout "pending" must not demote a church a subscription event already activated.
  if (event.type === "checkout.session.completed" && status === "pending" && current) {
    status = current.status as Exclude<MemberStatus, "none">;
  }

  await sql`
    update uug_member_churches set
      status = ${status},
      stripe_customer_id = case when ${customerId} = '' then stripe_customer_id else ${customerId} end,
      stripe_subscription_id = case when ${subscriptionId} = '' then stripe_subscription_id else ${subscriptionId} end,
      current_period_end = coalesce(${end}::timestamptz, current_period_end),
      stripe_event_at = ${created},
      member_since = case when ${status} = 'active' and member_since is null then now() else member_since end,
      updated_at = now()
    where user_id = ${church}
  `;
  await markProcessed(sql, event);
  return { applied: true, userId: church, status };
}
