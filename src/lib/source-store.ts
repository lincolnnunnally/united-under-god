import type { Sql } from "@/lib/db";
import { checkBidCategory } from "./church-spend.ts";

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
      id, bid_id, vendor_name, vendor_contact, notes, status, created_by
    ) values (
      ${quoteId},
      ${input.bidId},
      ${vendorName},
      ${vendorContact},
      ${notes},
      ${"received"},
      ${userId}
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

export async function publishAward(sql: Sql, awardId: string, userId: string) {
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
      l.unit_price,
      l.notes
    from source_awards a
    join source_bid_items i on i.id = a.item_id
    join source_quotes q on q.id = a.quote_id
    join source_quote_lines l on l.quote_id = a.quote_id and l.item_id = a.item_id
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

  const id = crypto.randomUUID();
  await sql`
    insert into source_buying_book (
      id, award_id, bid_id, item_id, title, vendor_name,
      unit_price, unit, quantity, notes, published_by
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
      ${userId}
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

function mapQuote(row: Record<string, unknown>, lines: SourceQuoteLine[]): SourceQuote {
  return {
    id: text(row.id),
    vendorName: text(row.vendor_name),
    vendorContact: text(row.vendor_contact),
    notes: text(row.notes),
    status: text(row.status),
    source: text(row.source) || "desk",
    vendorId: text(row.vendor_id),
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

export async function listBook(sql: Sql): Promise<PublicBookEntry[]> {
  // to_jsonb(...) ->> reads the category columns without naming them, so the
  // public page keeps working on a database where 0006 is not applied yet.
  const rows = await sql`
    select
      b.id, b.title, b.vendor_name, b.unit_price, b.unit, b.quantity, b.notes,
      b.published_at,
      coalesce(to_jsonb(r) ->> 'category', '') as category,
      coalesce(to_jsonb(i) ->> 'catalog_item', '') as catalog_item
    from source_buying_book b
    left join source_bid_requests r on r.id = b.bid_id
    left join source_bid_items i on i.id = b.item_id
    order by b.published_at desc
  `;
  return rows.map((row) => ({
    id: text(row.id),
    title: text(row.title),
    vendorName: text(row.vendor_name),
    unitPrice: text(row.unit_price),
    unit: text(row.unit),
    quantity: text(row.quantity),
    notes: text(row.notes),
    category: text(row.category),
    catalogItem: text(row.catalog_item),
    publishedAt: iso(row.published_at),
  }));
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
