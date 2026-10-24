import type { Sql } from "./db.ts";
import {
  SPEND_CATEGORIES,
  getSpendCategory,
  isLicensed,
  type SpendCategory,
} from "./church-spend.ts";
import {
  FEES,
  acceptedCovenant,
  feeFloor,
  feeFor,
  type Consequence,
  type FeeConfig,
  type FeeKind,
} from "./vendor-terms.ts";

/**
 * How program vendors are ranked in each buying catalog, and the reads that
 * feed it. Every approved vendor serving a catalog is listed; eligible vendors
 * with a record are scored and ordered, and the top one is Preferred.
 *
 *   score = 50 × service + 35 × price + 15 × support × price      (0 to 100)
 *
 *   service  = 0.7 × reviews + 0.3 × covenant history             (0 to 1)
 *   price    = 1 − 5 × (the vendor's price ÷ the best quote − 1),  (0 to 1)
 *              averaged over the catalog's items it quoted
 *   support  = points offered above the floor ÷ 10, at most 1     (0 to 1)
 *
 * Support is multiplied by the price score, so a higher fee counts only as far
 * as the price stays fair. A vendor that raises its price to pay a bigger fee
 * always loses more on price than it gains on support (see
 * {@link priceOutweighsFee}).
 *
 * Imported by node's test runner: relative imports, no framework code. Public
 * pages get only the score and the review summary, never case details.
 */

// ---------------------------------------------------------------------------
// The numbers. Change them here; the explanation page reads them.
// ---------------------------------------------------------------------------

/** Points out of 100 for each factor. */
export const RANK_WEIGHTS = { service: 50, price: 35, support: 15 } as const;

/** Inside the service record: verified reviews and covenant history. */
export const SERVICE_SPLIT = { reviews: 0.7, covenant: 0.3 } as const;

/**
 * Price score lost per unit of price above the best quote: 5 means a price 10%
 * above the best quote scores 0.5, and 20% above scores 0.
 */
export const PRICE_SLOPE = 5;

/** The price score when the vendor has no quote to compare yet: the middle. */
export const NO_PRICE_SCORE = 0.5;

/** Percentage points above the floor that earn full program-support credit. */
export const SUPPORT_FULL_POINTS = 10;

/**
 * Reviews are averaged with this many neutral reviews, so one glowing review
 * cannot outrank a long good record.
 */
export const REVIEW_PRIOR = { count: 3, score: 0.5 } as const;

/** A score shows only after this record. */
export const MIN_RECORD = { reviews: 3, awards: 1 } as const;

/** Covenant history: what one case decided against the vendor costs. */
export const CASE_COST = { at_fault: 0.25, partly: 0.125 } as const;

/** Covenant history: what a remedy not done, or done late, costs. */
export const LATE_REMEDY_COST = 0.25;

/** Shown wherever the ranking or the Preferred badge appears. */
export const RANKING_DISCLOSURE =
  "Preferred status considers each vendor's service record, price, and support for the program.";

/** The public page that explains the ranking. In the sitemap. */
export const RANKING_PATH = "/buying/how-vendors-are-ranked";

/** What a review author is called when the church did not choose to be named. */
export const ANONYMOUS_CHURCH = "A program church";

/**
 * The rule the weights must keep: raising a price by a fraction p frees at
 * most p × 100 points of fee to offer. The price score falls by at least
 * PRICE_SLOPE × p and support rises by at most p × 100 ÷ SUPPORT_FULL_POINTS,
 * so price must outweigh support at that exchange rate.
 */
export function priceOutweighsFee(
  weights: { price: number; support: number } = RANK_WEIGHTS,
  slope = PRICE_SLOPE,
  fullPoints = SUPPORT_FULL_POINTS,
): boolean {
  return weights.price * slope > (weights.support * 100) / fullPoints;
}

// ---------------------------------------------------------------------------
// Which catalogs are ranked, and which fees apply
// ---------------------------------------------------------------------------

/** The fee kinds a catalog's non-licensed items carry. Licensed items carry none. */
export function categoryFeeKinds(category: SpendCategory, config: FeeConfig = FEES): FeeKind[] {
  const kinds = new Set<FeeKind>();
  for (const sub of category.subcategories) {
    if (isLicensed(category, sub)) continue;
    for (const item of sub.items) {
      const fee = feeFor(item.model, false, config);
      if (fee) kinds.add(fee.kind);
    }
  }
  return (["rebate", "referral"] as FeeKind[]).filter((kind) => kinds.has(kind));
}

