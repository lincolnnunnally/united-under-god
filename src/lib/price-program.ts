import type { Sql } from "./db.ts";
import { cleanPrice } from "./source-store.ts";
import type { SendMail } from "./vendor-store.ts";
import { requireAttestedContact, type PriceContact } from "./price-contact.ts";
import {
  DEFAULT_TERM_MONTHS,
  REVIEW_DAYS,
  daysBetween,
  isoDay,
  longDate,
  nextReference,
  nextTerm,
  priceEnded,
  termDates,
  upForReview,
} from "./price-term.ts";

/**
 * Keeping program prices honest over time:
 *
 *   * the desk's "Prices up for review" list and the daily reminder digest
 *     (45 days before a term ends, once per term, one email a day at most);
 *   * asking a vendor to confirm or update, extending a term, and publishing
 *     updated prices (the old term is kept in history);
 *   * the vendor's side in the portal: confirm unchanged (waits for the
 *     owner's approval) or send updated prices (they become its quote again);
 *   * "We ordered this" from member churches, read only on the owner's desk,
 *     and the per-vendor comparison with the vendor's monthly reports.
 *
 * Imported by node's test runner: relative imports, no framework code. Mail is
 * passed in as a function, so nothing here sends on its own.
 */

export const PORTAL_PRICES_PATH = "/buying/portal#prices";

function text(value: unknown) {
  return String(value ?? "");
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return value ? text(value) : "";
}

function contactOf(row: Record<string, unknown>, prefix = "price_contact_"): PriceContact {
  return {
    name: text(row[`${prefix}name`]),
    title: text(row[`${prefix}title`]),
    email: text(row[`${prefix}email`]),
    phone: text(row[`${prefix}phone`]),
  };
}

function money(raw: string) {
  return raw ? `$${raw}` : "no price";
}

// ---------------------------------------------------------------------------
// Book entries with their vendor, for the desk, the portal, and the digest
// ---------------------------------------------------------------------------

export type PriceEntry = {
  bookId: string;
  bidId: string;
  bidTitle: string;
  bidStatus: string;
  itemId: string;
  quoteId: string;
  title: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  unitPrice: string;
  unit: string;
  referenceCode: string;
  effectiveOn: string;
  expiresOn: string;
  termMonths: number;
  /** Months for the next term: the bid's current setting. */
  bidTermMonths: number;
  priceContact: PriceContact;
  /** Days until the term ends (negative once ended). */
  daysLeft: number;
  ended: boolean;
  /** The vendor's quote now carries updated prices, waiting to be published. */
  updatedPricesWaiting: boolean;
  /** The updated price on the quote line for this item ('' if none). */
  updatedPrice: string;
};

async function readEntries(sql: Sql, where: { vendorId?: string; bookId?: string }, today: string) {
  const rows = await sql`
    select b.id as book_id, b.bid_id, b.item_id, b.title, b.vendor_name, b.unit_price, b.unit,
      b.reference_code, b.effective_on, b.expires_on, b.term_months,
      b.price_contact_name, b.price_contact_title, b.price_contact_email, b.price_contact_phone,
      r.title as bid_title, r.status as bid_status, r.price_term_months,
      q.id as quote_id, q.vendor_id, q.refresh_status, l.unit_price as quote_price,
      coalesce(v.email, '') as vendor_email
    from source_buying_book b
    join source_awards a on a.id = b.award_id
    join source_quotes q on q.id = a.quote_id
    join source_bid_requests r on r.id = b.bid_id
    left join source_quote_lines l on l.quote_id = q.id and l.item_id = b.item_id
    left join source_vendors v on v.id = q.vendor_id
    where (${where.vendorId ?? ""} = '' or q.vendor_id = ${where.vendorId ?? ""})
      and (${where.bookId ?? ""} = '' or b.id = ${where.bookId ?? ""})
    order by b.expires_on, b.title
  `;
  return rows.map((row): PriceEntry => {
    const expiresOn = text(row.expires_on);
    const updatedPricesWaiting = text(row.refresh_status) === "updated";
    return {
      bookId: text(row.book_id),
      bidId: text(row.bid_id),
      bidTitle: text(row.bid_title),
      bidStatus: text(row.bid_status),
      itemId: text(row.item_id),
      quoteId: text(row.quote_id),
      title: text(row.title),
      vendorId: text(row.vendor_id),
      vendorName: text(row.vendor_name),
      vendorEmail: text(row.vendor_email),
      unitPrice: text(row.unit_price),
      unit: text(row.unit),
      referenceCode: text(row.reference_code),
      effectiveOn: text(row.effective_on),
      expiresOn,
      termMonths: Number(row.term_months) || DEFAULT_TERM_MONTHS,
      bidTermMonths: Number(row.price_term_months) || DEFAULT_TERM_MONTHS,
      priceContact: contactOf(row),
      daysLeft: expiresOn ? daysBetween(today, expiresOn) : 0,
      ended: priceEnded(expiresOn, today),
      updatedPricesWaiting,
      updatedPrice: updatedPricesWaiting ? text(row.quote_price) : "",
    };
  });
}

