import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

if (process.env.PROBE_DB === "1") {
  const { dbSource, getSql } = await import("./db.ts");
  assert.equal(dbSource, "pglite");
  await assert.rejects(getSql(), (err: unknown) => {
    assert.ok(err instanceof Error);
    assert.equal(err.name, "DbUnavailableError");
    assert.match(err.message, /not available/);
    assert.equal(String((err as { code?: unknown }).code), "DB_UNAVAILABLE");
    return true;
  });
} else {
  test("serverless without DATABASE_URL does not open PGLite", () => {
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", new URL("./db-unavailable.test.ts", import.meta.url).pathname],
      {
        env: {
          ...process.env,
          PROBE_DB: "1",
          VERCEL: "1",
          VERCEL_ENV: "production",
          DATABASE_URL: "",
        },
        encoding: "utf8",
        timeout: 20000,
      },
    );
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /pglite\.data/);
    assert.doesNotMatch(output, /PGLite bootstrap failed/);
    assert.doesNotMatch(output, /Unhandled Rejection/);
  });
}
