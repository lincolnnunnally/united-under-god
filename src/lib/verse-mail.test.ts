import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import {
  buildConfirmMail,
  buildDailyVerseMail,
  confirmSendAllowed,
  CONFIRM_CAP_MESSAGE,
  fullPostalAddress,
  indexNowKeyFile,
  ipSubscribeLimited,
  issueVersePow,
  ministryToday,
  recipientAllowed,
  SHARED_IP_BUCKET,
  signVerseToken,
  solveVersePow,
  subscribeIpBucket,
  verifyVerseToken,
  verseLinkSecret,
  verseSendAllowance,
  VERSE_DAILY_SEND_CEILING,
  RESEND_DAILY_CAP,
  RESEND_MONTHLY_CAP,
  CONFIRM_DAILY_CAP,
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
const POSTAL = "PO Box 10, Vidalia, GA 30474";

function gate(now: Date) {
  const issued = issueVersePow(SECRET, Math.floor(now.getTime() / 1000), 8);
  return {
    powChallenge: issued.challenge,
    powNonce: solveVersePow(issued.challenge, issued.bits),
    postalAddress: POSTAL,
  };
}

function ask(sql: Sql, input: Parameters<typeof requestVerseSubscription>[1]) {
  const now = input.now ?? new Date();
  return requestVerseSubscription(sql, { ...gate(now), ...input });
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
    assert.equal(verseSendAllowance({ sentToday: 85, sentThisMonth: 0 }).allowance, 0);
    assert.equal(verseSendAllowance({ sentToday: 0, sentThisMonth: 2700 }).allowance, 0);
    const withDesk = verseSendAllowance({ sentToday: 10, sentThisMonth: 171 });
    assert.equal(withDesk.allowance, 75);
    assert.ok(withDesk.allowance + 10 < RESEND_DAILY_CAP);
    assert.ok(80 * 30 < RESEND_MONTHLY_CAP);
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
    assert.equal(confirmSendAllowed({ confirmsToday: 0, confirmsThisMonth: 0, otherToday: 0, otherThisMonth: 0 }), true);
    assert.equal(confirmSendAllowed({ confirmsToday: CONFIRM_DAILY_CAP, confirmsThisMonth: 0, otherToday: 0, otherThisMonth: 0 }), false);
    assert.equal(confirmSendAllowed({ confirmsToday: 0, confirmsThisMonth: 0, otherToday: 80, otherThisMonth: 0 }), true);
    assert.equal(ipSubscribeLimited(5, 0), true);
    assert.equal(ipSubscribeLimited(4, 20), true);
    assert.equal(ipSubscribeLimited(4, 19), false);
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
      insert into verse_send_log (id, kind, status, created_at)
      select 'cap-' || g, 'confirm', 'sent', ${now.toISOString()}::timestamptz
      from generate_series(1, 10) as g
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
    await pg.close();
  });

  it("does not count a honeypot fill against the IP limit", async () => {
    const { pg, sql } = await db();
    const now = new Date("2026-10-23T17:10:00Z");
    let calls = 0;
    const result = await ask(sql, {
      email: QA,
      sourcePath: "/verse",
      now,
      ip: "203.0.113.51",
      hp: "https://example.invalid",
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
