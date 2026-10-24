import type { Sql } from "./db.ts";
import { OWNER_EMAIL } from "./desk.ts";

/** Verified Resend sending domain for this account: emails.unitedundergod.org */
export const DEFAULT_DESK_FROM =
  "United Under God <no-reply@emails.unitedundergod.org>";

/** Replies land in Lincoln's inbox. The From address stays on the verified subdomain. */
export const DESK_REPLY_TO = OWNER_EMAIL;

/** email_log stores the provider body, clipped so a Cloudflare HTML page cannot fill the row. */
export const RESEND_ERROR_LIMIT = 500;

/** Public replies from the desk. Owner notices and church notes are other lanes. */
export const DESK_DAILY_CAP = 5;
/** Public replies for one UTC month. The daily cap would be 155 on a 31-day month. */
export const DESK_MONTHLY_CAP = 15;

/** Notices to lincoln@. Junk inquiries on the public lane cannot spend these. */
export const OWNER_DAILY_CAP = 20;
export const OWNER_MONTHLY_CAP = 40;

/**
 * Church sound-and-video confirmation. Same daily width as an owner notice,
 * on its own counter, so a busy Sunday of church notes cannot silence Lincoln.
 */
export const AV_DAILY_CAP = OWNER_DAILY_CAP;
export const AV_MONTHLY_CAP = 15;

/**
 * Letters these three lanes may spend in a month.
 * 80 verse letters × 31 days is 2,480, and confirmations take 450.
 * 3,000 − 2,480 − 450 = 70, which is this sum. Reserving (20 + 5) × 31
 * would put the month past 3,000 and shrink the morning letter, so the
 * month stops here instead.
 */
export const DESK_FAMILY_MONTHLY_CAP = OWNER_MONTHLY_CAP + DESK_MONTHLY_CAP + AV_MONTHLY_CAP;

export type DeskLane = "desk" | "owner" | "av";

export type DeskClaim = {
  ok: boolean;
  /** True only when this call incremented the counters. Fail-open does not. */
  reserved: boolean;
  reason: "" | "daily cap" | "monthly cap";
  dayBucket: string;
  monthBucket: string;
};

export type DeskMailSkip = {
  id: string;
  lane: string;
  kind: string;
  reason: string;
  created_at: string;
};

export function deskSendAllowed(sentToday: number, cap = DESK_DAILY_CAP) {
  return Math.max(0, sentToday) < cap;
}

export function deskBuckets(lane: DeskLane, now = new Date()) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  return { dayBucket: `${lane}:${day}`, monthBucket: `${lane}:${day.slice(0, 7)}` };
}

function deskLaneCaps(lane: DeskLane) {
  if (lane === "owner") return { daily: OWNER_DAILY_CAP, monthly: OWNER_MONTHLY_CAP };
  if (lane === "av") return { daily: AV_DAILY_CAP, monthly: AV_MONTHLY_CAP };
  return { daily: DESK_DAILY_CAP, monthly: DESK_MONTHLY_CAP };
}

function errorCode(error: unknown) {
  return (error as { code?: string })?.code;
}

/** Missing table, or the reserve function is not installed yet. */
function budgetNotReady(error: unknown) {
  const code = errorCode(error);
  return code === "42P01" || code === "42883";
}

/**
 * Write the held letter where the desk can read it. A failed insert does not
 * change the decision to hold the letter.
 */
export async function recordDeskSkip(
  sql: Sql,
  args: { lane: string; kind: string; reason: "daily cap" | "monthly cap" },
) {
  try {
    await sql`
      insert into desk_mail_skips (id, lane, kind, reason)
      values (${crypto.randomUUID()}, ${args.lane}, ${args.kind}, ${args.reason})
    `;
  } catch {
    console.error(`[desk-mail] skip log failed lane=${args.lane}`);
  }
}

/**
 * Recent held letters, newest first. A missing table yields an empty list so
 * the desk still opens before the manual migration is applied. Read only.
 */
