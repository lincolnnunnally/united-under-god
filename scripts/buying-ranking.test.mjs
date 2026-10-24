import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildSitemap, sourcesFor } from "./sitemap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const NAME = new RegExp(["mes", "sen", "ger"].join(""), "i");
const DISCLOSURE =
  "Preferred status considers each vendor's service record, price, and support for the program.";

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const SOURCE_FILES = walk(join(ROOT, "src")).filter((f) => /\.(tsx?|mts)$/.test(f));

/** Private pages behind an emailed link or a session. */
const PRIVATE_PAGES = ["src/routes/buying/portal.tsx", "src/routes/buying/review/$id.tsx"];

const NEW_COPY = [
  "src/routes/buying/how-vendors-are-ranked.tsx",
  "src/routes/buying/portal.tsx",
  "src/routes/buying/review/$id.tsx",
  "src/routes/buying/vendor/$id.tsx",
  "src/components/catalog-vendors.tsx",
  "src/components/vendor-ranking.tsx",
  "src/components/vendor-portal.tsx",
  "src/components/source-program.tsx",
  "src/lib/vendor-rank.ts",
  "src/lib/review-store.ts",
  "src/lib/vendor-portal-store.ts",
  "src/lib/vendor-broadcast.ts",
  "src/lib/vendor-files.ts",
  "src/lib/vendor-listing.ts",
];

