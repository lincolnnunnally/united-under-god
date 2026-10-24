import { timingSafeEqual } from "node:crypto";
import type { Sql } from "./db.ts";
import { sendHardcodedOwnerEmail, sendResendBatch, sendResendText } from "./desk-mail.ts";
import { groupVerseDays, type VerseDay } from "./verse.ts";
import { isMissingRelation, loadVerseDays } from "./verse-feed.ts";
import {
  CONFIRM_CAP_MESSAGE,
  CONFIRM_PER_ADDRESS_PER_DAY,
  CONFIRM_PER_NETWORK_PER_DAY,
  CONFIRM_TTL_SEC,
  POW_ISSUE_PER_HOUR,
  UNSUBSCRIBE_TTL_SEC,
  VERSE_NOT_OPEN,
  VERSE_POW_BITS,
  VERSE_POW_TTL_SEC,
  VERSE_SITE,
  batchIdempotencyKey,
  buildConfirmMail,
  buildDailyVerseMail,
  cleanSourcePath,
  confirmDayBucket,
  confirmHardCeilings,
  confirmMonthBucket,
  confirmNetBucket,
  confirmSendAllowed,
  fullPostalAddress,
  indexNowPayload,
  ipSubscribeLimited,
  isPlausibleEmail,
  issueVersePow,
  liveMailAllowed,
  ministryToday,
  normalizeEmail,
  recipientAllowed,
  signVerseToken,
  subscribeIpBucket,
  usableIndexNowKey,
  utcDayStart,
  utcMonthStart,
  verseLinkSecret,
  verseSendAllowance,
  verifyVersePow,
  verifyVerseToken,
} from "./verse-mail.ts";
const NOT_OPEN = VERSE_NOT_OPEN;
const TRY_LATER = "We could not send the confirmation email. Please try again in a little while.";
const CHALLENGE_LATER = "We could not take that just now. Please try again in a little while.";
const CHECK_INBOX = "Check your inbox for a note from United Under God. Open it and confirm, and the daily verse will start.";
const SAME_REPLY = { ok: true as const, state: "pending" as const, message: CHECK_INBOX };

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

