import { createHash, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { inquirySubject, kindLabel } from "@/lib/desk";

export const APP_SLUG = "united-under-god";
export const APP_NAME = "United Under God";
export const PUBLIC_URL = "https://unitedundergod.org";
export const ADMIN_URL = `${PUBLIC_URL}/admin`;
export const DASHBOARD_ORIGIN = "https://dashboard.unitedundergod.org";
export const INBOX_URL =
  process.env.APP_ENGINE_INBOX_URL?.trim() ||
  `${DASHBOARD_ORIGIN}/api/engine/inbox`;

export type OpsActivity = {
  sealsWaiting: number;
  foodWaiting: number;
  goodsWaiting: number;
  volunteersWaiting: number;
  buyingWaiting: number;
  otherWaiting: number;
  inquiries30d: number;
};

export type OpsStats = {
  ok: true;
  reporting: true;
  app: typeof APP_SLUG;
  appName: typeof APP_NAME;
  publicUrl: typeof PUBLIC_URL;
  adminUrl: typeof ADMIN_URL;
  users: number;
  ticketsOpen: number;
  ordersRecent: number;
  activeUsers30d: number;
  newUsers7d: number;
  newUsersPrev7d: number;
  generatedAt: string;
  activity: OpsActivity;
};

function asCount(rows: Array<{ n?: unknown }>) {
  const value = Number(rows[0]?.n ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function count(query: () => Promise<Array<{ n?: unknown }>>) {
  try {
    return asCount(await query());
  } catch {
    return 0;
  }
}

function bucketKind(kind: string): keyof Omit<OpsActivity, "inquiries30d"> {
  if (kind === "seal") return "sealsWaiting";
  if (kind === "food") return "foodWaiting";
  if (kind.startsWith("goods") || kind === "org") return "goodsWaiting";
  if (kind === "time") return "volunteersWaiting";
  if (kind === "buying") return "buyingWaiting";
  return "otherWaiting";
}

export function statsTokenMatches(request: Request) {
  const expected = (process.env.APP_ENGINE_STATS_TOKEN || "").trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const presented = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function reportingArmed() {
  return Boolean((process.env.APP_ENGINE_STATS_TOKEN || "").trim());
}

export async function readOpsStats(): Promise<OpsStats> {
  const sql = await getSql();
  const [
    users,
    ticketsOpen,
    activeUsers30d,
    newUsers7d,
    newUsersPrev7d,
    inquiries30d,
    waitingByKind,
  ] = await Promise.all([
    count(() => sql<{ n: number }>`select count(*)::int as n from "user"`),
    count(
      () =>
        sql<{ n: number }>`
          select count(*)::int as n from inquiries
          where status in ('new', 'assigned', 'scheduled')
        `,
    ),
    count(
      () =>
        sql<{ n: number }>`
          select count(distinct "userId")::int as n
          from "session"
          where "expiresAt" > now()
        `,
    ),
    count(
      () =>
        sql<{ n: number }>`
          select count(*)::int as n from inquiries
          where created_at > now() - interval '7 days'
        `,
    ),
    count(
      () =>
        sql<{ n: number }>`
          select count(*)::int as n from inquiries
          where created_at > now() - interval '14 days'
            and created_at <= now() - interval '7 days'
        `,
    ),
    count(
      () =>
        sql<{ n: number }>`
          select count(*)::int as n from inquiries
          where created_at > now() - interval '30 days'
        `,
    ),
    (async () => {
      try {
        return await sql<{ kind: string; n: number }>`
          select kind, count(*)::int as n from inquiries
          where status in ('new', 'assigned', 'scheduled')
          group by kind
        `;
      } catch {
        return [] as Array<{ kind: string; n: number }>;
      }
    })(),
  ]);

  const activity: OpsActivity = {
    sealsWaiting: 0,
    foodWaiting: 0,
    goodsWaiting: 0,
    volunteersWaiting: 0,
    buyingWaiting: 0,
    otherWaiting: 0,
    inquiries30d,
  };
  for (const row of waitingByKind) {
    activity[bucketKind(String(row.kind))] += Number(row.n) || 0;
  }

  return {
    ok: true,
    reporting: true,
    app: APP_SLUG,
    appName: APP_NAME,
    publicUrl: PUBLIC_URL,
    adminUrl: ADMIN_URL,
    users,
    ticketsOpen,
    // Gifts go through Stripe with metadata[app]=united-under-god.
    // The owner desk reads money from Stripe — we do not invent an order count.
    ordersRecent: 0,
    activeUsers30d,
    newUsers7d,
    newUsersPrev7d,
    generatedAt: new Date().toISOString(),
    activity,
  };
}

export async function forwardInquiryToDashboard(inquiry: {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  city: string;
  address: string;
  message: string;
}) {
  const token = (
    process.env.APP_ENGINE_INBOX_TOKEN ||
    process.env.APP_ENGINE_STATS_TOKEN ||
    ""
  ).trim();
  if (!token) return { forwarded: false, reason: "no token" };

  const subject = inquirySubject(inquiry.kind, inquiry.name);
  const body = [
    `Kind: ${kindLabel(inquiry.kind)}`,
    inquiry.organization ? `Organization: ${inquiry.organization}` : "",
    inquiry.phone ? `Phone: ${inquiry.phone}` : "",
    inquiry.city ? `City: ${inquiry.city}` : "",
    inquiry.address ? `Address: ${inquiry.address}` : "",
    inquiry.message ? `Notes: ${inquiry.message}` : "",
    "",
    `This app's desk: ${ADMIN_URL}`,
    `Public site: ${PUBLIC_URL}`,
  ]
    .filter((line, i, all) => line !== "" || i === all.length - 2)
    .join("\n");

  try {
    const res = await fetch(INBOX_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        app: APP_SLUG,
        appName: APP_NAME,
        email: inquiry.email || "lincoln@unitedundergod.org",
        name: inquiry.name,
        subject,
        body,
        source: "app_forward",
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { forwarded: false, reason: `inbox ${res.status}` };
    }
    return { forwarded: true, reason: "" };
  } catch (err) {
    return {
      forwarded: false,
      reason: err instanceof Error ? err.message : "inbox unreachable",
    };
  }
}

export function tokenFingerprint() {
  const token = (process.env.APP_ENGINE_STATS_TOKEN || "").trim();
  if (!token) return null;
  return createHash("sha256").update(token).digest("hex").slice(0, 8);
}
