import type { Sql } from "@/lib/db";
import { checkBidCategory } from "./church-spend.ts";
import { acceptedCovenant } from "./vendor-terms.ts";
import { requireAttestedContact, type PriceContact } from "./price-contact.ts";
import {
  DEFAULT_TERM_MONTHS,
  cleanTermMonths,
  isoDay,
  nextReference,
  priceEnded,
  termDates,
} from "./price-term.ts";

/** Canonical money text: digits with an optional decimal, up to two places. */
const PRICE = /^(?:\d+)(?:\.\d{1,2})?$/;

export type BidItemInput = {
  description: string;
  quantity?: string;
  unit?: string;
  /** The church-spend list item this line came from (a template line). */
  catalogItem?: string;
};

export type CreateBidInput = {
  title: string;
  summary?: string;
  neededBy?: string;
  /** A church-spend category id, or blank for an untagged bid. */
  category?: string;
  subcategory?: string;
  /** Two-letter state codes the bid is for ('' = anywhere). Needs 0007. */
  area?: string;
  items: BidItemInput[];
};

export type QuoteLineInput = {
  itemId: string;
  unitPrice?: string;
  notes?: string;
};

export type AddQuoteInput = {
  bidId: string;
  vendorName: string;
  vendorContact?: string;
  notes?: string;
  lines: QuoteLineInput[];
  /** The senior person at the vendor authorized to bind it to these prices. Required. */
  priceContact?: Partial<PriceContact>;
  /** That person attested (the owner ticks it on their word). Required. */
  attested?: boolean;
};

export type SourceItem = {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  catalogItem: string;
  sortOrder: number;
};

export type SourceQuoteLine = {
  id: string;
  itemId: string;
  unitPrice: string;
  notes: string;
};

export type SourceQuote = {
  id: string;
  vendorName: string;
  vendorContact: string;
  notes: string;
  status: string;
  /** 'desk' (typed in by staff) or 'online' (an invited vendor submitted it). */
  source: string;
  /** The source_vendors id behind an online quote ('' for desk quotes). */
  vendorId: string;
  /** The authorized price contact, the words attested, and when. */
  priceContact: PriceContact;
  attestation: string;
  attestedAt: string;
  /** 'updated': the vendor sent updated prices from the portal, waiting for the owner. */
  refreshStatus: string;
  createdAt: string;
  updatedAt: string;
  lines: SourceQuoteLine[];
};

export type SourceAward = {
  id: string;
  itemId: string;
  quoteId: string;
  createdAt: string;
};

export type SourceBookEntry = {
  id: string;
  awardId: string;
  bidId: string;
  itemId: string;
  title: string;
  vendorName: string;
  unitPrice: string;
  unit: string;
  quantity: string;
  notes: string;
  publishedAt: string;
  /** The program price reference, e.g. UUG-2026-0142 ('' until assigned). */
  referenceCode: string;
  effectiveOn: string;
  /** The last day the price is good. */
  expiresOn: string;
  termMonths: number;
  priceContact: PriceContact;
};

export type SourceBid = {
  id: string;
  title: string;
  summary: string;
  neededBy: string;
  category: string;
  subcategory: string;
  /** States the bid is for ('' = anywhere). */
  area: string;
  status: string;
  /** The price term, in months, for prices awarded from this bid. */
  priceTermMonths: number;
  createdAt: string;
  items: SourceItem[];
  quotes: SourceQuote[];
  awards: SourceAward[];
  book: SourceBookEntry[];
};

export type SourceDesk = {
  bids: SourceBid[];
  bookCount: number;
};

export type PublicBookEntry = {
  id: string;
  title: string;
  vendorName: string;
  unitPrice: string;
  unit: string;
  quantity: string;
  notes: string;
  /** The bid's church-spend category ('' when untagged). */
  category: string;
  /** The church-spend item the awarded line came from ('' when typed by hand). */
  catalogItem: string;
  publishedAt: string;
  /**
   * The awarded vendor is an approved program vendor that accepted the Vendor
   * Covenant. The only standing fact a public page shows; never case details.
   */
  covenant: boolean;
  /**
   * 'current' while the price term runs; 'ended' once it has passed. An ended
   * price is not shown as current: its price, reference, and contact are
   * blanked here, on the server.
   */
  priceStatus: "current" | "ended";
  /** The program reference a church gives the vendor ('' when ended). */
  referenceCode: string;
  /** The last day the price is good ('' when ended). */
  goodThrough: string;
  /** The authorized price contact at the vendor (blank when ended). */
  priceContact: PriceContact;
  /** The program vendor behind the price ('' for a quote typed in at the desk). */
  vendorId: string;
  /** The vendor's main email, for ordering directly. */
  vendorEmail: string;
};

