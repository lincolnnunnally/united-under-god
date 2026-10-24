import type { Sql } from "./db.ts";
import { SPEND_CATEGORIES, allItems } from "./church-spend.ts";
import { US_STATES } from "./vendor-store.ts";

/**
 * The market numbers on /buying/sell-to-churches: how many churches are in
 * our church directory, by state. The directory is ChurchConnect's
 * `cc_churches` table (JSONB `doc`, `doc.state`), which lives in the same Life
 * Produces Life database as this app, so it is read with the app's own
 * connection. Rows marked `directory_status = 'merged'` were folded into
 * another row as duplicates and are not counted.
 *
 * These are churches listed in the directory. They are not signed up, not
 * buyers, and not customers, and copy must never say otherwise.
 *
 * Imported by node's test runner: relative imports, no framework code.
 */

export type StateCount = { code: string; name: string; count: number };

export type ChurchMarket = {
  /** Churches in the directory with a recognised US state. */
  total: number;
  /** One row per state that has churches, largest first. */
  states: StateCount[];
  /** Approved vendors in the buying program (0 when none, or not readable). */
  approvedVendors: number;
  /** ISO time the numbers were read. */
  readAt: string;
};

export type ChurchMarketRead = { market: ChurchMarket | null };

const NAME_BY_CODE = new Map(US_STATES.map((state) => [state.code, state.name]));
const CODE_BY_NAME = new Map(
  US_STATES.map((state) => [state.name.toUpperCase().replace(/[^A-Z]/g, ""), state.code]),
);

/**
 * "GA", "ga", " Georgia ", "GEORGIA" -> "GA". Anything that is not a US state
 * (blank, null, "Ontario") -> null, so it is left out of every count.
 */
export function normalizeState(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toUpperCase().replace(/\./g, "");
  if (!cleaned) return null;
  if (cleaned.length === 2) return NAME_BY_CODE.has(cleaned) ? cleaned : null;
  return CODE_BY_NAME.get(cleaned.replace(/[^A-Z]/g, "")) ?? null;
}

/** Fold raw (state, count) rows into one count per state, largest first. */
export function tallyStates(rows: { state: unknown; n: unknown }[]): {
  total: number;
  states: StateCount[];
} {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const code = normalizeState(row.state);
    const n = Number(row.n);
    if (!code || !Number.isFinite(n) || n <= 0) continue;
    counts.set(code, (counts.get(code) ?? 0) + Math.floor(n));
  }
  const states = [...counts]
    .map(([code, count]) => ({ code, name: NAME_BY_CODE.get(code) ?? code, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { total: states.reduce((sum, row) => sum + row.count, 0), states };
}

/** Churches in the picked states (the "Your service area" picker). */
export function areaCount(states: StateCount[], picked: Iterable<string>): number {
  const set = new Set(picked);
  return states.reduce((sum, row) => (set.has(row.code) ? sum + row.count : sum), 0);
}

/** Program numbers that are true from the code itself, with no database. */
export function programNumbers(): { catalogs: number; items: number } {
  return {
    catalogs: SPEND_CATEGORIES.length,
    items: SPEND_CATEGORIES.reduce((sum, category) => sum + allItems(category).length, 0),
  };
}

/** A count rounded down for headline copy: 151,118 -> "151,000+". */
export function roundedDown(n: number): string {
  if (n < 1000) return n.toLocaleString("en-US");
  const step = n >= 10000 ? 1000 : 100;
  return `${(Math.floor(n / step) * step).toLocaleString("en-US")}+`;
}

export const MARKET_SQL = `select upper(trim(doc->>'state')) as state, count(*)::int as n
  from cc_churches
  where coalesce(doc->>'directory_status', '') <> 'merged'
  group by 1`;

export const VENDOR_COUNT_SQL = `select count(*)::int as n from source_vendors where status = 'approved'`;

/** Numbers stay this long per server instance. */
export const MARKET_TTL_MS = 6 * 60 * 60 * 1000;
/** After a failed read, wait this long before trying the database again. */
export const MARKET_RETRY_MS = 60 * 1000;
/** A read slower than this is treated as unavailable, so the page never hangs. */
export const MARKET_TIMEOUT_MS = 4000;

type CacheSlot = { value: ChurchMarket | null; until: number };
const cacheRef = globalThis as typeof globalThis & { __churchMarketCache__?: CacheSlot };

/** Test hook: forget the cached read. */
export function clearChurchMarketCache() {
  cacheRef.__churchMarketCache__ = undefined;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("church market read timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function readOnce(getSql: () => Promise<Sql>): Promise<ChurchMarket | null> {
  const sql = await getSql();
  const rows = await sql.query<{ state: unknown; n: unknown }>(MARKET_SQL);
  const { total, states } = tallyStates(rows);
  if (total <= 0) return null;
  let approvedVendors = 0;
  try {
    const [row] = await sql.query<{ n: unknown }>(VENDOR_COUNT_SQL);
    approvedVendors = Math.max(0, Number(row?.n) || 0);
  } catch {
    approvedVendors = 0; // vendors table not migrated yet: hide the number
  }
  return { total, states, approvedVendors, readAt: new Date().toISOString() };
}

/**
 * The cached market read. Any failure (no database, no `cc_churches` table on
 * a local PGLite, a timeout) returns `{ market: null }` and the page hides the
 * numbers instead of erroring.
 */
export async function readChurchMarket(
  getSql: () => Promise<Sql>,
  { now = Date.now(), timeoutMs = MARKET_TIMEOUT_MS } = {},
): Promise<ChurchMarketRead> {
  const slot = cacheRef.__churchMarketCache__;
  if (slot && slot.until > now) return { market: slot.value };
  try {
    const market = await withTimeout(readOnce(getSql), timeoutMs);
    cacheRef.__churchMarketCache__ = {
      value: market,
      until: now + (market ? MARKET_TTL_MS : MARKET_RETRY_MS),
    };
    return { market };
  } catch (err) {
    console.error("[market] church directory counts unavailable:", err);
    cacheRef.__churchMarketCache__ = { value: null, until: now + MARKET_RETRY_MS };
    return { market: null };
  }
}