// ---------------------------------------------------------------------------
// Price reviews: requests to the vendor, and the vendor's confirmations
// ---------------------------------------------------------------------------

export type PriceReviewRow = {
  id: string;
  bookId: string;
  vendorId: string;
  kind: "request" | "confirm";
  status: string;
  email: string;
  emailError: string;
  priceContact: PriceContact;
  forExpiresOn: string;
  decidedBy: string;
  decidedAt: string;
  createdAt: string;
};

function mapReview(row: Record<string, unknown>): PriceReviewRow {
  return {
    id: text(row.id),
    bookId: text(row.book_id),
    vendorId: text(row.vendor_id),
    kind: text(row.kind) === "confirm" ? "confirm" : "request",
    status: text(row.status),
    email: text(row.email),
    emailError: text(row.email_error),
    priceContact: contactOf(row),
    forExpiresOn: text(row.for_expires_on),
    decidedBy: text(row.decided_by),
    decidedAt: iso(row.decided_at),
    createdAt: iso(row.created_at),
  };
}

export type BookHistoryRow = {
  id: string;
  bookId: string;
  referenceCode: string;
  unitPrice: string;
  effectiveOn: string;
  expiresOn: string;
  reason: string;
  createdAt: string;
};

export type PriceReviewItem = PriceEntry & {
  reviews: PriceReviewRow[];
  /** A vendor confirmation waiting for the owner's approval. */
  pendingConfirmation: PriceReviewRow | null;
  lastRequest: PriceReviewRow | null;
  history: BookHistoryRow[];
};

export type PriceReviewDesk = {
  /** Terms ending within the review window, or ended. Soonest first. */
  dueSoon: PriceReviewItem[];
  /** Every other awarded price, with its term. */
  current: PriceReviewItem[];
  reviewDays: number;
};

/** The desk's "Prices up for review" list, plus every other price and its history. */
export async function readPriceReviews(sql: Sql, today = isoDay()): Promise<PriceReviewDesk> {
  const entries = await readEntries(sql, {}, today);
  const reviews = (await sql`select * from source_price_reviews order by created_at desc`).map(mapReview);
  const history = (await sql`select * from source_book_history order by created_at desc`).map(
    (row): BookHistoryRow => ({
      id: text(row.id),
      bookId: text(row.book_id),
      referenceCode: text(row.reference_code),
      unitPrice: text(row.unit_price),
      effectiveOn: text(row.effective_on),
      expiresOn: text(row.expires_on),
      reason: text(row.reason),
      createdAt: iso(row.created_at),
    }),
  );
  const items = entries.map((entry): PriceReviewItem => {
    const mine = reviews.filter((row) => row.bookId === entry.bookId);
    return {
      ...entry,
      reviews: mine,
      pendingConfirmation: mine.find((row) => row.kind === "confirm" && row.status === "pending") ?? null,
      lastRequest: mine.find((row) => row.kind === "request") ?? null,
      history: history.filter((row) => row.bookId === entry.bookId),
    };
  });
  const due = (item: PriceReviewItem) =>
    upForReview(item.expiresOn, today) || item.updatedPricesWaiting || Boolean(item.pendingConfirmation);
  return {
    dueSoon: items.filter(due).sort((a, b) => a.expiresOn.localeCompare(b.expiresOn)),
    current: items.filter((item) => !due(item)),
    reviewDays: REVIEW_DAYS,
  };
}