/** A church-spend item that is on a bid still open for quotes. No prices, no vendors. */
export type BiddingItem = {
  category: string;
  catalogItem: string;
};

function text(value: unknown) {
  return String(value ?? "");
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return text(value);
}

export function cleanPrice(raw: string) {
  const value = raw.trim().replace(/[$,\s]/g, "");
  if (!value) return "";
  if (!PRICE.test(value)) {
    throw new Error("Enter a price like 12.50, or leave the line blank.");
  }
  return value;
}

function requireText(value: string, message: string, max = 240) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(message);
  if (trimmed.length > max) throw new Error("That is too long to store.");
  return trimmed;
}

export async function createBid(sql: Sql, input: CreateBidInput, userId: string) {
  const title = requireText(input.title, "Name the bid.", 160);
  const summary = (input.summary ?? "").trim().slice(0, 2000);
  const neededBy = (input.neededBy ?? "").trim().slice(0, 40);
  const { category, subcategory } = checkBidCategory(
    input.category ?? "",
    input.subcategory ?? "",
  );
  const items = input.items
    .map((item) => ({
      description: item.description.trim(),
      quantity: (item.quantity ?? "").trim().slice(0, 40) || "1",
      unit: (item.unit ?? "").trim().slice(0, 40),
      catalogItem: (item.catalogItem ?? "").trim().slice(0, 80),
    }))
    .filter((item) => item.description);
  if (items.length === 0) {
    throw new Error("Add at least one item to the bid.");
  }
  if (items.length > 40) throw new Error("Keep a bid to 40 items.");
  for (const item of items) {
    if (item.description.length > 240) throw new Error("That item name is too long.");
  }

  const bidId = crypto.randomUUID();
  try {
    await sql`
      insert into source_bid_requests (
        id, title, summary, needed_by, category, subcategory, status, created_by
      ) values (
        ${bidId}, ${title}, ${summary}, ${neededBy}, ${category}, ${subcategory},
        ${"open"}, ${userId}
      )
    `;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      await sql`
        insert into source_bid_items (
          id, bid_id, description, quantity, unit, catalog_item, sort_order
        ) values (
          ${crypto.randomUUID()},
          ${bidId},
          ${item.description},
          ${item.quantity},
          ${item.unit},
          ${item.catalogItem},
          ${index}
        )
      `;
    }
  } catch (err) {
    throw missingCategoryColumns(err) ?? err;
  }
  // Written only when set, so a bid still saves on a database without 0007.
  if ((input.area ?? "").trim()) await setBidArea(sql, bidId, input.area ?? "");
  return bidId;
}

/** Two-letter state codes, comma separated; blank means anywhere. */
export function cleanArea(raw: string): string {
  const codes = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  for (const code of codes) {
    if (!/^[A-Z]{2}$/.test(code)) throw new Error(`"${code}" is not a two-letter state code.`);
  }
  return [...new Set(codes)].sort().join(", ");
}

export async function setBidArea(sql: Sql, bidId: string, raw: string) {
  const area = cleanArea(raw);
  try {
    const rows = await sql`
      update source_bid_requests set area = ${area}, updated_at = now() where id = ${bidId}
      returning id
    `;
    if (!rows[0]) throw new Error("That bid is not on the desk.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/column "area"/.test(message)) {
      throw new Error(
        "The bid area column is not in the database yet. Apply migrations/0007_source_vendors.sql, then try again.",
      );
    }
    throw err;
  }
}

/**
 * Postgres 42703 (undefined column) on a bid write means
 * migrations/0006_source_bid_category.sql has not been applied to this
 * database. Say so instead of a bare SQL error.
 */
