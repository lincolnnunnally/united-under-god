import { pendingMigrations } from "../../scripts/migration-plan.mjs";
import { resolvePostgresConnectionString } from "../../scripts/postgres-url.mjs";
import { pgliteBootstrapAllowed } from "./db-runtime.ts";

/** Which database backend is active. */
export type DbSource = "postgres" | "pglite";

/** Shared failure when Postgres is unset and PGLite cannot run on this host. */
export const DB_UNAVAILABLE_MESSAGE = "The database is not available.";

/**
 * Thrown instead of opening PGLite on a host where that bootstrap is known
 * broken (Vercel/Lambda cannot open `/var/task/_libs/pglite.data`).
 */
export class DbUnavailableError extends Error {
  readonly code = "DB_UNAVAILABLE";
  constructor(message = DB_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "DbUnavailableError";
  }
}

// An empty/whitespace connection string (an easy misconfig in deploy UIs) must
// mean "unset" — otherwise production would silently run on the PGLite fallback.
// Prefer DATABASE_URL, then sister aliases SUPABASE_DB_URL and
// SUPABASE_DIRECT_CONNECTION_STRING. Set Supabase LPL DATABASE_URL (same Life
// Produces Life DB as sister LPL apps).
const databaseUrl =
  typeof process !== "undefined" ? resolvePostgresConnectionString() : undefined;

/**
 * Active backend: Supabase Life Produces Life Postgres (`pg` Pool) when a
 * connection string is set. Otherwise a local embedded **PGLite** so dev and
 * live preview work with nothing configured. Vercel serverless cannot open
 * PGLite's data file, so that fallback is refused there (`DbUnavailableError`)
 * instead of crashing the isolate. Set Supabase LPL DATABASE_URL (same Life
 * Produces Life DB as sister LPL apps) to use Postgres; no other stack is involved.
 */
export const dbSource: DbSource = databaseUrl ? "postgres" : "pglite";

/**
 * Minimal shared SQL surface, satisfied by both Postgres and PGLite. Both the
 * tagged-template and `.query()` forms resolve to an array of row objects:
 *
 *   const sql = await getSql();
 *   const rows = await sql`select * from todos where id = ${id}`; // parameterized
 *   const rows2 = await sql.query("select * from todos where id = $1", [id]);
 */
export interface Sql {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Init state lives on globalThis as promises: dev HMR creates new instances of
 * this module, and two instances racing module-level state would open a second
 * pool or run two concurrent PGLite migration passes (whose duplicate
 * `_migrations` insert rejects — and would get memoized, poisoning every later
 * `getSql()`). A failed init clears its slot so the next call retries.
 */
const globalRef = globalThis as typeof globalThis & {
  __pgSqlPromise__?: Promise<Sql>;
  __pgliteInstance__?: Promise<import("@electric-sql/pglite").PGlite>;
  __pgliteMigrateChain__?: Promise<void>;
};

/**
 * Result-type parity: Postgres sends every value as text plus a type OID — the
 * JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
 * int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
 * JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
 * production return identical, JSON-safe shapes:
 *   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
 *                                   `::text` if you ever need huge integers)
 *   date                         -> 'YYYY-MM-DD' string
 *   interval                     -> Postgres interval text
 * numeric already comes back as a string on both (arbitrary precision).
 */
const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    // Rebuild with $1, $2, … placeholders so values stay parameterized.
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

function createPostgresSql(): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    // node-postgres (`pg`) Pool against Supabase Life Produces Life (any
    // Postgres URL). One pool per process; warm serverless instances reuse it.
    const { Pool, types } = await import("pg");
    types.setTypeParser(OID_INT8, Number);
    types.setTypeParser(OID_DATE, identity);
    types.setTypeParser(OID_INTERVAL, identity);
    const pool = new Pool({ connectionString: databaseUrl });
    return toSql(async <T>(text: string, params: unknown[]) => {
      const res = await pool.query(text, params);
      return res.rows as T[];
    });
  })().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined;
    throw err;
  });
  return globalRef.__pgSqlPromise__;
}