/** The email asking a vendor to confirm or update. The desk shows this exact text first. */
export function priceReviewEmail(args: {
  vendorName: string;
  contactName: string;
  entries: Pick<PriceEntry, "title" | "unitPrice" | "unit" | "referenceCode" | "expiresOn">[];
  portal: boolean;
  siteUrl: string;
}) {
  const lines = args.entries.map(
    (entry) =>
      `- ${entry.title}: ${money(entry.unitPrice)}${entry.unit ? ` / ${entry.unit}` : ""} · reference ${entry.referenceCode} · good through ${longDate(entry.expiresOn)}`,
  );
  return {
    subject: "Please confirm or update your program prices",
    text: [
      args.contactName ? `Hello ${args.contactName},` : "Hello,",
      "",
      `These program prices from ${args.vendorName} for member churches of United Under God are coming up for review:`,
      "",
      ...lines,
      "",
      args.portal
        ? `Please confirm them unchanged for a new term, or send updated prices, in your vendor portal: ${args.siteUrl}${PORTAL_PRICES_PATH}`
        : "Please reply to this email to confirm them unchanged for a new term, or with your updated prices.",
      "A confirmed term starts once United Under God approves it. Until then the current price stands through its good-through date.",
      "",
      "Under the Vendor Covenant, when a member church gives you a program reference, you charge no more than the awarded price for the term.",
      "",
      "Questions? Reply to this email.",
      "",
      "United Under God, Inc.",
    ].join("\n"),
  };
}

/** Who a review request goes to: the price contact and the vendor's main email, each once. */
export function reviewRecipients(entry: Pick<PriceEntry, "priceContact" | "vendorEmail">): string[] {
  const out: string[] = [];
  for (const raw of [entry.priceContact.email, entry.vendorEmail]) {
    const email = raw.trim().toLowerCase();
    if (email && !out.includes(email)) out.push(email);
  }
  return out;
}

async function oneEntry(sql: Sql, bookId: string, today: string) {
  const entry = (await readEntries(sql, { bookId }, today))[0];
  if (!entry) throw new Error("That price is not in the buying book.");
  return entry;
}

export async function previewPriceReviewRequest(sql: Sql, bookId: string, siteUrl: string, today = isoDay()) {
  const entry = await oneEntry(sql, bookId, today);
  return {
    to: reviewRecipients(entry),
    email: priceReviewEmail({
      vendorName: entry.vendorName,
      contactName: entry.priceContact.name,
      entries: [entry],
      portal: Boolean(entry.vendorId),
      siteUrl,
    }),
  };
}

/** One click: ask the vendor (its price contact and its main email) to confirm or update. */
export async function sendPriceReviewRequest(
  sql: Sql,
  args: { bookId: string; userId: string; siteUrl: string; send: SendMail; today?: string },
): Promise<{ sent: string[]; failed: { to: string; error: string }[] }> {
  const today = args.today ?? isoDay();
  const entry = await oneEntry(sql, args.bookId, today);
  const to = reviewRecipients(entry);
  if (to.length === 0) throw new Error("This price has no contact email. Add one on the vendor first.");
  const email = priceReviewEmail({
    vendorName: entry.vendorName,
    contactName: entry.priceContact.name,
    entries: [entry],
    portal: Boolean(entry.vendorId),
    siteUrl: args.siteUrl,
  });
  const result = { sent: [] as string[], failed: [] as { to: string; error: string }[] };
  for (const address of to) {
    let outcome: { ok: boolean; error: string };
    try {
      outcome = await args.send({ to: address, subject: email.subject, text: email.text });
    } catch {
      outcome = { ok: false, error: "send failed" };
    }
    const error = outcome.ok ? "" : outcome.error || "mail is not set up (no RESEND_API_KEY)";
    await sql`
      insert into source_price_reviews (
        id, book_id, vendor_id, kind, status, email, email_error, for_expires_on, created_by
      ) values (
        ${crypto.randomUUID()}, ${entry.bookId}, ${entry.vendorId}, ${"request"},
        ${outcome.ok ? "sent" : "failed"}, ${address}, ${error.slice(0, 500)}, ${entry.expiresOn},
        ${args.userId}
      )
    `;
    if (outcome.ok) result.sent.push(address);
    else result.failed.push({ to: address, error });
  }
  return result;
}

