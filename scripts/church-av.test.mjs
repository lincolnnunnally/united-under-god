import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { churchAvHelpPaths, churchAvLandingPaths, churchAvPaths } from "./sitemap.mjs";

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

// Every file that renders the church AV pages: the routes (hub, states,
// cities, help, planner), their components, their libraries, and the data.
const SOURCES = [
  ...walk(join(ROOT, "src/routes/church-av")),
  ...readdirSync(join(ROOT, "src/components"))
    .filter((f) => /^church-av.*\.tsx$/.test(f))
    .map((f) => join(ROOT, "src/components", f)),
  ...readdirSync(join(ROOT, "src/lib"))
    .filter((f) => /^church-av.*\.ts$/.test(f))
    .map((f) => join(ROOT, "src/lib", f)),
  join(ROOT, "src/data/church-av.json"),
];
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

const HELP_SLUGS = [
  "cant-hear-in-the-back",
  "hearing-aids-squeal-or-echo",
  "livestream-keeps-dropping",
  "feedback-during-the-sermon",
  "volunteers-cant-run-the-board",
  "traditional-sanctuary-without-a-big-screen",
  "older-members-staying-home",
  "planning-a-new-building",
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

test("the help, planner, and component sources are all covered", () => {
  const names = SOURCES.map((f) => f.slice(ROOT.length + 1));
  for (const f of [
    "src/lib/church-av-help.ts",
    "src/lib/church-av-planner.ts",
    "src/components/church-av-planner.tsx",
    "src/components/church-av-stage.tsx",
    "src/routes/church-av/help/$slug.tsx",
    "src/routes/church-av/help/index.tsx",
    "src/routes/church-av/planner/index.tsx",
    "src/routes/church-av/planner/summary.tsx",
    "src/lib/church-av-confirm.ts",
    "src/lib/church-av-confirm.test.ts",
  ]) {
    assert.ok(names.includes(f), `${f} is not checked`);
  }
});

test("no dollar amounts, prices, or ranking promises on church AV pages", () => {
  for (const file of SOURCES) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/\$\s?\d/.test(text), `${file} prints a dollar amount`);
    assert.ok(!/\b\d[\d,.]*\s?(k|K)?\s?(dollars|USD)\b/.test(text), `${file} prints an amount`);
    assert.ok(
      !/\b(first page of Google|rank(s|ed|ing)? (you|your church)|#1|number one)\b/i.test(text),
      `${file} makes a ranking promise`,
    );
    assert.ok(!/\bguarantee/i.test(text), `${file} guarantees something`);
  }
});

test("every help page and the planner are in the sitemap and have routes", () => {
  const paths = churchAvPaths();
  assert.deepEqual(
    churchAvHelpPaths()
      .slice(1)
      .map((p) => p.replace("/church-av/help/", ""))
      .sort(),
    [...HELP_SLUGS].sort(),
  );
  for (const slug of HELP_SLUGS) assert.ok(paths.includes(`/church-av/help/${slug}`), slug);
  assert.ok(paths.includes("/church-av/help"));
  assert.ok(paths.includes("/church-av/planner"));
  // The per-church summary is noindex and stays out of the sitemap.
  assert.ok(!paths.includes("/church-av/planner/summary"));
  assert.match(read("src/routes/church-av/planner/summary.tsx"), /noindex: true/);
  const routes = join(ROOT, "src/routes/church-av");
  assert.ok(existsSync(join(routes, "help", "$slug.tsx")));
  assert.ok(existsSync(join(routes, "help", "index.tsx")));
  assert.ok(existsSync(join(routes, "planner", "index.tsx")));
  assert.ok(existsSync(join(routes, "planner", "summary.tsx")));
});

