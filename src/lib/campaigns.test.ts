import assert from "node:assert/strict";
import { test } from "node:test";
import { readCampaignDesk } from "./campaign-desk.ts";
import { CAMPAIGNS, LED_WALL, campaignOf, ledWallNeed } from "./campaigns.ts";
import { cleanNeed, createNeed, needConfirmationEmail, needNotice, readNeedsDesk, type NeedInput } from "./church-needs.ts";
import type { Sql } from "./db.ts";
import { PROGRAM_MIGRATIONS, freshProgramDb } from "./program-test-db.ts";

const SITE = "https://www.unitedundergod.org";

async function fresh() {
  return freshProgramDb([
    ...PROGRAM_MIGRATIONS,
    "0013_source_church_needs.sql",
    "0014_need_org_kind.sql",
    "0015_need_campaign.sql",
  ]);
}

function asked(overrides: Partial<NeedInput> = {}): NeedInput {
  const need = ledWallNeed({ parts: ["led-wall", "lighting", "sound"], seats: "350", timing: "In 3 to 6 months" });
  return {
    orgKind: "church",
    churchName: "New Hope Church",
    contactName: "Sam Cole",
    email: "sam@newhope.example",
    city: "Valdosta",
    state: "GA",
    category: LED_WALL.bid.category,
    title: need.title,
    details: need.details,
    campaign: LED_WALL.slug,
    ...overrides,
  };
}

async function vendor(sql: Sql, id: string, overrides: { status?: string; categories?: string[]; states?: string[] } = {}) {
  await sql`
    insert into source_vendors (id, company, email, categories, states, status)
    values (
      ${id}, ${`Company ${id}`}, ${`${id}@av.example`},
      ${JSON.stringify(overrides.categories ?? ["audio-visual/av-systems"])}::jsonb,
      ${JSON.stringify(overrides.states ?? ["GA"])}::jsonb,
      ${overrides.status ?? "approved"}
    )
  `;
}

test("the LED wall form turns plain answers into one need", () => {
  const need = ledWallNeed({
    parts: ["sound", "led-wall"],
    seats: "350",
    stageWidth: "40 feet",
    daylight: "Lots of daylight",
    timing: "In 3 to 6 months",
    room: "The cross hangs center stage.",
  });
  assert.equal(need.title, "LED wall and sound");
  assert.match(need.details, /Bid: An LED wall behind the stage; Sound/);
  assert.match(need.details, /Seats in the room: 350/);
  assert.match(need.details, /Daylight in the room: Lots of daylight/);
  assert.equal(ledWallNeed({ parts: ["led-wall", "lighting", "sound"] }).title, "LED wall, stage lighting and sound");
  assert.throws(() => ledWallNeed({ parts: [] }), /Choose what you would like bid/);
  assert.throws(() => ledWallNeed({ parts: ["fog machine"] }), /Choose what you would like bid/);
});

test("only a known campaign is kept; anything else reads as none", () => {
  assert.equal(campaignOf("led-wall"), "led-wall");
  assert.equal(campaignOf("nope"), "");
  assert.equal(campaignOf(undefined), "");
  assert.equal(cleanNeed(asked({ campaign: "made-up" })).campaign, "");
  assert.equal(new Set(CAMPAIGNS.map((c) => c.slug)).size, CAMPAIGNS.length);
});

test("the campaign's copy keeps the church AV rules and promises three bids", () => {
  const text = JSON.stringify(LED_WALL);
  assert.ok(!/\bfree\b/i.test(text), "no 'free'");
  assert.ok(!/\bAI\b/.test(text), "no 'AI'");
  assert.ok(!/\$\s?\d|guarantee/i.test(text), "no prices or guarantees");
  assert.ok(!new RegExp(["mes", "sen", "ger"].join(""), "i").test(text), "no installer name");
  assert.equal(LED_WALL.biddersWanted, 3);
  assert.match(LED_WALL.confirmation.join(" "), /We are United Under God/);
  assert.match(LED_WALL.confirmation.join(" "), /three church audio, video and lighting companies/);
});

test("a campaign need is saved with its campaign and gets the campaign's confirmation", async () => {
  const sql = await fresh();
  const saved = await createNeed(sql, asked(), { ip: "" });
  assert.ok(saved);
  const row = (await readNeedsDesk(sql)).needs[0];
  assert.equal(row.campaign, "led-wall");
  assert.equal(row.category, "audio-visual");

  const clean = cleanNeed(asked());
  const mail = needConfirmationEmail(clean, saved.token, SITE);
  assert.equal(mail.subject, LED_WALL.confirmationSubject);
  assert.match(mail.text, /We are United Under God/);
  assert.ok(mail.text.includes(`${SITE}/buying/need/${saved.token}`));
  assert.match(needNotice(clean, { id: saved.id, saved: true }).text, /Campaign: LED walls, stage lighting and sound/);

  // A need posted straight to /buying/need keeps the plain confirmation.
  const plain = cleanNeed(asked({ campaign: "" }));
  assert.match(needConfirmationEmail(plain, saved.token, SITE).subject, /^We have your need/);
});

test("the campaigns desk counts its own requests and checks the three bidders", async () => {
  const sql = await fresh();
  await createNeed(sql, asked(), { ip: "" });
  await createNeed(sql, asked({ churchName: "Grace Chapel", email: "g@grace.example" }), { ip: "" });
  await createNeed(sql, asked({ campaign: "", title: "Stackable chairs", category: "furniture" }), { ip: "" });

  await vendor(sql, "a");
  await vendor(sql, "b", { states: ["FL"] });
  await vendor(sql, "c", { status: "pending" });
  await vendor(sql, "d", { states: ["TX"] });
  await vendor(sql, "e", { categories: ["furniture/chairs-tables"] });

  let [view] = await readCampaignDesk(sql);
  assert.equal(view.slug, "led-wall");
  assert.equal(view.total, 2, "only the campaign's own requests");
  assert.equal(view.counts.new, 2);
  assert.equal(view.last7Days, 2);
  // Owner (2026-10-30): the companies cover the whole country, so a company anywhere counts.
  assert.deepEqual(view.bidders.map((b) => b.id).sort(), ["a", "b", "d"]);
  assert.equal(view.biddersReady, true, "three approved AV companies, wherever they are");
  assert.ok(!("confirmation" in view));

  await sql`update source_vendors set status = 'paused' where id = 'd'`;
  [view] = await readCampaignDesk(sql);
  assert.equal(view.bidders.length, 2);
  assert.equal(view.biddersReady, false, "two approved bidders is not three");
});
