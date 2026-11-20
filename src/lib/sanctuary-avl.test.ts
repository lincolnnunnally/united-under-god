import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  AVL_ORIGIN,
  avlInputPath,
  avlOutputPath,
  avlUrl,
  isAvlHost,
  isAvlPath,
  movedChurchAvUrl,
} from "./sanctuary-avl-host.ts";
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

// Owner (2026-11-20): Sanctuary AVL is the main site; /church-av pages it covers redirect there.
const MOVED = JSON.parse(
  readFileSync(new URL("../data/church-av-moved.json", import.meta.url), "utf8"),
) as { origin: string; moved: Record<string, string> };
const HELP_SLUGS = [
  ...readFileSync(new URL("./church-av-help.ts", import.meta.url), "utf8").matchAll(/slug: "([^"]+)"/g),
].map((m) => m[1]);

test("every moved /church-av page lands on a real Sanctuary AVL page", () => {
  assert.equal(MOVED.origin, AVL_ORIGIN);
  const live = new Set(avlPaths(HELP_SLUGS).map((p) => avlOutputPath(p)));
  for (const [from, to] of Object.entries(MOVED.moved)) {
    assert.ok(from === "/church-av" || from.startsWith("/church-av/"), from);
    assert.ok(live.has(to), `${from} -> ${to} is not a Sanctuary AVL page`);
  }
  for (const slug of HELP_SLUGS) assert.ok(MOVED.moved[`/church-av/help/${slug}`], `help page ${slug} did not move`);
});

test("the planner, the LED wall bids page and the town pages stay on www", () => {
  for (const path of ["/church-av/planner", "/church-av/planner/summary", "/church-av/led-wall", "/church-av/georgia", "/church-av/florida/tampa"])
    assert.equal(movedChurchAvUrl(path, MOVED), "", path);
});

test("a moved page maps with or without a trailing slash", () => {
  assert.equal(movedChurchAvUrl("/church-av", MOVED), "https://sanctuaryavl.unitedundergod.org/");
  assert.equal(movedChurchAvUrl("/church-av/", MOVED), "https://sanctuaryavl.unitedundergod.org/");
  assert.equal(
    movedChurchAvUrl("/church-av/help/cant-hear-in-the-back/", MOVED),
    "https://sanctuaryavl.unitedundergod.org/help/cant-hear-in-the-back",
  );
  assert.equal(movedChurchAvUrl("/", MOVED), "");
});
