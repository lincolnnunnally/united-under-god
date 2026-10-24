import type { Sql } from "./db.ts";
import { getSpendCategory, isLicensed } from "./church-spend.ts";
import {
  TOKEN_SHAPE,
  cleanPlaces,
  cleanStates,
  cleanVendorCategories,
  cleanWebsite,
  describeCategories,
  hashInviteToken,
  newInviteToken,
  type SendMail,
} from "./vendor-store.ts";
import {
  AGREE_LABEL,
  FEES,
  VENDOR_TERMS_VERSION,
  cleanFeeOffer,
  feeFloor,
  needsCovenant,
  type FeeKind,
} from "./vendor-terms.ts";
import {
  INELIGIBLE_TEXT,
  RANK_WEIGHTS,
  categoryFeeKinds,
  displayScore,
  isRankedCategory,
  loadRankingData,
  rankFor,
  vendorCatalogs,
  type ScoreBreakdown,
} from "./vendor-rank.ts";
import { queueReportedReviewRequest } from "./review-store.ts";

/**
 * The vendor portal: sign-in by a one-time emailed link, a session cookie,
 * and what a signed-in vendor can do. Every link and session stores only a
 * SHA-256 of its token.
 *
 * Imported by node's test runner: relative imports, no framework code. Mail is
 * passed in as a function, so nothing here sends on its own.
 */

export const PORTAL_PATH = "/buying/portal";
export const SESSION_COOKIE = "uug_vendor_portal";
/** A sign-in link works once, for this long. */
export const LOGIN_LINK_MINUTES = 20;
/** A portal session lasts this long. */
export const SESSION_DAYS = 30;
/** One sign-in email per vendor per this many seconds. */
export const LOGIN_RESEND_SECONDS = 60;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function portalLinkPath(token: string) {
  return `${PORTAL_PATH}?t=${token}`;
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

export function loginEmail(args: { company: string; contactName: string; link: string }) {
  return {
    subject: "Your vendor portal sign-in link",
    text: [
      args.contactName ? `Hello ${args.contactName},` : "Hello,",
      "",
      `Here is the link to sign in to the United Under God vendor portal for ${args.company}:`,
      args.link,
      "",
      `It works once and expires in ${LOGIN_LINK_MINUTES} minutes. If you did not ask for it, you can ignore this email.`,
      "",
      "United Under God, Inc.",
    ].join("\n"),
  };
}

/**
 * Send a sign-in link to the vendor on the list with this email. The answer is
 * the same whether or not the email is on the list, so the form does not tell
 * anyone who our vendors are.
 */
export async function requestLoginLink(
  sql: Sql,
  args: { email: string; ip: string; siteUrl: string; send: SendMail; now?: Date },
): Promise<{ sent: boolean; reason: "" | "unknown" | "throttled" | "failed" }> {
  const email = args.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) throw new Error("Enter the email you signed up with.");
  const now = args.now ?? new Date();
  const rows = await sql`
    select id, company, contact_name, email from source_vendors
    where lower(email) = ${email} and status <> 'removed'
    order by created_at limit 1
  `;
  const vendor = rows[0];
  if (!vendor) return { sent: false, reason: "unknown" };
  const since = new Date(now.getTime() - LOGIN_RESEND_SECONDS * 1000).toISOString();
  const recent = await sql`
    select id from source_vendor_login_links where vendor_id = ${text(vendor.id)} and created_at > ${since}
  `;
  if (recent[0]) return { sent: false, reason: "throttled" };
  const token = newInviteToken();
  const id = crypto.randomUUID();
  const expires = new Date(now.getTime() + LOGIN_LINK_MINUTES * 60_000).toISOString();
  await sql`
    insert into source_vendor_login_links (id, vendor_id, token_hash, email, email_status, ip, created_at, expires_at)
    values (${id}, ${text(vendor.id)}, ${await hashInviteToken(token)}, ${email}, ${"sending"},
      ${args.ip.slice(0, 80)}, ${now.toISOString()}, ${expires})
  `;
  const mail = loginEmail({
    company: text(vendor.company),
    contactName: text(vendor.contact_name),
    link: `${args.siteUrl}${portalLinkPath(token)}`,
  });
  let outcome: { ok: boolean; error: string };
  try {
    outcome = await args.send({ to: text(vendor.email), subject: mail.subject, text: mail.text });
  } catch {
    outcome = { ok: false, error: "send failed" };
  }
  const error = outcome.ok ? "" : outcome.error || "mail is not set up (no RESEND_API_KEY)";
  await sql`
    update source_vendor_login_links set
      email_status = ${outcome.ok ? "sent" : "failed"}, email_error = ${error.slice(0, 500)}
    where id = ${id}
  `;
  return outcome.ok ? { sent: true, reason: "" } : { sent: false, reason: "failed" };
}