async function archiveTerm(sql: Sql, entry: PriceEntry, reason: "extended" | "updated", userId: string) {
  await sql`
    insert into source_book_history (
      id, book_id, reference_code, unit_price, effective_on, expires_on,
      price_contact_name, price_contact_title, price_contact_email, price_contact_phone,
      reason, changed_by
    ) values (
      ${crypto.randomUUID()}, ${entry.bookId}, ${entry.referenceCode}, ${entry.unitPrice},
      ${entry.effectiveOn}, ${entry.expiresOn}, ${entry.priceContact.name}, ${entry.priceContact.title},
      ${entry.priceContact.email}, ${entry.priceContact.phone}, ${reason}, ${userId}
    )
  `;
}

/**
 * Extend a price for a new term at the same price and reference. The new term
 * starts the day after the current one ends (or today, if it has ended), for
 * the bid's current term setting. The old term goes to history.
 */
export async function extendPriceTerm(
  sql: Sql,
  args: { bookId: string; userId: string; today?: string; contact?: PriceContact },
): Promise<{ effectiveOn: string; expiresOn: string }> {
  const today = args.today ?? isoDay();
  const entry = await oneEntry(sql, args.bookId, today);
  const term = nextTerm(entry.expiresOn, entry.bidTermMonths, today);
  await archiveTerm(sql, entry, "extended", args.userId);
  const contact = args.contact ?? entry.priceContact;
  await sql`
    update source_buying_book set
      effective_on = ${term.effectiveOn}, expires_on = ${term.expiresOn},
      term_months = ${entry.bidTermMonths},
      price_contact_name = ${contact.name}, price_contact_title = ${contact.title},
      price_contact_email = ${contact.email}, price_contact_phone = ${contact.phone}
    where id = ${entry.bookId}
  `;
  return term;
}

/**
 * The vendor, in its portal: "these prices are unchanged for a new term". It
 * needs the authorized contact and attestation again, and it does not extend
 * anything: it waits for the owner's approval.
 */
export async function confirmPricesUnchanged(
  sql: Sql,
  vendorId: string,
  input: { bookId: string; priceContact?: Partial<PriceContact>; attested?: boolean; ip?: string },
  today = isoDay(),
): Promise<{ id: string; status: "pending" }> {
  const entry = (await readEntries(sql, { vendorId, bookId: input.bookId }, today))[0];
  if (!entry || !vendorId) throw new Error("That price is not one of yours.");
  const { contact, attestation } = requireAttestedContact(
    { contact: input.priceContact, attested: input.attested },
    entry.vendorName,
  );
  const pending = await sql<{ id: string }>`
    select id from source_price_reviews
    where book_id = ${entry.bookId} and kind = 'confirm' and status = 'pending'
  `;
  if (pending[0]) {
    await sql`
      update source_price_reviews set
        price_contact_name = ${contact.name}, price_contact_title = ${contact.title},
        price_contact_email = ${contact.email}, price_contact_phone = ${contact.phone},
        attestation = ${attestation}, ip = ${(input.ip ?? "").slice(0, 80)}, created_at = now()
      where id = ${pending[0].id}
    `;
    return { id: pending[0].id, status: "pending" };
  }
  const id = crypto.randomUUID();
  await sql`
    insert into source_price_reviews (
      id, book_id, vendor_id, kind, status, price_contact_name, price_contact_title,
      price_contact_email, price_contact_phone, attestation, ip, for_expires_on, created_by
    ) values (
      ${id}, ${entry.bookId}, ${vendorId}, ${"confirm"}, ${"pending"}, ${contact.name},
      ${contact.title}, ${contact.email}, ${contact.phone}, ${attestation},
      ${(input.ip ?? "").slice(0, 80)}, ${entry.expiresOn}, ${`vendor:${vendorId}`}
    )
  `;
  return { id, status: "pending" };
}