export function missingCategoryColumns(err: unknown): Error | null {
  const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
  const message = err instanceof Error ? err.message : "";
  if (code && code !== "42703") return null;
  if (!/column "(?:category|subcategory|catalog_item)"(?: of relation "\w+")? does not exist/.test(message)) {
    return null;
  }
  return new Error(
    "The bid category columns are not in the database yet. Apply migrations/0006_source_bid_category.sql, then try again.",
  );
}

export async function setBidStatus(sql: Sql, bidId: string, status: string) {
  if (status !== "open" && status !== "closed") {
    throw new Error("A bid is open or closed.");
  }
  const rows = await sql`select id from source_bid_requests where id = ${bidId}`;
  if (!rows[0]) throw new Error("That bid is not on the desk.");
  await sql`
    update source_bid_requests
    set status = ${status}, updated_at = now()
    where id = ${bidId}
  `;
}

export async function addQuote(sql: Sql, input: AddQuoteInput, userId: string) {
  const vendorName = requireText(input.vendorName, "Name the vendor.", 160);
  const vendorContact = (input.vendorContact ?? "").trim().slice(0, 240);
  const notes = (input.notes ?? "").trim().slice(0, 2000);
  // Every price in the program is backed by someone who can bind the vendor to it.
  const { contact, attestation } = requireAttestedContact(
    { contact: input.priceContact, attested: input.attested },
    vendorName,
  );
  const bids = await sql<{ id: string; status: string }>`
    select id, status from source_bid_requests where id = ${input.bidId}
  `;
  const bid = bids[0];
  if (!bid) throw new Error("That bid is not on the desk.");
  if (bid.status !== "open") {
    throw new Error("This bid is closed. Open it again to record another quote.");
  }
  const items = await sql<{ id: string }>`
    select id from source_bid_items where bid_id = ${input.bidId}
  `;
  const itemIds = new Set(items.map((row) => row.id));
  if (itemIds.size === 0) throw new Error("That bid has no items.");

  const priced: { itemId: string; unitPrice: string; notes: string }[] = [];
  const seen = new Set<string>();
  for (const line of input.lines) {
    if (!itemIds.has(line.itemId)) {
      throw new Error("A quote line does not belong to this bid.");
    }
    if (seen.has(line.itemId)) continue;
    seen.add(line.itemId);
    priced.push({
      itemId: line.itemId,
      unitPrice: cleanPrice(line.unitPrice ?? ""),
      notes: (line.notes ?? "").trim().slice(0, 400),
    });
  }
  if (!priced.some((line) => line.unitPrice)) {
    throw new Error("Enter a price on at least one item.");
  }

  const quoteId = crypto.randomUUID();
  await sql`
    insert into source_quotes (
      id, bid_id, vendor_name, vendor_contact, notes, status, created_by,
      price_contact_name, price_contact_title, price_contact_email, price_contact_phone,
      price_attestation, price_attested_at, price_attested_ip
    ) values (
      ${quoteId},
      ${input.bidId},
      ${vendorName},
      ${vendorContact},
      ${notes},
      ${"received"},
      ${userId},
      ${contact.name}, ${contact.title}, ${contact.email}, ${contact.phone},
      ${attestation}, ${new Date().toISOString()}, ${""}
    )
  `;
  for (const line of priced) {
    await sql`
      insert into source_quote_lines (id, quote_id, item_id, unit_price, notes)
      values (
        ${crypto.randomUUID()},
        ${quoteId},
        ${line.itemId},
        ${line.unitPrice},
        ${line.notes}
      )
    `;
  }
  return quoteId;
}

/** The price term for prices awarded from this bid: 6, 12, or a custom number of months. */
export async function setBidTerm(sql: Sql, bidId: string, raw: unknown) {
  const months = cleanTermMonths(raw);
  const rows = await sql`
    update source_bid_requests set price_term_months = ${months}, updated_at = now()
    where id = ${bidId} returning id
  `;
  if (!rows[0]) throw new Error("That bid is not on the desk.");
  return months;
}

