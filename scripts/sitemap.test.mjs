import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildSitemap, STATIC_PATHS } from "./sitemap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("public/sitemap.xml matches scripts/sitemap.mjs", () => {
  assert.equal(readFileSync(join(ROOT, "public/sitemap.xml"), "utf8"), buildSitemap());
});

test("every sitemap page has a route file", () => {
  const routes = join(ROOT, "src/routes");
  for (const path of STATIC_PATHS) {
    if (path === "/") continue;
    const name = path.slice(1);
    const found =
      existsSync(join(routes, `${name}.tsx`)) || existsSync(join(routes, name, "index.tsx"));
    assert.ok(found, `no route for ${path}`);
  }
  assert.ok(readdirSync(join(routes, "bible")).includes("$slug.tsx"));
});

test("robots.txt points at the www sitemap and blocks nothing public", () => {
  const robots = readFileSync(join(ROOT, "public/robots.txt"), "utf8");
  assert.match(robots, /Sitemap: https:\/\/www\.unitedundergod\.org\/sitemap\.xml/);
  for (const path of STATIC_PATHS) {
    assert.ok(!robots.includes(`Disallow: ${path}\n`), `robots blocks ${path}`);
  }
});