test("help pages have unique titles and descriptions and real case studies", () => {
  const help = read("src/lib/church-av-help.ts");
  const field = (name) =>
    [...help.matchAll(new RegExp(`^ {4}${name}:\\s*"([^"]+)",$`, "gm"))].map((m) => m[1]);
  const titles = field("title");
  const descriptions = [...help.matchAll(/^ {4}description:\n?\s*"([^"]+)",$/gm)].map((m) => m[1]);
  assert.equal(titles.length, HELP_SLUGS.length, "one title per help page");
  assert.equal(descriptions.length, HELP_SLUGS.length, "one description per help page");
  const allTitles = [...titles, ...av.states.map((s) => s.title), ...av.cities.map((c) => c.title)];
  assert.equal(new Set(allTitles).size, allTitles.length, "titles are unique across church AV");
  assert.equal(new Set(descriptions).size, descriptions.length, "descriptions are unique");
  for (const d of descriptions) {
    assert.ok(d.length >= 120 && d.length <= 165, `description is ${d.length} chars: ${d}`);
  }
  for (const m of help.matchAll(/caseStudies: \[([^\]]+)\]/g)) {
    for (const id of m[1].match(/"([^"]+)"/g).map((x) => x.slice(1, -1))) {
      assert.ok(av.caseStudies[id], `help page cites missing case study ${id}`);
    }
  }
  for (const m of help.matchAll(/testimonial: "([^"]+)"/g)) {
    assert.ok(
      av.testimonials.some((t) => t.id === m[1]),
      `missing testimonial ${m[1]}`,
    );
  }
});

test("help copy says 'in <city>' only where a project is listed", () => {
  const help = read("src/lib/church-av-help.ts") + read("src/lib/church-av-planner.ts");
  for (const m of help.matchAll(/\bin ([A-Z][a-z]+(?: [A-Z][a-z]+)*), (GA|FL|SC)\b/g)) {
    const listed = av.projects.some((p) => p.city === m[1] && p.state === m[2]);
    assert.ok(listed, `claims work in ${m[1]}, ${m[2]} without a listed project`);
  }
});

test("every church AV page has exactly one H1", () => {
  for (const file of walk(join(ROOT, "src/routes/church-av"))) {
    const text = readFileSync(file, "utf8");
    const h1 = (text.match(/<h1\b/g) ?? []).length + (text.match(/<AvHero\b/g) ?? []).length;
    assert.equal(h1, 1, `${file} has ${h1} H1s`);
  }
  for (const file of [
    "src/components/church-av-planner.tsx",
    "src/components/church-av-stage.tsx",
  ]) {
    assert.ok(!/<h1\b/.test(read(file)), `${file} adds an H1`);
  }
});

test("help pages give each page Article, FAQPage, and breadcrumb JSON-LD", () => {
  const route = read("src/routes/church-av/help/$slug.tsx");
  assert.match(route, /helpArticleJsonLd\(page\)/);
  assert.match(route, /faqJsonLd\(page\.faq\)/);
  assert.match(route, /breadcrumbJsonLd\(/);
  assert.match(route, /helpHowToJsonLd\(page\)/);
  assert.match(read("src/routes/church-av/planner/index.tsx"), /"@type": "HowTo"/);
});

test("the hearing aid page is accurate and does not overclaim", () => {
  const help = read("src/lib/church-av-help.ts");
  const start = help.indexOf('slug: "hearing-aids-squeal-or-echo"');
  const page = help.slice(start, help.indexOf('slug: "livestream-keeps-dropping"'));
  for (const term of [
    /telecoil/,
    /“T”/,
    /induction/,
    /Auracast/,
    /Bluetooth LE Audio/,
    /\bRF\b/,
    /\bIR\b/,
    /reverberat/,
    /feeds back/,
  ]) {
    assert.match(page, term);
  }
  assert.match(page, /we’ll help you choose the right option/i);
  // Owner, 2026-10-28: the installation team installs hearing loops. Auracast stays "help you choose".
  assert.match(page, /Our installation team installs hearing loops/);
  assert.match(page, /religious organizations are (generally|largely) exempt/i);
  for (const file of SOURCES) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/install(s|ed|ing)?\s+Auracast/i.test(text), `${file} claims Auracast installation`);
    assert.ok(
      !/(churches|you) (are|is) (legally )?required to (provide|have|install)/i.test(text),
      `${file} says churches are legally required`,
    );
  }
});

