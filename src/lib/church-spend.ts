import data from "../data/church-spend.json" with { type: "json" };

/**
 * Everything a church spends money on, for the united buying program
 * (src/data/church-spend.json): category, then subcategories, then the
 * typical items. The buying desk opens bids from it, the coverage view counts
 * against it, and /buying/<category> pages are built from it.
 *
 * The list holds no prices, discounts, or vendor names. A price on a public
 * page comes only from an awarded bid published to the buying book.
 *
 * This file is imported by node's test runner, so it uses relative imports
 * and no framework code.
 */

export const BUYING_MODELS = ["catalog", "contract", "project", "referral"] as const;
export type BuyingModel = (typeof BUYING_MODELS)[number];

export const UNITS = [
  "case",
  "each",
  "box",
  "pack",
  "ream",
  "roll",
  "bag",
  "bundle",
  "gallon",
  "month",
  "quarter",
  "year",
  "per week",
  "per service",
  "per visit",
  "per event",
  "per project",
  "per person",
  "per hour",
  "per trip",
  "per page",
  "per transaction",
  "per user per month",
  "per line per month",
] as const;

export const FREQUENCIES = [
  "weekly",
  "monthly",
  "quarterly",
  "twice a year",
  "annual",
  "seasonal",
  "per event",
  "as needed",
  "one time",
  "every few years",
] as const;

/**
 * `licensed`: buying goes only through a licensed or qualified provider, by
 * introduction. Every item under it is a referral and it is never bid.
 * `care`: can be bought, with a note the buyer should read first.
 */
export type SpendRequirement = { kind: "licensed" | "care"; note: string };

export type SpendItem = {
  id: string;
  name: string;
  unit: string;
  frequency: string;
  model: BuyingModel;
  /** Extra bid-sheet fields to collect for this item. */
  specs?: string[];
};

export type SpendSubcategory = {
  id: string;
  name: string;
  requires?: SpendRequirement;
  /** Bid-sheet fields to collect for everything in this subcategory. */
  specs?: string[];
  items: SpendItem[];
};

export type SpendCategory = {
  /** Also the URL slug: /buying/<id>. */
  id: string;
  name: string;
  short: string;
  summary: string;
  metaDescription: string;
  requires?: SpendRequirement;
  /** A category with its own pages elsewhere on the site (church AV). */
  route?: string;
  subcategories: SpendSubcategory[];
};

export type SpendList = { version: number; categories: SpendCategory[] };

export const SPEND_LIST = data as SpendList;
export const SPEND_CATEGORIES: SpendCategory[] = SPEND_LIST.categories;

/** A bid holds at most this many items (source-store createBid). */
export const MAX_BID_ITEMS = 40;

export const MODEL_LABELS: Record<BuyingModel, string> = {
  catalog: "Catalog item",
  contract: "Service contract",
  project: "Quoted project",
  referral: "By introduction",
};

export const MODEL_EXPLAINED: Record<BuyingModel, string> = {
  catalog:
    "A stocked item with a unit price. Once it is bid, any church orders it at the group price when it needs it.",
  contract: "A recurring service, bid by region so churches near each other share one price.",
  project: "A one-time job, quoted for your building against the group's bid terms.",
  referral: "We introduce you to a provider who serves churches. You deal with them directly.",
};

export function getSpendCategory(id: string): SpendCategory | undefined {
  return SPEND_CATEGORIES.find((category) => category.id === id);
}

export function getSpendSubcategory(
  categoryId: string,
  subcategoryId: string,
): SpendSubcategory | undefined {
  return getSpendCategory(categoryId)?.subcategories.find((sub) => sub.id === subcategoryId);
}

/** The requirement that applies to a subcategory: its own, else its category's. */
export function requirementFor(
  category: SpendCategory,
  sub?: SpendSubcategory,
): SpendRequirement | undefined {
  return sub?.requires ?? category.requires;
}

export function isLicensed(category: SpendCategory, sub?: SpendSubcategory): boolean {
  return requirementFor(category, sub)?.kind === "licensed";
}

/** Where a category's public catalog lives: its own route, else /buying/<id>. */
export function catalogPath(category: SpendCategory): string {
  return category.route ?? `/buying/${category.id}`;
}

/** Categories that get a /buying/<id> page (and a sitemap entry). */
export function catalogPageCategories(): SpendCategory[] {
  return SPEND_CATEGORIES.filter((category) => !category.route);
}