/** The owner approves (the term is extended) or declines a vendor's confirmation. */
export async function decideConfirmation(
  sql: Sql,
  args: { reviewId: string; approve: boolean; userId: string; today?: string },
): Promise<{ status: "approved" | "declined"; expiresOn?: string }> {
  const rows = await sql`
    select * from source_price_reviews where id = ${args.reviewId} and kind = 'confirm'
  `;
  const row = rows[0];
  if (!row) throw new Error("That confirmation is not on the desk.");
  if (text(row.status) !== "pending") throw new Error("That confirmation was already decided.");
  const claimed = await sql`
    update source_price_reviews set
      status = ${args.approve ? "approved" : "declined"}, decided_by = ${args.userId}, decided_at = now()
    where id = ${args.reviewId} and status = 'pending'
    returning id
  `;
  if (!claimed[0]) throw new Error("That confirmation was already decided.");
  if (!args.approve) return { status: "declined" };
  const term = await extendPriceTerm(sql, {
    bookId: text(row.book_id),
    userId: args.userId,
    today: args.today,
    contact: contactOf(row),
  });
  return { status: "approved", expiresOn: term.expiresOn };
}

/**
 * The vendor, in its portal: updated prices for the items it was awarded on a
 * bid. They revise its quote on that bid (a quote again, with the contact and
 * attestation) and wait for the owner to publish them; the current prices
 * stand until then.
 */
export async function submitUpdatedPrices(
  sql: Sql,
  vendorId: string,
  input: {
    bidId: string;
    lines: { itemId: string; unitPrice?: string; notes?: string }[];
    priceContact?: Partial<PriceContact>;
    attested?: boolean;
    ip?: string;
  },
  today = isoDay(),
): Promise<{ quoteId: string }> {
  const mine = (await readEntries(sql, { vendorId }, today)).filter((entry) => entry.bidId === input.bidId);
  if (!vendorId || mine.length === 0) throw new Error("You have no awarded prices on that bid.");
  const quoteId = mine[0]!.quoteId;
  const { contact, attestation } = requireAttestedContact(
    { contact: input.priceContact, attested: input.attested },
    mine[0]!.vendorName,
  );
  const awarded = new Set(mine.map((entry) => entry.itemId));
  const lines = new Map<string, { unitPrice: string; notes: string }>();
  for (const line of input.lines) {
    if (!awarded.has(line.itemId)) throw new Error("Update only the prices you were awarded.");
    if (lines.has(line.itemId)) continue;
    const unitPrice = cleanPrice(line.unitPrice ?? "");
    if (!unitPrice) throw new Error("Enter a price on every line you were awarded.");
    lines.set(line.itemId, { unitPrice, notes: (line.notes ?? "").trim().slice(0, 400) });
  }
  if (lines.size === 0) throw new Error("Enter your updated prices.");
  for (const [itemId, line] of lines) {
    await sql`
      update source_quote_lines set unit_price = ${line.unitPrice}, notes = ${line.notes}
      where quote_id = ${quoteId} and item_id = ${itemId}
    `;
  }
  await sql`
    update source_quotes set
      refresh_status = ${"updated"}, updated_at = now(),
      price_contact_name = ${contact.name}, price_contact_title = ${contact.title},
      price_contact_email = ${contact.email}, price_contact_phone = ${contact.phone},
      price_attestation = ${attestation}, price_attested_at = ${new Date().toISOString()},
      price_attested_ip = ${(input.ip ?? "").slice(0, 80)}
    where id = ${quoteId} and vendor_id = ${vendorId}
  `;
  return { quoteId };
}

/**
 * The owner publishes a vendor's updated prices: each awarded price from that
 * quote gets the new price, a new reference, and a new term from today. The
 * old price and term go to history.
 */
