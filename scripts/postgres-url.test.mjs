import assert from "node:assert/strict";
import { test } from "node:test";
import { resolvePostgresConnectionString } from "./postgres-url.mjs";

test("DATABASE_URL wins over sister aliases", () => {
  assert.equal(
    resolvePostgresConnectionString({
      DATABASE_URL: "postgres://primary/lpl",
      SUPABASE_DB_URL: "postgres://alias/lpl",
      SUPABASE_DIRECT_CONNECTION_STRING: "postgres://direct/lpl",
    }),
    "postgres://primary/lpl",
  );
});

test("SUPABASE_DB_URL is used when DATABASE_URL is unset", () => {
  assert.equal(
    resolvePostgresConnectionString({
      DATABASE_URL: "   ",
      SUPABASE_DB_URL: "postgres://alias/lpl",
      SUPABASE_DIRECT_CONNECTION_STRING: "postgres://direct/lpl",
    }),
    "postgres://alias/lpl",
  );
});

test("SUPABASE_DIRECT_CONNECTION_STRING is the last fallback", () => {
  assert.equal(
    resolvePostgresConnectionString({
      DATABASE_URL: "",
      SUPABASE_DB_URL: undefined,
      SUPABASE_DIRECT_CONNECTION_STRING: "postgres://direct/lpl",
    }),
    "postgres://direct/lpl",
  );
});

test("no usable connection string stays unset", () => {
  assert.equal(
    resolvePostgresConnectionString({
      DATABASE_URL: " ",
      SUPABASE_DB_URL: "",
      SUPABASE_DIRECT_CONNECTION_STRING: "\n",
    }),
    undefined,
  );
  assert.equal(resolvePostgresConnectionString({}), undefined);
});
