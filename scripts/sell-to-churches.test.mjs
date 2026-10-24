import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { STATIC_PATHS, sourcesFor } from "./sitemap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const PAGE = "src/routes/buying/sell-to-churches.tsx";
const COPY = "src/lib/sell-to-churches.ts";
const NAME = new RegExp(["mes", "sen", "ger"].join(""), "i");

test("the vendor program page is in the sitemap with its own sources", () => {
  assert.ok(STATIC_PATHS.includes("/buying/sell-to-churches"));
  assert.ok(sourcesFor("/buying/sell-to-churches").includes(PAGE));
  assert.ok(
    read("public/sitemap.xml").includes(
      "<loc>https://www.unitedundergod.org/buying/sell-to-churches</loc>",
    ),
  );
});

test("the page is linked from /buying, /buying/vendors, /organizations and the footer", () => {
  for (const file of [
    "src/routes/buying/index.tsx",
    "src/routes/buying/vendors.tsx",
    "src/routes/organizations.tsx",
    "src/components/site-footer.tsx",
  ]) {
    assert.match(read(file), /to="\/buying\/sell-to-churches"/, file);
  }
});

test("the page has unique search metadata and both JSON-LD blocks", () => {
  const page = read(PAGE);
  const copy = read(COPY);
  assert.match(copy, /SELL_TITLE = "Sell to churches/);
  assert.match(copy, /church supplier/i);
  assert.match(page, /serviceJsonLd\(/);
  assert.match(page, /faqJsonLd\(sellFaq\(/);
  assert.match(page, /path: SELL_PATH/);
  const titles = [
    ...read("src/routes/buying/vendors.tsx").matchAll(/title: "([^"]+)"/g),
    ...read("src/routes/buying/index.tsx").matchAll(/title: "([^"]+)"/g),
  ].map((m) => m[1]);
  assert.ok(!titles.some((t) => t.startsWith("Sell to churches")), "title is unique");
});

test("the page and its copy keep the owner's rules", () => {
  const text = `${read(PAGE)}\n${read(COPY)}\n${read("src/lib/church-market.ts")}`;
  const words = text.replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, ""); // rules in comments name the banned words
  assert.ok(!/\bAI\b/.test(words), "no 'AI'");
  assert.ok(!NAME.test(text), "never name the installer");
  assert.ok(!/\bmembers?(hip)?\b/i.test(words), "no 'members'");
  assert.ok(!/\bcustomers?\b/i.test(words), "no 'customers'");
  assert.ok(!/\blowest\b|\bcheapest\b|guaranteed?|\bleads\b/i.test(words), "no promises");
  // Rates come from the config, not from page copy.
  assert.ok(!/\d\s?%/.test(read(PAGE)), "page hard-codes a rate");
  assert.ok(!/\d\s?%/.test(read(COPY)), "copy hard-codes a rate");
  assert.match(read(PAGE), /FEES\.rebate\.percent/);
  assert.match(read(COPY), /config\.rebate\.percent/);
  assert.match(read(COPY), /config\.referral\.percent/);
  // The covenant is only described in general terms until its PR lands.
  assert.ok(!/Vendor Covenant/.test(words));
  assert.match(read(COPY), /covenant to make it right/);
});

test("numbers hide when the database is unavailable; testimonials hide while empty", () => {
  const page = read(PAGE);
  assert.match(page, /\{market \? <ServiceArea market=\{market\} \/> : null\}/);
  assert.match(page, /\{market \? \(/, "hero number only with a market read");
  assert.match(page, /TESTIMONIALS[^=]*= \[\];/);
  assert.match(page, /\{TESTIMONIALS\.length \? <Testimonials \/> : null\}/);
  assert.match(page, /approvedVendors > 0/, "zero vendors is hidden");
});
