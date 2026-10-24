import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const NAME = new RegExp(["mes", "sen", "ger"].join(""), "i");

/** Public pages a church sees. None may read a case. */
const PUBLIC_PAGES = [
  "src/routes/buying/index.tsx",
  "src/routes/buying/$category.tsx",
  "src/routes/buying/vendor-terms.tsx",
  "src/routes/buying/vendors.tsx",
  "src/routes/buying/report.tsx",
];

/** Private pages behind an emailed link. */
const PRIVATE_PAGES = [
  "src/routes/buying/cases/$id.tsx",
  "src/routes/buying/mediate/$id.tsx",
  "src/routes/buying/covenant.tsx",
];

const NEW_FILES = [
  "src/lib/case-store.ts",
  "src/lib/case-actions.ts",
  "src/components/report-problem.tsx",
  "src/components/vendor-covenant.tsx",
  "src/components/source-cases.tsx",
  ...PUBLIC_PAGES,
  ...PRIVATE_PAGES,
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test("the covenant renders on the Vendor Terms page, ahead of the rest", () => {
  const page = read("src/routes/buying/vendor-terms.tsx");
  assert.match(page, /import \{ CovenantBlock \} from "@\/components\/vendor-covenant"/);
  assert.match(page, /section\.covenant \?/);
  assert.match(page, /<CovenantBlock\b/);
  assert.match(page, /<ReportProblemLink\b/);
  const block = read("src/components/vendor-covenant.tsx");
  assert.match(block, /id="covenant"/);
  assert.match(block, /section\.points/);
  // The disclosure line still renders on church pages.
  for (const page of ["src/routes/buying/index.tsx", "src/routes/buying/$category.tsx"]) {
    assert.match(read(page), /<FeeDisclosure\b/, page);
  }
});

test("'Report a problem' is linked from /buying, every catalog page, and the covenant", () => {
  for (const page of [
    "src/routes/buying/index.tsx",
    "src/routes/buying/$category.tsx",
    "src/routes/buying/vendor-terms.tsx",
  ]) {
    const source = read(page);
    assert.match(source, /import \{[^}]*ReportProblemLink[^}]*\} from "@\/components\/report-problem"/, page);
    assert.match(source, /<ReportProblemLink\b/, page);
  }
  const link = read("src/components/report-problem.tsx");
  assert.match(link, /to="\/buying\/report"/);
  assert.match(link, /If a program vendor doesn’t make it right, tell us\. We will hear it and see it through\./);
  assert.ok(read("public/sitemap.xml").includes("/buying/report"));
});

test("the sign-up checkbox and the re-acceptance page say 'Vendor Covenant and Vendor Terms'", () => {
  const signup = read("src/routes/buying/vendors.tsx");
  assert.match(signup, /I agree to the\{" "\}/);
  assert.match(signup, /Vendor Covenant\n\s*<\/Link>\{" "\}\n\s*and\{" "\}/);
  assert.match(read("src/routes/buying/covenant.tsx"), /\{AGREE_LABEL\}/);
});

test("the report form uses the repo's honeypot", () => {
  const page = read("src/routes/buying/report.tsx");
  assert.match(page, /absolute -left-\[9999px\]/);
  assert.match(page, /tabIndex=\{-1\}/);
  assert.match(page, /hp: value\("fax"\)/);
  assert.match(read("src/lib/case-actions.ts"), /if \(data\.hp\) return \{ ok: true, saved: true, emailed: false \}/);
  assert.match(read("src/lib/case-actions.ts"), /sendHardcodedOwnerEmail/);
});

test("private pages are noindex, send no referrer, and stay out of the sitemap", () => {
  const sitemap = read("public/sitemap.xml");
  for (const page of PRIVATE_PAGES) {
    const source = read(page);
    assert.match(source, /noindex: true/, page);
    assert.match(source, /name: "referrer", content: "no-referrer"/, page);
    assert.match(source, /view\.state === "denied"/, page);
  }
  for (const path of ["/buying/cases", "/buying/mediate", "/buying/covenant"]) {
    assert.ok(!sitemap.includes(path), path);
  }
});

test("no case details on public pages: they never read a case", () => {
  for (const page of PUBLIC_PAGES.filter((p) => p !== "src/routes/buying/report.tsx")) {
    const source = read(page);
    assert.ok(!/case-store|case-actions|readCases|CaseRow/.test(source), `${page} reads cases`);
  }
  // The report page only lists vendor names and submits; it reads no case.
  const report = read("src/routes/buying/report.tsx");
  assert.match(report, /import \{ listReportVendorsFn, submitReport \} from "@\/lib\/case-actions"/);
  assert.ok(!/readCases|readVendorCase|readMediatorCase/.test(report));
  // The one public standing fact is the covenant line.
  const badge = read("src/components/report-problem.tsx");
  assert.match(badge, /Stands behind the\{" "\}/);
  assert.match(read("src/lib/source-store.ts"), /covenant: standing\.get/);
  assert.ok(!/church_name|source_cases/.test(read("src/lib/source-store.ts")), "the book never joins cases");
});

test("new copy keeps the owner's rules", () => {
  const text = NEW_FILES.map(read).join("\n");
  assert.ok(!/\bAI\b/.test(text), "no 'AI'");
  assert.ok(!NAME.test(text), "never name the installer");
  assert.ok(!/guarantee/i.test(text), "no guaranteed refunds");
  assert.ok(!/legal advice/i.test(text.replace(/It is not legal advice\./g, "")), "no legal advice");
  for (const page of PUBLIC_PAGES) {
    // Import paths (e.g. member-actions) are code, not copy.
    const copy = read(page)
      .split("\n")
      .filter((line) => !line.startsWith("import "))
      .join("\n");
    assert.ok(!/\bmembers?(hip)?\b/i.test(copy), `${page} says members`);
  }
  assert.ok(!/\bmembers?(hip)?\b/i.test(read("src/lib/case-store.ts")));
  // The response window comes from config, not page copy.
  assert.ok(!/\b2 business/.test(read("src/routes/buying/report.tsx")));
});

test("migration 0008 is additive and idempotent", () => {
  const sqlText = read("migrations/0008_source_vendor_cases.sql")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = sqlText.replace(/on delete cascade/gi, "");
  assert.ok(!/\b(drop|rename|truncate|delete|update)\b/i.test(statements), "nothing destructive");
  assert.ok(!/alter\s+column/i.test(sqlText), "no retyping");
  for (const stmt of sqlText
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    assert.match(stmt, /if not exists/i, `not idempotent: ${stmt.slice(0, 60)}`);
  }
  for (const table of [
    "source_cases",
    "source_case_events",
    "source_committee",
    "source_case_mediators",
    "source_covenant_links",
  ]) {
    assert.match(sqlText, new RegExp(`create table if not exists ${table} \\(`), table);
  }
  // Tokens: only hashes are stored.
  assert.ok(!/\btoken text\b/.test(sqlText));
});

test("built pages carry the covenant and the report link, and keep the rules", (t) => {
  const built = walk(join(ROOT, ".vercel/output")).filter(
    (f) => !f.includes("/_libs/") && /\.(m?js|html|json)$/.test(f),
  );
  if (!built.length) return t.skip("no build output");
  const all = built.map((f) => readFileSync(f, "utf8"));
  assert.ok(all.some((s) => s.includes("Accept United Under God’s resolution.")), "covenant in build");
  assert.ok(all.some((s) => s.includes("We will hear it and see it through.")), "report link in build");
});
