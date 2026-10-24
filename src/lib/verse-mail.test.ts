import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { claimDeskSend, DESK_DAILY_CAP, deskSendAllowed, sendHardcodedOwnerEmail } from "./desk-mail.ts";
import {
  buildConfirmMail,
  buildDailyVerseMail,
  confirmDayBucket,
  confirmHardCeilings,
  confirmMonthBucket,
  confirmNetBucket,
  confirmNetwork,
  confirmSendAllowed,
  CONFIRM_CAP_MESSAGE,
  CONFIRM_MONTHLY_CAP,
  CONFIRM_PER_NETWORK_PER_DAY,
  DESK_DAILY_RESERVE,
  DESK_MONTHLY_RESERVE,
  fullPostalAddress,
  indexNowKeyFile,
  ipSubscribeLimited,
  issueVersePow,
  ministryToday,
  POW_ISSUE_PER_HOUR,
  recipientAllowed,
  remainingVerseRunDateKeys,
  RESEND_DAILY_CAP,
  RESEND_MONTHLY_CAP,
  SHARED_IP_BUCKET,
  signVerseToken,
  solveVersePow,
  subscribeIpBucket,
  verifyVersePow,
  verifyVerseToken,
  VERSE_DAILY_SEND_CEILING,
  VERSE_POW_HMAC_PREFIX,
  verseLinkSecret,
  verseMonthSlotsToHold,
  versePowKey,
  verseRunDateKey,
  verseSendAllowance,
  verseSlotsToHold,
  CONFIRM_DAILY_CAP,
} from "./verse-mail.ts";
import {
  confirmVerseToken,
  deliverDailyVerse,
  issueVerseSignupChallenge,
  requestVerseSubscription,
  unsubscribeVerseToken,
} from "./verse-mail.server.ts";
import type { VerseDay } from "./verse.ts";

const SECRET = "test-link-secret";
const QA = "delivered@resend.dev";
const POSTAL = "PO Box 10, Vidalia, GA 30474";

function gate(now: Date, ip?: string) {
  const issued = issueVersePow(SECRET, Math.floor(now.getTime() / 1000), 8, subscribeIpBucket(ip));
  return {
    powChallenge: issued.challenge,
    powNonce: solveVersePow(issued.challenge, issued.bits),
    postalAddress: POSTAL,
  };
}

function ask(sql: Sql, input: Parameters<typeof requestVerseSubscription>[1]) {
  const now = input.now ?? new Date();
  return requestVerseSubscription(sql, { ...gate(now, input.ip), ...input });
}

function toSql(pg: PGlite): Sql {
  const run = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  };
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run<T>(text, values);
  }) as Sql;
  sql.query = (text, params = []) => run(text, params);
  return sql;
}

async function db() {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(readFileSync(new URL("../../migrations/manual/0005_verse_subscribers.sql", import.meta.url), "utf8"));
  return { pg, sql: toSql(pg) };
}

function verse(dateKey: string): VerseDay {
  return {
    dateKey,
    reference: "Psalm 23:1",
    title: "The Lord is my shepherd",
    verseText: "The Lord is my shepherd; I shall not want.",
    translation: "KJV",
    livingTranslation: "God is looking after you. You are not on your own.",
    application: "Rest in that today.",
    heartMessage: "",
    prayer: "",
    publishedAt: `${dateKey}T11:00:00Z`,
  };
}

function mockFetch(calls: { url: string; body: string; headers: Record<string, string> }[]) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    calls.push({ url: String(url), body: String(init?.body ?? ""), headers });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
}

