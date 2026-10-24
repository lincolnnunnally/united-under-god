import assert from "node:assert/strict";
import { test } from "node:test";
import type { Sql } from "./db.ts";
import {
  MARKET_RETRY_MS,
  MARKET_TTL_MS,
  areaCount,
  clearChurchMarketCache,
  normalizeState,
  programNumbers,
  readChurchMarket,
  roundedDown,
  tallyStates,
} from "./church-market.ts";
import { SPEND_CATEGORIES, allItems } from "./church-spend.ts";
import {
  reasons,
  sellFaq,
  marketLine,
  SELL_DESCRIPTION,
  SELL_TITLE,
  STEPS,
} from "./sell-to-churches.ts";
import { FEES, type FeeConfig } from "./vendor-terms.ts";

/** The shape the live directory returns (verified 2026-10-24, merged rows excluded). */
const LIVE_ROWS = [
  { state: "FL", n: 40455 },
  { state: "NC", n: 30274 },
  { state: "GA", n: 28916 },
  { state: "TN", n: 19098 },
  { state: "SC", n: 16343 },
  { state: "AL", n: 16024 },
  { state: null, n: 12 },
  { state: "", n: 8 },
  { state: "GEORGIA", n: 8 },
];

function fakeSql(handler: (text: string) => unknown[] | Promise<unknown[]>): () => Promise<Sql> {
  const sql = (async () => []) as unknown as Sql;
  sql.query = (async (text: string) => handler(text)) as Sql["query"];
  return async () => sql;
}

test("state names and codes normalize to one code", () => {
  assert.equal(normalizeState("GA"), "GA");
  assert.equal(normalizeState(" ga "), "GA");
  assert.equal(normalizeState("GEORGIA"), "GA");
  assert.equal(normalizeState("Georgia"), "GA");
  assert.equal(normalizeState("North Carolina"), "NC");
  assert.equal(normalizeState("NORTH CAROLINA"), "NC");
  assert.equal(normalizeState("N.C."), "NC");
  assert.equal(normalizeState("District of Columbia"), "DC");
  assert.equal(normalizeState(""), null);
  assert.equal(normalizeState(null), null);
  assert.equal(normalizeState("Ontario"), null);
  assert.equal(normalizeState("ZZ"), null);
});

test("counts fold full names into their state and drop unknowns", () => {
  const { total, states } = tallyStates(LIVE_ROWS);
  assert.equal(total, 151118);
  assert.deepEqual(
    states.map((row) => [row.code, row.count]),
    [
      ["FL", 40455],
      ["NC", 30274],
      ["GA", 28924],
      ["TN", 19098],
      ["SC", 16343],
      ["AL", 16024],
    ],
  );
  assert.equal(states[2].name, "Georgia");
  assert.equal(
    tallyStates([
      { state: "GA", n: "5" },
      { state: "GA", n: -1 },
    ]).total,
    5,
  );
});

test("the service-area picker sums the picked states", () => {
  const { states, total } = tallyStates(LIVE_ROWS);
  assert.equal(areaCount(states, []), 0);
  assert.equal(areaCount(states, ["GA"]), 28924);
  assert.equal(areaCount(states, ["GA", "SC", "NC"]), 28924 + 16343 + 30274);
  assert.equal(areaCount(states, new Set(states.map((row) => row.code))), total);
  assert.equal(areaCount(states, ["TX"]), 0, "a state with no churches adds nothing");
});

test("program numbers come from the spend list", () => {
  const program = programNumbers();
  assert.equal(program.catalogs, SPEND_CATEGORIES.length);
  assert.equal(program.catalogs, 30);
  assert.equal(
    program.items,
    SPEND_CATEGORIES.reduce((sum, category) => sum + allItems(category).length, 0),
  );
  assert.ok(program.items > 0);
});

test("headline rounding never overstates", () => {
  assert.equal(roundedDown(151118), "151,000+");
  assert.equal(roundedDown(9999), "9,900+");
  assert.equal(roundedDown(640), "640");
});

test("a working read returns counts and caches them", async () => {
  clearChurchMarketCache();
  let calls = 0;
  const getSql = fakeSql((text) => {
    calls += 1;
    if (text.includes("cc_churches")) {
      assert.match(text, /directory_status/);
      return LIVE_ROWS;
    }
    return [{ n: 3 }];
  });
  const now = 1_000_000;
  const first = await readChurchMarket(getSql, { now });
  assert.equal(first.market?.total, 151118);
  assert.equal(first.market?.approvedVendors, 3);
  const again = await readChurchMarket(getSql, { now: now + MARKET_TTL_MS - 1 });
  assert.equal(again.market?.total, 151118);
  assert.equal(calls, 2, "second read served from cache");
  await readChurchMarket(getSql, { now: now + MARKET_TTL_MS + 1 });
  assert.equal(calls, 4, "cache expires");
  clearChurchMarketCache();
});

