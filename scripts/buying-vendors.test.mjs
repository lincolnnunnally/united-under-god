import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const NAME = new RegExp(["mes", "sen", "ger"].join(""), "i");
const DISCLOSURE =
  /United Under God retains these rebates to support the buying program and its service to churches/;

const PUBLIC_PAGES = [
  "src/routes/buying/index.tsx",
  "src/routes/buying/$category.tsx",
  "src/routes/buying/bids/$id.tsx",
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test("the disclosure line renders on /buying, each catalog page, and each bid page", () => {
  for (const page of PUBLIC_PAGES) {
    const source = read(page);
    assert.match(source, /import \{ FeeDisclosure \} from "@\/components\/fee-disclosure"/, page);
    assert.match(source, /<FeeDisclosure\b/, `${page} renders the disclosure`);
  }
  const component = read("src/components/fee-disclosure.tsx");
  assert.match(component, /\{FEE_DISCLOSURE\}/);
  assert.match(component, /to="\/buying\/vendor-terms"/);
  assert.match(read("src/lib/vendor-terms.ts"), DISCLOSURE);
});

test("the bid page is private: noindex, no referrer, nothing without the token", () => {
  const page = read("src/routes/buying/bids/$id.tsx");
  assert.match(page, /noindex: true/);
  assert.match(page, /name: "referrer", content: "no-referrer"/);
  assert.match(page, /view\.state === "denied"/);
  assert.match(page, /This bid is closed\./);
  assert.ok(!read("public/sitemap.xml").includes("/buying/bids"));
});

test("vendor pages keep the owner's copy rules", () => {
  const files = [
    "src/routes/buying/vendors.tsx",
    "src/routes/buying/vendor-terms.tsx",
    "src/routes/buying/bids/$id.tsx",
    "src/components/fee-disclosure.tsx",
    "src/lib/vendor-terms.ts",
    "src/lib/vendor-store.ts",
  ];
  const text = files.map(read).join("\n");
  assert.ok(!/\bAI\b/.test(text), "no 'AI'");
  assert.ok(!NAME.test(text), "never name the installer");
  assert.ok(!/\blowest\b|\bcheapest\b|best price|save up to/i.test(text), "no lowest-price claims");
  assert.ok(!/\bmembers?(hip)?\b/i.test(text), "no 'membership' or 'members'");
  // Rates come from the config, not from page copy.
  for (const page of files.filter(
    (f) => f.startsWith("src/routes") || f.startsWith("src/components"),
  )) {
    assert.ok(!/\d\s?%/.test(read(page)), `${page} hard-codes a rate`);
  }
});

test("vendor sign-up uses the repo's honeypot and records the terms version", () => {
  const page = read("src/routes/buying/vendors.tsx");
  assert.match(page, /absolute -left-\[9999px\]/);
  assert.match(page, /tabIndex=\{-1\}/);
  assert.match(page, /hp: value\("fax"\)/);
  assert.match(page, /termsVersion: VENDOR_TERMS_VERSION/);
  assert.match(page, /I agree to the\{" "\}/);
  assert.match(page, /LICENSED_VENDOR_NOTE/);
});

test("the migration is additive and idempotent", () => {
  const sqlText = read("migrations/0007_source_vendors.sql")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  // "on delete cascade" on a foreign key is not a delete.
  const statements = sqlText.replace(/on delete cascade/gi, "");
  assert.ok(!/\b(drop|rename|truncate|delete|update)\b/i.test(statements), "nothing destructive");
  assert.ok(!/alter\s+column/i.test(sqlText), "no retyping");
  for (const stmt of sqlText
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    assert.match(stmt, /if not exists/i, `not idempotent: ${stmt.slice(0, 60)}`);
  }
});

test("built pages carry the disclosure and keep the rules", (t) => {
  const built = walk(join(ROOT, ".vercel/output")).filter(
    (f) => !f.includes("/_libs/") && /\.(m?js|html|json)$/.test(f),
  );
  if (!built.length) return t.skip("no build output");
  const chunks = built.filter((f) => DISCLOSURE.test(readFileSync(f, "utf8")));
  assert.ok(chunks.length > 0, "build output has the disclosure line");
  for (const file of chunks)
    assert.ok(!NAME.test(readFileSync(file, "utf8")), `${file} names the installer`);
});
