import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import {
  AV_PLANNER_URL,
  buildAvConfirmation,
  sendAvConfirmation,
} from "./church-av-confirm.ts";
import { DESK_REPLY_TO, deskFromAddress } from "./desk-mail.ts";

async function db() {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(readFileSync(new URL("../../migrations/manual/0005_verse_subscribers.sql", import.meta.url), "utf8"));
  const run = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  };
  const sql = (async <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run<T>(text, values);
  }) as Sql;
  sql.query = (text, params = []) => run(text, params);
  return { pg, sql };
}

// Banned words assembled from pieces so this file passes the same source scan
// (scripts/church-av.test.mjs) that it enforces on the email.
const INSTALLER = new RegExp(["mes", "sen", "ger"].join(""), "i");
const BANNED: [string, RegExp][] = [
  ["installer name", INSTALLER],
  ["the word for no charge", new RegExp(`\\b${["fr", "ee"].join("")}\\b`, "i")],
  ["the two-letter tech word", new RegExp(`\\b${["A", "I"].join("")}\\b`)],
  ["a price", /\$\s?\d|\bprice[sd]? (?:at|of|from)\b|\bcosts?\b|\bdollars?\b/i],
  [
    "a ranking promise",
    new RegExp(
      ["#\\s?1\\b", "\\bnum" + "ber one\\b", "\\bbest\\b", "\\btop[- ]rated\\b", "\\bguar" + "antee"].join("|"),
      "i",
    ),
  ],
  ["a phone number", /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/],
  ["an email address", /[^\s@]+@[^\s@]+\.[a-z]{2,}/i],
];

function assertClean(text: string) {
  for (const [what, re] of BANNED) assert.ok(!re.test(text), `email contains ${what}`);
  for (const url of text.match(/https?:\/\/\S+/g) ?? []) {
    assert.ok(url.startsWith("https://www.unitedundergod.org/"), `outside link ${url}`);
  }
}

const SUMMARY =
  "https://www.unitedundergod.org/church-av/planner/summary?style=traditional&seats=150-300&problems=hearing-aids-squeal-or-echo,livestream-keeps-dropping,cant-hear-in-the-back&decider=committee";

const PLANNER_MESSAGE = [
  "We have an old stone sanctuary.",
  "",
  "Church Room Planner answers:",
  "- Worship style: Traditional",
  "- What is not working: People can’t hear in the back; Hearing aids squeal or echo; The livestream keeps dropping",
  "",
  "Recommendation:",
  "Start here:",
  "- Speakers aimed at the seats, tuned for speech",
  "",
  `Committee summary: ${SUMMARY}`,
].join("\n");

describe("buildAvConfirmation", () => {
  it("planner case: thanks by name, next steps, summary link, two help pages", () => {
    const mail = buildAvConfirmation({
      name: "Ruth Pastor",
      phone: "912-555-0199",
      message: PLANNER_MESSAGE,
    });
    assert.match(mail.text, /^Dear Ruth Pastor,/);
    assert.match(mail.text, /Thank you/);
    assert.match(mail.text, /call you within one business day/);
    assert.match(mail.text, /walk through the sanctuary/);
    assert.match(mail.text, /build a design for your room/);
    assert.match(mail.text, /Nothing you sent us is a price or a quote\./);
    assert.match(mail.text, /Share this with your committee or board:\n/);
    assert.ok(mail.text.includes(SUMMARY));
    const help = mail.text.match(/\/church-av\/help\/[a-z-]+/g) ?? [];
    assert.deepEqual(help, [
      "/church-av/help/cant-hear-in-the-back",
      "/church-av/help/hearing-aids-squeal-or-echo",
    ]);
    assert.ok(!mail.text.includes(AV_PLANNER_URL + "\n"), "no planner nudge when they used it");
    assert.match(mail.text, /United Under God$/);
    assertClean(mail.subject);
    assertClean(mail.text);
  });

  it("non-planner case: no summary, no help pages, links the planner", () => {
    const mail = buildAvConfirmation({
      name: "  Deacon   Sam ",
      message: "Our sound is muddy.\n\nSource: /church-av/georgia",
    });
    assert.match(mail.text, /^Dear Deacon Sam,/);
    assert.ok(!/committee or board/.test(mail.text));
    assert.ok(!/\/church-av\/help\//.test(mail.text));
    assert.ok(mail.text.includes(`\n${AV_PLANNER_URL}\n`));
    assert.match(mail.text, /reach out within one business day/);
    assertClean(mail.text);
  });

  it("never echoes a link that is not our own summary page", () => {
    const mail = buildAvConfirmation({
      name: "Eve",
      message:
        "Church Room Planner answers:\n- What is not working: Feedback during the sermon\n\nCommittee summary: https://evil.example/church-av/planner/summary?problems=x",
    });
    assert.ok(!mail.text.includes("evil.example"));
    assert.ok(!/committee or board/.test(mail.text));
    assert.ok(mail.text.includes("/church-av/help/feedback-during-the-sermon"));
    assertClean(mail.text);
  });
});

describe("sendAvConfirmation", () => {
  it("sends one Resend email to the requester from the desk sender, reply-to the owner", async () => {
    const { pg, sql } = await db();
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const held = await sendAvConfirmation({
      inquiry: { id: "i0", name: "Ruth", email: "ruth@example.org", phone: "", message: "" },
      apiKey: "re_test",
      fetchImpl,
    });
    assert.deepEqual(held, { sent: false });
    assert.equal(calls.length, 0);
    const result = await sendAvConfirmation({
      inquiry: { id: "i1", name: "Ruth", email: "ruth@example.org", phone: "", message: "" },
      apiKey: "re_test",
      fetchImpl,
      sql,
    });
    assert.deepEqual(result, { sent: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    assert.deepEqual(calls[0].body.to, ["ruth@example.org"]);
    assert.equal(calls[0].body.from, deskFromAddress());
    assert.equal(calls[0].body.reply_to, DESK_REPLY_TO);
    assert.equal(DESK_REPLY_TO, "lincoln@unitedundergod.org");
    await pg.close();
  });

  it("a failed send resolves, logs the inquiry id only, and never throws", async () => {
    const { pg, sql } = await db();
    const errors: string[] = [];
    const original = console.error;
    console.error = (line: string) => errors.push(line);
    try {
      const fetchImpl = (async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch;
      const result = await sendAvConfirmation({
        inquiry: { id: "i2", name: "Ruth", email: "ruth@example.org" },
        apiKey: "re_test",
        fetchImpl,
        sql,
      });
      assert.deepEqual(result, { sent: false });
      assert.equal(errors.length, 1);
      assert.match(errors[0], /av confirmation failed inquiry=i2/);
      assert.ok(!errors[0].includes("ruth@"));
    } finally {
      console.error = original;
      await pg.close();
    }
  });

  it("skips a request with no usable email", async () => {
    let called = false;
    const result = await sendAvConfirmation({
      inquiry: { id: "i3", name: "Ruth", email: "" },
      apiKey: "re_test",
      fetchImpl: (async () => {
        called = true;
        return new Response("{}");
      }) as unknown as typeof fetch,
    });
    assert.deepEqual(result, { sent: false });
    assert.equal(called, false);
  });
});