/**
 * Trade a sign-in link for a session. The link works once and only until it
 * expires. Returns the session token for the cookie (only its hash is kept).
 */
export async function redeemLoginLink(
  sql: Sql,
  token: string,
  now = new Date(),
): Promise<{ sessionToken: string; vendorId: string; expiresAt: string }> {
  if (!token || !TOKEN_SHAPE.test(token)) throw new Error("This sign-in link is not valid.");
  const claimed = await sql<{ vendor_id: string }>`
    update source_vendor_login_links set used_at = ${now.toISOString()}
    where token_hash = ${await hashInviteToken(token)} and used_at is null
      and expires_at > ${now.toISOString()}
    returning vendor_id
  `;
  const vendorId = claimed[0]?.vendor_id;
  if (!vendorId) {
    throw new Error("This sign-in link has expired or was already used. Ask for a new one.");
  }
  const vendors = await sql<{ status: string }>`select status from source_vendors where id = ${vendorId}`;
  if (!vendors[0] || vendors[0].status === "removed") {
    throw new Error("This vendor is no longer in the program.");
  }
  const sessionToken = newInviteToken();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000).toISOString();
  await sql`
    insert into source_vendor_sessions (id, vendor_id, token_hash, created_at, expires_at)
    values (${crypto.randomUUID()}, ${vendorId}, ${await hashInviteToken(sessionToken)},
      ${now.toISOString()}, ${expiresAt})
  `;
  return { sessionToken, vendorId, expiresAt };
}

/** The vendor behind a session token, or null (expired, ended, unknown, or removed). */
export async function sessionVendorId(
  sql: Sql,
  sessionToken: string | null | undefined,
  now = new Date(),
): Promise<string | null> {
  if (!sessionToken || !TOKEN_SHAPE.test(sessionToken)) return null;
  const rows = await sql<{ vendor_id: string; status: string }>`
    select s.vendor_id, v.status from source_vendor_sessions s
    join source_vendors v on v.id = s.vendor_id
    where s.token_hash = ${await hashInviteToken(sessionToken)}
      and s.ended_at is null and s.expires_at > ${now.toISOString()}
  `;
  const row = rows[0];
  if (!row || row.status === "removed") return null;
  return text(row.vendor_id);
}

