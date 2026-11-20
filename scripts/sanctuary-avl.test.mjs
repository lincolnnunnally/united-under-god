import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// Every file that renders Sanctuary AVL.
const SOURCES = [
  ...walk(join(ROOT, "src/routes/avl")),
  join(ROOT, "src/components/sanctuary-avl.tsx"),
  join(ROOT, "src/lib/sanctuary-avl.ts"),
  join(ROOT, "src/lib/sanctuary-avl-host.ts"),
  join(ROOT, "server/middleware/sanctuary-avl.ts"),
];
const text = SOURCES.map((f) => readFileSync(f, "utf8")).join("\n");

test("Sanctuary AVL never names a partner company", () => {
  // Owner, 2026-11-20: churches must not see who we partner with.
  const NAME = new RegExp(["mes", "sen", "ger"].join(""), "i");
  for (const f of SOURCES) assert.ok(!NAME.test(readFileSync(f, "utf8")), `${f} names a partner`);
});

test("Sanctuary AVL copy keeps the owner's rules", () => {
  assert.ok(!/\bfree\b/i.test(text), "no 'free'");
  assert.ok(!/\bAI\b/.test(text), "no 'AI'");
  assert.ok(!/\bguarantee/i.test(text), "no guarantees");
  assert.ok(!/first page of Google|#1\b|number one/i.test(text), "no ranking promises");
});

test("every ballpark price sits next to the note that it is not a quote", () => {
  const lib = readFileSync(join(ROOT, "src/lib/sanctuary-avl.ts"), "utf8");
  assert.match(lib, /BALLPARK_NOTE =\s*\n?\s*"Ballpark ranges for planning only, not a quote/);
  const comp = readFileSync(join(ROOT, "src/components/sanctuary-avl.tsx"), "utf8");
  assert.match(comp, /function PriceTable[\s\S]*\{BALLPARK_NOTE\}/);
  // Prices are printed only through the shared table, never typed into a page.
  for (const f of walk(join(ROOT, "src/routes/avl"))) {
    assert.ok(!/\$\s?\d/.test(readFileSync(f, "utf8")), `${f} types a dollar amount`);
  }
});

test("the request form posts the church AV inquiry and says who sent it", () => {
  const comp = readFileSync(join(ROOT, "src/components/sanctuary-avl.tsx"), "utf8");
  assert.match(comp, /intent="av"/);
  assert.match(comp, /label: `Sanctuary AVL \$\{label\}`/);
  const confirm = readFileSync(join(ROOT, "src/lib/church-av-confirm.ts"), "utf8");
  assert.match(confirm, /\^Sent from: Sanctuary AVL/);
});

test("the subdomain sitemap is listed in robots.txt", () => {
  assert.match(
    readFileSync(join(ROOT, "public/robots.txt"), "utf8"),
    /^Sitemap: https:\/\/sanctuaryavl\.unitedundergod\.org\/sitemap-avl\.xml$/m,
  );
});