describe("verse mail tokens and caps", () => {
  it("signs a confirm token and rejects a tampered one", () => {
    const now = 1_700_000_000;
    const token = signVerseToken({ email: " Ada@Example.com ", purpose: "confirm", exp: now + 100 }, SECRET);
    const ok = verifyVerseToken(token, SECRET, now);
    assert.equal(ok.ok && ok.email, "ada@example.com");
    assert.equal(ok.ok && ok.purpose, "confirm");
    assert.equal(verifyVerseToken(token, "other", now).ok, false);
    assert.equal(verifyVerseToken(`${token}x`, SECRET, now).ok, false);
    assert.equal(verifyVerseToken(token, SECRET, now + 500).ok, false);
  });

  it("stops verse sends below the free-plan caps", () => {
    assert.equal(verseSendAllowance({ sentToday: 0, sentThisMonth: 0 }).allowance, VERSE_DAILY_SEND_CEILING);
    assert.equal(VERSE_DAILY_SEND_CEILING < RESEND_DAILY_CAP, true);
    assert.equal(verseSendAllowance({ sentToday: RESEND_DAILY_CAP - DESK_DAILY_RESERVE, sentThisMonth: 0 }).allowance, 0);
    assert.equal(
      verseSendAllowance({ sentToday: 0, sentThisMonth: RESEND_MONTHLY_CAP - DESK_MONTHLY_RESERVE }).allowance,
      0,
    );
    const withDesk = verseSendAllowance({ sentToday: 10, sentThisMonth: 171 });
    assert.equal(withDesk.allowance, VERSE_DAILY_SEND_CEILING);
    assert.ok(withDesk.allowance + 10 + DESK_DAILY_RESERVE <= RESEND_DAILY_CAP);
    assert.ok(VERSE_DAILY_SEND_CEILING * 30 + CONFIRM_MONTHLY_CAP <= RESEND_MONTHLY_CAP - DESK_MONTHLY_RESERVE);
  });

  it("requires its own link secret and a street or PO box", () => {
    assert.equal(verseLinkSecret({ VERSE_LINK_SECRET: "  verse-secret  " }), "verse-secret");
    assert.equal(verseLinkSecret({ VERSE_LINK_SECRET: "", BETTER_AUTH_SECRET: "auth-secret" } as { VERSE_LINK_SECRET?: string }), "");
    assert.equal(fullPostalAddress("Vidalia, Georgia"), "");
    assert.equal(fullPostalAddress("Vidalia, GA 30474"), "");
    assert.equal(fullPostalAddress("Church Street, Vidalia, GA 30474"), "");
    assert.equal(fullPostalAddress("United Under God, Inc."), "");
    assert.equal(fullPostalAddress(POSTAL), POSTAL);
    assert.equal(fullPostalAddress("123 Church Street, Vidalia, GA 30474"), "123 Church Street, Vidalia, GA 30474");
    assert.equal(subscribeIpBucket(""), SHARED_IP_BUCKET);
    assert.equal(subscribeIpBucket("   "), SHARED_IP_BUCKET);
    assert.equal(subscribeIpBucket("203.0.113.9"), "203.0.113.9");
    assert.equal(subscribeIpBucket("2001:db8:85a3:1::8a2e"), subscribeIpBucket("2001:db8:85a3:1:ffff::1"));
    assert.notEqual(subscribeIpBucket("2001:db8:85a3:1::1"), subscribeIpBucket("2001:db8:85a3:2::1"));
  });

  it("keeps confirmations in their own slice", () => {
    assert.equal(CONFIRM_DAILY_CAP, 15);
    assert.equal(CONFIRM_MONTHLY_CAP, 450);
    assert.equal(CONFIRM_PER_NETWORK_PER_DAY, 3);
    assert.equal(confirmHardCeilings().dailyHard, RESEND_DAILY_CAP - DESK_DAILY_RESERVE);
    assert.equal(confirmHardCeilings().monthlyHard, RESEND_MONTHLY_CAP - DESK_MONTHLY_RESERVE);
    assert.equal(
      confirmHardCeilings({ verseHold: VERSE_DAILY_SEND_CEILING }).dailyHard,
      RESEND_DAILY_CAP - DESK_DAILY_RESERVE - VERSE_DAILY_SEND_CEILING,
    );
    assert.equal(confirmSendAllowed({ confirmsToday: 0, confirmsThisMonth: 0, otherToday: 0, otherThisMonth: 0 }), true);
    assert.equal(confirmSendAllowed({ confirmsToday: CONFIRM_DAILY_CAP, confirmsThisMonth: 0, otherToday: 0, otherThisMonth: 0 }), false);
    assert.equal(confirmSendAllowed({ confirmsToday: 0, confirmsThisMonth: CONFIRM_MONTHLY_CAP, otherToday: 0, otherThisMonth: 0 }), false);
    assert.equal(confirmSendAllowed({ confirmsToday: 0, confirmsThisMonth: 0, otherToday: 80, otherThisMonth: 0 }), true);
    assert.equal(
      confirmSendAllowed({
        confirmsToday: 0,
        confirmsThisMonth: 0,
        otherToday: 0,
        otherThisMonth: 0,
        verseHold: VERSE_DAILY_SEND_CEILING,
      }),
      true,
    );
    assert.equal(
      confirmSendAllowed({
        confirmsToday: CONFIRM_DAILY_CAP,
        confirmsThisMonth: 0,
        otherToday: 0,
        otherThisMonth: 0,
        verseHold: VERSE_DAILY_SEND_CEILING,
      }),
      false,
    );
    const withConfirms = verseSendAllowance({
      sentToday: 0,
      sentThisMonth: 0,
      confirmsToday: CONFIRM_DAILY_CAP,
      confirmsThisMonth: 0,
    });
    assert.equal(withConfirms.allowance, VERSE_DAILY_SEND_CEILING);
    assert.ok(CONFIRM_DAILY_CAP + withConfirms.allowance + DESK_DAILY_RESERVE <= RESEND_DAILY_CAP);
    assert.equal(verseSlotsToHold(120, false), VERSE_DAILY_SEND_CEILING);
    assert.equal(verseSlotsToHold(12, false), 12);
    assert.equal(verseSlotsToHold(120, true), 0);
    assert.equal(ipSubscribeLimited(5, 0), true);
    assert.equal(ipSubscribeLimited(4, 20), true);
    assert.equal(ipSubscribeLimited(4, 19), false);
    assert.equal(confirmNetwork("203.0.113.9"), "203.0.113.0/24");
    assert.equal(confirmNetwork("203.0.113.200"), confirmNetwork("203.0.113.1"));
    assert.notEqual(confirmNetwork("203.0.113.9"), confirmNetwork("203.0.114.9"));
    assert.equal(confirmNetwork("::ffff:203.0.113.9"), "203.0.113.0/24");
    assert.equal(confirmNetwork("2001:db8:85a3:1::1"), confirmNetwork("2001:db8:85a3:ffff::2"));
    assert.notEqual(confirmNetwork("2001:db8:85a3::1"), confirmNetwork("2001:db8:85a4::1"));
    assert.equal(confirmNetwork(""), SHARED_IP_BUCKET);
    assert.equal(confirmNetwork("999.1.1.1"), SHARED_IP_BUCKET);
  });

  it("signs proof of work with a key derived from the link secret", () => {
    const now = 1_700_000_000;
    const bucket = subscribeIpBucket("203.0.113.9");
    const key = versePowKey(SECRET);
    assert.equal(key.length > 0, true);
    assert.notEqual(key, SECRET);
    assert.equal(key, createHmac("sha256", SECRET).update(VERSE_POW_HMAC_PREFIX).digest("base64url"));
    const issued = issueVersePow(SECRET, now, 8, bucket);
    const nonce = solveVersePow(issued.challenge, issued.bits);
    assert.equal(verifyVersePow(issued.challenge, nonce, SECRET, now, bucket), true);
    assert.equal(verifyVersePow(issued.challenge, nonce, SECRET, now, subscribeIpBucket("198.51.100.9")), false);
    const payload = issued.challenge.slice(0, issued.challenge.indexOf("."));
    const rawSig = createHmac("sha256", SECRET).update(payload).digest("base64url");
    assert.equal(verifyVersePow(`${payload}.${rawSig}`, nonce, SECRET, now, bucket), false);
    const token = signVerseToken({ email: QA, purpose: "confirm", exp: now + 100 }, SECRET);
    assert.equal(verifyVerseToken(token, SECRET, now).ok, true);
    assert.equal(verifyVerseToken(token, key, now).ok, false);
  });

  it("mails QA addresses unless live sending is explicitly allowed", () => {
    assert.equal(recipientAllowed(QA, false), true);
    assert.equal(recipientAllowed("neighbor@example.com", false), false);
    assert.equal(recipientAllowed("neighbor@example.com", true), true);
  });

  it("serves the IndexNow key file only at the matching path", () => {
    assert.equal(indexNowKeyFile("/indexnowkey.txt", "indexnowkey")?.body, "indexnowkey");
    assert.equal(indexNowKeyFile("/other.txt", "indexnowkey"), null);
    assert.equal(indexNowKeyFile("/short.txt", "short"), null);
    assert.equal(indexNowKeyFile("/indexnowkey.txt", ""), null);
  });

  it("uses Vidalia's calendar day, not UTC", () => {
    assert.equal(ministryToday(new Date("2026-10-23T03:30:00Z")), "2026-10-22");
    assert.equal(ministryToday(new Date("2026-10-23T13:00:00Z")), "2026-10-23");
  });

  it("puts a one-click unsubscribe header on the letter and keeps copyrighted text out", () => {
    const token = signVerseToken({ email: QA, purpose: "unsubscribe", exp: 2_000_000_000 }, SECRET);
    const mail = buildDailyVerseMail({
      verse: { ...verse("2026-10-23"), translation: "NIV", verseText: "SECRET COPYRIGHT LINE" },
      token,
      address: POSTAL,
    });
    assert.match(mail.headers["List-Unsubscribe"], /<mailto:lincoln@unitedundergod\.org\?subject=/);
    assert.match(mail.headers["List-Unsubscribe"], /<https:\/\/www\.unitedundergod\.org\/api\/verse\/unsubscribe\?token=/);
    assert.equal(mail.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
    assert.equal(mail.text.includes("SECRET COPYRIGHT LINE"), false);
    assert.match(mail.text, /God is looking after you/);
    assert.match(mail.html, /Stop the daily verse/);
    const confirm = buildConfirmMail({
      confirmToken: signVerseToken({ email: QA, purpose: "confirm", exp: 2_000_000_000 }, SECRET),
      unsubscribeToken: token,
      address: POSTAL,
    });
    assert.match(confirm.text, /Confirm:/);
    assert.equal(confirm.text.includes("Resend"), false);
  });
});

describe("verse subscription store", () => {
  it("keeps a person pending until they confirm, then sends once", async () => {
    const { pg, sql } = await db();
    const rls = await pg.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname = 'verse_subscribers'",
    );
    assert.equal(rls.rows[0]?.relrowsecurity, true);

    const calls: { url: string; body: string; headers: Record<string, string> }[] = [];
    const now = new Date("2026-10-23T13:05:00Z");
    const joined = await ask(sql, {
      email: `  ${QA} `,
      sourcePath: "/verse/psalm-23-1",
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: mockFetch(calls),
    });
    assert.equal(joined.ok && joined.state, "pending");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    const payload = JSON.parse(calls[0].body) as { to: string[]; headers: Record<string, string> };
    assert.deepEqual(payload.to, [QA]);
    assert.match(payload.headers["List-Unsubscribe"], /api\/verse\/unsubscribe/);
    assert.match(calls[0].headers["idempotency-key"], /^verse-confirm\//);

    const rows = await sql<{ status: string }>`select status from verse_subscribers`;
    assert.equal(rows[0]?.status, "pending");

    const blocked = await ask(sql, {
      email: "neighbor@example.com",
      sourcePath: "/verse",
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: mockFetch(calls),
    });
    assert.equal(blocked.ok, false);
    assert.equal(calls.length, 1);

    const token = signVerseToken(
      { email: QA, purpose: "confirm", exp: Math.floor(now.getTime() / 1000) + 3600 },
      SECRET,
    );
    const confirmed = await confirmVerseToken(sql, token, { secret: SECRET, now });
    assert.equal(confirmed.ok, true);
    const after = await sql<{ status: string }>`select status from verse_subscribers where email = ${QA}`;
    assert.equal(after[0]?.status, "confirmed");

    const day = verse("2026-10-23");
    const deliverCalls: { url: string; body: string }[] = [];
    const first = await deliverDailyVerse(sql, {
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      indexNowKey: "",
      postalAddress: POSTAL,
      days: [day],
      fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
        const stored = await sql<{ idempotency_key: string; recipient_ids: string }>`
          select idempotency_key, recipient_ids from verse_mail_runs
        `;
        assert.ok(stored[0]?.idempotency_key);
        assert.ok(stored[0]?.recipient_ids);
        deliverCalls.push({ url: String(url), body: String(init?.body ?? "") });
        const headers = Object.fromEntries(new Headers(init?.headers).entries());
        assert.equal(headers["idempotency-key"], stored[0]?.idempotency_key);
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(first.sent, 1);
    assert.equal(deliverCalls.length, 1);
    assert.equal(deliverCalls[0].url, "https://api.resend.com/emails/batch");
    const batch = JSON.parse(deliverCalls[0].body) as { to: string[]; text: string; headers: Record<string, string> }[];
    assert.equal(batch.length, 1);
    assert.deepEqual(batch[0].to, [QA]);
    assert.match(batch[0].text, /Read the full page: https:\/\/www\.unitedundergod\.org\/verse\/psalm-23-1/);
    assert.equal(batch[0].headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");

    const second = await deliverDailyVerse(sql, {
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      indexNowKey: "indexnowkey",
      postalAddress: POSTAL,
      days: [day],
      fetchImpl: (async () => {
        throw new Error("must not send twice");
      }) as typeof fetch,
    });
    assert.equal(second.reason, "already sent");
    assert.equal(second.sent, 0);

    const unsubToken = signVerseToken(
      { email: QA, purpose: "unsubscribe", exp: Math.floor(now.getTime() / 1000) + 3600 },
      SECRET,
    );
    const stopped = await unsubscribeVerseToken(sql, unsubToken, { secret: SECRET, now });
    assert.equal(stopped.ok, true);
    const gone = await sql<{ status: string }>`select status from verse_subscribers where email = ${QA}`;
    assert.equal(gone[0]?.status, "unsubscribed");
    await pg.close();
  });

  it("does not call the network for a real address outside production", async () => {
    const { pg, sql } = await db();
    let called = false;
    const result = await ask(sql, {
      email: "neighbor@example.com",
      sourcePath: "/verse",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: (async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(result.ok, false);
    assert.equal(called, false);
    await pg.close();
  });

  it("holds the rest of the list when the daily ceiling is already used", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T13:05:00Z");
    await sql`
      insert into verse_send_log (id, kind, status, created_at)
      select 'log-' || g, 'daily', 'sent', ${now.toISOString()}::timestamptz
      from generate_series(1, ${RESEND_DAILY_CAP - DESK_DAILY_RESERVE}) as g
    `;
    await sql`
      insert into verse_subscribers (id, email, status, confirmed_at)
      values ('sub-1', ${QA}, 'confirmed', now())
    `;
    let called = false;
    const result = await deliverDailyVerse(sql, {
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      indexNowKey: "not a key",
      postalAddress: POSTAL,
      days: [verse("2026-10-23")],
      fetchImpl: (async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(result.sent, 0);
    assert.equal(called, false);
    assert.match(result.reason, /cap/);
    await pg.close();
  });

  it("gives one reply for a new address, a confirmed address, and a rate limit", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T13:05:00Z");
    const calls: string[] = [];
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push(String(init?.body ?? ""));
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const first = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl,
    });
    assert.equal(first.ok, true);
    const token = signVerseToken(
      { email: QA, purpose: "confirm", exp: Math.floor(now.getTime() / 1000) + 3600 },
      SECRET,
    );
    await confirmVerseToken(sql, token, { secret: SECRET, now });
    const again = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl,
    });
    await sql`
      update verse_confirm_budget
      set used = ${CONFIRM_DAILY_CAP}
      where bucket = ${confirmDayBucket(now)}
    `;
    const capped = await ask(sql, {
      email: "bounced@resend.dev",
      sourcePath: "/verse",
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl,
    });
    assert.equal(again.ok && again.message, first.ok ? first.message : "");
    assert.equal(capped.ok, false);
    assert.equal(capped.ok === false && capped.error, CONFIRM_CAP_MESSAGE);
    assert.equal(calls.length, 2);
    const owner = JSON.parse(calls[1] ?? "{}") as { to?: string[] };
    assert.deepEqual(owner.to, ["lincoln@unitedundergod.org"]);
    await ask(sql, {
      email: "complained@resend.dev",
      sourcePath: "/verse",
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl,
    });
    assert.equal(calls.length, 2);
    await pg.close();
  });

  it("stops a fourth confirmation to the same address on the same day", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T15:00:00Z");
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    for (let n = 0; n < 4; n += 1) {
      const result = await ask(sql, {
        email: QA,
        sourcePath: "/verse",
        now,
        ip: `203.0.${120 + n}.1`,
        apiKey: "re_test",
        secret: SECRET,
        allowLive: false,
        fetchImpl,
      });
      assert.equal(result.ok && result.message.includes("Check your inbox"), true);
    }
    assert.equal(calls, 3);
    await pg.close();
  });

  it("limits sign-up attempts from one IP", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T16:00:00Z");
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    for (let n = 0; n < 5; n += 1) {
      const result = await ask(sql, {
        email: `person${n}@example.com`,
        sourcePath: "/verse",
        now,
        ip: "203.0.113.9",
        apiKey: "re_test",
        secret: SECRET,
        allowLive: false,
        fetchImpl,
      });
      assert.equal(result.ok, false);
    }
    const blocked = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now,
      ip: "203.0.113.9",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl,
    });
    assert.equal(blocked.ok && blocked.message.includes("Check your inbox"), true);
    assert.equal(calls, 0);
    await pg.close();
  });

  it("ignores a sign-up that has not solved the proof of work", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T17:00:00Z");
    let calls = 0;
    const result = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now,
      ip: "203.0.113.50",
      powChallenge: "not-a-challenge",
      powNonce: "1",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: (async () => {
        calls += 1;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(result.ok, false);
    assert.equal(calls, 0);
    const hits = await sql<{ n: number }>`select count(*)::int as n from verse_subscribe_hits`;
    assert.equal(hits[0]?.n, 0);
    const used = await sql<{ n: number }>`select count(*)::int as n from verse_pow_used`;
    assert.equal(used[0]?.n, 0);
    await pg.close();
  });

  it("checks the honeypot before the proof of work and does not spend an IP hit", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T17:10:00Z");
    let calls = 0;
    const result = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now,
      ip: "203.0.113.51",
      hp: "https://example.invalid",
      powChallenge: "not-a-challenge",
      powNonce: "1",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: (async () => {
        calls += 1;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(result.ok && result.message.includes("Check your inbox"), true);
    assert.equal(calls, 0);
    const hits = await sql<{ n: number }>`select count(*)::int as n from verse_subscribe_hits`;
    assert.equal(hits[0]?.n, 0);
    const used = await sql<{ n: number }>`select count(*)::int as n from verse_pow_used`;
    assert.equal(used[0]?.n, 0);
    await pg.close();
  });

  it("shares one bucket when the caller address is missing and groups IPv6 by /64", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T18:00:00Z");
    const fetchImpl = (async () => new Response("{}", { status: 200 })) as typeof fetch;
    for (let n = 0; n < 5; n += 1) {
      await ask(sql, {
        email: `person${n}@example.com`,
        sourcePath: "/verse",
        now,
        ip: "",
        apiKey: "re_test",
        secret: SECRET,
        allowLive: false,
        fetchImpl,
      });
    }
    const shared = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now,
      ip: "",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl,
    });
    assert.equal(shared.ok && shared.message.includes("Check your inbox"), true);
    const buckets = await sql<{ ip: string }>`select distinct ip from verse_subscribe_hits`;
    assert.deepEqual(buckets.map((row) => row.ip), [SHARED_IP_BUCKET]);

    for (let n = 0; n < 5; n += 1) {
      await ask(sql, {
        email: `v6${n}@example.com`,
        sourcePath: "/verse",
        now,
        ip: `2001:db8:85a3:4::${n}`,
        apiKey: "re_test",
        secret: SECRET,
        allowLive: false,
        fetchImpl,
      });
    }
    const samePrefix = await ask(sql, {
      email: "bounced@resend.dev",
      sourcePath: "/verse",
      now,
      ip: "2001:db8:85a3:4:ffff::9",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl,
    });
    assert.equal(samePrefix.ok && samePrefix.message.includes("Check your inbox"), true);
    await pg.close();
  });

  it("does not send a confirmation without a street or PO box", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T19:00:00Z");
    let calls = 0;
    const result = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now,
      postalAddress: "Vidalia, GA 30474",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: (async () => {
        calls += 1;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.error, /not open just yet/);
    assert.equal(calls, 0);
    const hits = await sql<{ n: number }>`select count(*)::int as n from verse_subscribe_hits`;
    assert.equal(hits[0]?.n, 0);
    await pg.close();
  });

  it("does not send the verse without a street or PO box", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T13:05:00Z");
    await sql`
      insert into verse_subscribers (id, email, status, confirmed_at)
      values ('sub-1', ${QA}, 'confirmed', now())
    `;
    let called = false;
    const result = await deliverDailyVerse(sql, {
      now,
      apiKey: "re_test",
      secret: "",
      allowLive: false,
      postalAddress: "Vidalia, Georgia",
      days: [verse("2026-10-23")],
      fetchImpl: (async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(result.reason, "link secret missing");
    const postal = await deliverDailyVerse(sql, {
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      postalAddress: "Vidalia, Georgia",
      days: [verse("2026-10-23")],
      fetchImpl: (async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(postal.reason, "postal address missing");
    assert.equal(called, false);
    const runs = await sql<{ n: number }>`select count(*)::int as n from verse_mail_runs`;
    assert.equal(runs[0]?.n, 0);
    await pg.close();
  });

  it("resumes a capped run later the same day", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T13:05:00Z");
    await sql`
      insert into verse_subscribers (id, email, status, confirmed_at)
      select 'sub-' || g, 'subscriber-' || g || '@example.com', 'confirmed', ${now.toISOString()}::timestamptz
      from generate_series(1, 81) as g
    `;
    const seen = new Set<string>();
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      const batch = JSON.parse(String(init?.body ?? "[]")) as { to: string[] }[];
      for (const message of batch) seen.add(message.to[0] ?? "");
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const first = await deliverDailyVerse(sql, {
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: true,
      postalAddress: POSTAL,
      days: [verse("2026-10-23")],
      fetchImpl,
    });
    assert.equal(first.sent, 80);
    assert.match(first.reason, /cap/);
    const second = await deliverDailyVerse(sql, {
      now: new Date(now.getTime() + 60_000),
      apiKey: "re_test",
      secret: SECRET,
      allowLive: true,
      postalAddress: POSTAL,
      days: [verse("2026-10-23")],
      fetchImpl,
    });
    assert.equal(second.sent, 1);
    assert.equal(seen.size, 81);
    await pg.close();
  });

  it("seeds existing verse pages and submits only a page that is new after that", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T13:05:00Z");
    const older = [
      { ...verse("2026-10-21"), reference: "John 1:1" },
      { ...verse("2026-10-22"), reference: "John 3:16" },
    ];
    const seeded = await deliverDailyVerse(sql, {
      now,
      secret: SECRET,
      postalAddress: POSTAL,
      indexNowKey: "indexnowkey",
      days: older,
      fetchImpl: (async () => {
        throw new Error("backlog must not be submitted");
      }) as typeof fetch,
    });
    assert.equal(seeded.reason, "no verse published");
    const rows = await sql<{ slug: string; http_status: number | null }>`
      select slug, http_status from verse_indexnow_log order by slug
    `;
    assert.deepEqual(rows.map((row) => row.slug), ["john-1-1", "john-3-16"]);
    assert.equal(rows[0]?.http_status, null);
    let body = "";
    const fresh = await deliverDailyVerse(sql, {
      now,
      secret: SECRET,
      postalAddress: POSTAL,
      indexNowKey: "indexnowkey",
      days: [...older, { ...verse("2026-10-20"), reference: "Romans 8:28" }],
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        body = String(init?.body ?? "");
        return new Response("{}", { status: 202 });
      }) as typeof fetch,
    });
    assert.equal(fresh.indexNow, 1);
    assert.match(body, /romans-8-28/);
    assert.equal(body.includes("john-1-1"), false);
    await pg.close();
  });

  it("replays the stored idempotency key after a crash", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T13:05:00Z");
    await sql`
      insert into verse_subscribers (id, email, status, confirmed_at)
      values ('sub-1', ${QA}, 'confirmed', now())
    `;
    await sql`
      insert into verse_mail_runs (date_key, status, recipient_ids, idempotency_key, started_at)
      values (
        '2026-10-23',
        'sending',
        'sub-1',
        'verse-daily/2026-10-23/stored',
        ${new Date(now.getTime() - 16 * 60 * 1000).toISOString()}::timestamptz
      )
    `;
    let key = "";
    const result = await deliverDailyVerse(sql, {
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      postalAddress: POSTAL,
      days: [verse("2026-10-23")],
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        key = new Headers(init?.headers).get("idempotency-key") ?? "";
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(result.sent, 1);
    assert.equal(key, "verse-daily/2026-10-23/stored");
    await pg.close();
  });
});

describe("verse confirm defenses", () => {
  it("stops a fourth confirmation from the same IPv4 /24 and the same IPv6 /48", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T21:00:00Z");
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const base = {
      sourcePath: "/verse",
      now,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: true,
      fetchImpl,
    };
    for (let n = 0; n < 3; n += 1) {
      const result = await ask(sql, { ...base, email: `v4-${n}@example.com`, ip: `203.0.113.${n + 1}` });
      assert.equal(result.ok, true);
    }
    const blockedV4 = await ask(sql, { ...base, email: "v4-more@example.com", ip: "203.0.113.200" });
    assert.equal(blockedV4.ok && blockedV4.message.includes("Check your inbox"), true);
    assert.equal(calls, 3);
    const otherV4 = await ask(sql, { ...base, email: "v4-other@example.com", ip: "203.0.114.8" });
    assert.equal(otherV4.ok, true);
    assert.equal(calls, 4);

    for (let n = 0; n < 3; n += 1) {
      const result = await ask(sql, { ...base, email: `v6-${n}@example.com`, ip: `2001:db8:85a3:${n}::1` });
      assert.equal(result.ok, true);
    }
    const blockedV6 = await ask(sql, { ...base, email: "v6-more@example.com", ip: "2001:db8:85a3:ffff::9" });
    assert.equal(blockedV6.ok && blockedV6.message.includes("Check your inbox"), true);
    assert.notEqual(blockedV6.ok === false && blockedV6.error, CONFIRM_CAP_MESSAGE);
    const otherV6 = await ask(sql, { ...base, email: "v6-other@example.com", ip: "2001:db8:85a4::1" });
    assert.equal(otherV6.ok, true);
    assert.equal(calls, 8);
    const nets = await sql<{ bucket: string; used: number }>`
      select bucket, used from verse_confirm_budget where bucket like 'net:%' order by bucket
    `;
    assert.deepEqual(
      nets.map((row) => `${row.bucket}=${Number(row.used)}`).sort(),
      [
        `${confirmNetBucket("203.0.113.1", now)}=${CONFIRM_PER_NETWORK_PER_DAY}`,
        `${confirmNetBucket("203.0.114.8", now)}=1`,
        `${confirmNetBucket("2001:db8:85a3::1", now)}=${CONFIRM_PER_NETWORK_PER_DAY}`,
        `${confirmNetBucket("2001:db8:85a4::1", now)}=1`,
      ].sort(),
    );
    await pg.close();
  });

  it("reserves the last global confirm before sending, and a failed send gives the slot back", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T22:00:00Z");
    await sql`
      insert into verse_confirm_budget (bucket, used)
      values (${confirmDayBucket(now)}, ${CONFIRM_DAILY_CAP - 1})
    `;
    const bodies: string[] = [];
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ""));
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const [first, second] = await Promise.all([
      ask(sql, {
        email: QA,
        sourcePath: "/verse",
        now,
        ip: "203.0.113.10",
        apiKey: "re_test",
        secret: SECRET,
        allowLive: false,
        fetchImpl,
      }),
      ask(sql, {
        email: "bounced@resend.dev",
        sourcePath: "/verse",
        now,
        ip: "198.51.100.10",
        apiKey: "re_test",
        secret: SECRET,
        allowLive: false,
        fetchImpl,
      }),
    ]);
    const outcomes = [first, second];
    assert.equal(outcomes.filter((result) => result.ok).length, 1);
    assert.equal(outcomes.filter((result) => !result.ok && result.error === CONFIRM_CAP_MESSAGE).length, 1);
    const subscriberSends = bodies.filter((body) => body.includes(QA) || body.includes("bounced@resend.dev"));
    assert.equal(subscriberSends.length, 1);
    const day = await sql<{ used: number }>`
      select used from verse_confirm_budget where bucket = ${confirmDayBucket(now)}
    `;
    assert.equal(Number(day[0]?.used), CONFIRM_DAILY_CAP);

    const monthFull = await ask(sql, {
      email: "complained@resend.dev",
      sourcePath: "/verse",
      now,
      ip: "192.0.2.10",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl,
    });
    assert.equal(monthFull.ok, false);
    await sql`
      update verse_confirm_budget set used = ${CONFIRM_MONTHLY_CAP} where bucket = ${confirmMonthBucket(now)}
    `;
    await sql`
      update verse_confirm_budget set used = 0 where bucket = ${confirmDayBucket(now)}
    `;
    const monthBlocked = await ask(sql, {
      email: "complained@resend.dev",
      sourcePath: "/verse",
      now,
      ip: "192.0.2.11",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl,
    });
    assert.equal(monthBlocked.ok === false && monthBlocked.error, CONFIRM_CAP_MESSAGE);

    let fail = true;
    let releasedCalls = 0;
    const releaseFetch = (async () => {
      if (fail) return new Response("no", { status: 500 });
      releasedCalls += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const later = new Date("2026-11-02T15:00:00Z");
    const failed = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now: later,
      ip: "203.0.115.4",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: releaseFetch,
    });
    assert.equal(failed.ok === false && failed.error.includes("try again"), true);
    const released = await sql<{ used: number }>`
      select used from verse_confirm_budget where bucket = ${confirmDayBucket(later)}
    `;
    assert.equal(Number(released[0]?.used), 0);
    fail = false;
    const retried = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now: later,
      ip: "203.0.115.4",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: releaseFetch,
    });
    assert.equal(retried.ok, true);
    assert.equal(releasedCalls, 1);
    const kept = await sql<{ used: number }>`
      select used from verse_confirm_budget where bucket = ${confirmDayBucket(later)}
    `;
    assert.equal(Number(kept[0]?.used), 1);
    await pg.close();
  });

  it("drops proof-of-work rows older than 10 minutes and refuses a challenge from another bucket", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T23:00:00Z");
    const old = new Date(now.getTime() - 10 * 60 * 1000 - 1000).toISOString();
    const recent = new Date(now.getTime() - 9 * 60 * 1000).toISOString();
    await sql`
      insert into verse_pow_used (challenge, used_at)
      values ('old-challenge', ${old}::timestamptz), ('recent-challenge', ${recent}::timestamptz)
    `;
    await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now,
      ip: "203.0.113.40",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: (async () => new Response("{}", { status: 200 })) as typeof fetch,
    });
    const left = await sql<{ challenge: string }>`select challenge from verse_pow_used order by challenge`;
    const challenges = left.map((row) => row.challenge);
    assert.equal(challenges.includes("old-challenge"), false);
    assert.equal(challenges.includes("recent-challenge"), true);
    assert.equal(challenges.length, 2);

    const issued = issueVersePow(SECRET, Math.floor(now.getTime() / 1000), 8, subscribeIpBucket("203.0.113.40"));
    const stolen = await requestVerseSubscription(sql, {
      email: "bounced@resend.dev",
      sourcePath: "/verse",
      now,
      ip: "198.51.100.40",
      powChallenge: issued.challenge,
      powNonce: solveVersePow(issued.challenge, issued.bits),
      postalAddress: POSTAL,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: (async () => new Response("{}", { status: 200 })) as typeof fetch,
    });
    assert.equal(stolen.ok, false);
    const hits = await sql<{ ip: string }>`select ip from verse_subscribe_hits`;
    assert.deepEqual(hits.map((row) => row.ip), [subscribeIpBucket("203.0.113.40")]);
    await pg.close();
  });

  it("limits challenge issuance to 30 an hour for one IP bucket and logs the block", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T12:00:00Z");
    const logs: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      const stale = new Date(now.getTime() - 61 * 60 * 1000).toISOString();
      for (let n = 0; n < POW_ISSUE_PER_HOUR; n += 1) {
        await sql`
          insert into verse_pow_issued (id, ip, created_at)
          values (${`stale-${n}`}, ${subscribeIpBucket("203.0.113.70")}, ${stale}::timestamptz)
        `;
      }
      let first = { challenge: "", bits: 16 };
      for (let n = 0; n < POW_ISSUE_PER_HOUR; n += 1) {
        const issued = await issueVerseSignupChallenge(sql, {
          ip: "203.0.113.70",
          secret: SECRET,
          postalAddress: POSTAL,
          now,
        });
        assert.equal(issued.ok, true);
        if (issued.ok && n === 0) first = { challenge: issued.challenge, bits: issued.bits };
      }
      const blocked = await issueVerseSignupChallenge(sql, {
        ip: "203.0.113.70",
        secret: SECRET,
        postalAddress: POSTAL,
        now,
      });
      assert.equal(blocked.ok, false);
      assert.match(logs.join("\n"), /\[verse-mail\] pow challenge limit reached bucket=203\.0\.113\.70/);
      const other = await issueVerseSignupChallenge(sql, {
        ip: "198.51.100.70",
        secret: SECRET,
        postalAddress: POSTAL,
        now,
      });
      assert.equal(other.ok, true);
      const bucket = subscribeIpBucket("203.0.113.70");
      const nonce = solveVersePow(first.challenge, first.bits);
      const nowSec = Math.floor(now.getTime() / 1000);
      assert.equal(verifyVersePow(first.challenge, nonce, SECRET, nowSec, bucket), true);
      assert.equal(verifyVersePow(first.challenge, nonce, SECRET, nowSec, subscribeIpBucket("198.51.100.70")), false);
    } finally {
      console.error = original;
    }
    await pg.close();
  });

  it("keeps the morning verse and the desk reserve after the 8 PM Eastern rollover", async () => {
    const { pg, sql } = await db();
    // 8:30 PM EDT is 00:30 UTC the next day. The UTC quota just reset.
    // The 9 AM Eastern verse run (13:00 UTC) has not happened yet.
    const overnight = new Date("2026-10-24T00:30:00.000Z");
    assert.equal(overnight.getUTCHours() === 0 && ministryToday(overnight) === "2026-10-23", true);
    assert.equal(verseRunDateKey(overnight), "2026-10-24");
    await sql`
      insert into verse_subscribers (id, email, status, confirmed_at)
      select 'reader-' || g, 'reader-' || g || '@example.com', 'confirmed', ${overnight.toISOString()}::timestamptz
      from generate_series(1, ${VERSE_DAILY_SEND_CEILING}) as g
    `;
    let confirmSends = 0;
    let deskSends = 0;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as { to?: string[] };
      const to = payload.to ?? [];
      if (to.includes("lincoln@unitedundergod.org")) deskSends += 1;
      else confirmSends += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    for (let n = 0; n < 40; n += 1) {
      await ask(sql, {
        email: `night-${n}@example.com`,
        sourcePath: "/verse",
        now: overnight,
        ip: `203.0.${n}.1`,
        apiKey: "re_test",
        secret: SECRET,
        allowLive: true,
        fetchImpl,
      });
    }
    assert.equal(confirmSends, CONFIRM_DAILY_CAP);
    assert.ok(confirmSends < 40);
    const morning = new Date("2026-10-24T13:00:00.000Z");
    assert.equal(ministryToday(morning), "2026-10-24");
    let verseSends = 0;
    const delivered = await deliverDailyVerse(sql, {
      now: morning,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: true,
      postalAddress: POSTAL,
      days: [verse("2026-10-24")],
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        const batch = JSON.parse(String(init?.body ?? "[]")) as unknown[];
        verseSends += batch.length;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(delivered.sent, VERSE_DAILY_SEND_CEILING);
    assert.equal(verseSends, VERSE_DAILY_SEND_CEILING);
    // 15 confirms + 80 verse letters fill the provider cap minus the 5-letter
    // desk reserve, and they do not go past it. The cap-hit note is the one
    // desk send. It spends one reserved slot, so the three together stay
    // inside the provider cap and inside the cap minus the reserve still unused.
    assert.equal(deskSends, 1);
    assert.equal(confirmSends + verseSends, RESEND_DAILY_CAP - DESK_DAILY_RESERVE);
    assert.ok(deskSends <= DESK_DAILY_RESERVE);
    assert.ok(confirmSends + verseSends + deskSends <= RESEND_DAILY_CAP);
    assert.ok(
      confirmSends + verseSends + deskSends <=
        RESEND_DAILY_CAP - (DESK_DAILY_RESERVE - deskSends),
    );
    assert.ok(confirmSends + verseSends + DESK_DAILY_RESERVE <= RESEND_DAILY_CAP);
    assert.ok(CONFIRM_MONTHLY_CAP + VERSE_DAILY_SEND_CEILING * 30 + DESK_MONTHLY_RESERVE <= RESEND_MONTHLY_CAP);
    await pg.close();
  });

  it("releases a refused confirmation in bucket order and keeps the slot when the network fails", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-11-06T15:00:00Z");
    const releaseOrder: string[] = [];
    const watching = (async <T = Record<string, unknown>>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<T[]> => {
      const text = strings.join(" ");
      if (text.includes("greatest(used - 1")) {
        const bucket = values.find((value) => typeof value === "string" && /^(day|month|net):/.test(value));
        if (typeof bucket === "string") releaseOrder.push(bucket);
      }
      return sql<T>(strings, ...values);
    }) as Sql;
    watching.query = (text, params) => sql.query(text, params);
    const refused = await ask(watching, {
      email: QA,
      sourcePath: "/verse",
      now,
      ip: "203.0.118.4",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: (async () => new Response("no", { status: 500 })) as typeof fetch,
    });
    assert.equal(refused.ok, false);
    const expectedOrder = [confirmDayBucket(now), confirmMonthBucket(now), confirmNetBucket("203.0.118.4", now)].sort();
    assert.deepEqual(releaseOrder, expectedOrder);
    const afterRefusal = await sql<{ used: number }>`
      select used from verse_confirm_budget where bucket = ${confirmDayBucket(now)}
    `;
    assert.equal(Number(afterRefusal[0]?.used), 0);

    const dropped = await ask(sql, {
      email: "bounced@resend.dev",
      sourcePath: "/verse",
      now,
      ip: "203.0.119.4",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: false,
      fetchImpl: (async () => {
        throw new Error("socket hang up");
      }) as typeof fetch,
    });
    assert.equal(dropped.ok, false);
    const kept = await sql<{ used: number }>`
      select used from verse_confirm_budget where bucket = ${confirmDayBucket(now)}
    `;
    assert.equal(Number(kept[0]?.used), 1);
    await pg.close();
  });

  it("claims the challenge hour with one counter update", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-12-02T15:00:00Z");
    const bucket = subscribeIpBucket("203.0.113.80");
    const hourAgo = new Date(now.getTime() - 61 * 60 * 1000).toISOString();
    await sql`
      insert into verse_pow_rate (bucket, window_start, used)
      values (${bucket}, ${hourAgo}::timestamptz, ${POW_ISSUE_PER_HOUR})
    `;
    let rateSql = "";
    let rateStatements = 0;
    const watching = (async <T = Record<string, unknown>>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<T[]> => {
      const text = strings.join(" ");
      if (text.includes("verse_pow_rate")) {
        rateStatements += 1;
        rateSql = text;
      }
      return sql<T>(strings, ...values);
    }) as Sql;
    watching.query = (text, params) => sql.query(text, params);
    const reset = await issueVerseSignupChallenge(watching, {
      ip: "203.0.113.80",
      secret: SECRET,
      postalAddress: POSTAL,
      now,
    });
    assert.equal(reset.ok, true);
    assert.equal(rateStatements, 1);
    assert.match(rateSql, /on conflict \(bucket\) do update/i);
    assert.equal(rateSql.includes("select count"), false);
    const opened = await sql<{ used: number }>`
      select used from verse_pow_rate where bucket = ${bucket}
    `;
    assert.equal(Number(opened[0]?.used), 1);
    await sql`
      update verse_pow_rate
      set used = ${POW_ISSUE_PER_HOUR - 1}, window_start = ${now.toISOString()}::timestamptz
      where bucket = ${bucket}
    `;
    const last = await issueVerseSignupChallenge(sql, {
      ip: "203.0.113.80",
      secret: SECRET,
      postalAddress: POSTAL,
      now,
    });
    assert.equal(last.ok, true);
    const blocked = await issueVerseSignupChallenge(sql, {
      ip: "203.0.113.80",
      secret: SECRET,
      postalAddress: POSTAL,
      now,
    });
    assert.equal(blocked.ok, false);
    const full = await sql<{ used: number }>`
      select used from verse_pow_rate where bucket = ${bucket}
    `;
    assert.equal(Number(full[0]?.used), POW_ISSUE_PER_HOUR);
    await pg.close();
  });

  it("stops desk mail at five a day", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-12-03T15:00:00.000Z");
    assert.equal(DESK_DAILY_CAP, DESK_DAILY_RESERVE);
    assert.equal(deskSendAllowed(DESK_DAILY_CAP - 1), true);
    assert.equal(deskSendAllowed(DESK_DAILY_CAP), false);
    let fetches = 0;
    const fetchImpl = (async () => {
      fetches += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    for (let n = 0; n < DESK_DAILY_CAP; n += 1) {
      const sent = await sendHardcodedOwnerEmail({
        subject: "Desk note",
        text: "hello",
        apiKey: "re_test",
        logKind: "food",
        logLabel: "unsaved",
        sql,
        now,
        fetchImpl,
      });
      assert.equal(sent.sent, 1);
    }
    assert.equal(fetches, DESK_DAILY_CAP);
    const blocked = await sendHardcodedOwnerEmail({
      subject: "Desk note",
      text: "hello",
      apiKey: "re_test",
      logKind: "food",
      logLabel: "unsaved",
      sql,
      now,
      fetchImpl,
    });
    assert.deepEqual(blocked, { sent: 0, attempted: 0 });
    assert.equal(fetches, DESK_DAILY_CAP);
    const used = await sql<{ used: number }>`
      select used from desk_send_budget where bucket = ${`day:${now.toISOString().slice(0, 10)}`}
    `;
    assert.equal(Number(used[0]?.used), DESK_DAILY_CAP);

    const later = new Date("2026-12-04T15:00:00.000Z");
    const refused = await sendHardcodedOwnerEmail({
      subject: "Desk note",
      text: "hello",
      apiKey: "re_test",
      logKind: "food",
      logLabel: "unsaved",
      sql,
      now: later,
      fetchImpl: (async () => new Response("no", { status: 500 })) as typeof fetch,
    });
    assert.equal(refused.sent, 0);
    const released = await sql<{ used: number }>`
      select used from desk_send_budget where bucket = ${`day:${later.toISOString().slice(0, 10)}`}
    `;
    assert.equal(Number(released[0]?.used), 0);
    const dropped = await sendHardcodedOwnerEmail({
      subject: "Desk note",
      text: "hello",
      apiKey: "re_test",
      logKind: "food",
      logLabel: "unsaved",
      sql,
      now: later,
      fetchImpl: (async () => {
        throw new Error("socket hang up");
      }) as typeof fetch,
    });
    assert.equal(dropped.sent, 0);
    const kept = await sql<{ used: number }>`
      select used from desk_send_budget where bucket = ${`day:${later.toISOString().slice(0, 10)}`}
    `;
    assert.equal(Number(kept[0]?.used), 1);
    assert.equal(await claimDeskSend(sql, later), true);
    await pg.close();
  });

  it("holds the rest of the month so desk mail cannot shrink the letter", async () => {
    const { pg, sql } = await db();
    const morning = new Date("2026-10-31T13:00:00.000Z");
    assert.equal(remainingVerseRunDateKeys(morning).length, 1);
    assert.equal(remainingVerseRunDateKeys(new Date("2026-10-24T00:30:00.000Z")).length, 8);
    const monthHold = verseMonthSlotsToHold(VERSE_DAILY_SEND_CEILING, 8);
    assert.equal(monthHold, VERSE_DAILY_SEND_CEILING * 8);
    assert.equal(
      confirmHardCeilings({ verseHold: VERSE_DAILY_SEND_CEILING, verseMonthHold: monthHold }).monthlyHard,
      RESEND_MONTHLY_CAP - DESK_MONTHLY_RESERVE - monthHold,
    );
    const todayHold = VERSE_DAILY_SEND_CEILING;
    const filler = confirmHardCeilings({ verseHold: todayHold, verseMonthHold: todayHold }).monthlyHard;
    await sql`
      insert into verse_send_log (id, kind, status, created_at)
      select 'month-' || g, 'daily', 'sent', '2026-10-01T12:00:00Z'::timestamptz
      from generate_series(1, ${filler}) as g
    `;
    await sql`
      insert into verse_subscribers (id, email, status, confirmed_at)
      select 'reader-' || g, 'reader-' || g || '@example.com', 'confirmed', ${morning.toISOString()}::timestamptz
      from generate_series(1, ${VERSE_DAILY_SEND_CEILING}) as g
    `;
    for (let n = 0; n < DESK_DAILY_CAP; n += 1) {
      const claimed = await claimDeskSend(sql, morning);
      assert.equal(claimed, true);
    }
    assert.equal(await claimDeskSend(sql, morning), false);
    let confirmFetches = 0;
    const blocked = await ask(sql, {
      email: "late@example.com",
      sourcePath: "/verse",
      now: morning,
      ip: "203.0.130.1",
      apiKey: "re_test",
      secret: SECRET,
      allowLive: true,
      fetchImpl: (async () => {
        confirmFetches += 1;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.error, CONFIRM_CAP_MESSAGE);
    assert.equal(confirmFetches, 0);
    let verseSends = 0;
    const delivered = await deliverDailyVerse(sql, {
      now: morning,
      apiKey: "re_test",
      secret: SECRET,
      allowLive: true,
      postalAddress: POSTAL,
      days: [verse("2026-10-31")],
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        const batch = JSON.parse(String(init?.body ?? "[]")) as unknown[];
        verseSends += batch.length;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(delivered.sent, VERSE_DAILY_SEND_CEILING);
    assert.equal(verseSends, VERSE_DAILY_SEND_CEILING);
    await pg.close();
  });
});

describe("verse mail routes do not change state on GET", () => {
  it("confirms and unsubscribes from a button, and the one-click path is POST only", () => {
    const confirm = readFileSync(new URL("../routes/verse/confirm.tsx", import.meta.url), "utf8");
    const unsub = readFileSync(new URL("../routes/verse/unsubscribe.tsx", import.meta.url), "utf8");
    const api = readFileSync(new URL("../routes/api/verse/unsubscribe.ts", import.meta.url), "utf8");
    assert.equal(confirm.includes("loader:"), false);
    assert.equal(unsub.includes("loader:"), false);
    assert.match(confirm, /confirmDailyVerse/);
    assert.match(unsub, /unsubscribeDailyVerse/);
    assert.match(api, /POST: \(\{ request \}\) => oneClick\(request\)/);
    assert.match(api, /GET: \(\) => new Response\(null, \{ status: 405/);
    assert.equal(api.includes("GET: ({ request }) => oneClick"), false);
  });
});