export function allItems(category: SpendCategory): SpendItem[] {
  return category.subcategories.flatMap((sub) => sub.items);
}

export function modelMix(items: SpendItem[]): Record<BuyingModel, number> {
  const mix: Record<BuyingModel, number> = { catalog: 0, contract: 0, project: 0, referral: 0 };
  for (const item of items) mix[item.model] += 1;
  return mix;
}

/** Every problem with the list, as sentences. An empty array means it is valid. */
export function validateSpendList(list: SpendList): string[] {
  const problems: string[] = [];
  const ids = new Map<string, string>();
  const claim = (id: string, where: string) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) problems.push(`${where}: id "${id}" is not a slug`);
    const prior = ids.get(id);
    if (prior) problems.push(`${where}: id "${id}" is already used by ${prior}`);
    else ids.set(id, where);
  };
  const models = new Set<string>(BUYING_MODELS);
  const units = new Set<string>(UNITS);
  const frequencies = new Set<string>(FREQUENCIES);

  for (const category of list.categories) {
    claim(category.id, `category ${category.id}`);
    for (const field of ["name", "short", "summary", "metaDescription"] as const) {
      if (!category[field]?.trim()) problems.push(`category ${category.id} has no ${field}`);
    }
    if (category.subcategories.length === 0) {
      problems.push(`category ${category.id} has no subcategories`);
    }
    for (const sub of category.subcategories) {
      claim(sub.id, `subcategory ${category.id}/${sub.id}`);
      const requirement = requirementFor(category, sub);
      if (requirement && !requirement.note.trim()) {
        problems.push(`${category.id}/${sub.id} has a requirement with no note`);
      }
      if (sub.items.length === 0) problems.push(`${category.id}/${sub.id} has no items`);
      for (const item of sub.items) {
        const where = `item ${category.id}/${sub.id}/${item.id}`;
        claim(item.id, where);
        if (!item.name?.trim()) problems.push(`${where} has no name`);
        if (!models.has(item.model)) problems.push(`${where} has no buying model`);
        if (!units.has(item.unit)) problems.push(`${where} has unknown unit "${item.unit}"`);
        if (!frequencies.has(item.frequency)) {
          problems.push(`${where} has unknown frequency "${item.frequency}"`);
        }
        if (requirement?.kind === "licensed" && item.model !== "referral") {
          problems.push(`${where} is licensed-only but is not a referral`);
        }
      }
    }
    // A whole-category template must still fit in one bid.
    const biddable = category.subcategories
      .filter((sub) => !isLicensed(category, sub))
      .flatMap((sub) => sub.items);
    if (biddable.length > MAX_BID_ITEMS) {
      problems.push(`category ${category.id} has more than ${MAX_BID_ITEMS} biddable items`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Bid templates (the desk's "New bid from template")
// ---------------------------------------------------------------------------

export type TemplateItem = {
  description: string;
  quantity: string;
  unit: string;
  catalogItem: string;
};

export type BidTemplate = {
  title: string;
  summary: string;
  category: string;
  subcategory: string;
  items: TemplateItem[];
};

export type TemplateOption = {
  /** "category" or "category/subcategory". */
  value: string;
  label: string;
  category: string;
  subcategory: string;
  disabled: boolean;
  note: string;
};

/** The choices for the desk's template picker, grouped by category. */
export function templateOptions(): { category: SpendCategory; options: TemplateOption[] }[] {
  return SPEND_CATEGORIES.map((category) => {
    const biddable = category.subcategories.filter((sub) => !isLicensed(category, sub));
    const whole: TemplateOption = {
      value: category.id,
      label: `All of ${category.name}`,
      category: category.id,
      subcategory: "",
      disabled: biddable.length === 0,
      note: biddable.length === 0 ? "Referral only through a licensed provider" : "",
    };
    const subs = category.subcategories.map((sub) => {
      const licensed = isLicensed(category, sub);
      return {
        value: `${category.id}/${sub.id}`,
        label: sub.name,
        category: category.id,
        subcategory: sub.id,
        disabled: licensed,
        note: licensed ? "Referral only through a licensed provider" : "",
      };
    });
    return { category, options: [whole, ...subs] };
  });
}

function specLines(category: SpendCategory, subs: SpendSubcategory[]): string[] {
  const lines: string[] = [];
  for (const sub of subs) {
    const fields = [...(sub.specs ?? [])];
    for (const item of sub.items) {
      for (const spec of item.specs ?? []) fields.push(`${item.name}: ${spec}`);
    }
    if (fields.length) lines.push(`${sub.name}: ${fields.join("; ")}.`);
    const care = requirementFor(category, sub);
    if (care?.kind === "care") lines.push(`Note: ${care.note}`);
  }
  return lines;
}

/**
 * A pre-filled bid for a category or one of its subcategories. Licensed
 * (referral-only) parts are left out of a whole-category template and refused
 * on their own, because they are never bid.
 */
export function bidTemplate(categoryId: string, subcategoryId = ""): BidTemplate {
  const category = getSpendCategory(categoryId);
  if (!category) throw new Error("That category is not on the list.");
  let subs: SpendSubcategory[];
  if (subcategoryId) {
    const sub = category.subcategories.find((row) => row.id === subcategoryId);
    if (!sub) throw new Error("That subcategory is not in this category.");
    if (isLicensed(category, sub)) {
      throw new Error(
        `${sub.name} is referral only through a licensed provider, so it is not bid.`,
      );
    }
    subs = [sub];
  } else {
    subs = category.subcategories.filter((sub) => !isLicensed(category, sub));
    if (subs.length === 0) {
      throw new Error(
        `${category.name} is referral only through a licensed provider, so it is not bid.`,
      );
    }
  }
  const items = subs.flatMap((sub) =>
    sub.items.map((item) => ({
      description: item.name,
      quantity: "1",
      unit: item.unit,
      catalogItem: item.id,
    })),
  );
  const sub = subcategoryId ? subs[0] : undefined;
  const title = sub ? `${category.name}: ${sub.name}` : category.name;
  const summary = [
    `Group bid for ${sub ? sub.name.toLowerCase() : category.name.toLowerCase()}. Quote a unit price for each line you can supply.`,
    ...specLines(category, subs),
  ].join("\n");
  return {
    title,
    summary,
    category: category.id,
    subcategory: sub?.id ?? "",
    items: items.slice(0, MAX_BID_ITEMS),
  };
}

/**
 * The category tag on a new bid. Blank is allowed (an untagged bid); an
 * unknown or referral-only category is refused.
 */
export function checkBidCategory(
  categoryId: string,
  subcategoryId: string,
): { category: string; subcategory: string } {
  const categoryKey = categoryId.trim();
  const subKey = subcategoryId.trim();
  if (!categoryKey) {
    if (subKey) throw new Error("Pick a category for that subcategory.");
    return { category: "", subcategory: "" };
  }
  const category = getSpendCategory(categoryKey);
  if (!category) throw new Error("That category is not on the list.");
  const sub = subKey ? category.subcategories.find((row) => row.id === subKey) : undefined;
  if (subKey && !sub) throw new Error("That subcategory is not in this category.");
  if (
    sub
      ? isLicensed(category, sub)
      : category.subcategories.every((row) => isLicensed(category, row))
  ) {
    throw new Error(
      `${sub?.name ?? category.name} is referral only through a licensed provider, so it is not bid.`,
    );
  }
  return { category: category.id, subcategory: sub?.id ?? "" };
}

// ---------------------------------------------------------------------------
// Coverage (the desk's gap view)
// ---------------------------------------------------------------------------

export type CoverageBid = {
  category: string;
  status: string;
  book: unknown[];
};

export type CoverageRow = {
  category: SpendCategory;
  openBids: number;
  closedBids: number;
  bookItems: number;
  /** Every part is referral-only through a licensed provider: never bid, never a gap. */
  referralOnly: boolean;
  gap: boolean;
};

export type Coverage = {
  rows: CoverageRow[];
  gaps: SpendCategory[];
  referralOnly: SpendCategory[];
  uncategorized: { openBids: number; bookItems: number };
};

/** Per category: open bids and published buying-book items. Nothing in both is a gap. */
export function coverage(bids: CoverageBid[]): Coverage {
  const known = new Set(SPEND_CATEGORIES.map((category) => category.id));
  const rows = SPEND_CATEGORIES.map((category) => {
    const mine = bids.filter((bid) => bid.category === category.id);
    const openBids = mine.filter((bid) => bid.status === "open").length;
    const closedBids = mine.length - openBids;
    const bookItems = mine.reduce((sum, bid) => sum + bid.book.length, 0);
    const referralOnly = category.subcategories.every((sub) => isLicensed(category, sub));
    return {
      category,
      openBids,
      closedBids,
      bookItems,
      referralOnly,
      gap: !referralOnly && openBids === 0 && bookItems === 0,
    };
  });
  const loose = bids.filter((bid) => !known.has(bid.category));
  return {
    rows,
    gaps: rows.filter((row) => row.gap).map((row) => row.category),
    referralOnly: rows.filter((row) => row.referralOnly).map((row) => row.category),
    uncategorized: {
      openBids: loose.filter((bid) => bid.status === "open").length,
      bookItems: loose.reduce((sum, bid) => sum + bid.book.length, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Public catalog page view
// ---------------------------------------------------------------------------

export type CatalogBookEntry = {
  id: string;
  title: string;
  vendorName: string;
  unitPrice: string;
  unit: string;
  quantity: string;
  notes: string;
  category: string;
  catalogItem: string;
  /** The vendor stands behind the Vendor Covenant (see listBook). */
  covenant?: boolean;
  /** 'ended' once the price term has passed: shown as being refreshed, not as a price. */
  priceStatus?: "current" | "ended";
  /**
   * Vendor, price, and notes were withheld on the server because the viewer
   * is not a member church (see entriesForViewer in membership.ts).
   */
  locked?: boolean;
};

export type CatalogItemStatus = "priced" | "bidding" | "referral" | "not-bid";

export type CatalogItemView = {
  item: SpendItem;
  status: CatalogItemStatus;
  /** Real awarded prices only, from the published buying book. */
  prices: CatalogBookEntry[];
};

export type CatalogView = {
  category: SpendCategory;
  sections: {
    sub: SpendSubcategory;
    requires?: SpendRequirement;
    items: CatalogItemView[];
  }[];
  /** Published entries tagged with this category that are not a listed item. */
  otherPrices: CatalogBookEntry[];
  pricedCount: number;
  itemCount: number;
};

/**
 * What /buying/<category> shows. A price appears only when a published
 * buying-book entry exists for that item; referral-only parts never show
 * prices.
 */
export function catalogView(
  category: SpendCategory,
  book: CatalogBookEntry[],
  bidding: { category: string; catalogItem: string }[],
): CatalogView {
  // A locked entry still counts as priced: the price exists, the viewer is not a member.
  const mine = book.filter(
    (entry) =>
      entry.category === category.id &&
      (entry.unitPrice.trim() || entry.locked || entry.priceStatus === "ended"),
  );
  const open = new Set(
    bidding.filter((row) => row.category === category.id).map((row) => row.catalogItem),
  );
  const listed = new Set(allItems(category).map((item) => item.id));
  let pricedCount = 0;
  const sections = category.subcategories.map((sub) => {
    const requires = requirementFor(category, sub);
    const licensed = requires?.kind === "licensed";
    const items = sub.items.map((item): CatalogItemView => {
      const prices = licensed ? [] : mine.filter((entry) => entry.catalogItem === item.id);
      let status: CatalogItemStatus;
      if (prices.length) status = "priced";
      else if (item.model === "referral" || licensed) status = "referral";
      else if (open.has(item.id)) status = "bidding";
      else status = "not-bid";
      if (status === "priced") pricedCount += 1;
      return { item, status, prices };
    });
    return { sub, requires, items };
  });
  return {
    category,
    sections,
    otherPrices: mine.filter((entry) => !listed.has(entry.catalogItem)),
    pricedCount,
    itemCount: listed.size,
  };
}

/** Published entries grouped under their category, in list order; untagged last. */
export function groupBookByCategory<T extends { category: string }>(
  entries: T[],
): { category: SpendCategory | null; entries: T[] }[] {
  const groups: { category: SpendCategory | null; entries: T[] }[] = [];
  for (const category of SPEND_CATEGORIES) {
    const mine = entries.filter((entry) => entry.category === category.id);
    if (mine.length) groups.push({ category, entries: mine });
  }
  const known = new Set(SPEND_CATEGORIES.map((category) => category.id));
  const loose = entries.filter((entry) => !known.has(entry.category));
  if (loose.length) groups.push({ category: null, entries: loose });
  return groups;
}