async function createPgliteSql(): Promise<Sql> {
  // Embedded Postgres, imported on demand so it never loads on the Postgres path.
  // One in-memory instance per process, shared across HMR module instances, so
  // data survives source edits (it resets on dev-server restart).
  globalRef.__pgliteInstance__ ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite({
      parsers: {
        [OID_INT8]: Number,
        [OID_DATE]: identity,
        [OID_INTERVAL]: identity,
      },
    });
    await pg.waitReady;
    await pg.exec(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    return pg;
  })().catch((err) => {
    globalRef.__pgliteInstance__ = undefined;
    throw err;
  });
  const pg = await globalRef.__pgliteInstance__;

  // Apply migrations/ (the single schema source) so preview matches production.
  // SQL is inlined by the bundler via import.meta.glob (no runtime fs); applied
  // files are tracked in _migrations. The glob does not descend, so the opt-in
  // auth schema under migrations/auth/ stays out. Runs once per module instance
  // — so an HMR reload after adding a migration file applies it live — with
  // passes serialized on a global chain so concurrent callers never
  // double-apply.
  const migrate = async (): Promise<void> => {
    const migrations = import.meta.glob("/migrations/*.sql", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const doneRows = await pg.query<{ name: string }>("select name from _migrations");
    const done = doneRows.rows.map((r) => r.name);
    for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) {
      // Apply + record atomically (parity with scripts/migrate.mjs) so a failed
      // statement can't leave a file half-applied but untracked.
      await pg.transaction(async (tx) => {
        await tx.exec(migrations[path]);
        await tx.query("insert into _migrations (name) values ($1)", [name]);
      });
    }
  };
  const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve())
    .catch(() => undefined) // an earlier failed pass must not wedge the chain
    .then(migrate);
  globalRef.__pgliteMigrateChain__ = pass;
  await pass;

  return toSql(async <T>(text: string, params: unknown[]) => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  });
}

let sqlPromise: Promise<Sql> | null = null;

async function createSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler " +
        "or a server route loader, never from client code.",
    );
  }
  if (dbSource === "postgres") return createPostgresSql();
  if (!pgliteBootstrapAllowed()) throw new DbUnavailableError();
  return createPgliteSql();
}

/**
 * Get the shared, **server-only** SQL client. Supabase LPL Postgres (`pg` Pool)
 * when `DATABASE_URL` (or `SUPABASE_DB_URL`, then
 * `SUPABASE_DIRECT_CONNECTION_STRING`) is set, otherwise the local PGLite
 * fallback where that bootstrap is allowed. On Vercel/Lambda with no usable
 * connection string, this rejects with `DbUnavailableError` and does not open
 * PGLite. Memoized — safe to call per request. Set Supabase LPL DATABASE_URL
 * (same Life Produces Life DB as sister LPL apps).
 *
 * Schema comes from `migrations/*.sql`, auto-applied before the first query on
 * both backends — define tables there, never inline in server functions.
 */
export function getSql(): Promise<Sql> {
  sqlPromise ??= createSql().catch((err) => {
    sqlPromise = null; // don't memoize failures — let the next call retry
    throw err;
  });
  return sqlPromise;
}

/**
 * The shared PGLite instance (preview only), with `migrations/*.sql` applied.
 * Lets Better Auth persist to the SAME embedded DB as app data in preview (via a
 * Kysely dialect). Throws when a Postgres connection string is set (that path
 * uses the Supabase LPL `pg` Pool), and when PGLite cannot run on this host.
 */
export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  if (dbSource !== "pglite") {
    throw new Error(
      "getPglite() is only available on the PGLite fallback (no Supabase LPL DATABASE_URL)",
    );
  }
  await getSql();
  const pg = await globalRef.__pgliteInstance__;
  if (!pg) throw new Error("PGLite instance failed to initialize");
  return pg;
}

/**
 * Finish DB bootstrap before the server handles traffic.
 *
 * - **PGLite** (preview / no connection string, and not Vercel/Lambda): open the
 *   in-memory DB and apply `migrations/*.sql`. Idempotent — concurrent callers
 *   share one promise.
 * - **Supabase LPL Postgres**: no-op (pool is created lazily on first query).
 * - **Serverless with no usable connection string**: no-op. Do not open PGLite.
 *   The public buying book treats `DbUnavailableError` as an empty read; desk
 *   writes throw. Set Supabase LPL DATABASE_URL (same Life Produces Life DB as
 *   sister LPL apps).
 *
 * Vite `configureServer` awaits this at dev startup. On hosts where PGLite can
 * run, importing this module kicks bootstrap immediately (see bottom of file).
 * A failed bootstrap is logged and not rethrown: a floating rejection becomes
 * an unhandled rejection, and Vercel exits the isolate (status 128).
 */
export function ensureDbReady(): Promise<void> {
  if (dbSource !== "pglite") return Promise.resolve();
  if (!pgliteBootstrapAllowed()) return Promise.resolve();
  return getSql().then(() => undefined);
}

// Server-only eager start: kick PGLite bootstrap as soon as this module loads in
// Node, but never on Vercel/Lambda where `/var/task/_libs/pglite.data` is missing.
// Client bundles never hit this path (`getSql` throws in the browser).
const globalBoot = globalThis as typeof globalThis & {
  __pgBootstrapPromise__?: Promise<void>;
};
if (typeof window === "undefined" && dbSource === "pglite" && pgliteBootstrapAllowed()) {
  globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
    globalBoot.__pgBootstrapPromise__ = undefined;
    console.error("[db] PGLite bootstrap failed:", err);
  });
}