test("the planner keeps traditional churches screen-free and shows no prices", () => {
  const planner = read("src/lib/church-av-planner.ts");
  const traditional = planner.slice(
    planner.indexOf('if (style === "traditional") {\n    later.push'),
    planner.indexOf('} else if (style === "blended")'),
  );
  assert.ok(traditional.length > 0, "traditional branch found");
  assert.match(traditional, /No screen behind the pulpit/);
  assert.ok(!/LED wall/.test(traditional), "traditional never gets an LED wall");
  assert.match(planner, /Remote-controlled cameras/);
  const ui = read("src/components/church-av-planner.tsx");
  assert.match(
    ui,
    /\/\/ OWNER: price bands need installer approval|\{\/\* OWNER: price bands need installer approval \*\/\}/,
  );
  assert.match(ui, /Budget ranges — ask us/);
  assert.match(planner, /localStorage/);
  // The wizard's questions match the saved-progress bound.
  const steps = ui.slice(ui.indexOf("const STEPS"), ui.indexOf("function optionClass"));
  const count = Number(planner.match(/PLANNER_STEP_COUNT = (\d+)/)[1]);
  assert.equal((steps.match(/^ {4}title: /gm) ?? []).length, count);
  assert.match(ui, /window\.print\(\)/);
  const stage = read("src/components/church-av-stage.tsx");
  assert.match(stage, /function Traditional/);
  assert.match(stage, /function Blended/);
  assert.match(stage, /function Modern/);
  // Sends through the one av inquiry form with the answers attached.
  const route = read("src/routes/church-av/planner/index.tsx");
  assert.match(route, /attachment=\{plannerMessage\(/);
  assert.match(read("src/components/church-av.tsx"), /<InvolvementForm\s+intent="av"/);
  assert.match(read("src/components/involvement-form.tsx"), /attachment \?\? ""/);
});

test("hub, state, and city pages link to the planner and help pages", () => {
  for (const file of [
    "src/routes/church-av/index.tsx",
    "src/routes/church-av/$state/index.tsx",
    "src/routes/church-av/$state/$city.tsx",
  ]) {
    assert.match(read(file), /<HelpLinks\b/, `${file} links the help pages`);
  }
  assert.match(read("src/components/church-av.tsx"), /to="\/church-av\/planner"/);
});

test("the av confirmation email links only real planner problems, by their real labels", () => {
  const help = read("src/lib/church-av-help.ts");
  const confirm = read("src/lib/church-av-confirm.ts");
  const pairs = [...confirm.matchAll(/\{ slug: "([a-z-]+)", label: "([^"]+)" \}/g)];
  assert.ok(pairs.length >= 6, "confirmation email lists the planner problems");
  for (const [, slug, label] of pairs) {
    assert.ok(HELP_SLUGS.includes(slug), `${slug} is not a help page`);
    assert.ok(
      help.includes(`slug: "${slug}",\n    label: "${label}",`),
      `${slug} label differs from church-av-help.ts`,
    );
  }
  // Only our own pages; never the installer's site, phone, or email.
  for (const url of confirm.match(/https?:\/\/[^\s"`]+/g) ?? []) {
    assert.ok(url.startsWith("https://www.unitedundergod.org"), `outside link ${url}`);
  }
  assert.ok(!/[^\s@"`]+@[^\s@"`]+\.[a-z]{2,}/i.test(confirm), "no email address printed");
  assert.ok(!/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(confirm), "no phone number printed");
});

test("av requests get the confirmation email, and only av requests", () => {
  const actions = read("src/lib/desk-actions.ts");
  assert.match(actions, /settled\.ok && kind === "av"[\s\S]{0,300}sendAvConfirmation\(/);
});

// ------------------------------------------------------------ landing pages

const LANDING = {
  traditional: "traditional",
  modern: "modern",
  blended: "blended",
  "livestream-ministry": "livestream",
  "new-building": "newbuild",
  sound: "blended",
  video: "livestream",
  lighting: "modern",
  "hearing-help": "traditional",
  "led-wall": "modern",
};

test("every landing page has a route, a sitemap entry, and is checked", () => {
  const paths = churchAvPaths();
  assert.deepEqual(
    churchAvLandingPaths().sort(),
    Object.keys(LANDING)
      .map((slug) => `/church-av/${slug}`)
      .sort(),
  );
  const names = SOURCES.map((f) => f.slice(ROOT.length + 1));
  for (const f of ["src/lib/church-av-landing.ts", "src/components/church-av-landing.tsx"]) {
    assert.ok(names.includes(f), `${f} is not checked`);
  }
  for (const slug of Object.keys(LANDING)) {
    assert.ok(paths.includes(`/church-av/${slug}`), `${slug} is not in the sitemap`);
    const file = `src/routes/church-av/${slug}.tsx`;
    assert.ok(names.includes(file), `${file} is missing or not checked`);
    const route = read(file);
    assert.match(route, new RegExp(`createFileRoute\\("/church-av/${slug}"\\)`));
    assert.match(route, /head: \(\) => landingHead\(PAGE\)/, `${slug} uses the landing head`);
    assert.match(route, new RegExp(`getLanding\\("${slug}"\\)`));
    assert.match(route, /<LandingLook page=\{PAGE\}>/, `${slug} wraps itself in its look`);
    assert.match(route, /<LandingBody page=\{PAGE\} \/>/, `${slug} renders every section`);
    assert.match(route, /<LandingActions page=\{PAGE\}/, `${slug} offers the planner`);
  }
});

test("landing pages have unique SEO, real case studies, and the full set of sections", () => {
  const src = read("src/lib/church-av-landing.ts");
  const titles = [...src.matchAll(/^ {4}title: "([^"]+)",$/gm)].map((m) => m[1]);
  const descriptions = [...src.matchAll(/^ {4}description:\n?\s*"([^"]+)",$/gm)].map((m) => m[1]);
  const n = Object.keys(LANDING).length;
  assert.equal(titles.length, n, "one title per landing page");
  assert.equal(descriptions.length, n, "one description per landing page");
  const help = read("src/lib/church-av-help.ts");
  const helpTitles = [...help.matchAll(/^ {4}title:\s*"([^"]+)",$/gm)].map((m) => m[1]);
  const all = [
    ...titles,
    ...helpTitles,
    ...av.states.map((s) => s.title),
    ...av.cities.map((c) => c.title),
  ];
  assert.equal(new Set(all).size, all.length, "titles are unique across church AV");
  assert.equal(new Set(descriptions).size, n, "descriptions are unique");
  for (const d of descriptions) {
    assert.ok(d.length >= 120 && d.length <= 165, `description is ${d.length} chars: ${d}`);
  }
  for (const [slug, look] of Object.entries(LANDING)) {
    assert.match(src, new RegExp(`slug: "${slug}",\\n\\s+look: "${look}",`), `${slug} look`);
  }
  for (const m of src.matchAll(/caseStudies: \[([^\]]+)\]/g)) {
    for (const id of m[1].match(/"([^"]+)"/g).map((x) => x.slice(1, -1))) {
      assert.ok(av.caseStudies[id], `landing page cites missing case study ${id}`);
    }
  }
  for (const m of src.matchAll(/testimonial: "([^"]+)"/g)) {
    assert.ok(
      av.testimonials.some((t) => t.id === m[1]),
      `missing testimonial ${m[1]}`,
    );
  }
  // The pages the owner named.
  assert.match(src, /"word-of-faith"/);
  assert.match(src, /"lake-point-community-church",\s+"lakeside-church"/);
  // Service + FAQPage + BreadcrumbList for every page.
  const head = src.slice(src.indexOf("export function landingHead"));
  assert.match(head, /avServiceJsonLd\(/);
  assert.match(head, /faqJsonLd\(page\.faq\)/);
  assert.match(head, /breadcrumbJsonLd\(/);
  // Stage, case studies, testimonial, process with warranty, FAQ, planner, form.
  const body = read("src/components/church-av-landing.tsx");
  for (const part of [
    /<StageIllustration\b/,
    /<CaseStudyCard\b/,
    /<TestimonialQuote\b/,
    /AV_PROCESS\.map/,
    /1-year parts and labor warranty/,
    /<FaqSection\b/,
    /to="\/church-av\/planner" search=\{page\.planner\}/,
    /<RequestSection\b/,
  ]) {
    assert.match(body, part);
  }
  assert.ok(!/<h1\b/.test(body), "the landing components add no H1");
  // The style pages hand their style to the planner.
  for (const style of ["traditional", "blended", "modern"]) {
    assert.match(src, new RegExp(`planner: \\{ style: "${style}" \\}`));
  }
});

test("each landing look is scoped to its page, readable, and in the site's look", () => {
  const css = read("src/styles.css");
  const av = css.slice(css.indexOf("Church AV landing pages"));
  // Owner (2026-10-28): every page wears the battle standard. A look keeps its
  // picture and reading needs but never re-points the palette or the type.
  assert.ok(!/\.av-look[^{]*\{[^}]*--color-(paper|ink|cream|forest|primary)\s*:/.test(av), "a look re-points the palette");
  assert.ok(!/--font-display\s*:/.test(av), "a look sets its own display type");
  assert.ok(!/Fraunces|Figtree/.test(av + read("src/lib/church-av-landing.ts")), "a look loads its own font");
  for (const look of new Set(Object.values(LANDING))) {
    assert.match(css, new RegExp(`\\.av-look-${look}[ ,.]`), `${look} still has its own picture`);
  }
  // Traditional: body at least 18px for older readers, no motion.
  const trad = css.slice(css.indexOf(".av-look-traditional {"));
  assert.match(trad, /--text-sm: 1\.125rem;/);
  assert.match(trad, /--text-base: 1\.1875rem;/);
  assert.match(trad, /animation: none !important;/);
  // Modern: motion only when the visitor has not asked for less.
  const motion = css.slice(css.indexOf(".av-mod-beam-1,") - 80, css.indexOf(".av-mod-h1 {"));
  assert.match(motion, /@media \(prefers-reduced-motion: no-preference\)/);
  // Nothing outside the landing pages picks up a look.
  for (const file of walk(join(ROOT, "src"))) {
    if (!/\.tsx?$/.test(file)) continue;
    const rel = file.slice(ROOT.length + 1);
    if (
      /church-av-landing\.tsx?$|routes\/church-av\/(traditional|modern|blended|livestream-ministry|new-building|sound|video|lighting|hearing-help)\.tsx$/.test(
        rel,
      )
    )
      continue;
    assert.ok(!/av-look-/.test(readFileSync(file, "utf8")), `${rel} uses a landing look`);
  }
});

test("hub, help pages, and planner results link to the landing pages", () => {
  assert.match(read("src/routes/church-av/index.tsx"), /<DirectionCards \/>/);
  const comp = read("src/components/church-av-landing.tsx");
  assert.match(comp, /Choose your direction/);
  assert.match(comp, /LANDING_STYLES\.map/);
  assert.match(comp, /LANDING_OUTCOMES\.map/);
  assert.match(comp, /LANDING_COMPONENTS\.map/);
  const src = read("src/lib/church-av-landing.ts");
  for (const [help, slug] of [
    ["traditional-sanctuary-without-a-big-screen", "traditional"],
    ["hearing-aids-squeal-or-echo", "hearing-help"],
    ["livestream-keeps-dropping", "livestream-ministry"],
    ["planning-a-new-building", "new-building"],
  ]) {
    assert.match(src, new RegExp(`"${help}": "${slug}"`), `${help} links ${slug}`);
  }
  assert.match(read("src/routes/church-av/help/$slug.tsx"), /HELP_LANDING\[page\.slug\]/);
  const planner = read("src/components/church-av-planner.tsx");
  assert.match(planner, /landingForStyle\(answers\.style/);
  assert.match(planner, /initialStyle/);
  assert.match(read("src/routes/church-av/planner/index.tsx"), /initialStyle=\{search\.style\}/);
});

// Owner rules, 2026-10-23: no prices, no ranking promises, never say churches
// are legally required to provide assistive listening, and hearing loops or
// Auracast only alongside "we'll help you choose".
function ownerRuleFailures(text) {
  const out = [];
  if (/\bfree\b/i.test(text)) out.push("free");
  if (/\bAI\b/.test(text)) out.push("AI");
  if (/\$\s?\d|\bUSD\b|\bper month\b/i.test(text)) out.push("price");
  if (
    /\brank(s|ed|ing|ings)?\b|first page of google|page one of google|top of google|#1 on/i.test(
      text,
    )
  ) {
    out.push("ranking promise");
  }
  // Questions ("Are churches legally required…?") are fine; statements are not.
  const statements = text.replace(/[^.?!"]*\?/g, " ");
  if (
    /legally required|required by law|ADA requires|law requires|must provide assistive/i.test(
      statements,
    )
  ) {
    out.push("legal requirement");
  }
  if (/hearing loop|Auracast/i.test(text) && !/we['’]ll help you choose/i.test(text)) {
    out.push("hearing loop or Auracast without 'we'll help you choose'");
  }
  return out;
}

test("the owner rule check catches each banned phrase", () => {
  for (const sample of [
    "A free checkup",
    "AI powered",
    "Only $99",
    "We rank you first",
    "Churches are legally required to provide assistive listening",
    "Add a hearing loop",
  ]) {
    assert.ok(ownerRuleFailures(sample).length, sample);
  }
  assert.deepEqual(ownerRuleFailures("Auracast or a loop: we’ll help you choose."), []);
  assert.deepEqual(
    ownerRuleFailures("Are churches legally required to have assistive listening?"),
    [],
  );
});

test("every church AV source keeps the owner rules", () => {
  // Page copy only: skip test files and code comments (which name the rules).
  for (const file of SOURCES.filter((f) => !/\.test\.ts$/.test(f))) {
    const code = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|\s)\/\/.*$/gm, " ");
    const problems = ownerRuleFailures(code);
    assert.deepEqual(problems, [], `${file}: ${problems.join(", ")}`);
  }
});

test("ChurchConnect cross-links point at real ChurchConnect AV pages", () => {
  const lib = read("src/lib/church-av-churchconnect.ts");
  const towns = [...lib.matchAll(/^\s+([a-z-]+): "([a-z-]+-ga)",$/gm)];
  assert.ok(towns.length >= 7, "ChurchConnect town map is missing");
  for (const [, city, town] of towns) {
    assert.ok(
      av.cities.some((c) => c.state === "georgia" && c.slug === city),
      `${city} has no United Under God city page`,
    );
    assert.ok(town === `${city}-ga`, `${city} maps to ${town}`);
  }
  assert.ok(lib.includes('livestream: "church-livestreaming"'));
  assert.ok(lib.includes('booth: "sanctuary-sound-lighting"'));
  assert.ok(lib.includes('"https://www.churchconnect.cloud"'));
  assert.ok(read("src/routes/church-av/$state/$city.tsx").includes("<ChurchConnectLinks"));
  assert.ok(read("src/routes/church-av/help/$slug.tsx").includes("<ChurchConnectLinks"));
  assert.ok(read("src/components/church-av-landing.tsx").includes("<ChurchConnectLinks"));
});
