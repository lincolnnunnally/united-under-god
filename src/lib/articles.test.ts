import assert from "node:assert/strict";
import { test } from "node:test";
import {
  articleTitle,
  formatArticleDate,
  publishedRule,
  TITLE_MAX,
  withFallback,
  withoutSlugs,
} from "./articles.ts";

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

test("the public-row rule binds the app key and states the publish time", () => {
  const rule = publishedRule("$1");
  assert.match(rule, /app = \$1/);
  assert.match(rule, /status = 'published'/);
  assert.match(rule, /coalesce\(published_at, publish_at\) <= now\(\)/);
  assert.doesNotMatch(rule, /'uug'|'sanctuary-avl'/);
});

test("a library read falls back on failure or when it is slow", async () => {
  assert.deepEqual(await withFallback(Promise.resolve([1]), 50, []), [1]);
  assert.deepEqual(await withFallback(Promise.reject(new Error("db down")), 50, []), []);
  const slow = new Promise<number[]>((resolve) => setTimeout(() => resolve([2]), 500));
  assert.equal(await withFallback(slow, 20, null), null);
});

test("hand-written guides win a slug clash", () => {
  const rows = [{ slug: "church-av-cost" }, { slug: "new-guide" }, { slug: "" }];
  assert.deepEqual(withoutSlugs(rows, ["church-av-cost"]), [{ slug: "new-guide" }]);
});
