import type { Sql } from "./db.ts";
import { getSpendCategory } from "./church-spend.ts";
import { describeArea } from "./vendor-store.ts";
import { acceptedCovenant } from "./vendor-terms.ts";
import {
  displayScore,
  isListed,
  isRankedCategory,
  loadRankingData,
  rankFor,
  vendorCatalogs,
  type RankingData,
} from "./vendor-rank.ts";
import { listVendorFiles, type VendorFileRow } from "./vendor-files.ts";
import { vendorReviewSummary, type PublicReview } from "./review-store.ts";

/**
 * What a church sees of program vendors: each catalog's ranked list and each
 * vendor's profile. Only the score, the review summary, published reviews,
 * and the vendor's own business details leave here; never a church's contact,
 * a case, an eligibility reason, or a fee.
 *
 * Imported by node's test runner: relative imports, no framework code.
 */

export type PublicFile = {
  id: string;
  title: string;
  kind: string;
  filename: string;
  contentType: string;
  size: number;
  catalog: string;
};

export type CatalogVendor = {
  id: string;
  company: string;
  description: string;
  website: string;
  phone: string;
  area: string;
  /** Subcategory names it serves in this catalog. */
  serves: string[];
  /** Shown only for a ranked vendor (eligible, with a record). */
  score: number | null;
  position: number;
  preferred: boolean;
  newToProgram: boolean;
  covenant: boolean;
  reviewCount: number;
  reviewAverage: number;
  files: PublicFile[];
};

export type CatalogVendorsRead = {
  vendors: CatalogVendor[];
  /** False for licensed catalogs: no ranking, no fees. */
  ranked: boolean;
  unavailable: boolean;
  /** False when canViewVendorFiles said no; the file list is left empty. */
  filesVisible: boolean;
};

function publicFile(file: VendorFileRow): PublicFile {
  return {
    id: file.id,
    title: file.title,
    kind: file.kind,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    catalog: getSpendCategory(file.category)?.name ?? "",
  };
}

type VendorDetail = {
  id: string;
  description: string;
  website: string;
  phone: string;
  categories: string[];
  states: string[];
  places: string[];
  nationwide: boolean;
};

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function vendorDetails(sql: Sql, ids: string[]): Promise<Map<string, VendorDetail>> {
  if (ids.length === 0) return new Map();
  const rows = await sql`
    select id, website, phone, categories, states, places, nationwide,
      coalesce(to_jsonb(v) ->> 'description', '') as description
    from source_vendors v where id = any(${ids})
  `;
  return new Map(
    rows.map((row) => [
      String(row.id),
      {
        id: String(row.id),
        description: String(row.description ?? ""),
        website: String(row.website ?? ""),
        phone: String(row.phone ?? ""),
        categories: list(row.categories),
        states: list(row.states),
        places: list(row.places),
        nationwide: row.nationwide === true || row.nationwide === "t",
      },
    ]),
  );
}

function averageOverall(data: RankingData, vendorId: string) {
  const reviews = data.reviews.get(vendorId) ?? [];
  if (!reviews.length) return 0;
  return Math.round((reviews.reduce((sum, row) => sum + row.overall, 0) / reviews.length) * 10) / 10;
}

/** A catalog's vendors in ranked order. Files only when the caller may see them. */
export async function readCatalogVendors(
  sql: Sql,
  categoryId: string,
  options: { canViewFiles: boolean; now?: Date },
): Promise<Omit<CatalogVendorsRead, "unavailable">> {
  const category = getSpendCategory(categoryId);
  if (!category || !isRankedCategory(category)) {
    return { vendors: [], ranked: false, filesVisible: options.canViewFiles };
  }
  const data = await loadRankingData(sql, options.now);
  const ranked = rankFor(data, category.id);
  const details = await vendorDetails(
    sql,
    ranked.map((row) => row.id),
  );
  const files = options.canViewFiles
    ? await listVendorFiles(
        sql,
        ranked.map((row) => row.id),
      )
    : [];
  const terms = new Map(data.vendors.map((vendor) => [vendor.id, vendor.termsVersion]));
  return {
    ranked: true,
    filesVisible: options.canViewFiles,
    vendors: ranked.map((row) => {
      const detail = details.get(row.id);
      const serves = (detail?.categories ?? [])
        .filter((key) => key.startsWith(`${category.id}/`))
        .map((key) => category.subcategories.find((sub) => `${category.id}/${sub.id}` === key)?.name ?? "")
        .filter(Boolean);
      return {
        id: row.id,
        company: row.company,
        description: detail?.description ?? "",
        website: detail?.website ?? "",
        phone: detail?.phone ?? "",
        area: detail ? describeArea(detail) : "",
        serves,
        score: row.ranked ? displayScore(row.breakdown) : null,
        position: row.position,
        preferred: row.preferred,
        newToProgram: row.newToProgram,
        covenant: acceptedCovenant(terms.get(row.id) ?? ""),
        reviewCount: (data.reviews.get(row.id) ?? []).length,
        reviewAverage: averageOverall(data, row.id),
        files: files
          .filter((file) => file.vendorId === row.id && (!file.category || file.category === category.id))
          .map(publicFile),
      };
    }),
  };
}

