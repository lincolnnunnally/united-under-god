import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildSitemap, buyingPaths, sourcesFor } from "./sitemap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const list = JSON.parse(read("src/data/church-spend.json"));
// The installer's name, assembled so this file does not contain it either.
const NAME = new RegExp(["mes", "sen", "ger"].join(""), "i");

// Every file that renders the buying catalogs and the spend list.
const SOURCES = [
  "src/data/church-spend.json",
  "src/lib/church-spend.ts",
  "src/routes/buying/$category.tsx",
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test("every catalog page is in the sitemap with its own sources", () => {
  const xml = buildSitemap();
  const paths = buyingPaths();
  assert.equal(paths.length, list.categories.filter((c) => !c.route).length);
  for (const path of paths) {
    assert.ok(xml.includes(`<loc>https://www.unitedundergod.org${path}</loc>`), `${path} missing`);
    assert.ok(sourcesFor(path).includes("src/routes/buying/$category.tsx"));
  }
  assert.ok(existsSync(join(ROOT, "src/routes/buying/$category.tsx")));
});

test("the AV category has no catalog page; it goes to /church-av", () => {
  const av = list.categories.find((c) => c.id === "audio-visual");
  assert.equal(av.route, "/church-av");
  assert.ok(!buyingPaths().includes("/buying/audio-visual"));
  assert.match(read("src/routes/buying/$category.tsx"), /category\.route\) throw redirect/);
});

test("the four original /buying cards are still there", () => {
  const page = read("src/routes/buying/index.tsx");
  for (const title of [
    "Toner and printers",
    "Software you don’t pay for twice",
    "Surplus that becomes supply",
    "Sound, livestream & lighting",
  ]) {
    assert.ok(page.includes(`title: "${title}"`), `missing card ${title}`);
  }
  assert.match(page, /<CatalogDirectory \/>/);
  assert.match(page, /groupBookByCategory\(entries\)/);
});

test("catalog copy keeps the owner's rules", () => {
  const text = SOURCES.map(read).join("\n");
  assert.ok(!/\bfree\b/i.test(text), "no 'free' (the 'no fee' line is enough)");
  assert.ok(!/\bAI\b/.test(text), "no 'AI'");
  assert.ok(!NAME.test(text), "never name the installer");
  assert.ok(!/\blowest\b|\bcheapest\b|best price|guarantee/i.test(text), "no lowest-price claims");
  assert.ok(!/\d\s?%|\bpercent\b|save up to/i.test(text), "no discount amounts");
  assert.ok(!/lead[- ]fee|referral fee|finder'?s fee|commission/i.test(text), "no lead-fee language");
  assert.ok(!/legally required|required by law|ADA requires/i.test(text), "no legal-duty claims");
  // "membership" is allowed since 2026-10-24 (owner: the paid member church
  // program). The catalog pages gate vendor details and prices behind it;
  // see scripts/membership.test.mjs.
  // No hard-coded dollar amounts: a price on the page comes from the buying book.
  assert.ok(!/\$\s?\d/.test(text), "no dollar amounts in catalog sources");
});

test("catalog pages say pricing comes from bids", () => {
  const page = read("src/routes/buying/$category.tsx");
  assert.match(page, /Group pricing comes from bids/);
  assert.match(page, /Not bid yet/);
  assert.match(page, /so we can include you in the next bid/);
  assert.match(page, /<InvolvementForm\s+intent="buying"/);
});

test("built catalog pages keep the rules", (t) => {
  const built = walk(join(ROOT, ".vercel/output")).filter(
    (f) => !f.includes("/_libs/") && /\.(m?js|html|json)$/.test(f),
  );
  if (!built.length) return t.skip("no build output");
  const chunks = built.filter((f) => readFileSync(f, "utf8").includes("Group pricing comes from bids"));
  assert.ok(chunks.length > 0, "build output has no catalog page chunk");
  for (const file of chunks) {
    const text = readFileSync(file, "utf8");
    assert.ok(!NAME.test(text), `${file} names the installer`);
  }
});
