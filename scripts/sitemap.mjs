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

/**
 * /church-av help pages, read from the slugs in src/lib/church-av-help.ts so
 * the sitemap cannot drift from the pages that exist.
 */
export function churchAvHelpPaths(root = ROOT) {
  const source = readFileSync(join(root, "src/lib/church-av-help.ts"), "utf8");
  const slugs = [...source.matchAll(/^ {4}slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
  return ["/church-av/help", ...slugs.map((slug) => `/church-av/help/${slug}`)];
}

/**
 * /church-av landing pages (one per worship style, one per outcome), read
 * from the slugs in src/lib/church-av-landing.ts.
 */
export function churchAvLandingPaths(root = ROOT) {
  const source = readFileSync(join(root, "src/lib/church-av-landing.ts"), "utf8");
  const slugs = [...source.matchAll(/^ {4}slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
  return slugs.map((slug) => `/church-av/${slug}`);
}

/**
 * /church-av state, city, help, and planner pages, from the same data the
 * routes render. The planner's per-church summary page is noindex and stays out.
 */
export function churchAvPaths(root = ROOT) {
  const av = JSON.parse(readFileSync(join(root, "src/data/church-av.json"), "utf8"));
  return [
    ...churchAvLandingPaths(root),
    "/church-av/planner",
    ...churchAvHelpPaths(root),
    ...av.states.map((s) => `/church-av/${s.slug}`),
    ...av.cities.map((c) => `/church-av/${c.state}/${c.slug}`),
  ];
}

export function renderSitemap(paths) {
  const urls = paths
    .map((path) => `  <url><loc>${SITE_URL}${path === "/" ? "/" : path}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildSitemap(root = ROOT) {
  return renderSitemap([...STATIC_PATHS, ...churchAvPaths(root), ...biblePaths(root)]);
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
