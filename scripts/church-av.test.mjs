import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { churchAvPaths } from "./sitemap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The installer's name, assembled so this file does not contain it either.
const NAME = new RegExp(["mes", "sen", "ger"].join(""), "i");
const av = JSON.parse(readFileSync(join(ROOT, "src/data/church-av.json"), "utf8"));

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Every file that renders the church AV pages.
const SOURCES = [
  ...walk(join(ROOT, "src/routes/church-av")),
  join(ROOT, "src/components/church-av.tsx"),
  join(ROOT, "src/lib/church-av.ts"),
  join(ROOT, "src/data/church-av.json"),
];

test("church AV sources never name the installation company", () => {
  for (const file of SOURCES) {
    assert.ok(!NAME.test(readFileSync(file, "utf8")), `${file} names the installer`);
    assert.ok(!NAME.test(file), `${file} names the installer in its path`);
  }
});

test("built church AV pages never name the installation company", (t) => {
  const built = walk(join(ROOT, ".vercel/output")).filter(
    (f) => !f.includes("/_libs/") && /\.(m?js|html|json|css)$/.test(f),
  );
  if (!built.length) return t.skip("no build output");
  // App chunks only (third-party libraries live under _libs). The data file
  // is bundled into whichever chunk renders /church-av.
  const avChunks = built.filter((f) => /church-av|Every word heard/.test(readFileSync(f, "utf8")));
  assert.ok(avChunks.length > 0, "build output has no church AV chunk");
  for (const file of avChunks) {
    assert.ok(!NAME.test(readFileSync(file, "utf8")), `${file} names the installer`);
  }
});

test("church AV copy keeps the owner's rules", () => {
  const text = SOURCES.map((f) => readFileSync(f, "utf8")).join("\n");
  assert.ok(!/\bfree\b/i.test(text), "no 'free'");
  assert.ok(!/\bAI\b/.test(text), "no 'AI'");
  assert.ok(!/\bOperate\b/.test(text), "no Operate pitch");
  assert.ok(
    !/AggregateRating|LocalBusiness|"Review"|ratingValue/.test(text),
    "no rating or business markup",
  );
  assert.ok(!/Will Doss|"rating"/.test(text), "only the two AV testimonials, no ratings");
  assert.ok(
    !/https?:\/\/(?!www\.unitedundergod\.org)/.test(JSON.stringify(av)),
    "no outside links in the data",
  );
});

test("every state and city page is in the sitemap and has a route", () => {
  const paths = churchAvPaths();
  for (const s of av.states) assert.ok(paths.includes(`/church-av/${s.slug}`));
  for (const c of av.cities) assert.ok(paths.includes(`/church-av/${c.state}/${c.slug}`));
  const routes = join(ROOT, "src/routes/church-av");
  assert.ok(existsSync(join(routes, "index.tsx")));
  assert.ok(existsSync(join(routes, "$state", "index.tsx")));
  assert.ok(existsSync(join(routes, "$state", "$city.tsx")));
});

test("city pages are distinct and reference real data", () => {
  const slugs = new Set(av.cities.map((c) => c.slug));
  const titles = new Set();
  const descriptions = new Set();
  const intros = new Set();
  for (const s of av.states) {
    const n = av.cities.filter((c) => c.state === s.slug).length;
    assert.ok(n >= 8 && n <= 12, `${s.slug} has ${n} city pages`);
  }
  for (const page of [...av.states, ...av.cities]) {
    assert.ok(!titles.has(page.title), `duplicate title ${page.title}`);
    titles.add(page.title);
    assert.ok(!descriptions.has(page.description), `duplicate description on ${page.slug}`);
    descriptions.add(page.description);
    assert.ok(
      page.description.length >= 120 && page.description.length <= 165,
      `${page.slug} description is ${page.description.length} chars`,
    );
    for (const id of page.caseStudies) assert.ok(av.caseStudies[id], `${page.slug}: ${id}`);
    assert.ok(av.testimonials.some((t) => t.id === page.testimonial));
  }
  for (const c of av.cities) {
    assert.ok(!intros.has(c.intro));
    intros.add(c.intro);
    for (const n of c.nearby) assert.ok(slugs.has(n), `${c.slug} links missing city ${n}`);
    assert.ok(c.faq.length >= 1, `${c.slug} needs its own FAQ`);
  }
});

test("a city page claims work 'in' the city only when a project is listed there", () => {
  for (const c of av.cities) {
    const abbr = av.states.find((s) => s.slug === c.state).abbr;
    const local = av.projects.filter((p) => p.city === c.name && p.state === abbr);
    const claimsLocal = new RegExp(`\\bin ${c.name}\\b[^.]*\\bproject list\\b`).test(c.intro);
    const deniesLocal = new RegExp(`No ${c.name} church`).test(c.intro);
    if (claimsLocal && !local.length)
      assert.fail(`${c.slug} claims a local project it does not have`);
    if (deniesLocal && local.length) assert.fail(`${c.slug} denies a local project it has`);
  }
});
