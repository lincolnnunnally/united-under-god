import type { Sql } from "./db.ts";
import { SPEND_CATEGORIES, getSpendCategory, isLicensed } from "./church-spend.ts";
import { DEFAULT_TERM_MONTHS } from "./price-term.ts";
import { cleanArea, createBid } from "./source-store.ts";
import { TOKEN_SHAPE, newInviteToken, type SendMail } from "./vendor-store.ts";

/**
 * Church needs: a church tells us what it needs, United Under God bids it out,
 * and the church chooses from the quotes, or chooses none. Several churches'
 * needs in the same category can sit on one bid as separate lines, so the
 * suppliers quote on the larger order.
 *
 * Vendors never see a church: quotes are recorded per line by the desk (or
 * through a bid invite that shows only the bid), and nothing here is read by a
 * vendor page. A church's private page reads its own need and the quotes on
 * its own line, nothing else.
 *
 * Imported by node's test runner: relative imports, no framework code. Mail is
 * passed in as a function, so nothing here sends on its own.
 */

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

export const NEED_STATUSES = ["new", "bidding", "quotes_sent", "chosen", "closed"] as const;
export type NeedStatus = (typeof NEED_STATUSES)[number];

export const NEED_STATUS_LABELS: Record<NeedStatus, string> = {
  new: "New",
  bidding: "Out for quotes",
  quotes_sent: "Quotes sent to the church",
  chosen: "Church chose a quote",
  closed: "Closed",
};

/** Needs still being worked: they count toward "similar needs". */
const OPEN_STATUSES: NeedStatus[] = ["new", "bidding", "quotes_sent"];

/** At most this many needs from one IP address in an hour. */
export const NEED_IP_LIMIT = 5;

/** A bid holds at most this many lines (source-store createBid). */
const MAX_LINES = 40;

export function needLinkPath(token: string) {
  return `/buying/need/${token}`;
}

/** Categories a church can post a need in: everything that is bid (not referral only). */
export function needCategories() {
  return SPEND_CATEGORIES.filter(
    (category) => !category.subcategories.every((sub) => isLicensed(category, sub)),
  ).map((category) => ({ id: category.id, name: category.name }));
}

export function needCategoryName(id: string) {
  return id ? (getSpendCategory(id)?.name ?? id) : "Something else";
}

// ---------------------------------------------------------------------------
// Posting a need
// ---------------------------------------------------------------------------

export type NeedInput = {
  churchName: string;
  contactName: string;
  email: string;
  phone?: string;
  city: string;
  state: string;
  zip?: string;
  category?: string;
  title: string;
  details?: string;
  quantity?: string;
  neededBy?: string;
  /** Honeypot: people never see this field; a bot fills it. */
  hp?: string;
};

export type CleanNeed = Required<Omit<NeedInput, "hp">>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function need(value: string | undefined, message: string, max: number) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) throw new Error(message);
  if (trimmed.length > max) throw new Error("That is too long to store. Please shorten it.");
  return trimmed;
}

function optional(value: string | undefined, max: number) {
  const trimmed = (value ?? "").trim();
  if (trimmed.length > max) throw new Error("That is too long to store. Please shorten it.");
  return trimmed;
}

/** Every rule for a posted need. Throws a sentence the church can act on. */
export function cleanNeed(input: NeedInput): CleanNeed {
  const churchName = need(input.churchName, "Enter your church’s name.", 160);
  const contactName = need(input.contactName, "Enter your name.", 120);
  const email = need(input.email, "Enter an email address.", 200).toLowerCase();
  if (!EMAIL.test(email)) throw new Error("Enter a working email address.");
  const phone = optional(input.phone, 40);
  if (phone && (phone.match(/\d/g) ?? []).length < 7) {
    throw new Error("Enter a working phone number, or leave it blank.");
  }
  const city = need(input.city, "Enter your city.", 120);
  const state = need(input.state, "Enter your state.", 40).toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new Error("Enter your state as two letters, like GA.");
  const zip = optional(input.zip, 10);
  if (zip && !/^\d{5}(?:-\d{4})?$/.test(zip)) throw new Error("Enter a ZIP like 30401, or leave it blank.");
  const category = (input.category ?? "").trim();
  if (category && !needCategories().some((row) => row.id === category)) {
    throw new Error("Pick a category from the list.");
  }
  const title = need(input.title, "Tell us what you need.", 160);
  const details = optional(input.details, 4000);
  const quantity = optional(input.quantity, 120);
  const neededBy = optional(input.neededBy, 40);
  return {
    churchName,
    contactName,
    email,
    phone,
    city,
    state,
    zip,
    category,
    title,
    details,
    quantity,
    neededBy,
  };
}