/**
 * Licensed categories (insurance, benefits, banking, payroll and tax, audit)
 * stay out of ranking and fees entirely. A catalog is ranked when it has
 * anything a vendor can sign up for.
 */
export function isRankedCategory(category: SpendCategory | undefined): boolean {
  if (!category) return false;
  return category.subcategories.some((sub) => !isLicensed(category, sub));
}

/** Catalogs a vendor's category keys put it in ("janitorial-supplies/paper" -> janitorial-supplies). */
export function vendorCatalogs(categoryKeys: string[]): string[] {
  const ids = new Set<string>();
  for (const key of categoryKeys) {
    const id = key.split("/")[0] ?? "";
    if (isRankedCategory(getSpendCategory(id))) ids.add(id);
  }
  return SPEND_CATEGORIES.map((category) => category.id).filter((id) => ids.has(id));
}

// ---------------------------------------------------------------------------
// The factors
// ---------------------------------------------------------------------------

export type ReviewFacts = {
  /** 1 to 5. */
  overall: number;
  /** 1 to 5. */
  quality: number;
  onTime: boolean;
  billMatched: boolean;
  hireAgain: boolean;
};

export type CaseFacts = {
  /** '' while undecided. */
  finding: string;
  remedyKind: string;
  /** '' | pending | done | not_done */
  remedyStatus: string;
  remedyDue: string;
  /** ISO time the remedy was marked. */
  remedyMarkedAt: string;
};

export type PriceFact = { mine: number; best: number };

export type Offer = { rebate: number | null; referral: number | null };

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** One review as 0 to 1: overall counts most, then quality, then the three yes/no answers. */
export function reviewScore(review: ReviewFacts): number {
  const overall = (clamp(review.overall, 1, 5) - 1) / 4;
  const quality = (clamp(review.quality, 1, 5) - 1) / 4;
  const yes = (value: boolean) => (value ? 1 : 0);
  return (
    0.5 * overall +
    0.2 * quality +
    0.1 * yes(review.onTime) +
    0.1 * yes(review.billMatched) +
    0.1 * yes(review.hireAgain)
  );
}

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, Math.round(Number(value) || low)));
}

/** Every review counts, hidden or not, pulled toward neutral while there are few. */
export function reviewsComponent(reviews: ReviewFacts[]): number {
  const total = reviews.reduce((sum, review) => sum + reviewScore(review), 0);
  return (total + REVIEW_PRIOR.count * REVIEW_PRIOR.score) / (reviews.length + REVIEW_PRIOR.count);
}

/** A remedy that was owed and not done, or done after its due date. */
export function remedyLate(row: CaseFacts, today: string): boolean {
  if (!row.remedyKind || row.remedyKind === "none") return false;
  if (row.remedyStatus === "not_done") return true;
  if (row.remedyStatus === "done") {
    return Boolean(row.remedyDue) && row.remedyMarkedAt.slice(0, 10) > row.remedyDue;
  }
  return row.remedyStatus === "pending" && Boolean(row.remedyDue) && today > row.remedyDue;
}

/** 1 for a clean record; each case decided against the vendor and each late remedy costs. */
export function covenantComponent(cases: CaseFacts[], today: string): number {
  let cost = 0;
  for (const row of cases) {
    if (row.finding === "at_fault") cost += CASE_COST.at_fault;
    else if (row.finding === "partly") cost += CASE_COST.partly;
    if (remedyLate(row, today)) cost += LATE_REMEDY_COST;
  }
  return clamp01(1 - cost);
}

export function serviceScore(reviews: ReviewFacts[], cases: CaseFacts[], today: string): number {
  return (
    SERVICE_SPLIT.reviews * reviewsComponent(reviews) +
    SERVICE_SPLIT.covenant * covenantComponent(cases, today)
  );
}

/** Price to the church: each quoted item against the best quote for it, averaged. */
export function priceScore(prices: PriceFact[]): number {
  const usable = prices.filter((row) => row.mine > 0 && row.best > 0);
  if (usable.length === 0) return NO_PRICE_SCORE;
  const each = usable.map((row) => clamp01(1 - PRICE_SLOPE * (row.mine / row.best - 1)));
  return each.reduce((sum, value) => sum + value, 0) / each.length;
}