export async function listDeskMailSkips(sql: Sql, limit = 20): Promise<DeskMailSkip[]> {
  try {
    return await sql<DeskMailSkip>`
      select id, lane, kind, reason, created_at::text as created_at
      from desk_mail_skips
      order by created_at desc
      limit ${limit}
    `;
  } catch (error) {
    if (budgetNotReady(error)) return [];
    throw error;
  }
}

/**
 * Claim one letter on a lane for this UTC day and month together.
 * Public desk mail fail-opens only when the migration is not applied yet.
 * Owner notices and church notes fail open on any database error.
 * A cap writes a desk_mail_skips row and does not send.
 */
export async function claimDeskSend(
  sql: Sql,
  now = new Date(),
  lane: DeskLane = "desk",
  kind: string = lane,
): Promise<DeskClaim> {
  const buckets = deskBuckets(lane, now);
  const caps = deskLaneCaps(lane);
  const open = { ok: true, reserved: false, reason: "" as const, ...buckets };
  try {
    const rows = await sql<{ result: string }>`
      select desk_reserve_send(
        ${buckets.dayBucket},
        ${caps.daily},
        ${buckets.monthBucket},
        ${caps.monthly}
      ) as result
    `;
    const verdict = rows[0]?.result;
    if (verdict === "ok") return { ...open, reserved: true };
    if (verdict === "day" || verdict === "month") {
      const reason = verdict === "month" ? "monthly cap" : "daily cap";
      await recordDeskSkip(sql, { lane, kind, reason });
      return { ok: false, reserved: false, reason, ...buckets };
    }
    throw new Error("desk reserve returned nothing");
  } catch (error) {
    if (lane === "owner" || lane === "av" || budgetNotReady(error)) return open;
    throw error;
  }
}

/** Give back a day and a month, one row at a time, in bucket order. */
export async function releaseDeskSend(sql: Sql, now = new Date(), lane: DeskLane = "desk") {
  const buckets = deskBuckets(lane, now);
  const names = [buckets.dayBucket, buckets.monthBucket].sort();
  for (const bucket of names) {
    try {
      await sql`
        update desk_send_budget
        set used = greatest(used - 1, 0), updated_at = now()
        where bucket = ${bucket}
      `;
    } catch (error) {
      if (lane === "owner" || lane === "av" || budgetNotReady(error)) return;
      throw error;
    }
  }
}

export function deskFromAddress(env: { RESEND_FROM?: string } = process.env) {
  const override = env.RESEND_FROM?.trim();
  return override || DEFAULT_DESK_FROM;
}

export function clipResendError(body: string): string {
  return body.slice(0, RESEND_ERROR_LIMIT);
}

/** One Resend body for every send in this app. Callers do not set From or reply_to themselves. */
export function resendMessage(args: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
  from?: string;
}) {
  const from = args.from?.trim() || deskFromAddress();
  return {
    from,
    to: [args.to],
    reply_to: DESK_REPLY_TO,
    subject: args.subject,
    text: args.text,
    ...(args.html ? { html: args.html } : {}),
    ...(args.headers && Object.keys(args.headers).length > 0 ? { headers: args.headers } : {}),
  };
}

/**
 * The inquiry row is already saved. A mail failure must not reject the submit.
 * The log line names the inquiry id and kind only — no addresses, no body.
 */
export async function sendResendText(args: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
  apiKey?: string;
  from?: string;
  idempotencyKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; error: "" } | { ok: false; rejected: boolean; error: string }> {
  const key = args.apiKey?.trim();
  if (!key) return { ok: false, rejected: false, error: "" };
  try {
    const res = await (args.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(args.idempotencyKey ? { "Idempotency-Key": args.idempotencyKey } : {}),
      },
      body: JSON.stringify(
        resendMessage({
          to: args.to,
          subject: args.subject,
          text: args.text,
          html: args.html,
          headers: args.headers,
          from: args.from,
        }),
      ),
    });
    if (!res.ok) {
      const error = clipResendError(await res.text());
      return { ok: false, rejected: true, error: error || "resend rejected" };
    }
    return { ok: true, error: "" };
  } catch {
    // A timeout or a dropped connection may still have been accepted. Callers
    // that reserved a slot must keep it. Only a non-2xx answer is a rejection.
    return { ok: false, rejected: false, error: "resend request failed" };
  }
}