export type SavedNeed = { id: string; token: string };

/**
 * Save a posted need. A filled honeypot saves nothing and returns null; the
 * caller answers as if it had. More than {@link NEED_IP_LIMIT} needs from one
 * IP address in an hour is refused.
 */
export async function createNeed(
  sql: Sql,
  input: NeedInput,
  meta: { ip: string; now?: Date },
): Promise<SavedNeed | null> {
  if ((input.hp ?? "").trim()) return null;
  const clean = cleanNeed(input);
  const ip = meta.ip.slice(0, 80);
  const at = meta.now ?? new Date();
  if (ip) {
    const since = new Date(at.getTime() - 60 * 60 * 1000).toISOString();
    const recent = await sql<{ n: number }>`
      select count(*)::int as n from source_church_needs
      where ip = ${ip} and created_at > ${since}
    `;
    if (Number(recent[0]?.n ?? 0) >= NEED_IP_LIMIT) {
      throw new Error(
        "We have several needs from here in the last hour. Please try again a little later, or email lincoln@unitedundergod.org.",
      );
    }
  }
  const id = crypto.randomUUID();
  const token = newInviteToken();
  const stamp = at.toISOString();
  await sql`
    insert into source_church_needs (
      id, token, church_name, contact_name, email, phone, city, state, zip,
      category, title, details, quantity, needed_by, status, ip, created_at, updated_at
    ) values (
      ${id}, ${token}, ${clean.churchName}, ${clean.contactName}, ${clean.email},
      ${clean.phone}, ${clean.city}, ${clean.state}, ${clean.zip}, ${clean.category},
      ${clean.title}, ${clean.details}, ${clean.quantity}, ${clean.neededBy}, ${"new"},
      ${ip}, ${stamp}, ${stamp}
    )
  `;
  return { id, token };
}

function needLines(clean: Pick<CleanNeed, "title" | "category" | "quantity" | "neededBy" | "details">) {
  return [
    `What you need: ${clean.title}`,
    `Category: ${needCategoryName(clean.category)}`,
    clean.quantity ? `Quantity: ${clean.quantity}` : "",
    clean.neededBy ? `Needed by: ${clean.neededBy}` : "",
    clean.details ? `Details: ${clean.details}` : "",
  ].filter(Boolean);
}

/** The church's confirmation, with its private link. */
export function needConfirmationEmail(clean: CleanNeed, token: string, siteUrl: string) {
  return {
    subject: `We have your need: ${clean.title}`,
    text: [
      `Hello ${clean.contactName},`,
      "",
      `Thank you for telling us what ${clean.churchName} needs. United Under God will ask suppliers to quote on it. They never see your name or your contact information.`,
      "",
      "When the quotes are in, we will email you again, and you will see them side by side on your private page:",
      `${siteUrl}${needLinkPath(token)}`,
      "",
      "Keep this link to yourself. You choose a quote, or choose none. There is no obligation.",
      "",
      ...needLines(clean),
      "",
      "Reply to this email with any questions.",
      "",
      "United Under God",
    ].join("\n"),
  };
}

/** The owner's notice for a new need (or one that did not save). */
export function needNotice(clean: CleanNeed, meta: { id: string; saved: boolean }) {
  return {
    subject: `${meta.saved ? "" : "NOT SAVED: "}Church need: ${clean.title} (${clean.churchName}, ${clean.state})`,
    text: [
      meta.saved
        ? "A church posted a need to bid out. It is on the desk under Church needs: https://www.unitedundergod.org/buying/desk"
        : "A church posted a need to bid out, but it did not save. Everything they sent is below.",
      "",
      `Church: ${clean.churchName}`,
      `Contact: ${clean.contactName}`,
      `Email: ${clean.email}`,
      clean.phone ? `Phone: ${clean.phone}` : "",
      `Place: ${clean.city}, ${clean.state}${clean.zip ? ` ${clean.zip}` : ""}`,
      "",
      ...needLines(clean),
      "",
      `Need id: ${meta.id}`,
    ]
      .filter((line, index, all) => line !== "" || all[index - 1] !== "")
      .join("\n"),
  };
}

