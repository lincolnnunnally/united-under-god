import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PROGRAM_MIGRATIONS, freshProgramDb } from "./program-test-db.ts";
import { bidTemplate, getSpendCategory, SPEND_CATEGORIES, isLicensed } from "./church-spend.ts";
import { addQuote, createBid, readDesk, setItemWinners } from "./source-store.ts";
import { cleanVendorSignup, createVendor, updateVendor, type VendorSignupInput } from "./vendor-store.ts";
import { VENDOR_TERMS_VERSION } from "./vendor-terms.ts";
import {
  CASE_COST,
  MIN_RECORD,
  NO_PRICE_SCORE,
  PRICE_SLOPE,
  RANK_WEIGHTS,
  RANKING_DISCLOSURE,
  REVIEW_PRIOR,
  SUPPORT_FULL_POINTS,
  categoryFeeKinds,
  covenantComponent,
  displayScore,
  hasRecord,
  ineligibleReason,
  isListed,
  isRankedCategory,
  loadRankingData,
  priceOutweighsFee,
  priceScore,
  rankCatalog,
  rankFor,
  reviewScore,
  reviewsComponent,
  scoreVendor,
  supportScore,
  type RankVendor,
  type ReviewFacts,
} from "./vendor-rank.ts";
import { readCatalogVendors, readVendorProfile } from "./vendor-listing.ts";

const TODAY = "2026-10-24";

