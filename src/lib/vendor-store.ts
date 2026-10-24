import type { Sql } from "./db.ts";
import {
  SPEND_CATEGORIES,
  getSpendCategory,
  isLicensed,
  type SpendCategory,
  type SpendSubcategory,
} from "./church-spend.ts";
import { cleanPrice } from "./source-store.ts";
import { requireAttestedContact, type PriceContact } from "./price-contact.ts";
import {
  AGREE_LABEL,
  CONSEQUENCES,
  VENDOR_TERMS_PATH,
  VENDOR_TERMS_VERSION,
  feeSummary,
  needsCovenant,
  termsChange,
  type Consequence,
} from "./vendor-terms.ts";

/**
 * Vendors for the SOURCE buying program: public sign-up, the desk's vendor
 * list, bid invitations, and quotes an invited vendor submits online.
 *
 * Imported by node's test runner: relative imports, no framework code. Mail is
 * passed in as a function, so nothing here sends on its own.
 */

// ---------------------------------------------------------------------------
// Categories and service area
// ---------------------------------------------------------------------------

export const US_STATES: { code: string; name: string }[] = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
  ["PR", "Puerto Rico"],
].map(([code, name]) => ({ code, name }));

const STATE_CODES = new Set(US_STATES.map((state) => state.code));

/** The note shown where vendors pick categories. */
export const LICENSED_VENDOR_NOTE =
  "Insurance, health and retirement benefits, banking and loans, payroll and payroll tax, and audit and tax preparation are not part of vendor sign-up. They are handled separately through licensed or qualified providers.";

export type VendorCategoryOption = {
  category: SpendCategory;
  subcategories: { key: string; sub: SpendSubcategory }[];
};

/** What a vendor can pick: every non-licensed subcategory, by category. */
export function vendorCategoryOptions(): VendorCategoryOption[] {
  return SPEND_CATEGORIES.map((category) => ({
    category,
    subcategories: category.subcategories
      .filter((sub) => !isLicensed(category, sub))
      .map((sub) => ({ key: `${category.id}/${sub.id}`, sub })),
  })).filter((option) => option.subcategories.length > 0);
}

/**
 * Clean a list of "category" or "category/subcategory" keys. A whole category
 * expands to its non-licensed subcategories. Licensed and unknown keys are
 * refused.
 */
export function cleanVendorCategories(keys: string[]): string[] {
  const out = new Set<string>();
  for (const raw of keys) {
    const key = raw.trim();
    if (!key) continue;
    const [categoryId, subId = ""] = key.split("/");
    const category = getSpendCategory(categoryId);
    if (!category) throw new Error("A category you picked is not on the list.");
    if (!subId) {
      const subs = category.subcategories.filter((sub) => !isLicensed(category, sub));
      if (subs.length === 0) throw new Error(`${category.name} is handled separately.`);
      for (const sub of subs) out.add(`${category.id}/${sub.id}`);
      continue;
    }
    const sub = category.subcategories.find((row) => row.id === subId);
    if (!sub) throw new Error("A subcategory you picked is not on the list.");
    if (isLicensed(category, sub)) throw new Error(`${sub.name} is handled separately.`);
    out.add(`${category.id}/${sub.id}`);
  }
  return [...out].sort();
}

/** "GA, sc  NC" -> ["GA", "NC", "SC"]. Unknown codes are refused. */
export function cleanStates(raw: string[] | string): string[] {
  const parts = (Array.isArray(raw) ? raw : raw.split(/[\s,;]+/))
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  for (const code of parts) {
    if (!STATE_CODES.has(code)) throw new Error(`"${code}" is not a state code.`);
  }
  return [...new Set(parts)].sort();
}

/** Cities or ZIP codes, one per comma or line. */
export function cleanPlaces(raw: string[] | string): string[] {
  const parts = (Array.isArray(raw) ? raw : raw.split(/[\n;,]+/))
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (parts.length > 100) throw new Error("List up to 100 cities or ZIP codes.");
  for (const part of parts) {
    if (part.length > 60) throw new Error("A city or ZIP code is too long.");
  }
  return [...new Set(parts)];
}

// ---------------------------------------------------------------------------
// Sign-up
// ---------------------------------------------------------------------------

export type VendorSignupInput = {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  categories: string[];
  states: string[];
  places?: string;
  nationwide: boolean;
  /** "yes" or "no": carries general liability insurance. */
  insured: string;
  notes?: string;
  agreed: boolean;
  termsVersion: string;
};

export type CleanVendor = {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  categories: string[];
  states: string[];
  places: string[];
  nationwide: boolean;
  insured: boolean;
  notes: string;
  termsVersion: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function need(value: string, message: string, max: number) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(message);
  if (trimmed.length > max) throw new Error("That is too long to store.");
  return trimmed;
}

export function cleanWebsite(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("Enter your website like example.com.");
  }
  if (!/\./.test(url.hostname)) throw new Error("Enter your website like example.com.");
  if (withScheme.length > 240) throw new Error("That website address is too long.");
  return url.toString().replace(/\/$/, "");
}