/** The engine inbox inquiry for a new need (forwardInquiryToDashboard's shape). */
export function needInquiry(clean: CleanNeed, id: string) {
  return {
    id,
    kind: "buying",
    name: clean.contactName,
    email: clean.email,
    phone: clean.phone,
    organization: clean.churchName,
    city: `${clean.city}, ${clean.state}`,
    address: clean.zip,
    message: [
      "Posted a need to bid out (/buying/need).",
      ...needLines(clean),
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// The desk
// ---------------------------------------------------------------------------

export type NeedRow = {
  id: string;
  status: NeedStatus;
  churchName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  category: string;
  title: string;
  details: string;
  quantity: string;
  neededBy: string;
  bidId: string;
  bidTitle: string;
  itemId: string;
  chosenQuoteId: string;
  chosenVendor: string;
  chosenAt: string;
  churchNote: string;
  createdAt: string;
  /** Received quotes with a price on this need's line. */
  pricedQuotes: number;
  /** Other open needs in the same category and state. */
  similar: number;
};

export type NeedBidOption = { id: string; title: string; category: string; lines: number };

export type NeedsDesk = {
  needs: NeedRow[];
  /** Open bids, for "Add to an open bid" (the desk offers those in the need's category). */
  openBids: NeedBidOption[];
};

function text(value: unknown) {
  return String(value ?? "");
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return text(value);
}

function asStatus(value: unknown): NeedStatus {
  const status = text(value);
  return (NEED_STATUSES as readonly string[]).includes(status) ? (status as NeedStatus) : "new";
}

export async function readNeedsDesk(sql: Sql): Promise<NeedsDesk> {
  const rows = await sql`
    select n.*, coalesce(r.title, '') as bid_title, coalesce(q.vendor_name, '') as chosen_vendor
    from source_church_needs n
    left join source_bid_requests r on r.id = n.bid_id
    left join source_quotes q on q.id = n.chosen_quote_id
    order by n.created_at desc
  `;
  const priced = await sql<{ item_id: string; n: number }>`
    select l.item_id, count(*)::int as n
    from source_quote_lines l
    join source_quotes q on q.id = l.quote_id
    where q.status = 'received' and l.unit_price <> ''
      and l.item_id in (select item_id from source_church_needs where item_id <> '')
    group by l.item_id
  `;
  const pricedByItem = new Map(priced.map((row) => [text(row.item_id), Number(row.n) || 0]));
  const bids = await sql`
    select r.id, r.title, coalesce(to_jsonb(r) ->> 'category', '') as category,
      (select count(*)::int from source_bid_items i where i.bid_id = r.id) as lines
    from source_bid_requests r
    where r.status = 'open'
    order by r.created_at desc
  `;
  const open = rows.filter((row) => OPEN_STATUSES.includes(asStatus(row.status)));
  return {
    needs: rows.map((row) => {
      const status = asStatus(row.status);
      const category = text(row.category);
      const state = text(row.state);
      return {
        id: text(row.id),
        status,
        churchName: text(row.church_name),
        contactName: text(row.contact_name),
        email: text(row.email),
        phone: text(row.phone),
        city: text(row.city),
        state,
        zip: text(row.zip),
        category,
        title: text(row.title),
        details: text(row.details),
        quantity: text(row.quantity),
        neededBy: text(row.needed_by),
        bidId: text(row.bid_id),
        bidTitle: text(row.bid_title),
        itemId: text(row.item_id),
        chosenQuoteId: text(row.chosen_quote_id),
        chosenVendor: text(row.chosen_vendor),
        chosenAt: row.chosen_at ? iso(row.chosen_at) : "",
        churchNote: text(row.church_note),
        createdAt: iso(row.created_at),
        pricedQuotes: pricedByItem.get(text(row.item_id)) ?? 0,
        similar: OPEN_STATUSES.includes(status)
          ? open.filter(
              (other) =>
                text(other.id) !== text(row.id) &&
                text(other.category) === category &&
                text(other.state) === state,
            ).length
          : 0,
      };
    }),
    openBids: bids.map((row) => ({
      id: text(row.id),
      title: text(row.title),
      category: text(row.category),
      lines: Number(row.lines) || 0,
    })),
  };
}

type NeedRecord = {
  id: string;
  status: NeedStatus;
  token: string;
  churchName: string;
  contactName: string;
  email: string;
  state: string;
  category: string;
  title: string;
  details: string;
  quantity: string;
  neededBy: string;
  bidId: string;
  itemId: string;
};

function record(row: Record<string, unknown>): NeedRecord {
  return {
    id: text(row.id),
    status: asStatus(row.status),
    token: text(row.token),
    churchName: text(row.church_name),
    contactName: text(row.contact_name),
    email: text(row.email),
    state: text(row.state),
    category: text(row.category),
    title: text(row.title),
    details: text(row.details),
    quantity: text(row.quantity),
    neededBy: text(row.needed_by),
    bidId: text(row.bid_id),
    itemId: text(row.item_id),
  };
}

async function needById(sql: Sql, needId: string): Promise<NeedRecord> {
  const rows = await sql`select * from source_church_needs where id = ${needId}`;
  if (!rows[0]) throw new Error("That need is not on the desk.");
  return record(rows[0]);
}

function requireUnlinked(row: NeedRecord) {
  if (row.status === "closed") throw new Error("That need is closed.");
  if (row.bidId) throw new Error("That need is already on a bid.");
}

/** A need's bid date only when it is a real date, so the bid form shows it right. */
function bidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

/**
 * "Start a bid": a new bid from the need, with the need as its one line. The
 * bid's summary is the church's details; the church's name and contact are
 * never put on the bid.
 */
export async function startNeedBid(sql: Sql, needId: string, userId: string) {
  const row = await needById(sql, needId);
  requireUnlinked(row);
  let area = "";
  try {
    area = cleanArea(row.state);
  } catch {
    area = "";
  }
  const bidId = await createBid(
    sql,
    {
      title: row.title,
      summary: row.details,
      neededBy: bidDate(row.neededBy),
      category: row.category,
      area,
      items: [{ description: row.title, quantity: row.quantity || "1", unit: "" }],
    },
    userId,
  );
  const items = await sql<{ id: string }>`
    select id from source_bid_items where bid_id = ${bidId} order by sort_order limit 1
  `;
  await linkNeed(sql, row.id, bidId, text(items[0]?.id));
  return bidId;
}

/**
 * "Add to an open bid": the need becomes a new line on an open bid in the same
 * category. This is the grouping: several churches' needs on one bid.
 */
export async function addNeedToBid(sql: Sql, needId: string, bidId: string) {
  const row = await needById(sql, needId);
  requireUnlinked(row);
  const bids = await sql`
    select id, status, coalesce(to_jsonb(r) ->> 'category', '') as category
    from source_bid_requests r where id = ${bidId}
  `;
  const bid = bids[0];
  if (!bid) throw new Error("That bid is not on the desk.");
  if (text(bid.status) !== "open") throw new Error("That bid is closed. Pick an open bid.");
  if (text(bid.category) !== row.category) {
    throw new Error("Add a need only to an open bid in the same category.");
  }
  const lines = await sql<{ n: number; next: number }>`
    select count(*)::int as n, coalesce(max(sort_order), -1)::int + 1 as next
    from source_bid_items where bid_id = ${bidId}
  `;
  if (Number(lines[0]?.n ?? 0) >= MAX_LINES) throw new Error(`A bid holds at most ${MAX_LINES} lines.`);
  const itemId = crypto.randomUUID();
  await sql`
    insert into source_bid_items (id, bid_id, description, quantity, unit, catalog_item, sort_order)
    values (
      ${itemId}, ${bidId}, ${row.title.slice(0, 240)}, ${(row.quantity || "1").slice(0, 40)},
      ${""}, ${""}, ${Number(lines[0]?.next ?? 0)}
    )
  `;
  await linkNeed(sql, row.id, bidId, itemId);
  return itemId;
}

async function linkNeed(sql: Sql, needId: string, bidId: string, itemId: string) {
  if (!itemId) throw new Error("The bid line did not save.");
  await sql`
    update source_church_needs
    set bid_id = ${bidId}, item_id = ${itemId}, status = ${"bidding"}, updated_at = now()
    where id = ${needId}
  `;
}

/** The email that tells the church its quotes are ready. */
export function needQuotesEmail(row: Pick<NeedRecord, "contactName" | "title" | "token">, siteUrl: string) {
  return {
    subject: `Your quotes are ready: ${row.title}`,
    text: [
      `Hello ${row.contactName},`,
      "",
      `The quotes for "${row.title}" are in. See them side by side on your private page:`,
      `${siteUrl}${needLinkPath(row.token)}`,
      "",
      "Choose the one that works for you, or tell us none of them do. There is no obligation. When you choose, we will introduce you to the supplier.",
      "",
      "Reply to this email with any questions.",
      "",
      "United Under God",
    ].join("\n"),
  };
}

/** Priced, received quotes on one line: the only quotes a church ever sees. */
async function pricedOnLine(sql: Sql, itemId: string) {
  if (!itemId) return [];
  return sql`
    select q.id, q.vendor_name, q.notes as quote_notes, l.unit_price, l.notes as line_notes,
      coalesce((to_jsonb(r) ->> 'price_term_months')::int, ${DEFAULT_TERM_MONTHS}) as term_months,
      q.created_at
    from source_quote_lines l
    join source_quotes q on q.id = l.quote_id
    join source_bid_requests r on r.id = q.bid_id
    where l.item_id = ${itemId} and q.status = 'received' and l.unit_price <> ''
    order by q.created_at
  `;
}

/** "Send quotes to the church": only once its line has a priced quote. */
export async function sendNeedQuotes(
  sql: Sql,
  args: { needId: string; siteUrl: string; send: SendMail },
): Promise<{ ok: boolean; error: string }> {
  const row = await needById(sql, args.needId);
  if (row.status === "closed") throw new Error("That need is closed.");
  if (row.status === "chosen") throw new Error("The church already chose a quote.");
  if (!row.bidId) throw new Error("Put the need on a bid first.");
  if ((await pricedOnLine(sql, row.itemId)).length === 0) {
    throw new Error("No quote has a price on this church’s line yet.");
  }
  const mail = needQuotesEmail(row, args.siteUrl);
  const sent = await args.send({ to: row.email, subject: mail.subject, text: mail.text });
  if (!sent.ok) return { ok: false, error: sent.error || "The email did not send." };
  await sql`
    update source_church_needs set status = ${"quotes_sent"}, updated_at = now()
    where id = ${row.id}
  `;
  return { ok: true, error: "" };
}

export async function closeNeed(sql: Sql, needId: string) {
  const row = await needById(sql, needId);
  if (row.status === "closed") return;
  await sql`
    update source_church_needs set status = ${"closed"}, updated_at = now() where id = ${row.id}
  `;
}

// ---------------------------------------------------------------------------
// The church's private page
// ---------------------------------------------------------------------------

export type NeedQuote = {
  id: string;
  vendorName: string;
  unitPrice: string;
  /** The supplier's note on this line, then on its whole quote. */
  notes: string;
  /** How long the supplier holds the price, in months. */
  termMonths: number;
};

export type NeedView =
  | { state: "denied" }
  | {
      state: "open";
      status: NeedStatus;
      churchName: string;
      title: string;
      category: string;
      details: string;
      quantity: string;
      neededBy: string;
      place: string;
      createdAt: string;
      /** Shown once the desk sends them (quotes_sent, chosen, or declined). */
      quotes: NeedQuote[];
      chosenQuoteId: string;
    };

async function needByToken(sql: Sql, token: string) {
  if (!token || !TOKEN_SHAPE.test(token)) return null;
  const rows = await sql`select * from source_church_needs where token = ${token}`;
  return rows[0] ?? null;
}

/** The church's own need, and the quotes on its own line. Nothing about any other church. */
export async function readNeedByToken(sql: Sql, token: string): Promise<NeedView> {
  const row = await needByToken(sql, token);
  if (!row) return { state: "denied" };
  const status = asStatus(row.status);
  // The desk decides when the quotes go to the church; a church that said
  // none of them work still sees what it was offered.
  const showQuotes =
    status === "quotes_sent" ||
    status === "chosen" ||
    (status === "closed" && text(row.church_note) !== "");
  const lines = showQuotes ? await pricedOnLine(sql, text(row.item_id)) : [];
  return {
    state: "open",
    status,
    churchName: text(row.church_name),
    title: text(row.title),
    category: needCategoryName(text(row.category)),
    details: text(row.details),
    quantity: text(row.quantity),
    neededBy: text(row.needed_by),
    place: `${text(row.city)}, ${text(row.state)}`,
    createdAt: iso(row.created_at),
    quotes: lines.map((line) => ({
      id: text(line.id),
      vendorName: text(line.vendor_name),
      unitPrice: text(line.unit_price),
      notes: [text(line.line_notes).trim(), text(line.quote_notes).trim()].filter(Boolean).join(" "),
      termMonths: Number(line.term_months) || DEFAULT_TERM_MONTHS,
    })),
    chosenQuoteId: text(row.chosen_quote_id),
  };
}

export type NeedDecision = {
  churchName: string;
  contactName: string;
  email: string;
  phone: string;
  place: string;
  title: string;
  quantity: string;
  vendorName: string;
  unitPrice: string;
  bidId: string;
};

function decision(row: Record<string, unknown>, quote?: { vendorName: string; unitPrice: string }): NeedDecision {
  return {
    churchName: text(row.church_name),
    contactName: text(row.contact_name),
    email: text(row.email),
    phone: text(row.phone),
    place: `${text(row.city)}, ${text(row.state)}`,
    title: text(row.title),
    quantity: text(row.quantity),
    vendorName: quote?.vendorName ?? "",
    unitPrice: quote?.unitPrice ?? "",
    bidId: text(row.bid_id),
  };
}

/** "Choose this quote": recorded once; the desk then makes the introduction. */
export async function chooseNeedQuote(
  sql: Sql,
  input: { token: string; quoteId: string; now?: Date },
): Promise<NeedDecision> {
  const row = await needByToken(sql, input.token);
  if (!row) throw new Error("This link is not valid.");
  const status = asStatus(row.status);
  if (status === "chosen") throw new Error("You already chose a quote. Reply to our email to change it.");
  if (status !== "quotes_sent") throw new Error("These quotes are not open for a choice.");
  const quote = (await pricedOnLine(sql, text(row.item_id))).find(
    (line) => text(line.id) === input.quoteId,
  );
  if (!quote) throw new Error("That quote is not one of yours to choose.");
  await sql`
    update source_church_needs
    set chosen_quote_id = ${text(quote.id)}, chosen_at = ${(input.now ?? new Date()).toISOString()},
      status = ${"chosen"}, updated_at = now()
    where id = ${text(row.id)}
  `;
  return decision(row, { vendorName: text(quote.vendor_name), unitPrice: text(quote.unit_price) });
}

/** "None of these work": the need closes, with the church's note for the desk. */
export async function declineNeedQuotes(
  sql: Sql,
  input: { token: string; note: string },
): Promise<NeedDecision & { note: string }> {
  const row = await needByToken(sql, input.token);
  if (!row) throw new Error("This link is not valid.");
  const status = asStatus(row.status);
  if (status !== "quotes_sent") throw new Error("These quotes are not open for a choice.");
  const note = optional(input.note, 2000);
  await sql`
    update source_church_needs
    set status = ${"closed"}, church_note = ${note || "None of these work."}, updated_at = now()
    where id = ${text(row.id)}
  `;
  return { ...decision(row), note };
}

/** The owner's notice when a church chooses a quote, or none. */
export function needDecisionNotice(d: NeedDecision & { note?: string }, chose: boolean) {
  return {
    subject: chose
      ? `Church chose a quote: ${d.churchName} — ${d.title} from ${d.vendorName}`
      : `None of the quotes work: ${d.churchName} — ${d.title}`,
    text: [
      chose
        ? `${d.churchName} chose ${d.vendorName} at ${d.unitPrice} each for "${d.title}". Please introduce them to the supplier.`
        : `${d.churchName} said none of the quotes for "${d.title}" work. The need is closed.`,
      "",
      `Church: ${d.churchName}`,
      `Contact: ${d.contactName}`,
      `Email: ${d.email}`,
      d.phone ? `Phone: ${d.phone}` : "",
      `Place: ${d.place}`,
      d.quantity ? `Quantity: ${d.quantity}` : "",
      d.note ? `Their note: ${d.note}` : "",
      "",
      "Church needs on the desk: https://www.unitedundergod.org/buying/desk",
    ]
      .filter((line, index, all) => line !== "" || all[index - 1] !== "")
      .join("\n"),
  };
}
