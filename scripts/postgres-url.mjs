// @ts-check
/**
 * Connection string for Lincoln-owned apps on the Supabase Life Produces Life
 * Postgres database.
 *
 * Prefer `DATABASE_URL`. If that is unset or whitespace, use the sister-app
 * aliases in order: `SUPABASE_DB_URL`, then `SUPABASE_DIRECT_CONNECTION_STRING`.
 * Whitespace-only values count as unset. A usable value is returned as stored
 * (not re-trimmed), matching the previous `DATABASE_URL` check.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {string | undefined}
 */
export const POSTGRES_CONNECTION_KEYS = [
  "DATABASE_URL",
  "SUPABASE_DB_URL",
  "SUPABASE_DIRECT_CONNECTION_STRING",
];

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {string | undefined}
 */
export function resolvePostgresConnectionString(env = process.env) {
  for (const key of POSTGRES_CONNECTION_KEYS) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