/** Points above the floor, per fee kind the catalog carries, as 0 to 1. Missing = the floor. */
export function supportScore(
  offer: Offer | null,
  kinds: FeeKind[],
  config: FeeConfig = FEES,
): number {
  if (kinds.length === 0) return 0;
  const each = kinds.map((kind) => {
    const offered = offer?.[kind];
    const floor = feeFloor(kind, config);
    if (offered === null || offered === undefined || !Number.isFinite(offered)) return 0;
    return clamp01((offered - floor) / SUPPORT_FULL_POINTS);
  });
  return each.reduce((sum, value) => sum + value, 0) / each.length;
}

// ---------------------------------------------------------------------------
// Eligibility, the minimum record, and the score
// ---------------------------------------------------------------------------

export type RankVendor = {
  id: string;
  company: string;
  /** pending | approved | paused | removed */
  status: string;
  termsVersion: string;
  consequence: Consequence;
  reviews: ReviewFacts[];
  cases: CaseFacts[];
  /** Awarded bid lines across the program. */
  awards: number;
  /** This catalog's items the vendor quoted, against the best quote for each. */
  prices: PriceFact[];
  /** The rate offered in this catalog (null = the floor). */
  offer: Offer | null;
};

export type Ineligible = "not_approved" | "covenant" | "probation" | "suspension" | "revocation";

export const INELIGIBLE_TEXT: Record<Ineligible, string> = {
  not_approved: "Not approved for the program right now",
  covenant: "Has not accepted the current Vendor Covenant",
  probation: "On probation",
  suspension: "Suspended",
  revocation: "Revoked from the program",
};

/**
 * Eligible to be ranked: approved, accepted the current covenant, and not on
 * probation, suspension, or revocation. Returns why not, or null.
 */
export function ineligibleReason(vendor: Pick<RankVendor, "status" | "termsVersion" | "consequence">): Ineligible | null {
  if (vendor.consequence === "revocation") return "revocation";
  if (vendor.consequence === "suspension") return "suspension";
  if (vendor.status !== "approved") return "not_approved";
  if (vendor.consequence === "probation") return "probation";
  if (!acceptedCovenant(vendor.termsVersion)) return "covenant";
  return null;
}

/**
 * Shown in a catalog at all: approved and not suspended or revoked. (Probation
 * and an old covenant are listed, but not ranked.)
 */
export function isListed(vendor: Pick<RankVendor, "status" | "consequence">): boolean {
  return (
    vendor.status === "approved" &&
    vendor.consequence !== "suspension" &&
    vendor.consequence !== "revocation"
  );
}

/** Enough record for a score to show: 3 verified reviews, or an awarded bid. */
export function hasRecord(vendor: Pick<RankVendor, "reviews" | "awards">): boolean {
  return vendor.reviews.length >= MIN_RECORD.reviews || vendor.awards >= MIN_RECORD.awards;
}

export type ScoreBreakdown = {
  /** 0 to 1 */
  service: number;
  reviews: number;
  covenant: number;
  price: number;
  support: number;
  /** Points out of each weight. */
  points: { service: number; price: number; support: number };
  /** 0 to 100, unrounded. */
  total: number;
};

export function scoreVendor(
  vendor: RankVendor,
  kinds: FeeKind[],
  today: string,
  config: FeeConfig = FEES,
): ScoreBreakdown {
  const reviews = reviewsComponent(vendor.reviews);
  const covenant = covenantComponent(vendor.cases, today);
  const service = SERVICE_SPLIT.reviews * reviews + SERVICE_SPLIT.covenant * covenant;
  const price = priceScore(vendor.prices);
  const support = supportScore(vendor.offer, kinds, config);
  const points = {
    service: RANK_WEIGHTS.service * service,
    price: RANK_WEIGHTS.price * price,
    // A fee counts only as far as the price is fair.
    support: RANK_WEIGHTS.support * support * price,
  };
  return {
    service,
    reviews,
    covenant,
    price,
    support,
    points,
    total: points.service + points.price + points.support,
  };
}

/** Smaller average price ratio first; no quotes sort last. Breaks a tie the score cannot. */
function priceRatio(prices: PriceFact[]) {
  const usable = prices.filter((row) => row.mine > 0 && row.best > 0);
  if (usable.length === 0) return Number.POSITIVE_INFINITY;
  return usable.reduce((sum, row) => sum + row.mine / row.best, 0) / usable.length;
}

export type RankedVendor = {
  id: string;
  company: string;
  breakdown: ScoreBreakdown;
  eligible: boolean;
  ineligible: Ineligible | null;
  hasRecord: boolean;
  /** Eligible with a record: the score shows and the position counts. */
  ranked: boolean;
  /** 1-based among ranked vendors; 0 when not ranked. */
  position: number;
  preferred: boolean;
  /** Eligible, but no record yet. */
  newToProgram: boolean;
};