export type VendorProfile = {
  id: string;
  company: string;
  description: string;
  website: string;
  phone: string;
  area: string;
  covenant: boolean;
  catalogs: {
    id: string;
    name: string;
    score: number | null;
    position: number;
    preferred: boolean;
    newToProgram: boolean;
  }[];
  reviewCount: number;
  reviewAverage: number;
  reviews: PublicReview[];
  files: PublicFile[];
  filesVisible: boolean;
};

/** A listed vendor's public profile, or null (not listed, or not found). */
export async function readVendorProfile(
  sql: Sql,
  vendorId: string,
  options: { canViewFiles: boolean; now?: Date },
): Promise<VendorProfile | null> {
  if (!vendorId || vendorId.length > 80) return null;
  const data = await loadRankingData(sql, options.now);
  const vendor = data.vendors.find((row) => row.id === vendorId);
  if (!vendor || !isListed(vendor)) return null;
  const detail = (await vendorDetails(sql, [vendorId])).get(vendorId);
  if (!detail) return null;
  const catalogs = vendorCatalogs(vendor.categories).map((categoryId) => {
    const row = rankFor(data, categoryId).find((entry) => entry.id === vendorId);
    return {
      id: categoryId,
      name: getSpendCategory(categoryId)?.name ?? categoryId,
      score: row?.ranked ? displayScore(row.breakdown) : null,
      position: row?.position ?? 0,
      preferred: row?.preferred ?? false,
      newToProgram: row?.newToProgram ?? false,
    };
  });
  const reviews = await vendorReviewSummary(sql, vendorId);
  const files = options.canViewFiles ? await listVendorFiles(sql, [vendorId]) : [];
  return {
    id: vendorId,
    company: vendor.company,
    description: detail.description,
    website: detail.website,
    phone: detail.phone,
    area: describeArea(detail),
    covenant: acceptedCovenant(vendor.termsVersion),
    catalogs,
    reviewCount: reviews.count,
    reviewAverage: reviews.average,
    reviews: reviews.published,
    files: files.map(publicFile),
    filesVisible: options.canViewFiles,
  };
}

// ---------------------------------------------------------------------------
// The member gate
// ---------------------------------------------------------------------------

/**
 * What anyone may see of a catalog vendor: that it serves the catalog, its
 * company name, and the Preferred badge. Built from an allow-list (as
 * lockEntry in membership.ts), so a field added later is withheld by default.
 */
const OPEN_CATALOG_FIELDS = ["id", "company", "preferred"] as const;

export type LockedCatalogVendor = Pick<CatalogVendor, (typeof OPEN_CATALOG_FIELDS)[number]> & {
  locked: true;
};

export function lockCatalogVendor(vendor: CatalogVendor): LockedCatalogVendor {
  const open: Record<string, unknown> = {};
  for (const key of OPEN_CATALOG_FIELDS) open[key] = vendor[key];
  return { ...open, locked: true } as LockedCatalogVendor;
}

export type ViewerCatalogVendor = (CatalogVendor & { locked?: false }) | LockedCatalogVendor;

export type CatalogVendorsForViewer = Omit<CatalogVendorsRead, "vendors" | "unavailable"> & {
  vendors: ViewerCatalogVendor[];
  /** How many program vendors serve this catalog. */
  count: number;
  /** Member church or staff: the full listing was sent. */
  member: boolean;
};

/**
 * A catalog's vendors for one viewer. A non-member gets names and the
 * Preferred badge only; files are not even read for them.
 */
export async function catalogVendorsForViewer(
  sql: Sql,
  categoryId: string,
  options: { member: boolean; now?: Date },
): Promise<CatalogVendorsForViewer> {
  const read = await readCatalogVendors(sql, categoryId, {
    canViewFiles: options.member,
    now: options.now,
  });
  return {
    ...read,
    count: read.vendors.length,
    member: options.member,
    vendors: options.member ? read.vendors : read.vendors.map(lockCatalogVendor),
  };
}

/** What anyone may see of a profile: the name, its catalogs, and its standing there. */
const OPEN_PROFILE_FIELDS = ["id", "company", "catalogs"] as const;

export type LockedVendorProfile = Pick<VendorProfile, (typeof OPEN_PROFILE_FIELDS)[number]> & {
  locked: true;
};

export function lockVendorProfile(profile: VendorProfile): LockedVendorProfile {
  const open: Record<string, unknown> = {};
  for (const key of OPEN_PROFILE_FIELDS) open[key] = profile[key];
  return { ...open, locked: true } as LockedVendorProfile;
}

export type ViewerVendorProfile = (VendorProfile & { locked?: false }) | LockedVendorProfile;

export async function vendorProfileForViewer(
  sql: Sql,
  vendorId: string,
  options: { member: boolean; now?: Date },
): Promise<ViewerVendorProfile | null> {
  const profile = await readVendorProfile(sql, vendorId, {
    canViewFiles: options.member,
    now: options.now,
  });
  if (!profile) return null;
  return options.member ? profile : lockVendorProfile(profile);
}