export async function endSession(sql: Sql, sessionToken: string) {
  if (!sessionToken || !TOKEN_SHAPE.test(sessionToken)) return;
  await sql`
    update source_vendor_sessions set ended_at = now()
    where token_hash = ${await hashInviteToken(sessionToken)} and ended_at is null
  `;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export type ProfileInput = {
  description: string;
  website: string;
  phone: string;
  nationwide: boolean;
  states: string[];
  places: string;
  categories: string[];
};

/**
 * Save the profile. Description, website, phone, and service area apply now.
 * A change of categories waits for the owner's approval; the current ones stay
 * until then.
 */
export async function saveProfile(
  sql: Sql,
  vendorId: string,
  input: ProfileInput,
): Promise<{ categoriesPending: boolean }> {
  const rows = await sql`select * from source_vendors where id = ${vendorId}`;
  const current = rows[0];
  if (!current) throw new Error("Your vendor record was not found.");
  const description = input.description.trim().slice(0, 2000);
  const website = cleanWebsite(input.website);
  const phone = input.phone.trim();
  if (!phone) throw new Error("Enter a phone number.");
  if (phone.length > 40 || (phone.match(/\d/g) ?? []).length < 7) {
    throw new Error("Enter a working phone number.");
  }
  const nationwide = Boolean(input.nationwide);
  const states = nationwide ? [] : cleanStates(input.states);
  const places = nationwide ? [] : cleanPlaces(input.places);
  if (!nationwide && states.length === 0) throw new Error("Pick the states you serve, or choose nationwide.");
  const categories = cleanVendorCategories(input.categories);
  if (categories.length === 0) throw new Error("Pick at least one category you serve.");
  const approved = [...list(current.categories)].sort();
  const changed = categories.join("|") !== approved.join("|");
  await sql`
    update source_vendors set
      description = ${description}, website = ${website}, phone = ${phone},
      nationwide = ${nationwide}, states = ${JSON.stringify(states)}::jsonb,
      places = ${JSON.stringify(places)}::jsonb,
      requested_categories = ${JSON.stringify(changed ? categories : [])}::jsonb,
      categories_requested_at = ${changed ? new Date().toISOString() : null},
      profile_updated_at = now(), updated_at = now()
    where id = ${vendorId}
  `;
  return { categoriesPending: changed };
}

export type CategoryRequest = {
  vendorId: string;
  company: string;
  current: string[];
  requested: string[];
  added: string[];
  removed: string[];
  requestedAt: string;
};

export async function listCategoryRequests(sql: Sql): Promise<CategoryRequest[]> {
  const rows = await sql`
    select id, company, categories, requested_categories, categories_requested_at
    from source_vendors
    where status <> 'removed' and jsonb_array_length(requested_categories) > 0
    order by categories_requested_at
  `;
  return rows.map((row) => {
    const current = list(row.categories);
    const requested = list(row.requested_categories);
    return {
      vendorId: text(row.id),
      company: text(row.company),
      current,
      requested,
      added: requested.filter((key) => !current.includes(key)),
      removed: current.filter((key) => !requested.includes(key)),
      requestedAt: row.categories_requested_at ? iso(row.categories_requested_at) : "",
    };
  });
}

/** The owner approves or declines a vendor's category change. */
export async function decideCategoryRequest(
  sql: Sql,
  vendorId: string,
  approve: boolean,
  userId: string,
) {
  const rows = await sql`select requested_categories from source_vendors where id = ${vendorId}`;
  if (!rows[0]) throw new Error("That vendor is not on the list.");
  const requested = list(rows[0].requested_categories);
  if (requested.length === 0) throw new Error("That vendor has no category change waiting.");
  if (approve) {
    const categories = cleanVendorCategories(requested);
    await sql`
      update source_vendors set categories = ${JSON.stringify(categories)}::jsonb,
        requested_categories = '[]'::jsonb, categories_requested_at = null,
        reviewed_by = ${userId}, updated_at = now()
      where id = ${vendorId}
    `;
  } else {
    await sql`
      update source_vendors set requested_categories = '[]'::jsonb, categories_requested_at = null,
        reviewed_by = ${userId}, updated_at = now()
      where id = ${vendorId}
    `;
  }
}

// ---------------------------------------------------------------------------
// Fee offers
// ---------------------------------------------------------------------------

export type OfferRow = {
  category: string;
  name: string;
  kinds: FeeKind[];
  floors: Partial<Record<FeeKind, number>>;
  rebate: number | null;
  referral: number | null;
  updatedAt: string;
};

/** The catalogs a vendor serves, with the rate it offers in each (blank = the floor). */
export async function listOffers(sql: Sql, vendorId: string, categoryKeys: string[]): Promise<OfferRow[]> {
  const saved = await sql`
    select category, rebate_percent, referral_percent, updated_at
    from source_vendor_offers where vendor_id = ${vendorId}
  `;
  const byCategory = new Map(saved.map((row) => [text(row.category), row]));
  return vendorCatalogs(categoryKeys).map((categoryId) => {
    const category = getSpendCategory(categoryId)!;
    const kinds = categoryFeeKinds(category);
    const row = byCategory.get(categoryId);
    const num = (value: unknown) => (value === null || value === undefined ? null : Number(value));
    return {
      category: categoryId,
      name: category.name,
      kinds,
      floors: Object.fromEntries(kinds.map((kind) => [kind, feeFloor(kind)])),
      rebate: row ? num(row.rebate_percent) : null,
      referral: row ? num(row.referral_percent) : null,
      updatedAt: row ? iso(row.updated_at) : "",
    };
  });
}

/**
 * Save the rate offered in one catalog. Each rate is at or above its floor;
 * licensed catalogs carry no fee; the vendor must serve the catalog and have
 * accepted the current Vendor Terms (which make the rates minimums).
 */
export async function setOffer(
  sql: Sql,
  vendorId: string,
  input: { category: string; rebate?: string; referral?: string },
) {
  const rows = await sql`select categories, terms_version, status from source_vendors where id = ${vendorId}`;
  const vendor = rows[0];
  if (!vendor) throw new Error("Your vendor record was not found.");
  if (needsCovenant(text(vendor.terms_version))) {
    throw new Error(`Accept the current Vendor Terms (version ${VENDOR_TERMS_VERSION}) before setting a rate.`);
  }
  const category = getSpendCategory(input.category);
  if (!category || !isRankedCategory(category)) throw new Error("That catalog carries no program fee.");
  if (category.subcategories.every((sub) => isLicensed(category, sub))) {
    throw new Error(`${category.name} is handled separately and carries no program fee.`);
  }
  if (!vendorCatalogs(list(vendor.categories)).includes(category.id)) {
    throw new Error("You can set a rate only in a catalog you serve.");
  }
  const kinds = categoryFeeKinds(category);
  const rebate = kinds.includes("rebate") ? cleanFeeOffer(input.rebate ?? "", "rebate", FEES) : null;
  const referral = kinds.includes("referral")
    ? cleanFeeOffer(input.referral ?? "", "referral", FEES)
    : null;
  await sql`
    insert into source_vendor_offers (vendor_id, category, rebate_percent, referral_percent, updated_at)
    values (${vendorId}, ${category.id}, ${rebate}, ${referral}, now())
    on conflict (vendor_id, category) do update set
      rebate_percent = excluded.rebate_percent, referral_percent = excluded.referral_percent,
      updated_at = now()
  `;
  return { rebate, referral };
}

/** Accept the current Vendor Terms from inside the portal, recorded as at sign-up. */
export async function acceptTermsInPortal(
  sql: Sql,
  vendorId: string,
  input: { agreed: boolean; termsVersion: string; ip: string; now?: Date },
) {
  if (!input.agreed) throw new Error(`Tick “${AGREE_LABEL}” to accept.`);
  if (input.termsVersion !== VENDOR_TERMS_VERSION) {
    throw new Error("The terms were updated again. Reload the page, review them, and accept.");
  }
  const at = (input.now ?? new Date()).toISOString();
  await sql`
    update source_vendors set terms_version = ${VENDOR_TERMS_VERSION}, terms_accepted_at = ${at},
      terms_ip = ${input.ip.slice(0, 80)}, updated_at = now()
    where id = ${vendorId} and status <> 'removed'
  `;
}

// ---------------------------------------------------------------------------
// Monthly reports
// ---------------------------------------------------------------------------

export type ReportKind = "sales" | "job" | "none";

export type ReportInput = {
  month: string;
  kind: string;
  category?: string;
  amount?: string;
  description?: string;
  churchName?: string;
  contactName?: string;
  email?: string;
  closedOn?: string;
};

export type ReportRow = {
  id: string;
  vendorId: string;
  month: string;
  kind: ReportKind;
  category: string;
  amount: string;
  description: string;
  churchName: string;
  contactName: string;
  email: string;
  closedOn: string;
  reviewRequestId: string;
  createdAt: string;
};

function monthIndex(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return (year ?? 0) * 12 + ((mon ?? 1) - 1);
}

export function cleanMonth(raw: string, now = new Date()): string {
  const month = raw.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Pick the month you are reporting.");
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const index = monthIndex(month);
  if (index > current) throw new Error("You can report a month once it has started.");
  if (index < current - 24) throw new Error("Report months from the last two years.");
  return month;
}

function cleanAmount(raw: string | undefined) {
  const value = (raw ?? "").trim().replace(/[$,\s]/g, "");
  if (!value) throw new Error("Enter the amount, like 1250.00.");
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("Enter the amount, like 1250.00.");
  return value;
}

function mapReport(row: Record<string, unknown>): ReportRow {
  const kind = text(row.kind);
  return {
    id: text(row.id),
    vendorId: text(row.vendor_id),
    month: text(row.month),
    kind: (["sales", "job", "none"].includes(kind) ? kind : "sales") as ReportKind,
    category: text(row.category),
    amount: text(row.amount),
    description: text(row.description),
    churchName: text(row.church_name),
    contactName: text(row.contact_name),
    email: text(row.email),
    closedOn: text(row.closed_on),
    reviewRequestId: text(row.review_request_id),
    createdAt: iso(row.created_at),
  };
}

/**
 * Report one month's program sales, a closed job, or a month with none. A
 * closed job leaves a review request waiting on the desk; the owner approves
 * it before anything is sent to the church.
 */
export async function submitReport(
  sql: Sql,
  vendorId: string,
  input: ReportInput,
  args: { now?: Date } = {},
): Promise<{ id: string; reviewRequest: "pending" | "none" }> {
  const now = args.now ?? new Date();
  const month = cleanMonth(input.month, now);
  const kind = input.kind as ReportKind;
  if (!["sales", "job", "none"].includes(kind)) throw new Error("Pick sales, a closed job, or none.");
  const vendors = await sql`select categories, status from source_vendors where id = ${vendorId}`;
  if (!vendors[0] || text(vendors[0].status) === "removed") throw new Error("Your vendor record was not found.");
  const serves = vendorCatalogs(list(vendors[0].categories));
  const id = crypto.randomUUID();

  if (kind === "none") {
    await sql`
      insert into source_vendor_reports (id, vendor_id, month, kind) values (${id}, ${vendorId}, ${month}, ${"none"})
    `;
    return { id, reviewRequest: "none" };
  }

  const category = (input.category ?? "").trim();
  if (!serves.includes(category)) throw new Error("Pick a catalog you serve.");
  const amount = cleanAmount(input.amount);
  const description = (input.description ?? "").trim().slice(0, 1000);

  if (kind === "sales") {
    await sql`
      insert into source_vendor_reports (id, vendor_id, month, kind, category, amount, description)
      values (${id}, ${vendorId}, ${month}, ${"sales"}, ${category}, ${amount}, ${description})
    `;
    return { id, reviewRequest: "none" };
  }

  // A closed job: the church and its contact, who will be asked for a review.
  const churchName = (input.churchName ?? "").trim().slice(0, 200);
  const contactName = (input.contactName ?? "").trim().slice(0, 160);
  const email = (input.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!churchName) throw new Error("Enter the church's name.");
  if (!EMAIL.test(email)) throw new Error("Enter the church contact's email, so we can ask how it went.");
  if (!description) throw new Error("Say what the job was.");
  const closedOn = (input.closedOn ?? "").trim();
  if (closedOn && !/^\d{4}-\d{2}-\d{2}$/.test(closedOn)) throw new Error("Enter the date like 2026-10-15.");
  await sql`
    insert into source_vendor_reports (
      id, vendor_id, month, kind, category, amount, description, church_name, contact_name, email, closed_on
    ) values (
      ${id}, ${vendorId}, ${month}, ${"job"}, ${category}, ${amount}, ${description}, ${churchName},
      ${contactName}, ${email}, ${closedOn}
    )
  `;
  // Nothing is sent from a vendor's report: the request waits for the owner.
  const pending = await queueReportedReviewRequest(
    sql,
    { vendorId, category, churchName, contactName, email, job: description },
    { reportId: id, vendorLabel: `vendor:${vendorId}` },
  );
  await sql`update source_vendor_reports set review_request_id = ${pending.id} where id = ${id}`;
  return { id, reviewRequest: "pending" };
}

export async function listReports(sql: Sql, vendorId?: string): Promise<ReportRow[]> {
  const rows = vendorId
    ? await sql`select * from source_vendor_reports where vendor_id = ${vendorId} order by month desc, created_at desc`
    : await sql`select * from source_vendor_reports order by created_at desc limit 300`;
  return rows.map(mapReport);
}

// ---------------------------------------------------------------------------
// Open invitations
// ---------------------------------------------------------------------------

export type PortalInvite = {
  inviteId: string;
  bidId: string;
  title: string;
  neededBy: string;
  sentAt: string;
  quoted: boolean;
};

export async function listOpenInvites(sql: Sql, vendorId: string): Promise<PortalInvite[]> {
  const rows = await sql`
    select i.id as invite_id, r.id as bid_id, r.title, r.needed_by, i.sent_at,
      exists (select 1 from source_quotes q where q.bid_id = r.id and q.vendor_id = ${vendorId}) as quoted
    from source_bid_invites i join source_bid_requests r on r.id = i.bid_id
    where i.vendor_id = ${vendorId} and i.email_status = 'sent' and r.status = 'open'
    order by i.sent_at desc
  `;
  return rows.map((row) => ({
    inviteId: text(row.invite_id),
    bidId: text(row.bid_id),
    title: text(row.title),
    neededBy: text(row.needed_by),
    sentAt: iso(row.sent_at),
    quoted: bool(row.quoted),
  }));
}

/**
 * A fresh private link to an invited bid, for opening it from the portal. It
 * is kept apart from the link in the email, which keeps working.
 */
export async function portalBidLink(sql: Sql, vendorId: string, inviteId: string): Promise<string> {
  const token = newInviteToken();
  const rows = await sql<{ bid_id: string }>`
    update source_bid_invites set portal_token_hash = ${await hashInviteToken(token)}
    where id = ${inviteId} and vendor_id = ${vendorId} and email_status = 'sent'
    returning bid_id
  `;
  if (!rows[0]) throw new Error("That invitation is not in your portal.");
  return `/buying/bids/${encodeURIComponent(rows[0].bid_id)}?t=${token}`;
}

// ---------------------------------------------------------------------------
// The whole portal view
// ---------------------------------------------------------------------------

export type PortalScore = {
  category: string;
  name: string;
  breakdown: ScoreBreakdown;
  score: number | null;
  position: number;
  of: number;
  preferred: boolean;
  newToProgram: boolean;
  ineligible: string;
};

export type PortalView = {
  vendor: {
    id: string;
    company: string;
    contactName: string;
    email: string;
    phone: string;
    website: string;
    description: string;
    categories: string[];
    categoryNames: string[];
    requestedCategories: string[];
    states: string[];
    places: string[];
    nationwide: boolean;
    status: string;
    termsVersion: string;
    needsTerms: boolean;
  };
  weights: typeof RANK_WEIGHTS;
  scores: PortalScore[];
  reviewCount: number;
  awards: number;
  offers: OfferRow[];
  invites: PortalInvite[];
  reports: ReportRow[];
};

export async function readPortal(sql: Sql, vendorId: string, now = new Date()): Promise<PortalView> {
  const rows = await sql`select * from source_vendors where id = ${vendorId}`;
  const row = rows[0];
  if (!row) throw new Error("Your vendor record was not found.");
  const categories = list(row.categories);
  const data = await loadRankingData(sql, now);
  const scores: PortalScore[] = vendorCatalogs(categories).map((categoryId) => {
    const ranked = rankFor(data, categoryId);
    const mine = ranked.find((entry) => entry.id === vendorId);
    const name = getSpendCategory(categoryId)?.name ?? categoryId;
    const rankedCount = ranked.filter((entry) => entry.ranked).length;
    if (!mine) {
      // Not listed (not approved, suspended, or revoked): still show the math.
      const eligibility =
        text(row.status) !== "approved" ? INELIGIBLE_TEXT.not_approved : "Not listed in catalogs right now";
      return {
        category: categoryId,
        name,
        breakdown: emptyBreakdown(),
        score: null,
        position: 0,
        of: rankedCount,
        preferred: false,
        newToProgram: false,
        ineligible: eligibility,
      };
    }
    return {
      category: categoryId,
      name,
      breakdown: mine.breakdown,
      score: mine.ranked ? displayScore(mine.breakdown) : null,
      position: mine.position,
      of: rankedCount,
      preferred: mine.preferred,
      newToProgram: mine.newToProgram,
      ineligible: mine.ineligible ? INELIGIBLE_TEXT[mine.ineligible] : "",
    };
  });
  return {
    vendor: {
      id: text(row.id),
      company: text(row.company),
      contactName: text(row.contact_name),
      email: text(row.email),
      phone: text(row.phone),
      website: text(row.website),
      description: text(row.description),
      categories,
      categoryNames: describeCategories(categories),
      requestedCategories: list(row.requested_categories),
      states: list(row.states),
      places: list(row.places),
      nationwide: bool(row.nationwide),
      status: text(row.status),
      termsVersion: text(row.terms_version),
      needsTerms: needsCovenant(text(row.terms_version)),
    },
    weights: RANK_WEIGHTS,
    scores,
    reviewCount: (data.reviews.get(vendorId) ?? []).length,
    awards: data.awards.get(vendorId) ?? 0,
    offers: await listOffers(sql, vendorId, categories),
    invites: await listOpenInvites(sql, vendorId),
    reports: await listReports(sql, vendorId),
  };
}

function emptyBreakdown(): ScoreBreakdown {
  return {
    service: 0,
    reviews: 0,
    covenant: 0,
    price: 0,
    support: 0,
    points: { service: 0, price: 0, support: 0 },
    total: 0,
  };
}
