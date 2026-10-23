import { timingSafeEqual } from "node:crypto";
import type { Sql } from "./db.ts";
import { sendResendBatch, sendResendText } from "./desk-mail.ts";
import { OWNER_EMAIL } from "./desk.ts";
import { groupVerseDays, type VerseDay } from "./verse.ts";
import { isMissingRelation, loadVerseDays } from "./verse-feed.ts";
import {
  CONFIRM_MAX_PER_HOUR,
  CONFIRM_TTL_SEC,
  UNSUBSCRIBE_TTL_SEC,
  VERSE_SITE,
  batchIdempotencyKey,
  buildConfirmMail,
  buildDailyVerseMail,
  cleanSourcePath,
  indexNowPayload,
  isPlausibleEmail,
  liveMailAllowed,
  ministryToday,
  normalizeEmail,
  postalLine,
  recipientAllowed,
  signVerseToken,
  transactionalAllowance,
  usableIndexNowKey,
  utcDayStart,
  utcMonthStart,
  verseLinkSecret,
  verseSendAllowance,
  verifyVerseToken,
} from "./verse-mail.ts";

const NOT_OPEN = `The daily verse email is not open just yet. Write ${OWNER_EMAIL} and we will add you.`;
const TRY_LATER = "We could not send the confirmation email. Please try again in a little while.";
const CHECK_INBOX = "Check your inbox for a note from United Under God. Open it and confirm, and the daily verse will start.";
const ALREADY = "You're already receiving the daily verse. Look for it each day.";
const RATE = "We already sent a few confirmations. Check your inbox, including the spam folder, or try again in an hour.";

type Subscriber = {
  id: string;
  email: string;
  status: string;
  confirm_sent_at: unknown;
  confirm_send_count: number;
  confirm_window_started_at: unknown;
};

export type SubscribeState =
  | { ok: true; state: "pending" | "confirmed"; message: string }
  | { ok: false; error: string };

export type TokenState = { ok: true; message: string } | { ok: false; message: string };

export type DeliverState = {
  ok: boolean;
  sent: number;
  skipped: number;
  reason: string;
  indexNow: number;
};

function asTime(value: unknown) {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(time) ? time : 0;
}

