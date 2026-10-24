import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import {
  BUYING_MODELS,
  MAX_BID_ITEMS,
  SPEND_CATEGORIES,
  SPEND_LIST,
  allItems,
  bidTemplate,
  catalogPageCategories,
  catalogPath,
  catalogView,
  checkBidCategory,
  coverage,
  getSpendCategory,
  groupBookByCategory,
  isLicensed,
  requirementFor,
  templateOptions,
  validateSpendList,
  type SpendList,
} from "./church-spend.ts";
import {
  addQuote,
  createBid,
  listBidding,
  listBook,
  publishAward,
  readBuyingCatalog,
  readDesk,
  setBidStatus,
  setItemWinners,
} from "./source-store.ts";

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
    for (let i = 0; i < values.length; i += 1) {
      text += `$${i + 1}${strings[i + 1] ?? ""}`;
    }
    return run<T>(text, values);
  }) as Sql;
  sql.query = (text, params = []) => run(text, params);
  return sql;
}

const migration = (rel: string) =>
  readFileSync(new URL(`../../migrations/${rel}`, import.meta.url), "utf8");

async function fresh({ categories = true } = {}) {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(migration("0004_source_buying.sql"));
  if (categories) await pg.exec(migration("0006_source_bid_category.sql"));
  return toSql(pg);
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

test("the church spend list is valid", () => {
  assert.deepEqual(validateSpendList(SPEND_LIST), []);
});

test("every id is unique across categories, subcategories, and items", () => {
  const ids = SPEND_CATEGORIES.flatMap((c) => [
    c.id,
    ...c.subcategories.flatMap((s) => [s.id, ...s.items.map((i) => i.id)]),
  ]);
  assert.equal(new Set(ids).size, ids.length);
});

test("every item has a buying model, unit, and frequency", () => {
  for (const category of SPEND_CATEGORIES) {
    for (const item of allItems(category)) {
      assert.ok(BUYING_MODELS.includes(item.model), `${item.id} has no buying model`);
      assert.ok(item.unit, `${item.id} has no unit`);
      assert.ok(item.frequency, `${item.id} has no frequency`);
    }
  }
});

test("the validator catches a duplicate id, a missing model, and a licensed non-referral", () => {
  const broken: SpendList = {
    version: 1,
    categories: [
      {
        id: "x",
        name: "X",
        short: "x",
        summary: "x",
        metaDescription: "x",
        requires: { kind: "licensed", note: "Licensed only." },
        subcategories: [
          {
            id: "x-sub",
            name: "Sub",
            items: [
              { id: "dup", name: "A", unit: "each", frequency: "annual", model: "catalog" },
              {
                id: "dup",
                name: "B",
                unit: "each",
                frequency: "annual",
                model: "" as never,
              },
            ],
          },
        ],
      },
    ],
  };
  const problems = validateSpendList(broken).join("\n");
  assert.match(problems, /already used/);
  assert.match(problems, /no buying model/);
  assert.match(problems, /licensed-only but is not a referral/);
});

test("insurance, health benefits, banking and loans, and payroll and tax are referral only through a licensed provider", () => {
  const mustBeLicensed: [string, string?][] = [
    ["insurance"],
    ["transportation", "vehicle-insurance"],
    ["hr-benefits", "health-benefits"],
    ["hr-benefits", "retirement"],
    ["financial-services", "banking"],
    ["financial-services", "payroll-and-tax"],
    ["financial-services", "audit-tax"],
  ];
  for (const [categoryId, subId] of mustBeLicensed) {
    const category = getSpendCategory(categoryId)!;
    assert.ok(category, `missing category ${categoryId}`);
    const subs = subId
      ? [category.subcategories.find((s) => s.id === subId)!]
      : category.subcategories;
    for (const sub of subs) {
      assert.ok(sub, `missing ${categoryId}/${subId}`);
      assert.ok(isLicensed(category, sub), `${categoryId}/${sub.id} is not licensed-only`);
      const note = requirementFor(category, sub)!.note;
      assert.match(note, /^Referral only/, `${sub.id} note does not say referral only`);
      assert.match(note, /licensed|qualified/i);
      for (const item of sub.items) {
        assert.equal(item.model, "referral", `${item.id} must be a referral`);
      }
    }
  }
});

test("no lead-fee, commission, price, discount, or vendor claims in the list", () => {
  const text = readFileSync(new URL("../data/church-spend.json", import.meta.url), "utf8");
  assert.ok(!/lead[- ]fee|referral fee|finder'?s fee|commission|kickback/i.test(text));
  assert.ok(!/\$\s?\d|\d\s?%|percent|\bdiscount|\blowest\b|\bcheapest\b/i.test(text));
  assert.ok(!/\bfree\b/i.test(text), "no 'free'");
  assert.ok(!/\bAI\b/.test(text), "no 'AI'");
  assert.ok(!new RegExp(["mes", "sen", "ger"].join(""), "i").test(text));
});

test("the list covers what the owner asked for", () => {
  const ids = new Set(
    SPEND_CATEGORIES.flatMap((c) => [
      c.id,
      ...c.subcategories.flatMap((s) => [s.id, ...s.items.map((i) => i.id)]),
    ]),
  );
  const expected = [
    "copy-paper-letter", "toner-cartridge", "copier-lease", "bulletins", "offering-envelopes",
    "signage", "postage-meter", "prefilled-cups", "copyright-license", "hymnals", "choir-robes",
    "kids-curriculum", "vbs-kit", "summer-camp", "craft-supplies", "snack-crackers",
    "study-books", "pew-bibles", "paper-goods", "commercial-fridge", "toilet-tissue",
    "weekly-cleaning", "hvac-maintenance", "plumbing-service", "electrical-service",
    "roof-replacement", "interior-painting", "carpet-replacement", "pew-refinishing",
    "pew-cushions", "stacking-chairs", "folding-tables", "lawn-care", "landscaping",
    "snow-removal", "seal-coating", "striping", "tree-trimming", "general-pest", "cameras",
    "access-control", "alarm-monitoring", "extinguisher-inspection", "fire-alarm-inspection",
    "sprinkler-inspection", "first-aid-kits", "aed", "background-checks", "electric-supply",
    "gas-supply", "water", "dumpster", "recycling", "internet", "phone-service", "mobile-lines",
    "led-retrofit", "solar", "laptops", "office-suite", "church-management", "website",
    "email-hosting", "it-support", "cybersecurity", "data-backup", "sound-system",
    "livestream", "stage-lighting", "projection", "video-cameras", "hearing-assistance",
    "church-van", "fleet-fuel", "vehicle-maintenance", "auto-insurance",
    "property-insurance", "liability-insurance", "abuse-insurance", "do-insurance",
    "workers-comp", "payroll", "bookkeeping", "audit", "online-giving", "card-processing",
    "checking", "building-loan", "health-insurance", "retirement-plan", "staffing",
    "architecture", "campaign-consulting", "tent-rental", "t-shirts",
    "banners", "promo-items", "blankets", "canned-goods", "toothbrushes", "cemetery-mowing",
    "office-desks", "cribs", "baptism-robes", "altar-flowers", "poinsettias", "easter-lilies",
  ];
  for (const id of expected) assert.ok(ids.has(id), `the list has no ${id}`);
});

test("the AV category routes to the existing church AV pages", () => {
  const av = getSpendCategory("audio-visual")!;
  assert.equal(av.route, "/church-av");
  assert.equal(catalogPath(av), "/church-av");
  assert.ok(!catalogPageCategories().includes(av));
  assert.equal(catalogPath(getSpendCategory("grounds")!), "/buying/grounds");
});

test("category cards fill every row of two on /buying", () => {
  assert.equal(SPEND_CATEGORIES.length % 2, 0);
});

test("catalog pages have unique titles and descriptions", () => {
  const names = SPEND_CATEGORIES.map((c) => c.name);
  const metas = SPEND_CATEGORIES.map((c) => c.metaDescription);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(metas).size, metas.length);
  for (const meta of metas) assert.ok(meta.length <= 170, `too long: ${meta}`);
});

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

test("every template option produces a valid bid, and licensed ones are refused", async () => {
  const sql = await fresh();
  let made = 0;
  for (const { options } of templateOptions()) {
    for (const option of options) {
      if (option.disabled) {
        assert.throws(() => bidTemplate(option.category, option.subcategory), /referral only/);
        await assert.rejects(
          () =>
            createBid(
              sql,
              {
                title: "Should not open",
                category: option.category,
                subcategory: option.subcategory,
                items: [{ description: "x" }],
              },
              "operator-1",
            ),
          /referral only/,
        );
        continue;
      }
      const template = bidTemplate(option.category, option.subcategory);
      assert.ok(template.title);
      assert.ok(template.items.length > 0 && template.items.length <= MAX_BID_ITEMS);
      for (const item of template.items) {
        assert.ok(item.description && item.unit && item.catalogItem);
      }
      await createBid(sql, template, "operator-1");
      made += 1;
    }
  }
  const desk = await readDesk(sql);
  assert.equal(desk.bids.length, made);
  const hvac = desk.bids.find((bid) => bid.subcategory === "hvac")!;
  assert.equal(hvac.category, "facilities");
  assert.equal(hvac.title, "Facilities maintenance: Heating and air");
  assert.match(hvac.summary, /Tonnage/);
  const filters = hvac.items.find((item) => item.catalogItem === "hvac-filters")!;
  assert.equal(filters.unit, "case");
  assert.equal(filters.description, "HVAC filters");
});

test("a whole-category template leaves out its referral-only parts", () => {
  const template = bidTemplate("financial-services");
  const ids = new Set(template.items.map((item) => item.catalogItem));
  assert.ok(ids.has("bookkeeping"));
  assert.ok(ids.has("online-giving"));
  assert.ok(!ids.has("payroll"));
  assert.ok(!ids.has("audit"));
  assert.ok(!ids.has("building-loan"));
  assert.equal(template.subcategory, "");
  assert.throws(() => bidTemplate("insurance"), /referral only/);
  assert.throws(() => bidTemplate("nope"), /not on the list/);
  assert.throws(() => bidTemplate("grounds", "nope"), /not in this category/);
});

test("a care note travels into the bid's spec notes", () => {
  const template = bidTemplate("security-safety", "screening");
  assert.match(template.summary, /written consent/);
});

test("checkBidCategory allows blank, refuses unknown and referral-only", () => {
  assert.deepEqual(checkBidCategory("", ""), { category: "", subcategory: "" });
  assert.deepEqual(checkBidCategory("grounds", "snow"), { category: "grounds", subcategory: "snow" });
  assert.throws(() => checkBidCategory("", "snow"), /Pick a category/);
  assert.throws(() => checkBidCategory("made-up", ""), /not on the list/);
  assert.throws(() => checkBidCategory("hr-benefits", "health-benefits"), /referral only/);
  assert.deepEqual(checkBidCategory("hr-benefits", ""), {
    category: "hr-benefits",
    subcategory: "",
  });
});

// ---------------------------------------------------------------------------
// Coverage and catalog pages, against a real (PGLite) database
// ---------------------------------------------------------------------------

async function awardAndPublish(sql: Sql, bidId: string, itemIndexes: number[], price = "10") {
  const desk = await readDesk(sql);
  const bid = desk.bids.find((row) => row.id === bidId)!;
  const quoteId = await addQuote(
    sql,
    {
      bidId,
      vendorName: "Test Vendor",
      lines: bid.items.map((item) => ({ itemId: item.id, unitPrice: price })),
    },
    "operator-1",
  );
  for (const index of itemIndexes) {
    await setItemWinners(sql, bid.items[index]!.id, [quoteId], "operator-1");
  }
  const after = await readDesk(sql);
  const awards = after.bids.find((row) => row.id === bidId)!.awards;
  for (const award of awards) await publishAward(sql, award.id, "operator-1");
}

test("coverage counts open bids and published items per category, and lists the gaps", async () => {
  const sql = await fresh();
  const janitorial = await createBid(sql, bidTemplate("janitorial-supplies", "restroom"), "op");
  await awardAndPublish(sql, janitorial, [0, 1]);
  await setBidStatus(sql, janitorial, "closed");
  await createBid(sql, bidTemplate("janitorial-supplies", "cleaning"), "op");
  await createBid(sql, bidTemplate("grounds", "snow"), "op");
  await createBid(sql, bidTemplate("grounds", "lawn-landscape"), "op");
  await createBid(sql, { title: "Loose", items: [{ description: "Thing" }] }, "op");

  const view = coverage((await readDesk(sql)).bids);
  const row = (id: string) => view.rows.find((r) => r.category.id === id)!;
  assert.equal(row("janitorial-supplies").openBids, 1);
  assert.equal(row("janitorial-supplies").closedBids, 1);
  assert.equal(row("janitorial-supplies").bookItems, 2);
  assert.equal(row("janitorial-supplies").gap, false);
  assert.equal(row("grounds").openBids, 2);
  assert.equal(row("grounds").bookItems, 0);
  assert.equal(row("pest-control").gap, true);
  assert.equal(row("insurance").referralOnly, true);
  assert.equal(row("insurance").gap, false);
  assert.ok(view.gaps.some((c) => c.id === "pest-control"));
  assert.ok(!view.gaps.some((c) => c.id === "grounds" || c.id === "janitorial-supplies"));
  assert.ok(!view.gaps.some((c) => c.id === "insurance"));
  assert.equal(view.gaps.length, SPEND_CATEGORIES.length - 2 - view.referralOnly.length);
  assert.deepEqual(view.uncategorized, { openBids: 1, bookItems: 0 });
});

test("a catalog page shows real awarded prices only, and marks the rest honestly", async () => {
  const sql = await fresh();
  const restroom = await createBid(sql, bidTemplate("janitorial-supplies", "restroom"), "op");
  await awardAndPublish(sql, restroom, [0], "41.25");
  await createBid(sql, bidTemplate("janitorial-supplies", "cleaning"), "op");

  const read = await readBuyingCatalog(async () => sql);
  assert.equal(read.unavailable, false);
  const view = catalogView(getSpendCategory("janitorial-supplies")!, read.entries, read.bidding);
  const status = new Map(
    view.sections.flatMap((s) => s.items.map((row) => [row.item.id, row] as const)),
  );
  assert.equal(status.get("toilet-tissue")!.status, "priced");
  assert.equal(status.get("toilet-tissue")!.prices[0]!.unitPrice, "41.25");
  assert.equal(status.get("toilet-tissue")!.prices[0]!.vendorName, "Test Vendor");
  // Still on the open restroom bid (only the tissue was awarded).
  assert.equal(status.get("paper-towels")!.status, "bidding");
  assert.equal(status.get("disinfectant")!.status, "bidding");
  assert.equal(status.get("mat-service")!.status, "not-bid");
  assert.equal(view.pricedCount, 1);
  assert.equal(view.itemCount, allItems(getSpendCategory("janitorial-supplies")!).length);

  // The same price does not leak onto another category's page.
  const other = catalogView(getSpendCategory("grounds")!, read.entries, read.bidding);
  assert.equal(other.pricedCount, 0);
  assert.ok(other.sections.every((s) => s.items.every((row) => row.status === "not-bid")));
});

test("referral-only parts of a catalog page never show a price", () => {
  const category = getSpendCategory("financial-services")!;
  const entries = [
    {
      id: "b1",
      title: "Payroll processing",
      vendorName: "Somebody",
      unitPrice: "99",
      unit: "month",
      quantity: "1",
      notes: "",
      category: "financial-services",
      catalogItem: "payroll",
    },
  ];
  const view = catalogView(category, entries, []);
  const payroll = view.sections
    .flatMap((s) => s.items)
    .find((row) => row.item.id === "payroll")!;
  assert.equal(payroll.status, "referral");
  assert.deepEqual(payroll.prices, []);
  assert.equal(view.pricedCount, 0);
});

test("the buying book groups by category in list order, untagged last", () => {
  const groups = groupBookByCategory([
    { id: "1", category: "seasonal" },
    { id: "2", category: "" },
    { id: "3", category: "office-supplies" },
  ]);
  assert.deepEqual(
    groups.map((g) => g.category?.id ?? null),
    ["office-supplies", "seasonal", null],
  );
});

test("the public reads still work before 0006 is applied, and a bid write says why it fails", async () => {
  const sql = await fresh({ categories: false });
  assert.deepEqual(await listBook(sql), []);
  assert.deepEqual(await listBidding(sql), []);
  await assert.rejects(
    () => createBid(sql, bidTemplate("grounds", "snow"), "op"),
    /0006_source_bid_category\.sql/,
  );
});