export async function publishUpdatedPrices(
  sql: Sql,
  args: { quoteId: string; userId: string; today?: string },
): Promise<{ updated: number }> {
  const today = args.today ?? isoDay();
  const entries = (await readEntries(sql, {}, today)).filter((entry) => entry.quoteId === args.quoteId);
  if (entries.length === 0) throw new Error("That quote has no published prices.");
  const quotes = await sql`select * from source_quotes where id = ${args.quoteId}`;
  const quote = quotes[0];
  if (!quote) throw new Error("That quote is not on the desk.");
  if (!text(quote.price_contact_name)) throw new Error("This quote has no authorized price contact.");
  const contact = contactOf(quote);
  let updated = 0;
  for (const entry of entries) {
    const lines = await sql`
      select unit_price, notes from source_quote_lines
      where quote_id = ${args.quoteId} and item_id = ${entry.itemId}
    `;
    const price = text(lines[0]?.unit_price).trim();
    if (!price) continue;
    await archiveTerm(sql, entry, "updated", args.userId);
    const term = termDates(today, entry.bidTermMonths);
    const code = await nextReference(sql, Number(term.effectiveOn.slice(0, 4)));
    await sql`
      update source_buying_book set
        unit_price = ${price}, notes = ${text(lines[0]?.notes)}, reference_code = ${code},
        effective_on = ${term.effectiveOn}, expires_on = ${term.expiresOn},
        term_months = ${entry.bidTermMonths},
        price_contact_name = ${contact.name}, price_contact_title = ${contact.title},
        price_contact_email = ${contact.email}, price_contact_phone = ${contact.phone},
        published_by = ${args.userId}
      where id = ${entry.bookId}
    `;
    updated += 1;
  }
  await sql`update source_quotes set refresh_status = '' where id = ${args.quoteId}`;
  return { updated };
}

// ---------------------------------------------------------------------------
// The vendor's prices, in its portal
// ---------------------------------------------------------------------------

export type VendorPriceRow = PriceEntry & { pendingConfirmation: boolean; upForReview: boolean };

export async function listVendorPrices(sql: Sql, vendorId: string, today = isoDay()): Promise<VendorPriceRow[]> {
  if (!vendorId) return [];
  const entries = await readEntries(sql, { vendorId }, today);
  const pending = new Set(
    (
      await sql<{ book_id: string }>`
        select book_id from source_price_reviews
        where vendor_id = ${vendorId} and kind = 'confirm' and status = 'pending'
      `
    ).map((row) => row.book_id),
  );
  return entries.map((entry) => ({
    ...entry,
    pendingConfirmation: pending.has(entry.bookId),
    upForReview: upForReview(entry.expiresOn, today),
  }));
}

// ---------------------------------------------------------------------------
// The daily reminder digest
// ---------------------------------------------------------------------------

export function reminderDigestEmail(entries: PriceEntry[], siteUrl: string, today: string) {
  const lines = entries.map(
    (entry) =>
      `- ${entry.vendorName}: ${entry.title}, ${money(entry.unitPrice)} · ${entry.referenceCode} · ${
        entry.ended ? `ended ${longDate(entry.expiresOn)}` : `good through ${longDate(entry.expiresOn)} (${entry.daysLeft} days)`
      }`,
  );
  return {
    subject: `Prices up for review: ${entries.length} ${entries.length === 1 ? "price" : "prices"}`,
    text: [
      `These program prices end within ${REVIEW_DAYS} days (as of ${longDate(today)}):`,
      "",
      ...lines,
      "",
      `From the desk you can ask each vendor to confirm or update, reopen the bid, or extend the term once the vendor confirms: ${siteUrl}/buying/desk#price-review`,
    ].join("\n"),
  };
}

export type ReminderRun = {
  /** Book entries newly due, named in today's digest. */
  due: number;
  sent: boolean;
  /** Why nothing was sent ('' when it was). */
  skipped: "" | "nothing_due" | "already_sent_today" | "failed";
  error: string;
};

/**
 * The daily job. A term enters the reminder once, 45 days before it ends (or
 * on the first run after, if it is already closer). At most one digest email
 * a day: a run that finds today's digest already claimed sends nothing, and
 * any newly due prices go in tomorrow's. A failed send is retried the next
 * day; the reminders are recorded only once the digest went out.
 */