function asCount(rows: Array<{ n?: unknown }>) {
  const value = Number(rows[0]?.n ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function sentSince(sql: Sql, sinceIso: string) {
  const verse = await sql<{ n: number }>`
    select count(*)::int as n from verse_send_log
    where status = 'sent' and created_at >= ${sinceIso}::timestamptz
  `;
  let desk = 0;
  try {
    const rows = await sql<{ n: number }>`
      select count(*)::int as n from email_log
      where status = 'sent' and created_at >= ${sinceIso}::timestamptz
    `;
    desk = asCount(rows);
  } catch (error) {
    if (!isMissingRelation(error)) throw error;
  }
  return asCount(verse) + desk;
}

function confirmBudget(row: Subscriber, now: Date) {
  const windowStart = asTime(row.confirm_window_started_at);
  const inWindow = windowStart > 0 && now.getTime() - windowStart < 60 * 60 * 1000;
  const count = inWindow ? Number(row.confirm_send_count) || 0 : 0;
  if (count >= CONFIRM_MAX_PER_HOUR) return { send: false as const, reason: "rate" as const, count };
  const last = asTime(row.confirm_sent_at);
  if (last && now.getTime() - last < 60_000) return { send: false as const, reason: "recent" as const, count };
  return { send: true as const, reason: "" as const, count };
}

async function findSubscriber(sql: Sql, email: string) {
  const rows = await sql<Subscriber>`
    select id, email, status, confirm_sent_at, confirm_send_count, confirm_window_started_at
    from verse_subscribers
    where email = ${email}
  `;
  return rows[0];
}

async function sendConfirmation(args: {
  sql: Sql;
  row: Subscriber;
  secret: string;
  apiKey?: string;
  allowLive: boolean;
  now: Date;
  fetchImpl?: typeof fetch;
  site?: string;
}): Promise<SubscribeState> {
  if (!recipientAllowed(args.row.email, args.allowLive)) {
    console.error("[verse-mail] confirmation skipped; recipient is not allowed on this host");
    return { ok: false, error: TRY_LATER };
  }
  const sentToday = await sentSince(args.sql, utcDayStart(args.now));
  const sentThisMonth = await sentSince(args.sql, utcMonthStart(args.now));
  if (transactionalAllowance({ sentToday, sentThisMonth }) < 1) {
    console.error("[verse-mail] confirmation stopped under the send cap");
    return { ok: false, error: TRY_LATER };
  }
  const exp = Math.floor(args.now.getTime() / 1000);
  const confirmToken = signVerseToken(
    { email: args.row.email, purpose: "confirm", exp: exp + CONFIRM_TTL_SEC },
    args.secret,
  );
  const unsubscribeToken = signVerseToken(
    { email: args.row.email, purpose: "unsubscribe", exp: exp + UNSUBSCRIBE_TTL_SEC },
    args.secret,
  );
  const mail = buildConfirmMail({
    confirmToken,
    unsubscribeToken,
    site: args.site,
    address: postalLine(),
  });
  const hour = Math.floor(args.now.getTime() / 3_600_000);
  const result = await sendResendText({
    to: args.row.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    headers: mail.headers,
    apiKey: args.apiKey,
    idempotencyKey: `verse-confirm/${args.row.id}/${hour}`,
    fetchImpl: args.fetchImpl,
  });
  await args.sql`
    insert into verse_send_log (id, kind, subscriber_id, status)
    values (
      ${crypto.randomUUID()},
      'confirm',
      ${args.row.id},
      ${result.ok ? "sent" : "failed"}
    )
  `;
  if (!result.ok) {
    console.error(`[verse-mail] confirmation failed subscriber=${args.row.id}`);
    return { ok: false, error: TRY_LATER };
  }
  const windowStart = asTime(args.row.confirm_window_started_at);
  const inWindow = windowStart > 0 && args.now.getTime() - windowStart < 60 * 60 * 1000;
  await args.sql`
    update verse_subscribers
    set confirm_sent_at = ${args.now.toISOString()}::timestamptz,
        confirm_send_count = ${inWindow ? Number(args.row.confirm_send_count) + 1 : 1},
        confirm_window_started_at = ${inWindow ? new Date(windowStart).toISOString() : args.now.toISOString()}::timestamptz,
        updated_at = now()
    where id = ${args.row.id}
  `;
  return { ok: true, state: "pending", message: CHECK_INBOX };
}

export async function requestVerseSubscription(
  sql: Sql,
  input: { email: string; sourcePath: string; now?: Date; apiKey?: string; secret?: string; allowLive?: boolean; fetchImpl?: typeof fetch; site?: string },
): Promise<SubscribeState> {
  const email = normalizeEmail(input.email);
  if (!isPlausibleEmail(email)) {
    return { ok: false, error: "Please enter an email address we can write to." };
  }
  const secret = input.secret ?? verseLinkSecret();
  if (!secret) {
    console.error("[verse-mail] confirmation not sent; link secret missing");
    return { ok: false, error: NOT_OPEN };
  }
  const now = input.now ?? new Date();
  const sourcePath = cleanSourcePath(input.sourcePath);
  const note = `Daily verse by email. Double opt-in from ${sourcePath}.`;
  const allowLive = input.allowLive ?? liveMailAllowed();
  try {
    let row = await findSubscriber(sql, email);
    if (!row) {
      const id = crypto.randomUUID();
      try {
        await sql`
          insert into verse_subscribers (id, email, status, source_path, consent_note)
          values (${id}, ${email}, 'pending', ${sourcePath}, ${note})
        `;
      } catch (error) {
        if ((error as { code?: string })?.code !== "23505") throw error;
      }
      row = await findSubscriber(sql, email);
    }
    if (!row) return { ok: false, error: TRY_LATER };
    if (row.status === "confirmed") return { ok: true, state: "confirmed", message: ALREADY };
    if (row.status === "unsubscribed") {
      await sql`
        update verse_subscribers
        set status = 'pending',
            unsubscribed_at = null,
            confirmed_at = null,
            source_path = ${sourcePath},
            consent_note = ${note},
            confirm_send_count = 0,
            confirm_window_started_at = null,
            confirm_sent_at = null,
            updated_at = now()
        where id = ${row.id}
      `;
      row = { ...row, status: "pending", confirm_send_count: 0, confirm_sent_at: null, confirm_window_started_at: null };
    } else {
      await sql`
        update verse_subscribers
        set source_path = ${sourcePath}, updated_at = now()
        where id = ${row.id}
      `;
    }
    const budget = confirmBudget(row, now);
    if (!budget.send && budget.reason === "recent") return { ok: true, state: "pending", message: CHECK_INBOX };
    if (!budget.send) return { ok: false, error: RATE };
    return sendConfirmation({
      sql,
      row,
      secret,
      apiKey: input.apiKey,
      allowLive,
      now,
      fetchImpl: input.fetchImpl,
      site: input.site,
    });
  } catch (error) {
    if (isMissingRelation(error)) {
      console.error("[verse-mail] subscriber table is not ready");
      return { ok: false, error: NOT_OPEN };
    }
    console.error("[verse-mail] subscribe failed");
    return { ok: false, error: TRY_LATER };
  }
}

export async function confirmVerseToken(
  sql: Sql,
  token: string,
  opts: { secret?: string; now?: Date } = {},
): Promise<TokenState> {
  const secret = opts.secret ?? verseLinkSecret();
  const nowSec = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  const verified = verifyVerseToken(token, secret, nowSec);
  if (!verified.ok || verified.purpose !== "confirm") {
    return {
      ok: false,
      message: "That confirmation link is not valid, or it has expired. Sign up again on the verse page.",
    };
  }
  try {
    const updated = await sql<{ id: string }>`
      update verse_subscribers
      set status = 'confirmed',
          confirmed_at = coalesce(confirmed_at, now()),
          updated_at = now()
      where email = ${verified.email} and status = 'pending'
      returning id
    `;
    if (updated.length > 0) {
      return { ok: true, message: "You're confirmed. The verse of the day will come to this inbox." };
    }
    const row = await findSubscriber(sql, verified.email);
    if (row?.status === "confirmed") {
      return { ok: true, message: "You're confirmed. The verse of the day will come to this inbox." };
    }
    if (row?.status === "unsubscribed") {
      return {
        ok: false,
        message: "You stopped the daily verse. Sign up again on the verse page if you want it back.",
      };
    }
    return { ok: false, message: "That confirmation link is not valid, or it has expired. Sign up again on the verse page." };
  } catch (error) {
    if (isMissingRelation(error)) return { ok: false, message: NOT_OPEN };
    console.error("[verse-mail] confirm failed");
    return { ok: false, message: TRY_LATER };
  }
}

export async function unsubscribeVerseToken(
  sql: Sql,
  token: string,
  opts: { secret?: string; now?: Date } = {},
): Promise<TokenState> {
  const secret = opts.secret ?? verseLinkSecret();
  const nowSec = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  const verified = verifyVerseToken(token, secret, nowSec);
  if (!verified.ok || verified.purpose !== "unsubscribe") {
    return { ok: false, message: "That unsubscribe link is not valid." };
  }
  try {
    await sql`
      update verse_subscribers
      set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
      where email = ${verified.email} and status <> 'unsubscribed'
    `;
    const row = await findSubscriber(sql, verified.email);
    if (!row) return { ok: false, message: "That unsubscribe link is not valid." };
    return { ok: true, message: "You're unsubscribed. You will not receive the daily verse." };
  } catch (error) {
    if (isMissingRelation(error)) return { ok: false, message: NOT_OPEN };
    console.error("[verse-mail] unsubscribe failed");
    return { ok: false, message: TRY_LATER };
  }
}

async function claimRun(
  sql: Sql,
  dateKey: string,
): Promise<{ state: "claimed"; attempt: number } | { state: "done" | "busy" | "capped" }> {
  await sql`
    insert into verse_mail_runs (date_key, status)
    values (${dateKey}, 'started')
    on conflict (date_key) do nothing
  `;
  // A known provider failure bumps the attempt so the next call is not stuck
  // on a cached error. A crash mid-send keeps the attempt, and the same
  // idempotency key, so a retry does not mail the list twice.
  const claimed = await sql<{ attempt: number }>`
    update verse_mail_runs
    set status = 'sending',
        started_at = now(),
        attempt = case when stopped_reason = 'send failed' then attempt + 1 else attempt end
    where date_key = ${dateKey}
      and (
        status in ('started', 'partial')
        or (status = 'sending' and started_at < now() - interval '15 minutes')
      )
    returning attempt
  `;
  if (claimed.length > 0) return { state: "claimed", attempt: Number(claimed[0]?.attempt ?? 0) };
  const rows = await sql<{ status: string }>`
    select status from verse_mail_runs where date_key = ${dateKey}
  `;
  if (rows[0]?.status === "sent") return { state: "done" };
  if (rows[0]?.status === "capped") return { state: "capped" };
  return { state: "busy" };
}

async function finishRun(sql: Sql, dateKey: string, status: string, sent: number, skipped: number, reason: string) {
  await sql`
    update verse_mail_runs
    set status = ${status},
        sent_count = ${sent},
        skipped_count = ${skipped},
        stopped_reason = ${reason},
        finished_at = now()
    where date_key = ${dateKey}
  `;
}

export async function submitFreshVersePages(
  sql: Sql,
  opts: { slugs: string[]; key?: string; fetchImpl?: typeof fetch; site?: string },
) {
  const key = usableIndexNowKey(opts.key);
  if (!key) {
    console.info(
      opts.key?.trim()
        ? "[indexnow] INDEXNOW_KEY is not usable; skipping submission"
        : "[indexnow] INDEXNOW_KEY is not set; skipping submission",
    );
    return { submitted: [] as string[] };
  }
  const known = await sql<{ slug: string }>`select slug from verse_indexnow_log`;
  const have = new Set(known.map((row) => row.slug));
  const fresh = opts.slugs.filter((slug) => slug && !have.has(slug));
  if (fresh.length === 0) return { submitted: [] as string[] };
  const payload = indexNowPayload({ key, slugs: fresh, site: opts.site });
  const res = await (opts.fetchImpl ?? fetch)("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (res.status !== 200 && res.status !== 202) {
    console.error(`[indexnow] submit failed status=${res.status}`);
    return { submitted: [] as string[] };
  }
  const site = opts.site ?? VERSE_SITE;
  for (const slug of fresh) {
    await sql`
      insert into verse_indexnow_log (slug, url, http_status)
      values (${slug}, ${`${site}/verse/${slug}`}, ${res.status})
      on conflict (slug) do nothing
    `;
  }
  return { submitted: fresh };
}

export async function deliverDailyVerse(
  sql: Sql,
  opts: {
    now?: Date;
    apiKey?: string;
    secret?: string;
    allowLive?: boolean;
    indexNowKey?: string;
    fetchImpl?: typeof fetch;
    site?: string;
    days?: VerseDay[];
  } = {},
): Promise<DeliverState> {
  const now = opts.now ?? new Date();
  const days = opts.days ?? (await loadVerseDays(sql));
  const entries = groupVerseDays(days);
  let indexNow = 0;
  try {
    const submitted = await submitFreshVersePages(sql, {
      slugs: entries.map((entry) => entry.slug),
      key: opts.indexNowKey,
      fetchImpl: opts.fetchImpl,
      site: opts.site,
    });
    indexNow = submitted.submitted.length;
  } catch (error) {
    if (!isMissingRelation(error)) console.error("[indexnow] submit failed");
  }

  const dateKey = ministryToday(now);
  const verse = days.find((day) => day.dateKey === dateKey);
  if (!verse) {
    console.info(`[verse-mail] no verse published for ${dateKey}`);
    return { ok: true, sent: 0, skipped: 0, reason: "no verse published", indexNow };
  }

  const claim = await claimRun(sql, dateKey);
  if (claim.state !== "claimed") {
    const reason =
      claim.state === "capped" ? "already capped" : claim.state === "busy" ? "already sending" : "already sent";
    return { ok: true, sent: 0, skipped: 0, reason, indexNow };
  }

  const secret = opts.secret ?? verseLinkSecret();
  if (!secret) {
    console.error("[verse-mail] daily send skipped; link secret missing");
    await finishRun(sql, dateKey, "partial", 0, 0, "link secret missing");
    return { ok: false, sent: 0, skipped: 0, reason: "link secret missing", indexNow };
  }

  const allowLive = opts.allowLive ?? liveMailAllowed();
  const rows = await sql<{ id: string; email: string }>`
    select id, email from verse_subscribers
    where status = 'confirmed'
      and not exists (
        select 1 from verse_mail_deliveries d
        where d.subscriber_id = verse_subscribers.id
          and d.date_key = ${dateKey}
          and d.status = 'sent'
      )
    order by last_daily_sent_at nulls first, id
  `;
  const allowed = rows.filter((row) => recipientAllowed(row.email, allowLive));
  const skippedLive = rows.length - allowed.length;
  if (skippedLive > 0) {
    console.info(`[verse-mail] skipped ${skippedLive} recipient(s) that this host must not mail`);
  }
  const sentToday = await sentSince(sql, utcDayStart(now));
  const sentThisMonth = await sentSince(sql, utcMonthStart(now));
  const budget = verseSendAllowance({ sentToday, sentThisMonth });
  const chosen = allowed.slice(0, budget.allowance);
  const held = allowed.length - chosen.length;

  if (chosen.length === 0) {
    const reason = allowed.length === 0 ? "no confirmed subscribers" : budget.reason || "cap";
    await finishRun(sql, dateKey, allowed.length === 0 ? "sent" : "capped", 0, skippedLive, reason);
    return { ok: true, sent: 0, skipped: skippedLive, reason, indexNow };
  }

  const exp = Math.floor(now.getTime() / 1000) + UNSUBSCRIBE_TTL_SEC;
  const address = postalLine();
  const messages = chosen.map((row) => {
    const token = signVerseToken({ email: row.email, purpose: "unsubscribe", exp }, secret);
    const mail = buildDailyVerseMail({ verse, token, site: opts.site, address });
    return { to: row.email, subject: mail.subject, text: mail.text, html: mail.html, headers: mail.headers };
  });
  const sent = await sendResendBatch({
    messages,
    apiKey: opts.apiKey,
    idempotencyKey: `${batchIdempotencyKey(dateKey, chosen.map((row) => row.id))}/a${claim.attempt}`,
    fetchImpl: opts.fetchImpl,
  });
  if (!sent.ok) {
    console.error(`[verse-mail] daily batch failed date=${dateKey}`);
    await finishRun(sql, dateKey, "partial", 0, skippedLive, "send failed");
    return { ok: false, sent: 0, skipped: skippedLive, reason: "send failed", indexNow };
  }

  for (const row of chosen) {
    await sql`
      insert into verse_mail_deliveries (date_key, subscriber_id, status, sent_at)
      values (${dateKey}, ${row.id}, 'sent', now())
      on conflict (date_key, subscriber_id) do nothing
    `;
    await sql`
      insert into verse_send_log (id, kind, subscriber_id, date_key, status)
      values (${crypto.randomUUID()}, 'daily', ${row.id}, ${dateKey}, 'sent')
    `;
    await sql`
      update verse_subscribers
      set last_daily_sent_at = now(), updated_at = now()
      where id = ${row.id}
    `;
  }
  const reason = held > 0 ? budget.reason || "cap" : "";
  await finishRun(
    sql,
    dateKey,
    held > 0 ? "capped" : "sent",
    chosen.length,
    skippedLive + held,
    reason,
  );
  console.info(`[verse-mail] sent date=${dateKey} count=${chosen.length} held=${held}`);
  return { ok: true, sent: chosen.length, skipped: skippedLive + held, reason, indexNow };
}

export function cronSecretMatches(request: Request, env: { CRON_SECRET?: string } = process.env) {
  const expected = env.CRON_SECRET?.trim() ?? "";
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const presented = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