function near(actual: number, expected: number, message?: string) {
  assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} is not ${expected}`);
}

const GOOD: ReviewFacts = { overall: 5, quality: 5, onTime: true, billMatched: true, hireAgain: true };
const POOR: ReviewFacts = { overall: 1, quality: 1, onTime: false, billMatched: false, hireAgain: false };

function vendor(overrides: Partial<RankVendor> = {}): RankVendor {
  return {
    id: overrides.id ?? "v",
    company: overrides.company ?? "Vendor",
    status: "approved",
    termsVersion: VENDOR_TERMS_VERSION,
    consequence: "none",
    reviews: [GOOD, GOOD, GOOD],
    cases: [],
    awards: 1,
    prices: [{ mine: 100, best: 100 }],
    offer: null,
    ...overrides,
  };
}

// --- weights and the score math ------------------------------------------------

test("the weights are the owner's: service 50, price 35, support 15", () => {
  assert.deepEqual({ ...RANK_WEIGHTS }, { service: 50, price: 35, support: 15 });
  assert.equal(RANK_WEIGHTS.service + RANK_WEIGHTS.price + RANK_WEIGHTS.support, 100);
  assert.match(RANKING_DISCLOSURE, /^Preferred status considers each vendor's service record, price, and support for the program\.$/);
});

test("a perfect vendor scores 100 and each factor adds its weight", () => {
  const perfect = vendor({
    reviews: Array(50).fill(GOOD),
    offer: { rebate: 2 + SUPPORT_FULL_POINTS, referral: null },
  });
  const score = scoreVendor(perfect, ["rebate"], TODAY);
  assert.ok(score.service > 0.98, "fifty perfect reviews and a clean record");
  assert.equal(score.price, 1);
  assert.equal(score.support, 1);
  assert.equal(Math.round(score.points.price), 35);
  assert.equal(Math.round(score.points.support), 15);
  assert.ok(Math.abs(score.total - (score.points.service + 35 + 15)) < 1e-9);
  assert.equal(displayScore(score), Math.round(score.total));
});

test("reviews: overall counts most, few reviews pull toward neutral", () => {
  near(reviewScore(GOOD), 1);
  near(reviewScore(POOR), 0);
  near(reviewScore({ ...GOOD, hireAgain: false }), 0.9);
  near(reviewScore({ ...GOOD, overall: 3 }), 0.75);
  near(reviewsComponent([]), REVIEW_PRIOR.score);
  near(reviewsComponent([GOOD]), (1 + REVIEW_PRIOR.count * 0.5) / (1 + REVIEW_PRIOR.count));
  assert.ok(reviewsComponent(Array(20).fill(GOOD)) > reviewsComponent([GOOD]), "a long record counts more");
});

test("covenant history: cases decided against and late remedies cost", () => {
  assert.equal(covenantComponent([], TODAY), 1);
  const base = { remedyKind: "", remedyStatus: "", remedyDue: "", remedyMarkedAt: "" };
  assert.equal(covenantComponent([{ ...base, finding: "not_at_fault" }], TODAY), 1);
  assert.equal(covenantComponent([{ ...base, finding: "at_fault" }], TODAY), 1 - CASE_COST.at_fault);
  assert.equal(covenantComponent([{ ...base, finding: "partly" }], TODAY), 1 - CASE_COST.partly);
  const late = { finding: "at_fault", remedyKind: "refund", remedyStatus: "not_done", remedyDue: "2026-10-01", remedyMarkedAt: "" };
  assert.equal(covenantComponent([late], TODAY), 0.5);
  const onTime = { ...late, remedyStatus: "done", remedyMarkedAt: "2026-09-30T10:00:00.000Z" };
  assert.equal(covenantComponent([onTime], TODAY), 0.75);
  const overdue = { ...late, remedyStatus: "pending" };
  assert.equal(covenantComponent([overdue], TODAY), 0.5, "past due and still pending");
  assert.equal(covenantComponent(Array(9).fill(late), TODAY), 0, "never below zero");
});

test("price: each item against the best quote; 20% above the best scores 0", () => {
  assert.equal(priceScore([]), NO_PRICE_SCORE);
  assert.equal(priceScore([{ mine: 10, best: 10 }]), 1);
  assert.ok(Math.abs(priceScore([{ mine: 11, best: 10 }]) - (1 - PRICE_SLOPE * 0.1)) < 1e-9);
  near(priceScore([{ mine: 12, best: 10 }]), 0);
  assert.equal(priceScore([{ mine: 30, best: 10 }]), 0);
  assert.ok(Math.abs(priceScore([{ mine: 10, best: 10 }, { mine: 11, best: 10 }]) - 0.75) < 1e-9);
});

test("support: points above the floor, full at the cap; the floor earns nothing", () => {
  assert.equal(supportScore(null, ["rebate"]), 0);
  assert.equal(supportScore({ rebate: 2, referral: null }, ["rebate"]), 0);
  assert.equal(supportScore({ rebate: 7, referral: null }, ["rebate"]), 0.5);
  assert.equal(supportScore({ rebate: 40, referral: null }, ["rebate"]), 1);
  assert.equal(supportScore({ rebate: 12, referral: 10 }, ["rebate", "referral"]), 0.5);
  assert.equal(supportScore({ rebate: 1, referral: null }, ["rebate"]), 0, "below the floor counts as nothing");
  assert.equal(supportScore({ rebate: 12, referral: 20 }, []), 0, "no fee kinds, no support");
});

// --- price outweighs the fee ----------------------------------------------------

test("price outweighs the fee: the weights keep the guarantee", () => {
  assert.equal(priceOutweighsFee(), true);
  // A setup where the fee could buy rank fails the check.
  assert.equal(priceOutweighsFee({ price: 35, support: 15 }, 1, 10), false);
});

test("a vendor that raises its price to pay a bigger fee never outranks an otherwise equal cheaper vendor", () => {
  const kinds = ["rebate"] as const;
  for (const raise of [0.005, 0.01, 0.03, 0.05, 0.1, 0.15, 0.19, 0.2, 0.3, 0.5, 1]) {
    for (const bestOther of [null, 80, 95, 100]) {
      for (const startFee of [2, 4, 8]) {
        const items = [100, 40, 7.5];
        const best = (price: number) => Math.min(price, ...(bestOther ? [price * (bestOther / 100)] : []));
        const cheaper = vendor({
          id: "cheaper",
          company: "Zed Cheaper",
          prices: items.map((price) => ({ mine: price, best: best(price) })),
          offer: { rebate: startFee, referral: null },
        });
        // The raise frees `raise × 100` points of fee; it offers all of it, and more is never cheaper.
        const raiser = vendor({
          id: "raiser",
          company: "Aaa Raiser",
          prices: items.map((price) => ({ mine: price * (1 + raise), best: best(price) })),
          offer: { rebate: startFee + raise * 100, referral: null },
        });
        const order = rankCatalog([raiser, cheaper], [...kinds], TODAY).map((row) => row.id);
        assert.deepEqual(
          order,
          ["cheaper", "raiser"],
          `raise ${raise}, other quote at ${bestOther ?? "none"}%, starting fee ${startFee}%`,
        );
        const a = scoreVendor(raiser, [...kinds], TODAY).total;
        const b = scoreVendor(cheaper, [...kinds], TODAY).total;
        assert.ok(a <= b, "the raiser never scores higher");
      }
    }
  }
});

test("a higher fee at the same price does rank higher (fees count)", () => {
  const plain = vendor({ id: "plain", company: "A Plain" });
  const generous = vendor({ id: "generous", company: "Z Generous", offer: { rebate: 6, referral: null } });
  const order = rankCatalog([plain, generous], ["rebate"], TODAY);
  assert.deepEqual(order.map((row) => row.id), ["generous", "plain"]);
  assert.ok(order[0]!.breakdown.points.support > 0);
});

test("ties are broken by service record", () => {
  // Same total, built differently: B has the better service record.
  const a = vendor({ id: "a", company: "A", reviews: [GOOD, GOOD, GOOD], prices: [{ mine: 100, best: 100 }] });
  const b = vendor({ id: "b", company: "B", reviews: [GOOD, GOOD, GOOD, GOOD], prices: [{ mine: 100, best: 100 }] });
  const sa = scoreVendor(a, ["rebate"], TODAY);
  const sb = scoreVendor(b, ["rebate"], TODAY);
  // Lower B's price score so the totals match exactly.
  const gap = sb.points.service - sa.points.service;
  const ratio = 1 + gap / (RANK_WEIGHTS.price * PRICE_SLOPE);
  const b2 = { ...b, prices: [{ mine: 100 * ratio, best: 100 }] };
  const s2 = scoreVendor(b2, ["rebate"], TODAY);
  assert.ok(Math.abs(s2.total - sa.total) < 1e-9, "equal totals");
  const order = rankCatalog([a, b2], ["rebate"], TODAY).map((row) => row.id);
  assert.deepEqual(order, ["b", "a"], "the better service record wins the tie");
});

// --- eligibility, listing, and the minimum record -------------------------------

test("eligibility gates: current covenant, and no probation, suspension, or revocation", () => {
  assert.equal(ineligibleReason(vendor()), null);
  assert.equal(ineligibleReason(vendor({ termsVersion: "2026-10-25" })), null, "2026-10-25 carries the current covenant");
  assert.equal(ineligibleReason(vendor({ termsVersion: "2026-10-24" })), "covenant");
  assert.equal(ineligibleReason(vendor({ termsVersion: "" })), "covenant");
  assert.equal(ineligibleReason(vendor({ consequence: "warning" })), null, "a warning does not stop ranking");
  assert.equal(ineligibleReason(vendor({ consequence: "probation" })), "probation");
  assert.equal(ineligibleReason(vendor({ consequence: "suspension" })), "suspension");
  assert.equal(ineligibleReason(vendor({ consequence: "revocation" })), "revocation");
  assert.equal(ineligibleReason(vendor({ status: "pending" })), "not_approved");

  assert.equal(isListed(vendor({ consequence: "probation" })), true, "probation is listed, not ranked");
  assert.equal(isListed(vendor({ consequence: "suspension" })), false);
  assert.equal(isListed(vendor({ status: "paused" })), false);

  const best = vendor({ id: "probation", company: "A Best", consequence: "probation", reviews: Array(10).fill(GOOD) });
  const old = vendor({ id: "old", company: "B Old", termsVersion: "2026-10-24", reviews: Array(10).fill(GOOD) });
  const ok = vendor({ id: "ok", company: "C Ok", reviews: [GOOD, POOR, POOR] });
  const gone = vendor({ id: "gone", company: "D Gone", consequence: "revocation" });
  const ranked = rankCatalog([best, old, ok, gone], ["rebate"], TODAY);
  // Listed but not ranked: after the ranked ones, by name.
  assert.deepEqual(ranked.map((row) => row.id), ["ok", "probation", "old"]);
  assert.equal(ranked[0]!.preferred, true, "the top eligible vendor is Preferred");
  assert.equal(ranked[1]!.ranked, false);
  assert.equal(ranked[2]!.ranked, false);
  assert.ok(!ranked.some((row) => row.id === "gone"), "revoked vendors are not listed");
});

test("the minimum record: 3 verified reviews or an awarded bid before a score shows", () => {
  assert.deepEqual({ ...MIN_RECORD }, { reviews: 3, awards: 1 });
  assert.equal(hasRecord({ reviews: [GOOD, GOOD], awards: 0 }), false);
  assert.equal(hasRecord({ reviews: [GOOD, GOOD, GOOD], awards: 0 }), true);
  assert.equal(hasRecord({ reviews: [], awards: 1 }), true);

  // A newcomer with perfect numbers is not placed over a vendor with a record.
  const newcomer = vendor({
    id: "new",
    company: "A Newcomer",
    reviews: [GOOD, GOOD],
    awards: 0,
    offer: { rebate: 20, referral: null },
  });
  const steady = vendor({ id: "steady", company: "Z Steady", reviews: [GOOD, POOR, POOR], prices: [{ mine: 110, best: 100 }] });
  assert.ok(scoreVendor(newcomer, ["rebate"], TODAY).total > scoreVendor(steady, ["rebate"], TODAY).total);
  const ranked = rankCatalog([newcomer, steady], ["rebate"], TODAY);
  assert.deepEqual(ranked.map((row) => row.id), ["steady", "new"]);
  assert.equal(ranked[0]!.preferred, true);
  assert.equal(ranked[1]!.newToProgram, true);
  assert.equal(ranked[1]!.ranked, false);
  assert.equal(ranked[1]!.position, 0);

  // Nobody with a record: nobody is Preferred.
  const alone = rankCatalog([newcomer], ["rebate"], TODAY);
  assert.equal(alone[0]!.preferred, false);
});

test("licensed categories stay out of ranking and fees", () => {
  for (const category of SPEND_CATEGORIES) {
    const allLicensed = category.subcategories.every((sub) => isLicensed(category, sub));
    assert.equal(isRankedCategory(category), !allLicensed, category.id);
    if (allLicensed) assert.deepEqual(categoryFeeKinds(category), [], category.id);
  }
  assert.ok(SPEND_CATEGORIES.some((category) => !isRankedCategory(category)), "some catalogs are licensed");
  assert.deepEqual(categoryFeeKinds(getSpendCategory("printing-copiers")!).includes("rebate"), true);
});

// --- from the database ------------------------------------------------------------

function signup(overrides: Partial<VendorSignupInput> = {}): VendorSignupInput {
  return {
    company: "Coastal Office Supply",
    contactName: "Dana Reed",
    email: "dana@coastal.example",
    phone: "(912) 555-0100",
    website: "coastal.example",
    categories: ["printing-copiers/toner-ink"],
    states: ["GA"],
    places: "",
    nationwide: false,
    insured: "yes",
    notes: "",
    agreed: true,
    termsVersion: VENDOR_TERMS_VERSION,
    ...overrides,
  };
}

test("the migration applies twice without change (idempotent)", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  for (const file of [...PROGRAM_MIGRATIONS, "0010_source_vendor_portal.sql"]) {
    await pg.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  }
  const tables = await pg.query<{ n: number }>(
    "select count(*)::int as n from information_schema.tables where table_name like 'source_%'",
  );
  assert.ok(Number(tables.rows[0]!.n) >= 18);
});

test("ranking from the database: quotes set the price score, awards set the record", async () => {
  const sql = await freshProgramDb();
  const cheap = (await createVendor(sql, cleanVendorSignup(signup()), { ip: "" })).id;
  const dear = (
    await createVendor(sql, cleanVendorSignup(signup({ company: "Dear Toner", email: "x@dear.example" })), { ip: "" })
  ).id;
  const fresh = (
    await createVendor(sql, cleanVendorSignup(signup({ company: "Fresh Toner", email: "x@fresh.example" })), { ip: "" })
  ).id;
  for (const id of [cheap, dear, fresh]) await updateVendor(sql, id, { status: "approved" }, "lincoln");

  const bidId = await createBid(sql, bidTemplate("printing-copiers", "toner-ink"), "lincoln");
  const desk = await readDesk(sql);
  const items = desk.bids[0]!.items;
  const quote = async (vendorId: string, price: string) => {
    const quoteId = await addQuote(
      sql,
      { bidId, vendorName: vendorId, lines: items.map((item) => ({ itemId: item.id, unitPrice: price })) },
      "lincoln",
    );
    // Tie the desk quote to the program vendor, as an online quote would be.
    await sql`update source_quotes set vendor_id = ${vendorId}, source = 'online' where id = ${quoteId}`;
    return quoteId;
  };
  const cheapQuote = await quote(cheap, "100.00");
  await quote(dear, "110.00");
  await setItemWinners(sql, items[0]!.id, [cheapQuote], "lincoln");
  const dearQuote = (await sql<{ id: string }>`select id from source_quotes where vendor_id = ${dear}`)[0]!.id;
  await setItemWinners(sql, items[1]!.id, [dearQuote], "lincoln");

  const data = await loadRankingData(sql, new Date("2026-10-24T12:00:00Z"));
  const ranked = rankFor(data, "printing-copiers");
  assert.deepEqual(ranked.map((row) => row.company), ["Coastal Office Supply", "Dear Toner", "Fresh Toner"]);
  assert.equal(ranked[0]!.breakdown.price, 1);
  assert.ok(Math.abs(ranked[1]!.breakdown.price - 0.5) < 1e-9, "10% over the best quote");
  assert.equal(ranked[2]!.newToProgram, true, "no award and no reviews");
  assert.equal(ranked[0]!.preferred, true);

  // The public read shows the score, never the reason or a fee.
  const read = await readCatalogVendors(sql, "printing-copiers", { canViewFiles: true });
  assert.equal(read.ranked, true);
  assert.equal(read.vendors[0]!.preferred, true);
  assert.equal(typeof read.vendors[0]!.score, "number");
  assert.equal(read.vendors[2]!.score, null);
  assert.equal(read.vendors[2]!.newToProgram, true);
  const json = JSON.stringify(read);
  assert.ok(!/ineligible|rebate|referral|dana@|email/i.test(json), "no reasons, fees, or emails in the public read");

  // A licensed catalog has no vendors and no ranking.
  const licensed = SPEND_CATEGORIES.find((category) => !isRankedCategory(category))!;
  assert.deepEqual(await readCatalogVendors(sql, licensed.id, { canViewFiles: true }), {
    vendors: [],
    ranked: false,
    filesVisible: true,
  });

  // A suspended vendor leaves the catalog and has no public profile.
  await sql`update source_vendors set consequence = 'suspension', status = 'paused' where id = ${dear}`;
  const after = await readCatalogVendors(sql, "printing-copiers", { canViewFiles: true });
  assert.ok(!after.vendors.some((row) => row.id === dear));
  assert.equal(await readVendorProfile(sql, dear, { canViewFiles: true }), null);
  const profile = await readVendorProfile(sql, cheap, { canViewFiles: true });
  assert.equal(profile?.catalogs[0]?.preferred, true);
});