export async function runPriceReminders(
  sql: Sql,
  args: { send: (notice: { subject: string; text: string }) => Promise<{ ok: boolean; error: string }>; siteUrl: string; today?: string },
): Promise<ReminderRun> {
  const today = args.today ?? isoDay();
  const reminded = new Set(
    (await sql`select book_id, expires_on from source_price_reminders`).map(
      (row) => `${text(row.book_id)}|${text(row.expires_on)}`,
    ),
  );
  const due = (await readEntries(sql, {}, today)).filter(
    (entry) => upForReview(entry.expiresOn, today) && !reminded.has(`${entry.bookId}|${entry.expiresOn}`),
  );
  if (due.length === 0) return { due: 0, sent: false, skipped: "nothing_due", error: "" };
  const claimed = await sql`
    insert into source_price_digests (day, status, entries) values (${today}, ${"sending"}, ${due.length})
    on conflict (day) do nothing
    returning day
  `;
  if (!claimed[0]) return { due: due.length, sent: false, skipped: "already_sent_today", error: "" };
  let outcome: { ok: boolean; error: string };
  try {
    outcome = await args.send(reminderDigestEmail(due, args.siteUrl, today));
  } catch {
    outcome = { ok: false, error: "send failed" };
  }
  if (!outcome.ok) {
    const error = outcome.error || "mail is not set up (no RESEND_API_KEY)";
    await sql`update source_price_digests set status = 'failed', error = ${error.slice(0, 500)} where day = ${today}`;
    return { due: due.length, sent: false, skipped: "failed", error };
  }
  for (const entry of due) {
    await sql`
      insert into source_price_reminders (book_id, expires_on, digest_day)
      values (${entry.bookId}, ${entry.expiresOn}, ${today})
      on conflict (book_id, expires_on) do nothing
    `;
  }
  await sql`update source_price_digests set status = 'sent' where day = ${today}`;
  return { due: due.length, sent: true, skipped: "", error: "" };
}

// ---------------------------------------------------------------------------
// "We ordered this"
// ---------------------------------------------------------------------------

export type MemberOrderInput = {
  bookId: string;
  quantity: string;
  orderedOn: string;
  amount?: string;
};

export type MemberOrderRow = {
  id: string;
  bookId: string;
  referenceCode: string;
  vendorId: string;
  vendorName: string;
  title: string;
  churchName: string;
  quantity: string;
  orderedOn: string;
  amount: string;
  createdAt: string;
};

/** Every rule for a reported order. Throws a sentence the church can act on. */
export function cleanMemberOrder(input: MemberOrderInput, today = isoDay()) {
  const quantity = (input.quantity ?? "").trim();
  if (!/\d/.test(quantity)) throw new Error("Enter how many you ordered.");
  if (quantity.length > 40) throw new Error("Keep the quantity short, like 12 or 3 cases.");
  const orderedOn = (input.orderedOn ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(orderedOn)) throw new Error("Enter the date you ordered.");
  if (orderedOn > today) throw new Error("Enter a date that has already come.");
  if (daysBetween(orderedOn, today) > 730) throw new Error("Enter an order from the last two years.");
  const amountRaw = (input.amount ?? "").trim();
  const amount = amountRaw ? cleanPrice(amountRaw) : "";
  return { quantity, orderedOn, amount };
}

/**
 * A member church tells us it ordered an awarded price. It returns only the
 * new row's id: nothing about any other church's orders leaves here.
 */
export async function recordMemberOrder(
  sql: Sql,
  input: MemberOrderInput,
  who: { userId: string; churchName: string; today?: string },
): Promise<{ id: string }> {
  if (!who.userId) throw new Error("Sign in as a member church to tell us you ordered.");
  const order = cleanMemberOrder(input, who.today);
  const rows = await sql`
    select b.id, b.reference_code, b.vendor_name, b.title, coalesce(q.vendor_id, '') as vendor_id
    from source_buying_book b
    left join source_awards a on a.id = b.award_id
    left join source_quotes q on q.id = a.quote_id
    where b.id = ${input.bookId}
  `;
  const entry = rows[0];
  if (!entry) throw new Error("That price is not in the buying book.");
  const id = crypto.randomUUID();
  await sql`
    insert into source_member_orders (
      id, book_id, reference_code, vendor_id, vendor_name, title, user_id, church_name,
      quantity, ordered_on, amount
    ) values (
      ${id}, ${text(entry.id)}, ${text(entry.reference_code)}, ${text(entry.vendor_id)},
      ${text(entry.vendor_name)}, ${text(entry.title)}, ${who.userId}, ${who.churchName.slice(0, 200)},
      ${order.quantity}, ${order.orderedOn}, ${order.amount}
    )
  `;
  return { id };
}

