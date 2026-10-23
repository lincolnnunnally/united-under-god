#!/usr/bin/env node
/**
 * Writes public/sitemap.xml: every public, indexable page on the production
 * host (the apex 308s to www). Private pages (/login, /account, /admin,
 * /buying/desk, /give/thanks) and redirects (/donate) stay out on purpose.
 *
 *   node scripts/sitemap.mjs          # rewrite public/sitemap.xml
 *   node scripts/sitemap.mjs --check  # exit 1 if it is out of date
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_URL = "https://www.unitedundergod.org";

export const STATIC_PATHS = [
  "/",
  "/apps",
  "/organizations",
  "/join",
  "/give",
  "/mission",
  "/happenings",
  "/pantry",
  "/food-donors",
  "/buying",
  "/church-av",
  "/assessment",
  "/bible",
  "/doctrine",
  "/privacy",
  "/terms",
];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function biblePaths(root = ROOT) {
  const library = JSON.parse(readFileSync(join(root, "src/data/bible-library.json"), "utf8"));
  return library.questions.map((q) => `/bible/${q.slug}`);
}

export function renderSitemap(paths) {
  const urls = paths
    .map((path) => `  <url><loc>${SITE_URL}${path === "/" ? "/" : path}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildSitemap(root = ROOT) {
  return renderSitemap([...STATIC_PATHS, ...biblePaths(root)]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const target = join(ROOT, "public/sitemap.xml");
  const next = buildSitemap();
  if (process.argv.includes("--check")) {
    const current = readFileSync(target, "utf8");
    if (current !== next) {
      console.error("public/sitemap.xml is out of date. Run: node scripts/sitemap.mjs");
      process.exit(1);
    }
  } else {
    writeFileSync(target, next);
    console.log(`wrote ${target}`);
  }
}
