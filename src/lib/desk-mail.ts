import type { Sql } from "./db.ts";
import { OWNER_EMAIL } from "./desk.ts";

/** Verified Resend sending domain for this account: emails.unitedundergod.org */
export const DEFAULT_DESK_FROM =
  "United Under God <no-reply@emails.unitedundergod.org>";

/** Replies land in Lincoln's inbox. The From address stays on the verified subdomain. */
export const DESK_REPLY_TO = OWNER_EMAIL;

/** email_log stores the provider body, clipped so a Cloudflare HTML page cannot fill the row. */
export const RESEND_ERROR_LIMIT = 500;

/** Hard stop for desk mail, including the owner note. Same width as the verse reserve. */
export const DESK_DAILY_CAP = 5;

export function deskDayBucket(now = new Date()) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  return `day:${day}`;
}

export function deskSendAllowed(sentToday: number, cap = DESK_DAILY_CAP) {
  return Math.max(0, sentToday) < cap;
}

function missingRelation(error: unknown) {
  return (error as { code?: string })?.code === "42P01";
}

/**
 * Claim one desk letter for this UTC day. The counter moves in this statement
 * only while it is still under the cap. A missing table means the manual
 * migration is not applied yet, and the send is allowed.
 */
export async function claimDeskSend(sql: Sql, now = new Date()) {
  try {
    const rows = await sql<{ used: number }>`
      insert into desk_send_budget (bucket, used)
      values (${deskDayBucket(now)}, 1)
      on conflict (bucket) do update
      set used = desk_send_budget.used + 1, updated_at = now()
      where desk_send_budget.used < ${DESK_DAILY_CAP}
      returning used
    `;
    return rows.length > 0;
  } catch (error) {
    if (missingRelation(error)) return true;
    throw error;
  }
}

export async function releaseDeskSend(sql: Sql, now = new Date()) {
  try {
    await sql`
      update desk_send_budget
      set used = greatest(used - 1, 0), updated_at = now()
      where bucket = ${deskDayBucket(now)}
    `;
  } catch (error) {
    if (missingRelation(error)) return;
    throw error;
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
 * email_log write, so it still works when the database is down.
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
  if (args.sql) {
    const claimed = await claimDeskSend(args.sql, now);
    if (!claimed) {
      console.error(`[desk-mail] daily cap reached kind=${args.logKind}`);
      return { sent: 0, attempted: 0 };
    }
  }
  const result = await sendResendText({
    to: OWNER_EMAIL,
    subject: args.subject,
    text: args.text,
    apiKey: args.apiKey,
    from: args.from ?? deskFromAddress(),
    fetchImpl: args.fetchImpl,
  });
  if (!result.ok && args.sql && (result.rejected || result.error === "")) {
    await releaseDeskSend(args.sql, now);
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