/** Every sign-up rule. Throws a sentence the vendor can act on. */
export function cleanVendorSignup(input: VendorSignupInput): CleanVendor {
  if (!input.agreed) throw new Error(`Tick “${AGREE_LABEL}” to sign up.`);
  if (input.termsVersion !== VENDOR_TERMS_VERSION) {
    throw new Error(
      "The Vendor Terms were updated. Reload the page, review them, and agree again.",
    );
  }
  const company = need(input.company, "Enter your company name.", 160);
  const contactName = need(input.contactName, "Enter a contact name.", 120);
  const email = need(input.email, "Enter an email address.", 200).toLowerCase();
  if (!EMAIL.test(email)) throw new Error("Enter a working email address.");
  const phone = need(input.phone, "Enter a phone number.", 40);
  if ((phone.match(/\d/g) ?? []).length < 7) throw new Error("Enter a working phone number.");
  const website = cleanWebsite(input.website ?? "");
  const categories = cleanVendorCategories(input.categories);
  if (categories.length === 0) throw new Error("Pick at least one category you serve.");
  const nationwide = Boolean(input.nationwide);
  const states = nationwide ? [] : cleanStates(input.states);
  const places = nationwide ? [] : cleanPlaces(input.places ?? "");
  if (!nationwide && states.length === 0) {
    throw new Error("Pick the states you serve, or choose nationwide.");
  }
  if (input.insured !== "yes" && input.insured !== "no") {
    throw new Error("Tell us whether you carry general liability insurance.");
  }
  const notes = (input.notes ?? "").trim().slice(0, 2000);
  return {
    company,
    contactName,
    email,
    phone,
    website,
    categories,
    states,
    places,
    nationwide,
    insured: input.insured === "yes",
    notes,
    termsVersion: VENDOR_TERMS_VERSION,
  };
}

export type VendorStatus = "pending" | "approved" | "paused" | "removed";
export const VENDOR_STATUSES: VendorStatus[] = ["pending", "approved", "paused", "removed"];

export type VendorRow = {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  categories: string[];
  states: string[];
  places: string[];
  nationwide: boolean;
  insured: boolean;
  notes: string;
  status: VendorStatus;
  termsVersion: string;
  termsAcceptedAt: string;
  termsIp: string;
  /** Accepted an older version: has to accept the new covenant. */
  needsCovenant: boolean;
  /** Current standing consequence from a decided case ("none" when clear). */
  consequence: Consequence;
  consequenceCaseId: string;
  createdAt: string;
};