async function countKind(sql: Sql, sinceIso: string, kind: "confirm" | "daily") {
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from verse_send_log
    where status = 'sent' and kind = ${kind} and created_at >= ${sinceIso}::timestamptz
  `;
  return asCount(rows);
}

async function countDesk(sql: Sql, sinceIso: string) {
  try {
    const rows = await sql<{ n: number }>`
      select count(*)::int as n from email_log
      where status = 'sent' and created_at >= ${sinceIso}::timestamptz
    `;
    return asCount(rows);
  } catch (error) {
    if (!isMissingRelation(error)) throw error;
    return 0;
  }
}

function confirmsUsedToday(row: Subscriber, now: Date) {
  const windowStart = asTime(row.confirm_window_started_at);
  if (windowStart < Date.parse(utcDayStart(now))) return 0;
  return Number(row.confirm_send_count) || 0;
}

async function ipOverLimit(sql: Sql, ip: string, now: Date) {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const dayStart = utcDayStart(now);
  const hour = await sql<{ n: number }>`
    select count(*)::int as n from verse_subscribe_hits
    where ip = ${ip} and created_at >= ${hourAgo}::timestamptz
  `;
  const day = await sql<{ n: number }>`
    select count(*)::int as n from verse_subscribe_hits
    where ip = ${ip} and created_at >= ${dayStart}::timestamptz
  `;
  return ipSubscribeLimited(asCount(hour), asCount(day));
}

async function budgetUsed(sql: Sql, bucket: string) {
  const rows = await sql<{ used: number }>`
    select used from verse_confirm_budget where bucket = ${bucket}
  `;
  return Number(rows[0]?.used ?? 0);
}

async function otherMail(sql: Sql, now: Date) {
  const dayStart = utcDayStart(now);
  const monthStart = utcMonthStart(now);
  const otherToday = (await countKind(sql, dayStart, "daily")) + (await countDesk(sql, dayStart));
  const otherThisMonth = (await countKind(sql, monthStart, "daily")) + (await countDesk(sql, monthStart));
  return { otherToday, otherThisMonth };
}

async function confirmSliceOpen(sql: Sql, now: Date) {
  const confirmsToday = await budgetUsed(sql, confirmDayBucket(now));
  const confirmsThisMonth = await budgetUsed(sql, confirmMonthBucket(now));
  const { otherToday, otherThisMonth } = await otherMail(sql, now);
  return confirmSendAllowed({ confirmsToday, confirmsThisMonth, otherToday, otherThisMonth });
}

async function reserveConfirm(sql: Sql, now: Date, ip: string | undefined) {
  const { otherToday, otherThisMonth } = await otherMail(sql, now);
  const caps = confirmHardCeilings();
  const rows = await sql<{ result: string }>`
    select verse_reserve_confirm(
      ${confirmDayBucket(now)},
      ${caps.dayCap},
      ${confirmMonthBucket(now)},
      ${caps.monthCap},
      ${confirmNetBucket(ip, now)},
      ${caps.netCap},
      ${otherToday},
      ${otherThisMonth},
      ${caps.dailyHard},
      ${caps.monthlyHard}
    ) as result
  `;
  return rows[0]?.result ?? "global";
}

async function releaseConfirm(sql: Sql, now: Date, ip: string | undefined) {
  const day = confirmDayBucket(now);
  const month = confirmMonthBucket(now);
  const net = confirmNetBucket(ip, now);
  await sql`
    update verse_confirm_budget
    set used = greatest(used - 1, 0), updated_at = now()
    where bucket = ${day} or bucket = ${month} or bucket = ${net}
  `;
}

async function spendPow(sql: Sql, challenge: string, now: Date) {
  const cutoff = new Date(now.getTime() - VERSE_POW_TTL_SEC * 1000).toISOString();
  await sql`
    delete from verse_pow_used where used_at < ${cutoff}::timestamptz
  `;
  const spent = await sql<{ challenge: string }>`
    insert into verse_pow_used (challenge, used_at)
    values (${challenge}, ${now.toISOString()}::timestamptz)
    on conflict (challenge) do nothing
    returning challenge
  `;
  return spent.length > 0;
}

async function noteConfirmCap(sql: Sql, now: Date, apiKey?: string, fetchImpl?: typeof fetch) {
  console.error("[verse-mail] confirm cap reached");
  const day = utcDayStart(now).slice(0, 10);
  const inserted = await sql<{ id: string }>`
    insert into verse_send_log (id, kind, date_key, status)
    values (${`confirm-cap-${day}`}, 'confirm', ${day}, 'skipped')
    on conflict (id) do nothing
    returning id
  `;
  if (inserted.length === 0) return;
  await sendHardcodedOwnerEmail({
    subject: "Daily verse sign-ups are full for today",
    text: "The daily verse confirmation cap was reached. Sign-ups are paused until tomorrow.",
    apiKey,
    fetchImpl,
    logKind: "verse-confirm-cap",
    logLabel: "unsaved",
  });
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
  address: string;
  ip?: string;
}): Promise<SubscribeState> {
  if (!recipientAllowed(args.row.email, args.allowLive)) {
    console.error("[verse-mail] confirmation skipped; recipient is not allowed on this host");
    return { ok: false, error: TRY_LATER };
  }
  if (!args.address) {
    console.error("[verse-mail] confirmation skipped; VERSE_POSTAL_ADDRESS is not a street or PO box");
    return { ok: false, error: NOT_OPEN };
  }
  const reserved = await reserveConfirm(args.sql, args.now, args.ip);
  if (reserved !== "ok") {
    if (reserved === "net") {
      console.error("[verse-mail] confirm network cap reached");
      return SAME_REPLY;
    }
    await noteConfirmCap(args.sql, args.now, args.apiKey, args.fetchImpl);
    return { ok: false, error: CONFIRM_CAP_MESSAGE };
  }
  const dayStart = utcDayStart(args.now);
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
    address: args.address,
  });
  const usedToday = confirmsUsedToday(args.row, args.now);
  const result = await sendResendText({
    to: args.row.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    headers: mail.headers,
    apiKey: args.apiKey,
    idempotencyKey: `verse-confirm/${args.row.id}/${dayStart.slice(0, 10)}/${usedToday + 1}`,
    fetchImpl: args.fetchImpl,
  });
  if (!result.ok) {
    await releaseConfirm(args.sql, args.now, args.ip);
  }
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
  const sameDay = asTime(args.row.confirm_window_started_at) >= Date.parse(dayStart);
  await args.sql`
    update verse_subscribers
    set confirm_sent_at = ${args.now.toISOString()}::timestamptz,
        confirm_send_count = ${sameDay ? usedToday + 1 : 1},
        confirm_window_started_at = ${sameDay ? new Date(asTime(args.row.confirm_window_started_at)).toISOString() : args.now.toISOString()}::timestamptz,
        updated_at = now()
    where id = ${args.row.id}
  `;
  return SAME_REPLY;
}

export async function issueVerseSignupChallenge(
  sql: Sql,
  input: { ip?: string; secret?: string; postalAddress?: string; now?: Date } = {},
): Promise<{ ok: true; challenge: string; bits: number } | { ok: false; error: string }> {
  const secret = input.secret ?? verseLinkSecret();
  const address = fullPostalAddress(input.postalAddress ?? process.env.VERSE_POSTAL_ADDRESS);
  if (!secret || !address) return { ok: false, error: NOT_OPEN };
  const now = input.now ?? new Date();
  const bucket = subscribeIpBucket(input.ip);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const pruneBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  try {
    await sql`
      delete from verse_pow_issued where created_at < ${pruneBefore}::timestamptz
    `;
    const rows = await sql<{ n: number }>`
      select count(*)::int as n from verse_pow_issued
      where ip = ${bucket} and created_at >= ${hourAgo}::timestamptz
    `;
    if (asCount(rows) >= POW_ISSUE_PER_HOUR) {
      console.error(`[verse-mail] pow challenge limit reached bucket=${bucket}`);
      return { ok: false, error: CHALLENGE_LATER };
    }
    await sql`
      insert into verse_pow_issued (id, ip, created_at)
      values (${crypto.randomUUID()}, ${bucket}, ${now.toISOString()}::timestamptz)
    `;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (isMissingRelation(error) || code === "42883") {
      console.error("[verse-mail] pow challenge table is not ready");
      return { ok: false, error: NOT_OPEN };
    }
    console.error("[verse-mail] pow challenge failed");
    return { ok: false, error: CHALLENGE_LATER };
  }
  const issued = issueVersePow(secret, Math.floor(now.getTime() / 1000), VERSE_POW_BITS, bucket);
  return { ok: true, challenge: issued.challenge, bits: issued.bits };
}

export async function requestVerseSubscription(
  sql: Sql,
  input: {
    email: string;
    sourcePath: string;
    now?: Date;
    apiKey?: string;
    secret?: string;
    allowLive?: boolean;
    fetchImpl?: typeof fetch;
    site?: string;
    ip?: string;
    hp?: string;
    powChallenge?: string;
    powNonce?: string;
    postalAddress?: string;
  },
): Promise<SubscribeState> {
  const email = normalizeEmail(input.email);
  if (!isPlausibleEmail(email)) {
    return { ok: false, error: "Please enter an email address we can write to." };
  }
  if (input.hp?.trim()) return SAME_REPLY;
  const secret = input.secret ?? verseLinkSecret();
  if (!secret) {
    console.error("[verse-mail] confirmation not sent; link secret missing");
    return { ok: false, error: NOT_OPEN };
  }
  const address = fullPostalAddress(input.postalAddress ?? process.env.VERSE_POSTAL_ADDRESS);
  if (!address) {
    console.error("[verse-mail] confirmation skipped; VERSE_POSTAL_ADDRESS is not a street or PO box");
    return { ok: false, error: NOT_OPEN };
  }
  const now = input.now ?? new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const bucket = subscribeIpBucket(input.ip);
  if (!verifyVersePow(input.powChallenge ?? "", input.powNonce ?? "", secret, nowSec, bucket)) {
    return { ok: false, error: TRY_LATER };
  }
  const sourcePath = cleanSourcePath(input.sourcePath);
  const note = `Daily verse by email. Double opt-in from ${sourcePath}.`;
  const allowLive = input.allowLive ?? liveMailAllowed();
  try {
    if (!(await spendPow(sql, input.powChallenge ?? "", now))) return { ok: false, error: TRY_LATER };
    if (await ipOverLimit(sql, bucket, now)) return SAME_REPLY;
    await sql`
      insert into verse_subscribe_hits (id, ip, created_at)
      values (${crypto.randomUUID()}, ${bucket}, ${now.toISOString()}::timestamptz)
    `;
    if ((await budgetUsed(sql, confirmNetBucket(input.ip, now))) >= CONFIRM_PER_NETWORK_PER_DAY) {
      console.error("[verse-mail] confirm network cap reached");
      return SAME_REPLY;
    }
    if (!(await confirmSliceOpen(sql, now))) {
      await noteConfirmCap(sql, now, input.apiKey, input.fetchImpl);
      return { ok: false, error: CONFIRM_CAP_MESSAGE };
    }
    let row = await findSubscriber(sql, email);
    if (row?.status === "confirmed") return SAME_REPLY;
    if (row && confirmsUsedToday(row, now) >= CONFIRM_PER_ADDRESS_PER_DAY) return SAME_REPLY;
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
    } else if (row.status === "unsubscribed") {
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
    if (!row) return { ok: false, error: TRY_LATER };
    return sendConfirmation({
      sql,
      row,
      secret,
      apiKey: input.apiKey,
      allowLive,
      now,
      fetchImpl: input.fetchImpl,
      site: input.site,
      address,
      ip: input.ip,
    });
  } catch (error) {
    if (input.hp?.trim()) return SAME_REPLY;
    const code = (error as { code?: string })?.code;
    if (isMissingRelation(error) || code === "42883") {
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
): Promise<
  | { state: "claimed"; attempt: number; recipientIds: string; idempotencyKey: string }
  | { state: "done" | "busy" }
> {
  await sql`
    insert into verse_mail_runs (date_key, status)
    values (${dateKey}, 'started')
    on conflict (date_key) do nothing
  `;
  // A known provider failure bumps the attempt and clears the stored key so
  // the next call is not stuck on a cached error. A crash mid-send keeps the
  // stored ids and key. A capped run stays claimable so the rest of the list
  // can go later the same day. Right-hand values are the row before this update.
  const claimed = await sql<{ attempt: number; recipient_ids: string; idempotency_key: string }>`
    update verse_mail_runs
    set status = 'sending',
        started_at = now(),
        attempt = case
          when status = 'partial' and stopped_reason = 'send failed' then attempt + 1
          else attempt
        end,
        recipient_ids = case
          when status = 'sending' and idempotency_key <> '' then recipient_ids
          else ''
        end,
        idempotency_key = case
          when status = 'sending' and idempotency_key <> '' then idempotency_key
          else ''
        end
    where date_key = ${dateKey}
      and (
        status in ('started', 'partial', 'capped')
        or (status = 'sending' and started_at < now() - interval '15 minutes')
      )
    returning attempt, recipient_ids, idempotency_key
  `;
  if (claimed.length > 0) {
    return {
      state: "claimed",
      attempt: Number(claimed[0]?.attempt ?? 0),
      recipientIds: claimed[0]?.recipient_ids ?? "",
      idempotencyKey: claimed[0]?.idempotency_key ?? "",
    };
  }
  const rows = await sql<{ status: string }>`
    select status from verse_mail_runs where date_key = ${dateKey}
  `;
  if (rows[0]?.status === "sent") return { state: "done" };
  return { state: "busy" };
}

async function finishRun(sql: Sql, dateKey: string, status: string, sent: number, skipped: number, reason: string) {
  await sql`
    update verse_mail_runs
    set status = ${status},
        sent_count = sent_count + ${sent},
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
  const site = opts.site ?? VERSE_SITE;
  const slugs = opts.slugs.filter(Boolean);
  if (known.length === 0 && slugs.length > 0) {
    for (const slug of slugs) {
      await sql`
        insert into verse_indexnow_log (slug, url, http_status)
        values (${slug}, ${`${site}/verse/${slug}`}, null)
        on conflict (slug) do nothing
      `;
    }
    console.info(`[indexnow] seeded ${slugs.length} existing verse page(s); not submitting the backlog`);
    return { submitted: [] as string[] };
  }
  const have = new Set(known.map((row) => row.slug));
  const fresh = slugs.filter((slug) => !have.has(slug));
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
    postalAddress?: string;
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

  const secret = opts.secret ?? verseLinkSecret();
  if (!secret) {
    console.error("[verse-mail] daily send skipped; VERSE_LINK_SECRET is not set");
    return { ok: false, sent: 0, skipped: 0, reason: "link secret missing", indexNow };
  }
  const address = fullPostalAddress(opts.postalAddress ?? process.env.VERSE_POSTAL_ADDRESS);
  if (!address) {
    console.error("[verse-mail] daily send skipped; VERSE_POSTAL_ADDRESS is not a street or PO box");
    return { ok: false, sent: 0, skipped: 0, reason: "postal address missing", indexNow };
  }

  const claim = await claimRun(sql, dateKey);
  if (claim.state !== "claimed") {
    const reason = claim.state === "busy" ? "already sending" : "already sent";
    return { ok: true, sent: 0, skipped: 0, reason, indexNow };
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
  const dayStart = utcDayStart(now);
  const monthStart = utcMonthStart(now);
  const sentToday = (await countKind(sql, dayStart, "daily")) + (await countDesk(sql, dayStart));
  const sentThisMonth = (await countKind(sql, monthStart, "daily")) + (await countDesk(sql, monthStart));
  const budget = verseSendAllowance({
    sentToday,
    sentThisMonth,
    confirmsToday: await budgetUsed(sql, confirmDayBucket(now)),
    confirmsThisMonth: await budgetUsed(sql, confirmMonthBucket(now)),
  });

  let chosen: { id: string; email: string }[];
  let idempotencyKey = claim.idempotencyKey;
  if (claim.idempotencyKey) {
    const wanted = new Set(claim.recipientIds.split(",").filter(Boolean));
    const replayed: { id: string; email: string }[] = [];
    for (const id of wanted) {
      const found = await sql<{ id: string; email: string }>`
        select id, email from verse_subscribers where id = ${id}
      `;
      const row = found[0];
      if (row && recipientAllowed(row.email, allowLive)) replayed.push(row);
    }
    chosen = replayed;
  } else {
    chosen = allowed.slice(0, budget.allowance);
    if (chosen.length === 0) {
      const reason = allowed.length === 0 ? "no confirmed subscribers" : budget.reason || "cap";
      await finishRun(sql, dateKey, allowed.length === 0 ? "sent" : "capped", 0, skippedLive, reason);
      return { ok: true, sent: 0, skipped: skippedLive, reason, indexNow };
    }
    idempotencyKey = `${batchIdempotencyKey(dateKey, chosen.map((row) => row.id))}/a${claim.attempt}`;
    const ids = chosen.map((row) => row.id).join(",");
    await sql`
      update verse_mail_runs
      set recipient_ids = ${ids}, idempotency_key = ${idempotencyKey}
      where date_key = ${dateKey}
    `;
  }

  if (chosen.length === 0) {
    await finishRun(sql, dateKey, "sent", 0, skippedLive, "replay empty");
    return { ok: true, sent: 0, skipped: skippedLive, reason: "replay empty", indexNow };
  }

  const exp = Math.floor(now.getTime() / 1000) + UNSUBSCRIBE_TTL_SEC;
  const messages = chosen.map((row) => {
    const token = signVerseToken({ email: row.email, purpose: "unsubscribe", exp }, secret);
    const mail = buildDailyVerseMail({ verse, token, site: opts.site, address });
    return { to: row.email, subject: mail.subject, text: mail.text, html: mail.html, headers: mail.headers };
  });
  const sent = await sendResendBatch({
    messages,
    apiKey: opts.apiKey,
    idempotencyKey,
    fetchImpl: opts.fetchImpl,
  });
  if (!sent.ok) {
    console.error(`[verse-mail] daily batch failed date=${dateKey}`);
    await finishRun(sql, dateKey, "partial", 0, skippedLive, "send failed");
    return { ok: false, sent: 0, skipped: skippedLive, reason: "send failed", indexNow };
  }

  let recorded = 0;
  for (const row of chosen) {
    const inserted = await sql<{ subscriber_id: string }>`
      insert into verse_mail_deliveries (date_key, subscriber_id, status, sent_at)
      values (${dateKey}, ${row.id}, 'sent', now())
      on conflict (date_key, subscriber_id) do nothing
      returning subscriber_id
    `;
    if (inserted.length === 0) continue;
    recorded += 1;
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
  const left = await sql<{ n: number }>`
    select count(*)::int as n from verse_subscribers
    where status = 'confirmed'
      and not exists (
        select 1 from verse_mail_deliveries d
        where d.subscriber_id = verse_subscribers.id
          and d.date_key = ${dateKey}
          and d.status = 'sent'
      )
  `;
  const stillHeld = asCount(left);
  const reason = stillHeld > 0 ? budget.reason || "cap" : "";
  await finishRun(
    sql,
    dateKey,
    stillHeld > 0 ? "capped" : "sent",
    recorded,
    skippedLive + stillHeld,
    reason,
  );
  console.info(`[verse-mail] sent date=${dateKey} count=${recorded} held=${stillHeld}`);
  return { ok: true, sent: recorded, skipped: skippedLive + stillHeld, reason, indexNow };
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

