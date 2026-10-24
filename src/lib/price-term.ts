import type { Sql } from "./db.ts";

/**
 * The program price reference and the price term on an awarded price.
 *
 *   * A reference reads UUG-<year>-<number>, e.g. UUG-2026-0142. A church
 *     gives it to the vendor when it orders; it is unique across the book.
 *   * A term starts the day the price is published and runs for the months
 *     the owner set on the bid (6, 12, or a custom number; 12 by default).
 *     `expiresOn` is the last day the price is good ("Good through").
 *
 * Imported by node's test runner: relative imports, no framework code.
 */

export const DEFAULT_TERM_MONTHS = 12;
/** The two terms offered with one click; any whole number up to the maximum is allowed. */
export const TERM_CHOICES = [6, 12] as const;
export const MAX_TERM_MONTHS = 36;
/** The owner is reminded this many days before a term ends. */
export const REVIEW_DAYS = 45;

export const REFERENCE_SHAPE = /^UUG-\d{4}-\d{4,}$/;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isoDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function parseDay(day: string): Date {
  if (!DAY.test(day)) throw new Error(`Not a date: ${day}`);
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

/** `day` plus whole months; the 31st of a short month becomes its last day. */
export function addMonths(day: string, months: number): string {
  const start = parseDay(day);
  const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(start.getUTCDate(), last));
  return isoDay(target);
}

export function addDays(day: string, days: number): string {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
}

/** Whole days from `today` to `day` (negative once it has passed). */
export function daysBetween(today: string, day: string): number {
  return Math.round((parseDay(day).getTime() - parseDay(today).getTime()) / 86_400_000);
}

/** A whole number of months, 1 to {@link MAX_TERM_MONTHS}. Blank is the default. */
export function cleanTermMonths(raw: unknown): number {
  const value = String(raw ?? "").trim();
  if (!value) return DEFAULT_TERM_MONTHS;
  if (!/^\d+$/.test(value)) throw new Error("Enter the price term as a whole number of months.");
  const months = Number(value);
  if (months < 1 || months > MAX_TERM_MONTHS) {
    throw new Error(`A price term is 1 to ${MAX_TERM_MONTHS} months.`);
  }
  return months;
}

/** A term that starts on `effectiveOn` and is good through the day before the same date `months` later. */
export function termDates(effectiveOn: string, months: number): { effectiveOn: string; expiresOn: string } {
  return { effectiveOn, expiresOn: addDays(addMonths(effectiveOn, months), -1) };
}

/** The next term after `expiresOn`: it starts the day after, or today if that has passed. */
export function nextTerm(expiresOn: string, months: number, today: string) {
  const after = expiresOn && DAY.test(expiresOn) ? addDays(expiresOn, 1) : today;
  return termDates(after > today ? after : today, months);
}

/** True once the good-through date has passed. A price with no term yet is not ended. */
export function priceEnded(expiresOn: string, today: string): boolean {
  return DAY.test(expiresOn) && today > expiresOn;
}

/** Up for review: the term ends within {@link REVIEW_DAYS} days, or has ended. */
export function upForReview(expiresOn: string, today: string, days = REVIEW_DAYS): boolean {
  return DAY.test(expiresOn) && daysBetween(today, expiresOn) <= days;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "October 23, 2027". */
export function longDate(day: string): string {
  if (!DAY.test(day)) return day;
  const date = parseDay(day);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function formatReference(year: number, number: number): string {
  return `UUG-${year}-${String(number).padStart(4, "0")}`;
}

/** A reference typed by a church: '' when blank, otherwise it must look like UUG-2026-0142. */
export function cleanReference(raw: string | undefined): string {
  const value = (raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!value) return "";
  if (!REFERENCE_SHAPE.test(value)) {
    throw new Error("A program reference looks like UUG-2026-0142. Leave it blank if you do not have one.");
  }
  return value;
}

/** Hand out the next reference for `year`. The counter row makes two at once impossible. */
export async function nextReference(sql: Sql, year: number): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const rows = await sql<{ last: number }>`
      insert into source_reference_counters (year, last) values (${year}, 1)
      on conflict (year) do update set last = source_reference_counters.last + 1
      returning last
    `;
    const code = formatReference(year, Number(rows[0]?.last ?? 1));
    // A code typed in by hand, or a counter restored from an old backup, is skipped.
    const taken = await sql`select id from source_buying_book where reference_code = ${code}`;
    if (!taken[0]) return code;
  }
  throw new Error("Could not hand out a program reference. Try again.");
}

function text(value: unknown) {
  return String(value ?? "");
}

function dayOf(value: unknown): string {
  if (value instanceof Date) return isoDay(value);
  const raw = text(value);
  return DAY.test(raw.slice(0, 10)) ? raw.slice(0, 10) : isoDay();
}

/**
 * Give every book entry published before references existed its reference and
 * a term (from its publish date, for its bid's term). Run by the desk and the
 * daily job; a no-op once every entry has one.
 */
export async function ensureBookTerms(sql: Sql): Promise<number> {
  const rows = await sql`
    select b.id, b.published_at,
      coalesce((to_jsonb(r) ->> 'price_term_months')::int, ${DEFAULT_TERM_MONTHS}) as months,
      coalesce(q.price_contact_name, '') as pc_name,
      coalesce(q.price_contact_title, '') as pc_title,
      coalesce(q.price_contact_email, '') as pc_email,
      coalesce(q.price_contact_phone, '') as pc_phone
    from source_buying_book b
    left join source_bid_requests r on r.id = b.bid_id
    left join source_awards a on a.id = b.award_id
    left join source_quotes q on q.id = a.quote_id
    where b.reference_code = ''
    order by b.published_at
  `;
  let assigned = 0;
  for (const row of rows) {
    const months = Number(row.months) || DEFAULT_TERM_MONTHS;
    const term = termDates(dayOf(row.published_at), months);
    const code = await nextReference(sql, Number(term.effectiveOn.slice(0, 4)));
    const done = await sql`
      update source_buying_book set
        reference_code = ${code}, effective_on = ${term.effectiveOn}, expires_on = ${term.expiresOn},
        term_months = ${months},
        price_contact_name = case when price_contact_name = '' then ${text(row.pc_name)} else price_contact_name end,
        price_contact_title = case when price_contact_title = '' then ${text(row.pc_title)} else price_contact_title end,
        price_contact_email = case when price_contact_email = '' then ${text(row.pc_email)} else price_contact_email end,
        price_contact_phone = case when price_contact_phone = '' then ${text(row.pc_phone)} else price_contact_phone end
      where id = ${text(row.id)} and reference_code = ''
      returning id
    `;
    if (done[0]) assigned += 1;
  }
  return assigned;
}