function text(value: unknown) {
  return String(value ?? "");
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return text(value);
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

function bool(value: unknown) {
  return value === true || value === "t" || value === "true";
}

function mapVendor(row: Record<string, unknown>): VendorRow {
  const status = text(row.status) as VendorStatus;
  return {
    id: text(row.id),
    company: text(row.company),
    contactName: text(row.contact_name),
    email: text(row.email),
    phone: text(row.phone),
    website: text(row.website),
    categories: list(row.categories),
    states: list(row.states),
    places: list(row.places),
    nationwide: bool(row.nationwide),
    insured: bool(row.liability_insured),
    notes: text(row.notes),
    status: VENDOR_STATUSES.includes(status) ? status : "pending",
    termsVersion: text(row.terms_version),
    termsAcceptedAt: iso(row.terms_accepted_at),
    termsIp: text(row.terms_ip),
    needsCovenant: needsCovenant(text(row.terms_version)),
    consequence: cleanConsequence(text(row.consequence)),
    consequenceCaseId: text(row.consequence_case_id),
    createdAt: iso(row.created_at),
  };
}

/** '' and unknown values read as "none". */
export function cleanConsequence(value: string): Consequence {
  return (CONSEQUENCES as readonly string[]).includes(value) ? (value as Consequence) : "none";
}

/**
 * Save a sign-up with its terms acceptance (version, time, IP). The same
 * email signing up again while still on the list returns the existing row
 * instead of adding a second one.
 */
export async function createVendor(
  sql: Sql,
  vendor: CleanVendor,
  meta: { ip: string; now?: Date },
): Promise<{ id: string; duplicate: boolean }> {
  const existing = await sql<{ id: string }>`
    select id from source_vendors
    where lower(email) = ${vendor.email} and status <> 'removed'
    order by created_at limit 1
  `;
  if (existing[0]) return { id: existing[0].id, duplicate: true };
  const id = crypto.randomUUID();
  const acceptedAt = (meta.now ?? new Date()).toISOString();
  await sql`
    insert into source_vendors (
      id, company, contact_name, email, phone, website, categories, states, places,
      nationwide, liability_insured, notes, status, terms_version, terms_accepted_at, terms_ip
    ) values (
      ${id}, ${vendor.company}, ${vendor.contactName}, ${vendor.email}, ${vendor.phone},
      ${vendor.website}, ${JSON.stringify(vendor.categories)}::jsonb,
      ${JSON.stringify(vendor.states)}::jsonb, ${JSON.stringify(vendor.places)}::jsonb,
      ${vendor.nationwide}, ${vendor.insured}, ${vendor.notes}, ${"pending"},
      ${vendor.termsVersion}, ${acceptedAt}, ${meta.ip.slice(0, 80)}
    )
  `;
  return { id, duplicate: false };
}

/** Category keys as readable names, for email and the desk. */
export function describeCategories(keys: string[]): string[] {
  return keys.map((key) => {
    const [categoryId, subId] = key.split("/");
    const category = getSpendCategory(categoryId);
    const sub = category?.subcategories.find((row) => row.id === subId);
    return category && sub ? `${category.name}: ${sub.name}` : key;
  });
}

export function describeArea(vendor: Pick<CleanVendor, "nationwide" | "states" | "places">) {
  if (vendor.nationwide) return "Nationwide / ships anywhere";
  const states = vendor.states.join(", ");
  return vendor.places.length ? `${states} (${vendor.places.join(", ")})` : states;
}

/** The owner's notice for a new sign-up. */
export function vendorSignupNotice(
  vendor: CleanVendor,
  meta: { id: string; duplicate: boolean; ip: string; acceptedAt: string },
) {
  return {
    subject: `${meta.duplicate ? "Vendor sign-up again" : "New vendor sign-up"}: ${vendor.company}`,
    text: [
      meta.duplicate
        ? "This email is already on the vendor list. Nothing new was saved; the details below are what they sent this time."
        : "A vendor signed up for the buying program. Review it on the desk: https://www.unitedundergod.org/buying/desk",
      "",
      `Company: ${vendor.company}`,
      `Contact: ${vendor.contactName}`,
      `Email: ${vendor.email}`,
      `Phone: ${vendor.phone}`,
      `Website: ${vendor.website || "(none)"}`,
      `General liability insurance: ${vendor.insured ? "yes" : "no"}`,
      `Service area: ${describeArea(vendor)}`,
      "Categories:",
      ...describeCategories(vendor.categories).map((name) => `  - ${name}`),
      vendor.notes ? `Notes: ${vendor.notes}` : "",
      "",
      `Agreed to Vendor Terms version ${vendor.termsVersion} at ${meta.acceptedAt} from ${meta.ip || "unknown IP"}.`,
      `Vendor id: ${meta.id}`,
    ]
      .filter((line, index, all) => line !== "" || all[index - 1] !== "")
      .join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Desk vendor list
// ---------------------------------------------------------------------------

export async function listVendors(sql: Sql): Promise<VendorRow[]> {
  const rows = await sql`select * from source_vendors order by created_at desc`;
  return rows.map(mapVendor);
}

export type VendorUpdate = {
  status?: string;
  categories?: string[];
  states?: string[];
  places?: string;
  nationwide?: boolean;
};

export async function updateVendor(sql: Sql, id: string, patch: VendorUpdate, userId: string) {
  const rows = await sql`select * from source_vendors where id = ${id}`;
  if (!rows[0]) throw new Error("That vendor is not on the list.");
  const current = mapVendor(rows[0]);
  let status = current.status;
  if (patch.status !== undefined) {
    if (!VENDOR_STATUSES.includes(patch.status as VendorStatus)) {
      throw new Error("A vendor is pending, approved, paused, or removed.");
    }
    status = patch.status as VendorStatus;
  }
  const categories =
    patch.categories !== undefined ? cleanVendorCategories(patch.categories) : current.categories;
  if (categories.length === 0) throw new Error("A vendor needs at least one category.");
  const nationwide = patch.nationwide ?? current.nationwide;
  const states = nationwide
    ? []
    : patch.states !== undefined
      ? cleanStates(patch.states)
      : current.states;
  const places = nationwide
    ? []
    : patch.places !== undefined
      ? cleanPlaces(patch.places)
      : current.places;
  if (!nationwide && states.length === 0) {
    throw new Error("Pick at least one state, or nationwide.");
  }
  await sql`
    update source_vendors set
      status = ${status},
      categories = ${JSON.stringify(categories)}::jsonb,
      states = ${JSON.stringify(states)}::jsonb,
      places = ${JSON.stringify(places)}::jsonb,
      nationwide = ${nationwide},
      reviewed_by = ${userId},
      updated_at = now()
    where id = ${id}
  `;
  // Approving a suspended or revoked vendor again lifts that consequence. The
  // decided case keeps its record.
  if (
    status === "approved" &&
    (current.consequence === "suspension" || current.consequence === "revocation")
  ) {
    await sql`
      update source_vendors set consequence = 'none', consequence_at = now() where id = ${id}
    `;
  }
}

// ---------------------------------------------------------------------------
// Matching vendors to a bid
// ---------------------------------------------------------------------------

export type MatchBid = { category: string; subcategory: string; area: string };
type MatchVendor = Pick<VendorRow, "status" | "categories" | "states" | "nationwide">;

/** The states a bid is for. Blank means anywhere. */
export function bidStates(area: string): string[] {
  try {
    return cleanStates(area);
  } catch {
    return area
      .split(/[\s,;]+/)
      .map((part) => part.trim().toUpperCase())
      .filter((code) => STATE_CODES.has(code));
  }
}

export function vendorServesCategory(vendor: Pick<VendorRow, "categories">, bid: MatchBid) {
  if (!bid.category) return false;
  if (bid.subcategory) return vendor.categories.includes(`${bid.category}/${bid.subcategory}`);
  return vendor.categories.some((key) => key.startsWith(`${bid.category}/`));
}

export function vendorServesArea(vendor: Pick<VendorRow, "states" | "nationwide">, bid: MatchBid) {
  if (vendor.nationwide) return true;
  const wanted = bidStates(bid.area);
  if (wanted.length === 0) return true;
  return vendor.states.some((state) => wanted.includes(state));
}

/** Approved vendors whose categories and area fit this bid. */
export function matchVendors<T extends MatchVendor>(vendors: T[], bid: MatchBid): T[] {
  return vendors.filter(
    (vendor) =>
      vendor.status === "approved" &&
      vendorServesCategory(vendor, bid) &&
      vendorServesArea(vendor, bid),
  );
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export type SendMail = (args: {
  to: string;
  subject: string;
  text: string;
}) => Promise<{ ok: boolean; error: string }>;

export type InviteRow = {
  id: string;
  bidId: string;
  vendorId: string;
  email: string;
  subject: string;
  emailStatus: string;
  emailError: string;
  sentAt: string;
  openedAt: string;
};

/** 32 random bytes, base64url: the secret in a vendor's bid link. */
export function newInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

export function bidLinkPath(bidId: string, token: string) {
  return `/buying/bids/${encodeURIComponent(bidId)}?t=${token}`;
}

export type InviteBid = {
  id: string;
  title: string;
  summary: string;
  neededBy: string;
  itemCount: number;
};

/** The invitation email. The desk shows this exact text before anything is sent. */
export function inviteEmail(args: {
  bid: InviteBid;
  vendor: Pick<VendorRow, "company" | "contactName">;
  link: string;
  siteUrl: string;
}) {
  const { bid, vendor } = args;
  const greeting = vendor.contactName ? `Hello ${vendor.contactName},` : "Hello,";
  return {
    subject: `Bid invitation: ${bid.title}`,
    text: [
      greeting,
      "",
      `United Under God is collecting quotes for churches in its buying program, and ${vendor.company} is invited to quote:`,
      "",
      bid.title,
      bid.neededBy ? `Needed by: ${bid.neededBy}` : "",
      `${bid.itemCount} ${bid.itemCount === 1 ? "line item" : "line items"}`,
      "",
      bid.summary,
      "",
      "See the line items and enter your unit prices here (this link is only for you):",
      args.link,
      "",
      "You can revise your quote until the bid closes. Churches buy directly from you and choose freely.",
      "Each quote names a senior person at your company who is authorized to commit it to the quoted prices for the price term, with their title, email, and phone.",
      `Your open bids, standing, and monthly report are also in your vendor portal: ${args.siteUrl}/buying/portal`,
      "",
      "Quotes are given under the Vendor Covenant: make it right, stand behind your work, and quote honestly.",
      feeSummary(),
      `Vendor Covenant and Vendor Terms: ${args.siteUrl}${VENDOR_TERMS_PATH}`,
      "",
      "Questions? Reply to this email.",
      "",
      "United Under God, Inc.",
    ]
      .filter((line, index, all) => line !== "" || all[index - 1] !== "")
      .join("\n"),
  };
}

function mapInvite(row: Record<string, unknown>): InviteRow {
  return {
    id: text(row.id),
    bidId: text(row.bid_id),
    vendorId: text(row.vendor_id),
    email: text(row.email),
    subject: text(row.subject),
    emailStatus: text(row.email_status),
    emailError: text(row.email_error),
    sentAt: iso(row.sent_at),
    openedAt: row.opened_at ? iso(row.opened_at) : "",
  };
}

export async function listInvites(sql: Sql): Promise<InviteRow[]> {
  const rows = await sql`select * from source_bid_invites order by sent_at`;
  return rows.map(mapInvite);
}

async function loadInviteBid(sql: Sql, bidId: string) {
  const rows = await sql`select * from source_bid_requests where id = ${bidId}`;
  const row = rows[0];
  if (!row) throw new Error("That bid is not on the desk.");
  const items = await sql<{ n: number }>`
    select count(*)::int as n from source_bid_items where bid_id = ${bidId}
  `;
  return {
    bid: {
      id: text(row.id),
      title: text(row.title),
      summary: text(row.summary),
      neededBy: text(row.needed_by),
      itemCount: Number(items[0]?.n ?? 0),
    } satisfies InviteBid,
    status: text(row.status),
    match: {
      category: text(row.category),
      subcategory: text(row.subcategory),
      area: text(row.area),
    },
  };
}

/** Preview: who would get the invitation and the exact email (with a sample link). */
export async function previewInvites(sql: Sql, bidId: string, siteUrl: string) {
  const { bid, match } = await loadInviteBid(sql, bidId);
  const vendors = matchVendors(await listVendors(sql), match);
  const invited = new Set(
    (
      await sql<{ vendor_id: string }>`
      select vendor_id from source_bid_invites where bid_id = ${bidId} and email_status = 'sent'
    `
    ).map((row) => row.vendor_id),
  );
  const sample = vendors[0] ?? { company: "Vendor company", contactName: "Contact name" };
  return {
    vendors: vendors.map((vendor) => ({
      ...vendor,
      invited: invited.has(vendor.id),
      // On probation: listed, but only invited when staff tick it.
      probation: vendor.consequence === "probation",
    })),
    email: inviteEmail({
      bid,
      vendor: sample,
      link: `${siteUrl}/buying/bids/${bidId}?t=(a private link for each vendor)`,
      siteUrl,
    }),
  };
}

export type SendInvitesResult = {
  sent: string[];
  failed: { vendorId: string; error: string }[];
  skipped: { vendorId: string; reason: string }[];
};

/**
 * Send the invitation to the chosen vendors, once per vendor per bid. Only
 * approved vendors that still match the bid are sent to; the rest are skipped
 * with a reason. A vendor whose earlier send failed gets a fresh link.
 */
export async function sendInvites(
  sql: Sql,
  args: { bidId: string; vendorIds: string[]; userId: string; siteUrl: string; send: SendMail },
): Promise<SendInvitesResult> {
  const { bid, status, match } = await loadInviteBid(sql, args.bidId);
  if (status !== "open") throw new Error("This bid is closed. Reopen it to invite vendors.");
  const vendors = await listVendors(sql);
  const eligible = new Set(matchVendors(vendors, match).map((vendor) => vendor.id));
  const result: SendInvitesResult = { sent: [], failed: [], skipped: [] };

  for (const vendorId of [...new Set(args.vendorIds)]) {
    const vendor = vendors.find((row) => row.id === vendorId);
    if (!vendor) {
      result.skipped.push({ vendorId, reason: "not on the vendor list" });
      continue;
    }
    if (!eligible.has(vendorId)) {
      result.skipped.push({
        vendorId,
        reason: vendor.status === "approved" ? "does not match this bid" : `is ${vendor.status}`,
      });
      continue;
    }
    const token = newInviteToken();
    const tokenHash = await hashInviteToken(token);
    const email = inviteEmail({
      bid,
      vendor,
      link: `${args.siteUrl}${bidLinkPath(bid.id, token)}`,
      siteUrl: args.siteUrl,
    });
    const existing = await sql<{ id: string; email_status: string }>`
      select id, email_status from source_bid_invites
      where bid_id = ${bid.id} and vendor_id = ${vendorId}
    `;
    let inviteId: string;
    if (existing[0]) {
      if (existing[0].email_status !== "failed") {
        result.skipped.push({ vendorId, reason: "already invited" });
        continue;
      }
      // Claim the retry so a second click cannot send twice.
      const claimed = await sql<{ id: string }>`
        update source_bid_invites set
          token_hash = ${tokenHash}, email_status = 'sending', email_error = '',
          email = ${vendor.email}, subject = ${email.subject},
          sent_by = ${args.userId}, sent_at = now()
        where id = ${existing[0].id} and email_status = 'failed'
        returning id
      `;
      if (!claimed[0]) {
        result.skipped.push({ vendorId, reason: "already invited" });
        continue;
      }
      inviteId = claimed[0].id;
    } else {
      const inserted = await sql<{ id: string }>`
        insert into source_bid_invites (
          id, bid_id, vendor_id, token_hash, email, subject, email_status, sent_by
        ) values (
          ${crypto.randomUUID()}, ${bid.id}, ${vendorId}, ${tokenHash}, ${vendor.email},
          ${email.subject}, ${"sending"}, ${args.userId}
        )
        on conflict (bid_id, vendor_id) do nothing
        returning id
      `;
      if (!inserted[0]) {
        result.skipped.push({ vendorId, reason: "already invited" });
        continue;
      }
      inviteId = inserted[0].id;
    }

    let outcome: { ok: boolean; error: string };
    try {
      outcome = await args.send({ to: vendor.email, subject: email.subject, text: email.text });
    } catch {
      outcome = { ok: false, error: "send failed" };
    }
    const error = outcome.ok ? "" : outcome.error || "mail is not set up (no RESEND_API_KEY)";
    await sql`
      update source_bid_invites set
        email_status = ${outcome.ok ? "sent" : "failed"},
        email_error = ${error.slice(0, 500)}
      where id = ${inviteId}
    `;
    if (outcome.ok) result.sent.push(vendorId);
    else result.failed.push({ vendorId, error });
  }
  return result;
}

// ---------------------------------------------------------------------------
// The vendor's bid page and online quotes
// ---------------------------------------------------------------------------

export type InvitedItem = {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  specs: string[];
};

export type InvitedBidView =
  | { state: "denied" }
  | { state: "inactive" }
  | { state: "closed"; title: string }
  | {
      state: "open";
      bid: { id: string; title: string; summary: string; neededBy: string; items: InvitedItem[] };
      vendor: { company: string; priceContact: PriceContact };
      quote: {
        notes: string;
        lines: { itemId: string; unitPrice: string; notes: string }[];
        updatedAt: string;
        priceContact: PriceContact;
      } | null;
    };

/** Bid-sheet specs for a template line, from the church spend list. */
export function itemSpecs(categoryId: string, catalogItem: string): string[] {
  if (!catalogItem) return [];
  const category = getSpendCategory(categoryId);
  const candidates = category ? [category] : SPEND_CATEGORIES;
  for (const cat of candidates) {
    for (const sub of cat.subcategories) {
      const item = sub.items.find((row) => row.id === catalogItem);
      if (item) return [...(sub.specs ?? []), ...(item.specs ?? [])];
    }
  }
  return [];
}

async function findInvite(sql: Sql, bidId: string, token: string) {
  if (!token || !TOKEN_SHAPE.test(token) || !bidId) return null;
  const tokenHash = await hashInviteToken(token);
  const rows = await sql<{ id: string; vendor_id: string; opened_at: unknown; bid_id: string }>`
    select id, vendor_id, opened_at, bid_id from source_bid_invites
    where token_hash = ${tokenHash} and bid_id = ${bidId}
  `;
  if (rows[0]) return rows[0];
  // The vendor portal's own link to the same invitation (0010). Read through
  // to_jsonb so the email link keeps working on a database without it.
  const portal = await sql<{ id: string; vendor_id: string; opened_at: unknown; bid_id: string }>`
    select id, vendor_id, opened_at, bid_id from source_bid_invites i
    where bid_id = ${bidId} and coalesce(to_jsonb(i) ->> 'portal_token_hash', '') = ${tokenHash}
  `;
  return portal[0] ?? null;
}

async function inviteContext(sql: Sql, bidId: string, token: string) {
  const invite = await findInvite(sql, bidId, token);
  if (!invite) return { state: "denied" as const };
  const vendors = await sql`select * from source_vendors where id = ${invite.vendor_id}`;
  const vendor = vendors[0] ? mapVendor(vendors[0]) : null;
  if (!vendor || vendor.status !== "approved") return { state: "inactive" as const };
  const bids = await sql`select * from source_bid_requests where id = ${bidId}`;
  const bid = bids[0];
  if (!bid) return { state: "denied" as const };
  return { state: "ok" as const, invite, vendor, bid };
}

/** What a link holder sees. A wrong or missing token sees nothing of the bid. */
export async function readInvitedBid(
  sql: Sql,
  bidId: string,
  token: string,
): Promise<InvitedBidView> {
  const ctx = await inviteContext(sql, bidId, token);
  if (ctx.state !== "ok") return { state: ctx.state };
  const { invite, vendor, bid } = ctx;
  if (!invite.opened_at) {
    await sql`update source_bid_invites set opened_at = now() where id = ${invite.id}`;
  }
  if (text(bid.status) !== "open") return { state: "closed", title: text(bid.title) };
  const items = await sql`
    select * from source_bid_items where bid_id = ${bidId} order by sort_order, description
  `;
  const quotes = await sql`
    select * from source_quotes where bid_id = ${bidId} and vendor_id = ${vendor.id}
  `;
  const quote = quotes[0];
  const lines = quote
    ? await sql`select * from source_quote_lines where quote_id = ${text(quote.id)}`
    : [];
  return {
    state: "open",
    bid: {
      id: text(bid.id),
      title: text(bid.title),
      summary: text(bid.summary),
      neededBy: text(bid.needed_by),
      items: items.map((row) => ({
        id: text(row.id),
        description: text(row.description),
        quantity: text(row.quantity),
        unit: text(row.unit),
        specs: itemSpecs(text(bid.category), text(row.catalog_item)),
      })),
    },
    vendor: { company: vendor.company, priceContact: await defaultPriceContact(sql, vendor.id) },
    quote: quote
      ? {
          notes: text(quote.notes),
          updatedAt: iso(quote.updated_at),
          priceContact: {
            name: text(quote.price_contact_name),
            title: text(quote.price_contact_title),
            email: text(quote.price_contact_email),
            phone: text(quote.price_contact_phone),
          },
          lines: lines.map((row) => ({
            itemId: text(row.item_id),
            unitPrice: text(row.unit_price),
            notes: text(row.notes),
          })),
        }
      : null,
  };
}

export type OnlineQuoteInput = {
  bidId: string;
  token: string;
  notes?: string;
  lines: { itemId: string; unitPrice?: string; notes?: string }[];
  /** The senior person authorized to bind the vendor to these prices. Required. */
  priceContact?: Partial<PriceContact>;
  /** The attestation box was ticked. Required. */
  attested?: boolean;
  /** The submitter's IP, stored with the attestation. */
  ip?: string;
};

/** The vendor's default price contact from its portal profile (blank if none). */
export async function defaultPriceContact(sql: Sql, vendorId: string): Promise<PriceContact> {
  const rows = await sql`
    select coalesce(to_jsonb(v) ->> 'price_contact_name', '') as name,
      coalesce(to_jsonb(v) ->> 'price_contact_title', '') as title,
      coalesce(to_jsonb(v) ->> 'price_contact_email', '') as email,
      coalesce(to_jsonb(v) ->> 'price_contact_phone', '') as phone
    from source_vendors v where id = ${vendorId}
  `;
  const row = rows[0];
  return {
    name: text(row?.name),
    title: text(row?.title),
    email: text(row?.email),
    phone: text(row?.phone),
  };
}

/**
 * An invited vendor's quote. It lands as a source_quotes row (source
 * 'online', tied to the vendor) with source_quote_lines, next to the quotes
 * typed in at the desk. Submitting again revises the same quote until the bid
 * closes.
 */
export async function submitOnlineQuote(
  sql: Sql,
  input: OnlineQuoteInput,
): Promise<{ quoteId: string; revised: boolean }> {
  const ctx = await inviteContext(sql, input.bidId, input.token);
  if (ctx.state === "denied") throw new Error("This link is not valid for this bid.");
  if (ctx.state === "inactive") throw new Error("This invitation is not active.");
  const { vendor, bid } = ctx;
  if (text(bid.status) !== "open") throw new Error("This bid is closed and takes no more quotes.");

  const items = await sql<{ id: string }>`
    select id from source_bid_items where bid_id = ${input.bidId}
  `;
  const itemIds = new Set(items.map((row) => row.id));
  const lines = new Map<string, { unitPrice: string; notes: string }>();
  for (const line of input.lines) {
    if (!itemIds.has(line.itemId)) throw new Error("A quote line does not belong to this bid.");
    if (lines.has(line.itemId)) continue;
    lines.set(line.itemId, {
      unitPrice: cleanPrice(line.unitPrice ?? ""),
      notes: (line.notes ?? "").trim().slice(0, 400),
    });
  }
  if (![...lines.values()].some((line) => line.unitPrice)) {
    throw new Error("Enter a price on at least one item.");
  }
  const notes = (input.notes ?? "").trim().slice(0, 2000);
  const contact = [vendor.contactName, vendor.email, vendor.phone].filter(Boolean).join(" · ");
  const attested = requireAttestedContact(
    { contact: input.priceContact, attested: input.attested },
    vendor.company,
  );
  const price = attested.contact;
  const attestedAt = new Date().toISOString();
  const ip = (input.ip ?? "").slice(0, 80);

  const existing = await sql<{ id: string }>`
    select id from source_quotes where bid_id = ${input.bidId} and vendor_id = ${vendor.id}
  `;
  let quoteId = existing[0]?.id ?? "";
  if (quoteId) {
    await sql`
      update source_quotes set
        vendor_name = ${vendor.company}, vendor_contact = ${contact.slice(0, 240)},
        notes = ${notes}, updated_at = now(),
        price_contact_name = ${price.name}, price_contact_title = ${price.title},
        price_contact_email = ${price.email}, price_contact_phone = ${price.phone},
        price_attestation = ${attested.attestation}, price_attested_at = ${attestedAt},
        price_attested_ip = ${ip}
      where id = ${quoteId}
    `;
  } else {
    quoteId = crypto.randomUUID();
    const inserted = await sql<{ id: string }>`
      insert into source_quotes (
        id, bid_id, vendor_name, vendor_contact, notes, status, created_by, vendor_id, source,
        price_contact_name, price_contact_title, price_contact_email, price_contact_phone,
        price_attestation, price_attested_at, price_attested_ip
      ) values (
        ${quoteId}, ${input.bidId}, ${vendor.company}, ${contact.slice(0, 240)}, ${notes},
        ${"received"}, ${`vendor:${vendor.id}`}, ${vendor.id}, ${"online"},
        ${price.name}, ${price.title}, ${price.email}, ${price.phone},
        ${attested.attestation}, ${attestedAt}, ${ip}
      )
      on conflict (bid_id, vendor_id) where vendor_id <> '' do nothing
      returning id
    `;
    if (!inserted[0])
      throw new Error("Your quote was just saved from another window. Reload the page.");
  }
  for (const [itemId, line] of lines) {
    await sql`
      insert into source_quote_lines (id, quote_id, item_id, unit_price, notes)
      values (${crypto.randomUUID()}, ${quoteId}, ${itemId}, ${line.unitPrice}, ${line.notes})
      on conflict (quote_id, item_id) do update set
        unit_price = excluded.unit_price, notes = excluded.notes
    `;
    if (!line.unitPrice) {
      // A line the vendor no longer prices cannot stay an award.
      await sql`delete from source_awards where quote_id = ${quoteId} and item_id = ${itemId}`;
    }
  }
  if (existing[0]) {
    // A revision of a quote whose prices are already published waits on the
    // desk ("Prices up for review") for the owner to publish the new prices.
    await sql`
      update source_quotes set refresh_status = 'updated'
      where id = ${quoteId} and exists (
        select 1 from source_awards a join source_buying_book b on b.award_id = a.id
        where a.quote_id = ${quoteId}
      )
    `;
  }
  return { quoteId, revised: Boolean(existing[0]) };
}

// ---------------------------------------------------------------------------
// Accepting a new version of the Vendor Covenant and Vendor Terms
// ---------------------------------------------------------------------------

export const COVENANT_PAGE_PATH = "/buying/covenant";

export function covenantLinkPath(token: string) {
  return `${COVENANT_PAGE_PATH}?t=${token}`;
}

/** The re-acceptance email. The desk shows this exact text before anything is sent. */
export function covenantEmail(args: {
  vendor: Pick<VendorRow, "company" | "contactName" | "termsVersion">;
  link: string;
  siteUrl: string;
}) {
  const { vendor } = args;
  return {
    subject: "Please review and accept the Vendor Covenant and Vendor Terms",
    text: [
      vendor.contactName ? `Hello ${vendor.contactName},` : "Hello,",
      "",
      `${vendor.company} is a vendor in the United Under God buying program${vendor.termsVersion ? ` and accepted the Vendor Terms version ${vendor.termsVersion}` : ""}. The Vendor Terms are now version ${VENDOR_TERMS_VERSION}. ${termsChange()}`,
      "",
      "The terms begin with the Vendor Covenant. In short: make it right when it isn't right for the church, stand behind your work, go above and beyond, care about the church's success, quote honestly, honor the program price, answer problems quickly, and accept United Under God's resolution when a church and a vendor cannot settle a problem.",
      "",
      `Read it and accept version ${VENDOR_TERMS_VERSION} here (this link is only for you):`,
      args.link,
      "",
      `The full text is also public: ${args.siteUrl}${VENDOR_TERMS_PATH}`,
      "",
      "Questions? Reply to this email.",
      "",
      "United Under God, Inc.",
    ].join("\n"),
  };
}

/** Vendors still on an older version (pending, approved, or paused; not removed). */
export function vendorsNeedingCovenant(vendors: VendorRow[]): VendorRow[] {
  return vendors.filter((vendor) => vendor.status !== "removed" && vendor.needsCovenant);
}

export async function previewCovenantLink(sql: Sql, vendorId: string, siteUrl: string) {
  const rows = await sql`select * from source_vendors where id = ${vendorId}`;
  if (!rows[0]) throw new Error("That vendor is not on the list.");
  const vendor = mapVendor(rows[0]);
  return {
    vendor: { id: vendor.id, company: vendor.company, email: vendor.email },
    email: covenantEmail({
      vendor,
      link: `${siteUrl}${COVENANT_PAGE_PATH}?t=(a private link for this vendor)`,
      siteUrl,
    }),
  };
}

export type CovenantLinkRow = {
  id: string;
  vendorId: string;
  termsVersion: string;
  emailStatus: string;
  emailError: string;
  sentAt: string;
  usedAt: string;
};

export async function listCovenantLinks(sql: Sql): Promise<CovenantLinkRow[]> {
  const rows = await sql`select * from source_covenant_links order by sent_at desc`;
  return rows.map((row) => ({
    id: text(row.id),
    vendorId: text(row.vendor_id),
    termsVersion: text(row.terms_version),
    emailStatus: text(row.email_status),
    emailError: text(row.email_error),
    sentAt: iso(row.sent_at),
    usedAt: row.used_at ? iso(row.used_at) : "",
  }));
}

/** Send one vendor a private link to accept the current version. Only the hash is stored. */
export async function sendCovenantLink(
  sql: Sql,
  args: { vendorId: string; userId: string; siteUrl: string; send: SendMail },
): Promise<{ ok: boolean; error: string }> {
  const rows = await sql`select * from source_vendors where id = ${args.vendorId}`;
  if (!rows[0]) throw new Error("That vendor is not on the list.");
  const vendor = mapVendor(rows[0]);
  if (vendor.status === "removed") throw new Error("That vendor was removed from the program.");
  if (!vendor.needsCovenant) throw new Error("This vendor already accepted the current version.");
  const token = newInviteToken();
  const email = covenantEmail({
    vendor,
    link: `${args.siteUrl}${covenantLinkPath(token)}`,
    siteUrl: args.siteUrl,
  });
  const id = crypto.randomUUID();
  await sql`
    insert into source_covenant_links (
      id, vendor_id, token_hash, terms_version, email, email_status, sent_by
    ) values (
      ${id}, ${vendor.id}, ${await hashInviteToken(token)}, ${VENDOR_TERMS_VERSION},
      ${vendor.email}, ${"sending"}, ${args.userId}
    )
  `;
  let outcome: { ok: boolean; error: string };
  try {
    outcome = await args.send({ to: vendor.email, subject: email.subject, text: email.text });
  } catch {
    outcome = { ok: false, error: "send failed" };
  }
  const error = outcome.ok ? "" : outcome.error || "mail is not set up (no RESEND_API_KEY)";
  await sql`
    update source_covenant_links set
      email_status = ${outcome.ok ? "sent" : "failed"}, email_error = ${error.slice(0, 500)}
    where id = ${id}
  `;
  return { ok: outcome.ok, error };
}

export type CovenantLinkView =
  | { state: "denied" }
  | { state: "inactive" }
  | { state: "accepted"; company: string; version: string }
  | { state: "open"; company: string; acceptedVersion: string };

async function findCovenantLink(sql: Sql, token: string) {
  if (!token || !TOKEN_SHAPE.test(token)) return null;
  const tokenHash = await hashInviteToken(token);
  const links = await sql<{ id: string; vendor_id: string }>`
    select id, vendor_id from source_covenant_links where token_hash = ${tokenHash}
  `;
  const link = links[0];
  if (!link) return null;
  const rows = await sql`select * from source_vendors where id = ${link.vendor_id}`;
  return rows[0] ? { link, vendor: mapVendor(rows[0]) } : null;
}

/** What a link holder sees. A wrong or missing token sees nothing. */
export async function readCovenantLink(sql: Sql, token: string): Promise<CovenantLinkView> {
  const found = await findCovenantLink(sql, token);
  if (!found) return { state: "denied" };
  const { vendor } = found;
  if (vendor.status === "removed") return { state: "inactive" };
  if (!vendor.needsCovenant) {
    return { state: "accepted", company: vendor.company, version: vendor.termsVersion };
  }
  return { state: "open", company: vendor.company, acceptedVersion: vendor.termsVersion };
}

/** The vendor accepts the current version: version, time, and IP are stored as at sign-up. */
export async function acceptCovenant(
  sql: Sql,
  input: { token: string; agreed: boolean; termsVersion: string; ip: string; now?: Date },
): Promise<{ company: string; version: string }> {
  const found = await findCovenantLink(sql, input.token);
  if (!found) throw new Error("This link is not valid.");
  const { link, vendor } = found;
  if (vendor.status === "removed") throw new Error("This vendor is no longer in the program.");
  if (!input.agreed) throw new Error(`Tick “${AGREE_LABEL}” to accept.`);
  if (input.termsVersion !== VENDOR_TERMS_VERSION) {
    throw new Error("The terms were updated again. Reload the page, review them, and accept.");
  }
  const at = (input.now ?? new Date()).toISOString();
  await sql`
    update source_vendors set
      terms_version = ${VENDOR_TERMS_VERSION}, terms_accepted_at = ${at},
      terms_ip = ${input.ip.slice(0, 80)}, updated_at = now()
    where id = ${vendor.id}
  `;
  await sql`update source_covenant_links set used_at = ${at} where id = ${link.id}`;
  return { company: vendor.company, version: VENDOR_TERMS_VERSION };
}