export type VendorOrderMonth = {
  month: string;
  memberOrders: number;
  /** Sum of the amounts members gave (orders without an amount are counted, not summed). */
  memberAmount: number;
  /** What the vendor reported for the month (sales and closed jobs), or null if nothing. */
  vendorReported: number | null;
  /** The vendor reported the month with no program sales. */
  vendorReportedNone: boolean;
  /** Members say they ordered, but the vendor reported nothing or less than members did. */
  check: boolean;
};

export type VendorOrderComparison = {
  vendorId: string;
  vendorName: string;
  orders: MemberOrderRow[];
  months: VendorOrderMonth[];
};

function cents(raw: string) {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/**
 * The owner's view: member-reported orders per vendor, and each month beside
 * what the vendor reported. Staff only (the caller checks); never public.
 */
export async function readMemberOrders(sql: Sql): Promise<VendorOrderComparison[]> {
  const orders = (await sql`select * from source_member_orders order by ordered_on desc, created_at desc`).map(
    (row): MemberOrderRow => ({
      id: text(row.id),
      bookId: text(row.book_id),
      referenceCode: text(row.reference_code),
      vendorId: text(row.vendor_id),
      vendorName: text(row.vendor_name),
      title: text(row.title),
      churchName: text(row.church_name),
      quantity: text(row.quantity),
      orderedOn: text(row.ordered_on),
      amount: text(row.amount),
      createdAt: iso(row.created_at),
    }),
  );
  let reports: Record<string, unknown>[] = [];
  try {
    reports = await sql`select vendor_id, month, kind, amount from source_vendor_reports`;
  } catch (err) {
    // Before 0010 there are no vendor reports to compare with.
    if (!(err && typeof err === "object" && "code" in err && String(err.code) === "42P01")) throw err;
  }
  const groups = new Map<string, VendorOrderComparison>();
  for (const order of orders) {
    const key = order.vendorId || `name:${order.vendorName.toLowerCase()}`;
    const group = groups.get(key) ?? { vendorId: order.vendorId, vendorName: order.vendorName, orders: [], months: [] };
    group.orders.push(order);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const months = new Map<string, VendorOrderMonth>();
    const month = (key: string) => {
      const found = months.get(key);
      if (found) return found;
      const row: VendorOrderMonth = {
        month: key,
        memberOrders: 0,
        memberAmount: 0,
        vendorReported: null,
        vendorReportedNone: false,
        check: false,
      };
      months.set(key, row);
      return row;
    };
    for (const order of group.orders) {
      const row = month(order.orderedOn.slice(0, 7));
      row.memberOrders += 1;
      row.memberAmount += cents(order.amount);
    }
    if (group.vendorId) {
      for (const report of reports.filter((row) => text(row.vendor_id) === group.vendorId)) {
        const key = text(report.month);
        // Only months a member reported, plus any the vendor reported, are compared.
        const row = month(key);
        if (text(report.kind) === "none") row.vendorReportedNone = true;
        else row.vendorReported = (row.vendorReported ?? 0) + cents(text(report.amount));
      }
    }
    group.months = [...months.values()]
      .map((row) => ({
        ...row,
        memberAmount: row.memberAmount / 100,
        vendorReported: row.vendorReported === null ? null : row.vendorReported / 100,
        check:
          row.memberOrders > 0 &&
          (row.vendorReported === null || row.vendorReported < row.memberAmount),
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }
  return [...groups.values()].sort((a, b) => a.vendorName.localeCompare(b.vendorName));
}