/** Distinct letters in one Resend call. Same From and reply-to as every other send. */
export async function sendResendBatch(args: {
  messages: Array<{
    to: string;
    subject: string;
    text: string;
    html?: string;
    headers?: Record<string, string>;
  }>;
  apiKey?: string;
  from?: string;
  idempotencyKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; error: string }> {
  if (args.messages.length === 0) return { ok: true, error: "" };
  const key = args.apiKey?.trim();
  if (!key) return { ok: false, error: "" };
  try {
    const res = await (args.fetchImpl ?? fetch)("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(args.idempotencyKey ? { "Idempotency-Key": args.idempotencyKey } : {}),
      },
      body: JSON.stringify(
        args.messages.map((message) =>
          resendMessage({
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
            headers: message.headers,
            from: args.from,
          }),
        ),
      ),
    });
    if (!res.ok) {
      const error = clipResendError(await res.text());
      return { ok: false, error: error || "resend rejected" };
    }
    return { ok: true, error: "" };
  } catch {
    return { ok: false, error: "resend request failed" };
  }
}

/**
 * Resend only, to the literal owner address. No notify_routes read and no
 * email_log write.
 *
 * `unsaved` is the database-is-down fallback. It does not open a connection
 * and it does not claim a slot, even when a sql handle was passed in.
 * `routes` uses the owner allowance. A database error there still sends.
 */
export async function sendHardcodedOwnerEmail(args: {
  subject: string;
  text: string;
  apiKey?: string;
  from?: string;
  fetchImpl?: typeof fetch;
  logKind: string;
  logLabel: "unsaved" | "routes";
  sql?: Sql;
  now?: Date;
}): Promise<{ sent: number; attempted: number }> {
  const now = args.now ?? new Date();
  const budgeted = args.logLabel !== "unsaved";
  let reserved = false;
  if (budgeted && args.sql) {
    const claimed = await claimDeskSend(args.sql, now, "owner", args.logKind);
    if (!claimed.ok) {
      console.error(`[desk-mail] ${claimed.reason} reached kind=${args.logKind}`);
      return { sent: 0, attempted: 0 };
    }
    reserved = claimed.reserved;
  }
  const result = await sendResendText({
    to: OWNER_EMAIL,
    subject: args.subject,
    text: args.text,
    apiKey: args.apiKey,
    from: args.from ?? deskFromAddress(),
    fetchImpl: args.fetchImpl,
  });
  if (!result.ok && reserved && args.sql && (result.rejected || result.error === "")) {
    try {
      await releaseDeskSend(args.sql, now, "owner");
    } catch {
      console.error(`[desk-mail] release failed kind=${args.logKind}`);
    }
  }
  if (!result.ok) {
    console.error(
      `[desk-mail] ${args.logLabel} email failed kind=${args.logKind}`,
    );
    return { sent: 0, attempted: 1 };
  }
  return { sent: 1, attempted: 1 };
}

export async function finishDeskSend<T extends { sent: number; attempted: number }>(
  inquiry: { id: string; kind: string },
  send: () => Promise<T>,
): Promise<T | { sent: 0; attempted: 0 }> {
  try {
    const mail = await send();
    if (mail.sent < mail.attempted) {
      console.error(
        `[desk-mail] send failed inquiry=${inquiry.id} kind=${inquiry.kind} sent=${mail.sent} attempted=${mail.attempted}`,
      );
    }
    return mail;
  } catch {
    console.error(
      `[desk-mail] send failed inquiry=${inquiry.id} kind=${inquiry.kind}`,
    );
    return { sent: 0, attempted: 0 };
  }
}