test("no database hides the numbers instead of failing", async () => {
  clearChurchMarketCache();
  const err = Object.assign(new Error("The database is not available."), {
    name: "DbUnavailableError",
  });
  const down = await readChurchMarket(
    async () => {
      throw err;
    },
    { now: 5 },
  );
  assert.deepEqual(down, { market: null });

  clearChurchMarketCache();
  const missing = await readChurchMarket(
    fakeSql(() => {
      throw Object.assign(new Error('relation "cc_churches" does not exist'), { code: "42P01" });
    }),
    { now: 5 },
  );
  assert.deepEqual(missing, { market: null });

  // A failure is retried after a minute, not cached for hours.
  const later = await readChurchMarket(
    fakeSql(() => LIVE_ROWS),
    { now: 5 + MARKET_RETRY_MS + 1 },
  );
  assert.equal(later.market?.total, 151118);

  clearChurchMarketCache();
  const empty = await readChurchMarket(
    fakeSql(() => []),
    { now: 5 },
  );
  assert.deepEqual(empty, { market: null }, "an empty directory shows no zero");
  clearChurchMarketCache();
});

test("a slow database times out to hidden numbers", async () => {
  clearChurchMarketCache();
  const slow = await readChurchMarket(
    fakeSql(() => new Promise<unknown[]>((resolve) => setTimeout(() => resolve(LIVE_ROWS), 200))),
    { now: 9, timeoutMs: 20 },
  );
  assert.deepEqual(slow, { market: null });
  clearChurchMarketCache();
});

test("vendors table missing still shows church counts, with zero vendors", async () => {
  clearChurchMarketCache();
  const read = await readChurchMarket(
    fakeSql((text) => {
      if (text.includes("source_vendors")) throw new Error("relation does not exist");
      return LIVE_ROWS;
    }),
    { now: 1 },
  );
  assert.equal(read.market?.approvedVendors, 0);
  assert.equal(read.market?.total, 151118);
  clearChurchMarketCache();
});

test("copy keeps the owner's rules", () => {
  const { states } = tallyStates(LIVE_ROWS);
  const text = [
    SELL_TITLE,
    SELL_DESCRIPTION,
    marketLine({ states }),
    ...reasons().flatMap((r) => [r.title, r.body]),
    ...STEPS.flatMap((s) => [s.title, s.body]),
    ...sellFaq({ states }, programNumbers()).flatMap((f) => [f.q, f.a]),
    ...sellFaq(null, programNumbers()).flatMap((f) => [f.q, f.a]),
  ].join("\n");
  assert.ok(!/\bmembers?(hip)?\b/i.test(text), "no members");
  assert.ok(!/\bcustomers?\b/i.test(text), "no customers");
  assert.ok(!/\bbuyers?\b/i.test(text), "no buyers");
  assert.ok(!/\bAI\b/.test(text), "no AI");
  assert.ok(!new RegExp(["mes", "sen", "ger"].join(""), "i").test(text), "no installer name");
  assert.ok(!/\bleads?\b|guarantee|revenue/i.test(text), "no promised leads or revenue");
  assert.match(text, /church directory/);
  assert.match(text, /Florida, North Carolina, Georgia, Tennessee, South Carolina, and Alabama/);
});

test("fee numbers in the copy come from the config", () => {
  const custom: FeeConfig = {
    ...FEES,
    rebate: { ...FEES.rebate, percent: 7 },
    referral: { ...FEES.referral, percent: 13 },
    dueDays: 45,
  };
  const live = [...reasons(), ...sellFaq(null, { catalogs: 30 })]
    .map((x) => ("body" in x ? x.body : x.a))
    .join("\n");
  assert.match(live, new RegExp(`${FEES.rebate.percent}%`));
  assert.match(live, new RegExp(`${FEES.referral.percent}%`));
  const changed = [...reasons(custom), ...sellFaq(null, { catalogs: 30 }, custom)]
    .map((x) => ("body" in x ? x.body : x.a))
    .join("\n");
  assert.match(changed, /7%/);
  assert.match(changed, /13%/);
  assert.match(changed, /45 days/);
  assert.ok(!changed.includes(`${FEES.rebate.percent}% `), "no rate typed by hand");
});
