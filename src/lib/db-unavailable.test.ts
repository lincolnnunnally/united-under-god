import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { test } from "node:test";

const probe = process.env.PROBE_DB;

if (probe === "1") {
  const { dbSource, getSql } = await import("./db.ts");
  assert.equal(dbSource, "pglite");
  await assert.rejects(getSql(), (err: unknown) => {
    assert.ok(err instanceof Error);
    assert.equal(err.name, "DbUnavailableError");
    assert.match(err.message, /not available/);
    assert.equal(String((err as { code?: unknown }).code), "DB_UNAVAILABLE");
    return true;
  });
} else if (probe === "pool") {
  const require = createRequire(import.meta.url);
  const pg = require("pg") as typeof import("pg");
  const seen: Array<string | undefined> = [];
  const Original = pg.Pool;
  pg.Pool = class extends Original {
    constructor(config?: { connectionString?: string }) {
      seen.push(config?.connectionString);
      super(config);
    }
  };

  const { dbSource, getSql } = await import("./db.ts");
  assert.equal(dbSource, "postgres");
  const sql = await getSql();
  assert.equal(typeof sql, "function");
  assert.equal(typeof sql.query, "function");
  assert.deepEqual(seen, [process.env.EXPECT_URL]);
  process.exit(0);
} else {
  const file = new URL("./db-unavailable.test.ts", import.meta.url).pathname;

  function runProbe(env: Record<string, string | undefined>) {
    return spawnSync(process.execPath, ["--experimental-strip-types", file], {
      env: {
        ...process.env,
        ...env,
      },
      encoding: "utf8",
      timeout: 20000,
    });
  }

  test("serverless without a Postgres URL does not open PGLite", () => {
    const result = runProbe({
      PROBE_DB: "1",
      VERCEL: "1",
      VERCEL_ENV: "production",
      DATABASE_URL: "",
      SUPABASE_DB_URL: "",
      SUPABASE_DIRECT_CONNECTION_STRING: "",
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /pglite\.data/);
    assert.doesNotMatch(output, /PGLite bootstrap failed/);
    assert.doesNotMatch(output, /Unhandled Rejection/);
  });

  test("DATABASE_URL selects the pg Pool ahead of sister aliases", () => {
    const result = runProbe({
      PROBE_DB: "pool",
      VERCEL: "1",
      DATABASE_URL: "postgres://primary/lpl",
      SUPABASE_DB_URL: "postgres://alias/lpl",
      SUPABASE_DIRECT_CONNECTION_STRING: "postgres://direct/lpl",
      EXPECT_URL: "postgres://primary/lpl",
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /pglite\.data/);
    assert.doesNotMatch(output, /PGLite bootstrap failed/);
  });

  test("SUPABASE_DB_URL selects the pg Pool when DATABASE_URL is empty", () => {
    const result = runProbe({
      PROBE_DB: "pool",
      VERCEL: "1",
      DATABASE_URL: "  ",
      SUPABASE_DB_URL: "postgres://alias/lpl",
      SUPABASE_DIRECT_CONNECTION_STRING: "postgres://direct/lpl",
      EXPECT_URL: "postgres://alias/lpl",
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /pglite\.data/);
  });

  test("SUPABASE_DIRECT_CONNECTION_STRING selects the pg Pool last", () => {
    const result = runProbe({
      PROBE_DB: "pool",
      VERCEL: "1",
      DATABASE_URL: "",
      SUPABASE_DB_URL: "",
      SUPABASE_DIRECT_CONNECTION_STRING: "postgres://direct/lpl",
      EXPECT_URL: "postgres://direct/lpl",
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    assert.equal(result.status, 0, output);
  });
}
