import assert from "node:assert/strict";
import { test } from "node:test";
import { avlInputPath, avlOutputPath, avlUrl, isAvlHost, isAvlPath } from "./sanctuary-avl-host.ts";
import { GUIDES, ROOM_SIZES, avlPaths, rangeText } from "./sanctuary-avl.ts";

test("only the Sanctuary AVL host is rewritten", () => {
  assert.ok(isAvlHost("sanctuaryavl.unitedundergod.org"));
  assert.ok(isAvlHost("SanctuaryAVL.localhost:8080"));
  assert.ok(!isAvlHost("www.unitedundergod.org"));
  assert.ok(!isAvlHost("bible.unitedundergod.org"));
  assert.ok(!isAvlHost(undefined));
});

test("the subdomain's addresses map to /avl and back", () => {
  assert.equal(avlInputPath("/"), "/avl");
  assert.equal(avlInputPath("/guides/church-av-cost"), "/avl/guides/church-av-cost");
  assert.equal(avlInputPath("/avl/guides"), "/avl/guides");
  assert.equal(avlInputPath("/sitemap-avl.xml"), "/sitemap-avl.xml");
  assert.equal(avlInputPath("/api/cron/x"), "/api/cron/x");
  assert.equal(avlInputPath("/_serverFn/abc"), "/_serverFn/abc");
  assert.equal(avlOutputPath("/avl"), "/");
  assert.equal(avlOutputPath("/avl/sizes/multi-campus"), "/sizes/multi-campus");
  assert.equal(avlOutputPath("/avlx"), "/avlx");
  assert.ok(!isAvlPath("/avlx"));
  assert.equal(avlUrl("/avl"), "https://sanctuaryavl.unitedundergod.org/");
  assert.equal(avlUrl("/avl/guides/"), "https://sanctuaryavl.unitedundergod.org/guides");
});

test("room sizes and guides are complete and ranges read low to high", () => {
  for (const size of ROOM_SIZES) {
    for (const [low, high] of Object.values(size.ranges))
      assert.ok(low > 0 && low < high, size.slug);
    assert.ok(size.needs.length && size.first.length && size.typical.length, size.slug);
  }
  assert.equal(new Set(GUIDES.map((g) => g.slug)).size, GUIDES.length);
  assert.equal(rangeText([20000, 60000]), "$20,000 – $60,000");
  const paths = avlPaths(["cant-hear-in-the-back"]);
  assert.ok(paths.includes("/avl/guides/church-av-cost"));
  assert.ok(paths.includes("/avl/sizes/300-to-800-seats"));
  assert.ok(paths.includes("/avl/help/cant-hear-in-the-back"));
});
