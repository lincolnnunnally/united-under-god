import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildSitemap, sourcesFor, STATIC_PATHS } from "./sitemap.mjs";

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

test("every sitemap URL carries a real, non-future lastmod from its own sources", () => {
  const xml = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
  const urls = [...xml.matchAll(/<url>(.*?)<\/url>/g)].map((m) => m[1]);
  const today = new Date().toISOString().slice(0, 10);
  for (const url of urls) {
    const path = url.match(/<loc>https:\/\/www\.unitedundergod\.org([^<]*)<\/loc>/)[1] || "/";
    const lastmod = url.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
    if (sourcesFor(path).length) assert.ok(lastmod, `no lastmod: ${url}`);
    if (lastmod) assert.ok(lastmod[1] <= today, `future lastmod: ${url}`);
  }
  for (const path of STATIC_PATHS) {
    assert.ok(sourcesFor(path).length > 0, `no source files for ${path}`);
  }
});
