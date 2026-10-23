#!/usr/bin/env node
/**
 * Writes public/sitemap.xml: every public, indexable page on the production
 * host (the apex 308s to www), each with the date its own source files last
 * changed. Private pages (/login, /account, /admin,
 * /buying/desk, /give/thanks) and redirects (/donate) stay out on purpose.
 *
 *   node scripts/sitemap.mjs          # rewrite public/sitemap.xml
 *   node scripts/sitemap.mjs --check  # exit 1 if it is out of date
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

/**
 * The files a page is built from. A page's <lastmod> is the last commit that
 * touched any of them, so it moves when that page's words change and not on
 * every deploy. Unknown paths return [] and get no <lastmod>.
 */
export function sourcesFor(path, root = ROOT) {
  const route = (name) => {
    const file = join("src/routes", `${name}.tsx`);
    const index = join("src/routes", name, "index.tsx");
    if (existsSync(join(root, file))) return file;
    if (existsSync(join(root, index))) return index;
    return null;
  };
  const av = ["src/data/church-av.json", "src/lib/church-av.ts", "src/components/church-av.tsx"];
  if (path === "/") return ["src/routes/index.tsx"];
  if (path.startsWith("/bible/")) return ["src/data/bible-library.json", "src/routes/bible/$slug.tsx"];
  if (path === "/church-av/help") return ["src/lib/church-av-help.ts", "src/routes/church-av/help/index.tsx"];
  if (path.startsWith("/church-av/help/")) return ["src/lib/church-av-help.ts", "src/routes/church-av/help/$slug.tsx"];
  if (path === "/church-av/planner") return ["src/lib/church-av-planner.ts", "src/routes/church-av/planner/index.tsx"];
  if (path === "/church-av") return [...av, "src/routes/church-av/index.tsx"];
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "church-av" && parts.length === 2) {
    const landing = route(`church-av/${parts[1]}`);
    if (landing) return ["src/lib/church-av-landing.ts", "src/components/church-av-landing.tsx", landing];
    return [...av, "src/routes/church-av/$state/index.tsx"];
  }
  if (parts[0] === "church-av" && parts.length === 3) return [...av, "src/routes/church-av/$state/$city.tsx"];
  const file = route(path.slice(1));
  return file ? [file] : [];
}

/** Date (YYYY-MM-DD) of the last commit touching `sources`, today if they have uncommitted edits, null without git. */
export function gitLastmod(sources, root = ROOT) {
  if (!sources.length) return null;
  try {
    const opts = { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] };
    const dirty = execFileSync("git", ["status", "--porcelain", "--", ...sources], opts).trim();
    if (dirty) return new Date().toISOString().slice(0, 10);
    const date = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...sources], opts).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  } catch {
    return null;
  }
}

/** <loc> -> <lastmod> already in public/sitemap.xml: the fallback when git history is missing (shallow clone, tarball). */
export function committedLastmods(root = ROOT) {
  const out = new Map();
  try {
    const xml = readFileSync(join(root, "public/sitemap.xml"), "utf8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) out.set(m[1], m[2]);
  } catch {
    /* no committed sitemap yet */
  }
  return out;
}

export function renderSitemap(paths, lastmodFor = () => null) {
  const urls = paths
    .map((path) => {
      const loc = `${SITE_URL}${path === "/" ? "/" : path}`;
      const lastmod = lastmodFor(path, loc);
      return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildSitemap(root = ROOT) {
  const committed = committedLastmods(root);
  return renderSitemap(
    [...STATIC_PATHS, ...churchAvPaths(root), ...biblePaths(root)],
    (path, loc) => gitLastmod(sourcesFor(path, root), root) ?? committed.get(loc) ?? null,
  );
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