export async function setQuoteStatus(sql: Sql, quoteId: string, status: string) {
  if (status !== "received" && status !== "withdrawn") {
    throw new Error("A quote is received or withdrawn.");
  }
  const rows = await sql`select id from source_quotes where id = ${quoteId}`;
  if (!rows[0]) throw new Error("That quote is not on the desk.");
  await sql`
    update source_quotes
    set status = ${status}, updated_at = now()
    where id = ${quoteId}
  `;
  if (status === "withdrawn") {
    await sql`delete from source_awards where quote_id = ${quoteId}`;
  }
}

export async function setItemWinners(sql: Sql, itemId: string, quoteIds: string[], userId: string) {
  const uniqueIds = [...new Set(quoteIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length > 40) throw new Error("Too many winners on one item.");

  const items = await sql<{ id: string; bid_id: string }>`
    select id, bid_id from source_bid_items where id = ${itemId}
  `;
  const item = items[0];
  if (!item) throw new Error("That item is not on the desk.");

  for (const quoteId of uniqueIds) {
    const quotes = await sql<{ id: string; bid_id: string; status: string }>`
      select id, bid_id, status from source_quotes where id = ${quoteId}
    `;
    const quote = quotes[0];
    if (!quote || quote.bid_id !== item.bid_id) {
      throw new Error("That quote is not on this bid.");
    }
    if (quote.status !== "received") {
      throw new Error("A withdrawn quote cannot be awarded.");
    }
    const lines = await sql<{ unit_price: string }>`
      select unit_price from source_quote_lines
      where quote_id = ${quoteId} and item_id = ${itemId}
    `;
    if (!text(lines[0]?.unit_price).trim()) {
      throw new Error("Award a quote that priced this item.");
    }
  }

  const existing = await sql<{ id: string; quote_id: string }>`
    select id, quote_id from source_awards where item_id = ${itemId}
  `;
  const keep = new Set(uniqueIds);
  for (const row of existing) {
    if (!keep.has(row.quote_id)) {
      await sql`delete from source_awards where id = ${row.id}`;
    }
  }
  const have = new Set(existing.map((row) => row.quote_id));
  for (const quoteId of uniqueIds) {
    if (have.has(quoteId)) continue;
    await sql`
      insert into source_awards (id, item_id, quote_id, awarded_by)
      values (${crypto.randomUUID()}, ${itemId}, ${quoteId}, ${userId})
    `;
  }
}

export async function publishAward(
  sql: Sql,
  awardId: string,
  userId: string,
  options: { today?: string } = {},
) {
  const rows = await sql`
    select
      a.id as award_id,
      i.bid_id,
      i.id as item_id,
      i.description,
      i.quantity,
      i.unit,
      q.vendor_name,
      q.status as quote_status,
      q.price_contact_name, q.price_contact_title, q.price_contact_email, q.price_contact_phone,
      r.price_term_months,
      l.unit_price,
      l.notes
    from source_awards a
    join source_bid_items i on i.id = a.item_id
    join source_quotes q on q.id = a.quote_id
    join source_quote_lines l on l.quote_id = a.quote_id and l.item_id = a.item_id
    join source_bid_requests r on r.id = i.bid_id
    where a.id = ${awardId}
  `;
  const row = rows[0];
  if (!row) throw new Error("That award is not on the desk.");
  if (text(row.quote_status) === "withdrawn") {
    throw new Error("That quote was withdrawn.");
  }
  const unitPrice = text(row.unit_price).trim();
  if (!unitPrice) throw new Error("That winner has no price to publish.");

  const existing = await sql<{ id: string }>`
    select id from source_buying_book where award_id = ${awardId}
  `;
  if (existing[0]) return existing[0].id;
  if (!text(row.price_contact_name).trim()) {
    throw new Error(
      "This quote has no authorized price contact. Record the quote again with the person who can commit the vendor to these prices.",
    );
  }

  const months = Number(row.price_term_months) || DEFAULT_TERM_MONTHS;
  const term = termDates(options.today ?? isoDay(), months);
  const referenceCode = await nextReference(sql, Number(term.effectiveOn.slice(0, 4)));
  const id = crypto.randomUUID();
  await sql`
    insert into source_buying_book (
      id, award_id, bid_id, item_id, title, vendor_name,
      unit_price, unit, quantity, notes, published_by,
      reference_code, effective_on, expires_on, term_months,
      price_contact_name, price_contact_title, price_contact_email, price_contact_phone
    ) values (
      ${id},
      ${awardId},
      ${text(row.bid_id)},
      ${text(row.item_id)},
      ${text(row.description)},
      ${text(row.vendor_name)},
      ${unitPrice},
      ${text(row.unit)},
      ${text(row.quantity)},
      ${text(row.notes)},
      ${userId},
      ${referenceCode}, ${term.effectiveOn}, ${term.expiresOn}, ${months},
      ${text(row.price_contact_name)}, ${text(row.price_contact_title)},
      ${text(row.price_contact_email)}, ${text(row.price_contact_phone)}
    )
  `;
  return id;
}

function mapItem(row: Record<string, unknown>): SourceItem {
  return {
    id: text(row.id),
    description: text(row.description),
    quantity: text(row.quantity),
    unit: text(row.unit),
    catalogItem: text(row.catalog_item),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function contactOf(row: Record<string, unknown>, prefix = "price_contact_"): PriceContact {
  return {
    name: text(row[`${prefix}name`]),
    title: text(row[`${prefix}title`]),
    email: text(row[`${prefix}email`]),
    phone: text(row[`${prefix}phone`]),
  };
}

function mapQuote(row: Record<string, unknown>, lines: SourceQuoteLine[]): SourceQuote {
  return {
    id: text(row.id),
    vendorName: text(row.vendor_name),
    vendorContact: text(row.vendor_contact),
    notes: text(row.notes),
    status: text(row.status),
    source: text(row.source) || "desk",
    vendorId: text(row.vendor_id),
    priceContact: contactOf(row),
    attestation: text(row.price_attestation),
    attestedAt: row.price_attested_at ? iso(row.price_attested_at) : "",
    refreshStatus: text(row.refresh_status),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    lines,
  };
}

function mapBook(row: Record<string, unknown>): SourceBookEntry {
  return {
    id: text(row.id),
    awardId: text(row.award_id),
    bidId: text(row.bid_id),
    itemId: text(row.item_id),
    title: text(row.title),
    vendorName: text(row.vendor_name),
    unitPrice: text(row.unit_price),
    unit: text(row.unit),
    quantity: text(row.quantity),
    notes: text(row.notes),
    publishedAt: iso(row.published_at),
    referenceCode: text(row.reference_code),
    effectiveOn: text(row.effective_on),
    expiresOn: text(row.expires_on),
    termMonths: Number(row.term_months ?? DEFAULT_TERM_MONTHS) || DEFAULT_TERM_MONTHS,
    priceContact: contactOf(row),
  };
}

export async function readDesk(sql: Sql): Promise<SourceDesk> {
  const bids = await sql`select * from source_bid_requests order by created_at desc`;
  const items = await sql`
    select * from source_bid_items order by sort_order, description
  `;
  const quotes = await sql`select * from source_quotes order by created_at`;
  const lines = await sql`select * from source_quote_lines`;
  const awards = await sql`select * from source_awards order by created_at`;
  const book = await sql`
    select * from source_buying_book order by published_at desc
  `;

  const linesByQuote = new Map<string, SourceQuoteLine[]>();
  for (const row of lines) {
    const quoteId = text(row.quote_id);
    const list = linesByQuote.get(quoteId) ?? [];
    list.push({
      id: text(row.id),
      itemId: text(row.item_id),
      unitPrice: text(row.unit_price),
      notes: text(row.notes),
    });
    linesByQuote.set(quoteId, list);
  }

  return {
    bookCount: book.length,
    bids: bids.map((bid) => {
      const bidId = text(bid.id);
      return {
        id: bidId,
        title: text(bid.title),
        summary: text(bid.summary),
        neededBy: text(bid.needed_by),
        category: text(bid.category),
        subcategory: text(bid.subcategory),
        area: text(bid.area),
        status: text(bid.status),
        priceTermMonths: Number(bid.price_term_months ?? DEFAULT_TERM_MONTHS) || DEFAULT_TERM_MONTHS,
        createdAt: iso(bid.created_at),
        items: items.filter((row) => text(row.bid_id) === bidId).map(mapItem),
        quotes: quotes
          .filter((row) => text(row.bid_id) === bidId)
          .map((row) => mapQuote(row, linesByQuote.get(text(row.id)) ?? [])),
        awards: awards
          .filter((row) =>
            items.some(
              (item) => text(item.bid_id) === bidId && text(item.id) === text(row.item_id),
            ),
          )
          .map((row) => ({
            id: text(row.id),
            itemId: text(row.item_id),
            quoteId: text(row.quote_id),
            createdAt: iso(row.created_at),
          })),
        book: book.filter((row) => text(row.bid_id) === bidId).map(mapBook),
      };
    }),
  };
}

export async function listBook(
  sql: Sql,
  options: { today?: string } = {},
): Promise<PublicBookEntry[]> {
  const today = options.today ?? isoDay();
  // to_jsonb(...) ->> reads the category columns without naming them, so the
  // public page keeps working on a database where 0006 is not applied yet.
  const rows = await sql`
    select
      b.id, b.item_id, b.title, b.vendor_name, b.unit_price, b.unit, b.quantity, b.notes,
      b.published_at,
      coalesce(to_jsonb(b) ->> 'reference_code', '') as reference_code,
      coalesce(to_jsonb(b) ->> 'expires_on', '') as expires_on,
      coalesce(to_jsonb(b) ->> 'price_contact_name', '') as price_contact_name,
      coalesce(to_jsonb(b) ->> 'price_contact_title', '') as price_contact_title,
      coalesce(to_jsonb(b) ->> 'price_contact_email', '') as price_contact_email,
      coalesce(to_jsonb(b) ->> 'price_contact_phone', '') as price_contact_phone,
      coalesce(to_jsonb(r) ->> 'category', '') as category,
      coalesce(to_jsonb(i) ->> 'catalog_item', '') as catalog_item,
      coalesce(to_jsonb(q) ->> 'vendor_id', '') as vendor_id
    from source_buying_book b
    left join source_bid_requests r on r.id = b.bid_id
    left join source_bid_items i on i.id = b.item_id
    left join source_awards a on a.id = b.award_id
    left join source_quotes q on q.id = a.quote_id
    order by b.published_at desc
  `;
  const standing = await vendorListing(
    sql,
    [...new Set(rows.map((row) => text(row.vendor_id)).filter(Boolean))],
  );
  // An ended price stays on the page as "being refreshed" only until a newer
  // award for the same item is published; then the current one stands alone.
  const currentItems = new Set(
    rows.filter((row) => !priceEnded(text(row.expires_on), today)).map((row) => text(row.item_id)),
  );
  return rows
    .filter((row) => standing.get(text(row.vendor_id))?.listed ?? true)
    .filter((row) => !priceEnded(text(row.expires_on), today) || !currentItems.has(text(row.item_id)))
    .map((row) => {
      const ended = priceEnded(text(row.expires_on), today);
      const vendorId = text(row.vendor_id);
      return {
        id: text(row.id),
        title: text(row.title),
        vendorName: text(row.vendor_name),
        // An ended price is not shown as current anywhere: it leaves here blank.
        unitPrice: ended ? "" : text(row.unit_price),
        unit: text(row.unit),
        quantity: text(row.quantity),
        notes: ended ? "" : text(row.notes),
        category: text(row.category),
        catalogItem: text(row.catalog_item),
        publishedAt: iso(row.published_at),
        covenant: standing.get(vendorId)?.covenant ?? false,
        priceStatus: ended ? ("ended" as const) : ("current" as const),
        referenceCode: ended ? "" : text(row.reference_code),
        goodThrough: ended ? "" : text(row.expires_on),
        priceContact: ended
          ? { name: "", title: "", email: "", phone: "" }
          : contactOf(row),
        vendorId,
        vendorEmail: standing.get(vendorId)?.email ?? "",
      };
    });
}

/**
 * For program vendors behind book entries: whether their prices stay listed
 * (not removed, and not paused by a suspension decision) and whether they
 * stand behind the Vendor Covenant. Reads only status, terms version, and
 * consequence; safe before 0007/0008 (everything stays listed, no line).
 */
async function vendorListing(
  sql: Sql,
  ids: string[],
): Promise<Map<string, { listed: boolean; covenant: boolean; email: string }>> {
  const out = new Map<string, { listed: boolean; covenant: boolean; email: string }>();
  if (ids.length === 0) return out;
  let rows: Record<string, unknown>[];
  try {
    rows = await sql`
      select id, status, terms_version, email, coalesce(to_jsonb(v) ->> 'consequence', '') as consequence
      from source_vendors v where id = any(${ids})
    `;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && String(err.code) === "42P01") return out;
    throw err;
  }
  for (const row of rows) {
    const status = text(row.status);
    const consequence = text(row.consequence);
    const suspended =
      consequence === "revocation" || (status === "paused" && consequence === "suspension");
    out.set(text(row.id), {
      listed: status !== "removed" && !suspended,
      covenant: status === "approved" && acceptedCovenant(text(row.terms_version)),
      email: text(row.email),
    });
  }
  return out;
}

/** List items on bids that are open right now. Safe before 0006 (returns blanks). */
export async function listBidding(sql: Sql): Promise<BiddingItem[]> {
  const rows = await sql`
    select distinct
      coalesce(to_jsonb(r) ->> 'category', '') as category,
      coalesce(to_jsonb(i) ->> 'catalog_item', '') as catalog_item
    from source_bid_items i
    join source_bid_requests r on r.id = i.bid_id
    where r.status = 'open'
  `;
  return rows
    .map((row) => ({ category: text(row.category), catalogItem: text(row.catalog_item) }))
    .filter((row) => row.category && row.catalogItem);
}

const DB_DOWN =
  /pglite\.data|PGLite bootstrap|PGLite instance|database is not available|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|Connection terminated|password authentication failed|timeout expired|the database system is (?:starting|shutting)/i;

const DB_DOWN_CODES = new Set([
  "DB_UNAVAILABLE",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ECONNRESET",
  "57P01",
  "57P02",
  "57P03",
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "53300",
  "42P01",
  "3D000",
]);

/** True when the buying book cannot be read because Postgres/PGLite is unusable. */
export function isBuyingDbUnavailable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String((err as { name?: unknown }).name ?? "") : "";
  if (name === "DbUnavailableError") return true;
  const code = "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
  if (code === "ENOENT") {
    const message = err instanceof Error ? err.message : "";
    return message.includes("pglite.data");
  }
  if (DB_DOWN_CODES.has(code)) return true;
  const message = err instanceof Error ? err.message : "";
  return DB_DOWN.test(message);
}

export type BuyingBookRead = {
  entries: PublicBookEntry[];
  unavailable: boolean;
};

export type BuyingCatalogRead = BuyingBookRead & {
  bidding: BiddingItem[];
};

/**
 * Public SOURCE book read. A missing or broken database is an empty book, not
 * a thrown error — the vision page stays up. Unrelated failures still throw.
 */
export async function readBuyingBook(open: () => Promise<Sql>): Promise<BuyingBookRead> {
  try {
    return { entries: await listBook(await open()), unavailable: false };
  } catch (err) {
    if (!isBuyingDbUnavailable(err)) throw err;
    console.error("[source] buying book unavailable:", err);
    return { entries: [], unavailable: true };
  }
}

/**
 * The /buying/<category> read: the published book plus which list items are
 * on an open bid. Same failure rule as {@link readBuyingBook}.
 */
export async function readBuyingCatalog(open: () => Promise<Sql>): Promise<BuyingCatalogRead> {
  try {
    const sql = await open();
    return { entries: await listBook(sql), bidding: await listBidding(sql), unavailable: false };
  } catch (err) {
    if (!isBuyingDbUnavailable(err)) throw err;
    console.error("[source] buying catalog unavailable:", err);
    return { entries: [], bidding: [], unavailable: true };
  }
}

/** Same read as {@link readBuyingBook}, returning only the entries. */
export async function listBuyingBook(open: () => Promise<Sql>): Promise<PublicBookEntry[]> {
  return (await readBuyingBook(open)).entries;
}