/**
 * Order a catalog. Ranked vendors (eligible, with a record) come first by
 * score, ties broken by service record, then price; then eligible vendors new
 * to the program; then the rest that are listed. The top ranked vendor is
 * Preferred. A vendor without a record is never placed above one with a record.
 * Vendors not listed (suspended, revoked, not approved) are left out.
 */
export function rankCatalog(
  vendors: RankVendor[],
  kinds: FeeKind[],
  today: string,
  config: FeeConfig = FEES,
): RankedVendor[] {
  const rows = vendors.filter(isListed).map((vendor) => {
    const ineligible = ineligibleReason(vendor);
    const record = hasRecord(vendor);
    return {
      vendor,
      row: {
        id: vendor.id,
        company: vendor.company,
        breakdown: scoreVendor(vendor, kinds, today, config),
        eligible: ineligible === null,
        ineligible,
        hasRecord: record,
        ranked: ineligible === null && record,
        position: 0,
        preferred: false,
        newToProgram: ineligible === null && !record,
      } satisfies RankedVendor,
    };
  });
  const group = (row: RankedVendor) => (row.ranked ? 0 : row.newToProgram ? 1 : 2);
  rows.sort((a, b) => {
    const byGroup = group(a.row) - group(b.row);
    if (byGroup) return byGroup;
    if (a.row.ranked) {
      const byTotal = b.row.breakdown.total - a.row.breakdown.total;
      if (Math.abs(byTotal) > 1e-9) return byTotal;
      const byService = b.row.breakdown.service - a.row.breakdown.service;
      if (Math.abs(byService) > 1e-9) return byService;
      const byPrice = priceRatio(a.vendor.prices) - priceRatio(b.vendor.prices);
      if (byPrice) return byPrice;
    }
    return a.row.company.localeCompare(b.row.company) || a.row.id.localeCompare(b.row.id);
  });
  let position = 0;
  return rows.map(({ row }) => {
    if (!row.ranked) return row;
    position += 1;
    return { ...row, position, preferred: position === 1 };
  });
}

/** 0 to 100, as shown. */
export function displayScore(breakdown: ScoreBreakdown): number {
  return Math.round(breakdown.total);
}

// ---------------------------------------------------------------------------
// Reading the inputs from the database
// ---------------------------------------------------------------------------

function text(value: unknown) {
  return String(value ?? "");
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return text(value);
}

function bool(value: unknown) {
  return value === true || value === "t" || value === "true";
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(text) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type RankingVendorRow = {
  id: string;
  company: string;
  status: string;
  termsVersion: string;
  consequence: Consequence;
  categories: string[];
};

/** Everything ranking needs, read once and ranked per catalog in memory. */
export type RankingData = {
  today: string;
  vendors: RankingVendorRow[];
  reviews: Map<string, ReviewFacts[]>;
  cases: Map<string, CaseFacts[]>;
  awards: Map<string, number>;
  /** category -> vendor -> price facts */
  prices: Map<string, Map<string, PriceFact[]>>;
  /** category -> vendor -> offer */
  offers: Map<string, Map<string, Offer>>;
};

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const rows = map.get(key) ?? [];
  rows.push(value);
  map.set(key, rows);
}

const CONSEQUENCE_VALUES = ["none", "warning", "probation", "suspension", "revocation"];

/**
 * Load the ranking inputs. Reads vendors, reviews (ratings only, hidden ones
 * too), the outcome columns of cases (never church details), awards, priced
 * quote lines, and offers.
 */
