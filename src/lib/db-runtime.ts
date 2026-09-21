/**
 * PGLite looks for a bundled data file at `/var/task/_libs/pglite.data` inside
 * the Vercel/Lambda filesystem. That file is not there, and opening it rejects
 * the isolate (`ENOENT` → unhandled rejection, exit 128). Dev and local preview
 * still use the embedded database when no Supabase LPL connection string is set
 * (`DATABASE_URL`, else `SUPABASE_DB_URL`, else `SUPABASE_DIRECT_CONNECTION_STRING`).
 */
type Env = Record<string, string | undefined>;

export function pgliteBootstrapAllowed(
  env: Env = process.env,
  cwd = typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : "",
): boolean {
  if (env.VERCEL || env.VERCEL_ENV || env.NOW_REGION) return false;
  if (env.AWS_LAMBDA_FUNCTION_NAME || env.LAMBDA_TASK_ROOT || env.AWS_EXECUTION_ENV) {
    return false;
  }
  if (cwd === "/var/task" || cwd.startsWith("/var/task/")) return false;
  return true;
}
