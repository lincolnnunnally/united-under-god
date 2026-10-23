import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import {
  buildConfirmMail,
  buildDailyVerseMail,
  indexNowKeyFile,
  ministryToday,
  recipientAllowed,
  signVerseToken,
  verifyVerseToken,
  verseSendAllowance,
  VERSE_DAILY_SEND_CEILING,
  RESEND_DAILY_CAP,
  RESEND_MONTHLY_CAP,
} from "./verse-mail.ts";
import {
  confirmVerseToken,
  deliverDailyVerse,
  requestVerseSubscription,
  unsubscribeVerseToken,
} from "./verse-mail.server.ts";
import type { VerseDay } from "./verse.ts";

const SECRET = "test-link-secret";
const QA = "delivered@resend.dev";

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
    assert.equal(verseSendAllowance({ sentToday: 85, sentThisMonth: 0 }).allowance, 0);
    assert.equal(verseSendAllowance({ sentToday: 0, sentThisMonth: 2700 }).allowance, 0);
    const withDesk = verseSendAllowance({ sentToday: 10, sentThisMonth: 171 });
    assert.equal(withDesk.allowance, 75);
    assert.ok(withDesk.allowance + 10 < RESEND_DAILY_CAP);
    assert.ok(80 * 30 < RESEND_MONTHLY_CAP);
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
      address: "United Under God, Inc., Vidalia, Georgia",
    });
    assert.match(mail.headers["List-Unsubscribe"], /^<https:\/\/www\.unitedundergod\.org\/api\/verse\/unsubscribe\?token=/);
    assert.equal(mail.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
    assert.equal(mail.text.includes("SECRET COPYRIGHT LINE"), false);
    assert.match(mail.text, /God is looking after you/);
    assert.match(mail.html, /Stop the daily verse/);
    const confirm = buildConfirmMail({
      confirmToken: signVerseToken({ email: QA, purpose: "confirm", exp: 2_000_000_000 }, SECRET),
      unsubscribeToken: token,
      address: "United Under God, Inc., Vidalia, Georgia",
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
    const joined = await requestVerseSubscription(sql, {
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

    const blocked = await requestVerseSubscription(sql, {
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
      days: [day],
      fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
        deliverCalls.push({ url: String(url), body: String(init?.body ?? "") });
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
    const result = await requestVerseSubscription(sql, {
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
      from generate_series(1, 90) as g
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
});
