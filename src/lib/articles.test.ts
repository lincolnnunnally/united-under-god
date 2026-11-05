import assert from "node:assert/strict";
import { test } from "node:test";
import { articleTitle, formatArticleDate, TITLE_MAX } from "./articles.ts";

test("short titles keep the brand", () => {
  assert.equal(articleTitle("Why Unity Takes Work"), "Why Unity Takes Work | United Under God");
});

test("titles never pass 65 characters", () => {
  const long = "What it looks like when every church in a small town decides to work together for its neighbors";
  for (const t of [long, "x".repeat(50), "y".repeat(65), "z".repeat(200)]) {
    assert.ok(articleTitle(t).length <= TITLE_MAX, articleTitle(t));
  }
  assert.equal(articleTitle("y".repeat(65)), "y".repeat(65));
  assert.ok(articleTitle(long).endsWith("…"));
});

test("dates read in UTC", () => {
  assert.equal(formatArticleDate("2026-11-05T02:00:00Z"), "November 5, 2026");
  assert.equal(formatArticleDate("nope"), "");
});