test("the disclosure renders wherever the Preferred badge appears", () => {
  assert.match(read("src/lib/vendor-rank.ts"), new RegExp(DISCLOSURE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const badge = read("src/components/vendor-ranking.tsx");
  assert.match(badge, /\{RANKING_DISCLOSURE\}/);
  assert.match(badge, /to="\/buying\/how-vendors-are-ranked"/, "the disclosure links to the explanation");
  const users = SOURCE_FILES.filter((file) => /<PreferredBadge\b/.test(readFileSync(file, "utf8")));
  assert.ok(users.length >= 3, "the badge is used on the catalog, the profile, and the portal");
  for (const file of users) {
    assert.match(readFileSync(file, "utf8"), /<RankingDisclosure\b/, `${relative(ROOT, file)} shows Preferred without the disclosure`);
  }
  // Ranked lists (score lines) carry it too.
  for (const file of SOURCE_FILES.filter((f) => /<ScoreLine\b/.test(readFileSync(f, "utf8")))) {
    assert.match(readFileSync(file, "utf8"), /<RankingDisclosure\b/, `${relative(ROOT, file)} ranks without the disclosure`);
  }
  // The word itself only appears in copy next to the disclosure.
  for (const file of SOURCE_FILES.filter((f) => f.endsWith(".tsx"))) {
    const source = readFileSync(file, "utf8");
    if (/>\s*Preferred\s*</.test(source)) {
      assert.ok(file.endsWith("vendor-ranking.tsx"), `${relative(ROOT, file)} writes its own Preferred label`);
    }
  }
});

test("catalog pages get one vendor section, fed by the gated loader", () => {
  const page = read("src/routes/buying/$category.tsx");
  assert.match(page, /import \{ CatalogVendors \} from "@\/components\/catalog-vendors"/);
  assert.equal(page.match(/<CatalogVendors\b/g)?.length, 1);
  assert.match(page, /readCatalogVendorsFn\(\{ data: \{ categoryId: category\.id \} \}\)/, "read in the loader, on the server");
  assert.match(page, /read=\{vendors\}/);
  assert.ok(!/useEffect/.test(read("src/components/catalog-vendors.tsx")), "no unguarded client fetch");
  assert.match(read("src/components/catalog-vendors.tsx"), /<BecomeMemberCta\b/);
  assert.ok(!/readCatalogVendors\(|vendor-rank|source_cases|case-store/.test(page), "no ungated vendor read");
  const section = read("src/components/catalog-vendors.tsx");
  assert.match(section, /<RankingDisclosure\b/);
  assert.match(section, /<PreferredBadge \/>/);
  // No fee amounts or fee words on a church page.
  assert.ok(!/\d\s?%|\bpercent\b|referral fee|rebate/i.test(section));
});

test("the explanation page is public, in the sitemap, and says what the owner decided", () => {
  const page = read("src/routes/buying/how-vendors-are-ranked.tsx");
  assert.ok(buildSitemap().includes("https://www.unitedundergod.org/buying/how-vendors-are-ranked<"));
  assert.ok(read("public/sitemap.xml").includes("/buying/how-vendors-are-ranked<"));
  assert.ok(sourcesFor("/buying/how-vendors-are-ranked").includes("src/routes/buying/how-vendors-are-ranked.tsx"));
  assert.ok(!/noindex/.test(page));
  assert.match(page, /RANK_WEIGHTS\.service/);
  assert.match(page, /RANK_WEIGHTS\.price/);
  assert.match(page, /RANK_WEIGHTS\.support/);
  assert.match(page, /Fees count, but price counts more/);
  assert.match(page, /raises its prices to pay a higher\s+fee loses more on price than it gains/);
  assert.match(page, /Vendor Covenant/);
  assert.match(page, /Verified reviews only/);
  assert.match(page, /never for being negative/);
  assert.match(page, /not a promise of sales/);
  assert.match(page, /<RankingDisclosure\b/);
});

test("private pages are noindex, send no referrer, and stay out of the sitemap", () => {
  const sitemap = read("public/sitemap.xml");
  for (const page of PRIVATE_PAGES) {
    const source = read(page);
    assert.match(source, /noindex: true/, page);
    assert.match(source, /name: "referrer", content: "no-referrer"/, page);
  }
  assert.match(read("src/routes/buying/review/$id.tsx"), /view\.state === "denied"/);
  for (const path of ["/buying/portal", "/buying/review", "/buying/vendor/", "/api/vendor-files"]) {
    assert.ok(!sitemap.includes(path), path);
  }
  // The emailed sign-in link is spent by a button press (POST), not by opening it.
  const portal = read("src/routes/buying/portal.tsx");
  assert.match(portal, /redeemPortalLinkFn/);
  assert.match(read("src/lib/portal-actions.ts"), /redeemPortalLinkFn = createServerFn\(\{ method: "POST" \}\)/);
  assert.match(portal, /absolute -left-\[9999px\]/, "the sign-in form has the honeypot");
});

test("every vendor file read goes through canViewVendorFiles", () => {
  const gate = read("src/lib/vendor-file-access.ts");
  assert.match(gate, /export async function canViewVendorFiles\(\n?\s*request: Request \| null \| undefined/);
  // Member church or staff, through main's memberAccess; else only the owning vendor's portal session.
  assert.match(gate, /memberAccess\(request\)\)\.canView\) return true/);
  assert.match(gate, /portalVendorId\(request\)\) === options\.ownerVendorId/);
  assert.ok(!/return true;\s*\}\s*$/.test(gate.trim()), "not open to everyone any more");
  const route = read("src/routes/api/vendor-files/$id.ts");
  assert.match(route, /canViewVendorFiles\(request, \{ ownerVendorId: file\.vendorId \}\)/);
  assert.match(route, /fileHeaders\(file\)/);
  for (const file of SOURCE_FILES) {
    const rel = relative(ROOT, file);
    if (rel.startsWith("src/lib/vendor-files") || rel.endsWith(".test.ts")) continue;
    const source = readFileSync(file, "utf8");
    if (/\b(readServableFile|listVendorFiles)\(/.test(source) && !/canViewVendorFiles|canViewFiles/.test(source)) {
      assert.fail(`${rel} reads vendor files without canViewVendorFiles`);
    }
  }
  const actions = read("src/lib/public-vendor-actions.ts");
  assert.match(actions, /canViewVendorFiles\(await currentRequest\(\)\)/);
  assert.match(actions, /catalogVendorsForViewer\(await publicSql\(\), data\.categoryId, \{ member \}\)/);
  assert.match(actions, /vendorProfileForViewer\(await publicSql\(\), data\.vendorId, \{ member \}\)/);
});

test("migration 0010 is additive and idempotent", () => {
  const sqlText = read("migrations/0010_source_vendor_portal.sql")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = sqlText.replace(/on delete cascade/gi, "");
  assert.ok(!/\b(drop|rename|truncate|delete|update|insert)\b/i.test(statements), "nothing destructive");
  assert.ok(!/alter\s+column/i.test(sqlText), "no retyping");
  for (const stmt of sqlText
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    assert.match(stmt, /if not exists/i, `not idempotent: ${stmt.slice(0, 60)}`);
  }
  assert.ok(!/\btoken text\b/.test(sqlText), "only token hashes are stored");
  assert.match(sqlText, /content bytea/);
  // The membership work takes 0011; nothing else claims 0010.
  const numbered = readdirSync(join(ROOT, "migrations")).filter((f) => f.startsWith("0010_"));
  assert.deepEqual(numbered, ["0010_source_vendor_portal.sql"]);
});

test("new copy keeps the owner's rules", () => {
  for (const file of NEW_COPY) {
    const copy = read(file)
      .split("\n")
      .filter((line) => !line.startsWith("import "))
      .join("\n");
    assert.ok(!/\bAI\b/.test(copy), `${file}: no 'AI'`);
    assert.ok(!NAME.test(copy), `${file}: never name the installer`);
    assert.ok(!/\blowest\b|\bcheapest\b|best price|save up to|guarantee/i.test(copy), `${file}: no promises`);
    assert.ok(!/will (?:get|win|bring) (?:you )?(?:more )?(?:sales|jobs|work)/i.test(copy), `${file}: no promised sales`);
    if (file.startsWith("src/routes") || file.startsWith("src/components")) {
      assert.ok(!/\d\s?%/.test(copy), `${file} hard-codes a rate`);
    }
  }
});

test("built pages carry the disclosure and the ranking page", (t) => {
  const built = walk(join(ROOT, ".vercel/output")).filter(
    (f) => !f.includes("/_libs/") && /\.(m?js|html|json)$/.test(f),
  );
  if (!built.length) return t.skip("no build output");
  const all = built.map((f) => readFileSync(f, "utf8"));
  assert.ok(all.some((s) => s.includes(DISCLOSURE)), "disclosure in build");
  assert.ok(all.some((s) => s.includes("Fees count, but price counts more")), "ranking page in build");
  for (const text of all.filter((s) => s.includes(DISCLOSURE))) assert.ok(!NAME.test(text));
});