export async function loadRankingData(sql: Sql, now = new Date()): Promise<RankingData> {
  const today = now.toISOString().slice(0, 10);
  const vendorRows = await sql`
    select id, company, status, terms_version, categories,
      coalesce(to_jsonb(v) ->> 'consequence', '') as consequence
    from source_vendors v where status <> 'removed'
  `;
  const vendors: RankingVendorRow[] = vendorRows.map((row) => {
    const consequence = text(row.consequence);
    return {
      id: text(row.id),
      company: text(row.company),
      status: text(row.status),
      termsVersion: text(row.terms_version),
      consequence: (CONSEQUENCE_VALUES.includes(consequence) ? consequence : "none") as Consequence,
      categories: list(row.categories),
    };
  });

  const reviews = new Map<string, ReviewFacts[]>();
  for (const row of await sql`
    select vendor_id, overall, quality, on_time, bill_matched, hire_again
    from source_vendor_reviews
  `) {
    push(reviews, text(row.vendor_id), {
      overall: Number(row.overall),
      quality: Number(row.quality),
      onTime: bool(row.on_time),
      billMatched: bool(row.bill_matched),
      hireAgain: bool(row.hire_again),
    });
  }

  const cases = new Map<string, CaseFacts[]>();
  for (const row of await sql`
    select vendor_id, finding, remedy_kind, remedy_status, remedy_due, remedy_marked_at
    from source_cases where finding <> ''
  `) {
    push(cases, text(row.vendor_id), {
      finding: text(row.finding),
      remedyKind: text(row.remedy_kind),
      remedyStatus: text(row.remedy_status),
      remedyDue: text(row.remedy_due),
      remedyMarkedAt: row.remedy_marked_at ? iso(row.remedy_marked_at) : "",
    });
  }

  const awards = new Map<string, number>();
  for (const row of await sql`
    select q.vendor_id, count(*)::int as n
    from source_awards a join source_quotes q on q.id = a.quote_id
    where q.vendor_id <> '' and q.status = 'received'
    group by q.vendor_id
  `) {
    awards.set(text(row.vendor_id), Number(row.n));
  }

  // Every priced line on a received quote, by catalog and item. The best quote
  // for an item counts every quote, typed at the desk or sent online.
  const lines = await sql`
    select r.category, l.item_id, l.unit_price, q.vendor_id
    from source_quote_lines l
    join source_quotes q on q.id = l.quote_id
    join source_bid_items i on i.id = l.item_id
    join source_bid_requests r on r.id = i.bid_id
    where q.status = 'received' and l.unit_price <> '' and r.category <> ''
  `;
  const byItem = new Map<string, { category: string; quotes: { vendorId: string; price: number }[] }>();
  for (const row of lines) {
    const price = Number(text(row.unit_price));
    if (!(price > 0)) continue;
    const itemId = text(row.item_id);
    const entry = byItem.get(itemId) ?? { category: text(row.category), quotes: [] };
    entry.quotes.push({ vendorId: text(row.vendor_id), price });
    byItem.set(itemId, entry);
  }
  const prices = new Map<string, Map<string, PriceFact[]>>();
  for (const { category, quotes } of byItem.values()) {
    // A price compares only when there is another quote for the same item.
    if (quotes.length < 2) continue;
    const best = Math.min(...quotes.map((quote) => quote.price));
    const forCategory = prices.get(category) ?? new Map<string, PriceFact[]>();
    for (const quote of quotes) {
      if (!quote.vendorId) continue;
      push(forCategory, quote.vendorId, { mine: quote.price, best });
    }
    prices.set(category, forCategory);
  }

  const offers = new Map<string, Map<string, Offer>>();
  for (const row of await sql`
    select vendor_id, category, rebate_percent, referral_percent from source_vendor_offers
  `) {
    const category = text(row.category);
    const forCategory = offers.get(category) ?? new Map<string, Offer>();
    forCategory.set(text(row.vendor_id), {
      rebate: rate(row.rebate_percent),
      referral: rate(row.referral_percent),
    });
    offers.set(category, forCategory);
  }

  return { today, vendors, reviews, cases, awards, prices, offers };
}

/** The vendors serving a catalog, as ranking inputs. */
export function catalogInputs(data: RankingData, categoryId: string): RankVendor[] {
  return data.vendors
    .filter((vendor) => vendor.categories.some((key) => key.startsWith(`${categoryId}/`)))
    .map((vendor) => ({
      id: vendor.id,
      company: vendor.company,
      status: vendor.status,
      termsVersion: vendor.termsVersion,
      consequence: vendor.consequence,
      reviews: data.reviews.get(vendor.id) ?? [],
      cases: data.cases.get(vendor.id) ?? [],
      awards: data.awards.get(vendor.id) ?? 0,
      prices: data.prices.get(categoryId)?.get(vendor.id) ?? [],
      offer: data.offers.get(categoryId)?.get(vendor.id) ?? null,
    }));
}

/** Rank one catalog from loaded data. Licensed and unknown catalogs are not ranked. */
export function rankFor(data: RankingData, categoryId: string): RankedVendor[] {
  const category = getSpendCategory(categoryId);
  if (!category || !isRankedCategory(category)) return [];
  return rankCatalog(catalogInputs(data, categoryId), categoryFeeKinds(category), data.today);
}
