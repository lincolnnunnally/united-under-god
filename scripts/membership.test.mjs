import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { STATIC_PATHS, buildSitemap } from "./sitemap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
// The installer's name, assembled so this file does not contain it either.
const NAME = new RegExp(["mes", "sen", "ger"].join(""), "i");

const PAGES = [
  "src/routes/membership/index.tsx",
  "src/routes/membership/welcome.tsx",
  "src/routes/fellowship.tsx",
  "src/components/member-gate.tsx",
  "src/components/member-home.tsx",
  "src/components/member-status.tsx",
  "src/lib/membership.ts",
  "src/lib/fellowship.ts",
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test("catalog pages read the book through the server-side member gate", () => {
  const category = read("src/routes/buying/$category.tsx");
  assert.match(category, /listCatalogBookForViewer\(\)/);
  assert.ok(!/\blistCatalogBook\(\)/.test(category), "the ungated read is not used");
  assert.match(category, /<MemberLockedLine\b/);
  assert.match(category, /<BecomeMemberCta\b/);

  const index = read("src/routes/buying/index.tsx");
  assert.match(index, /loader: \(\) => listPublishedBookForViewer\(\)/);
  assert.ok(!/\blistPublishedBook\(\)/.test(index), "the ungated read is not used");

  const actions = read("src/lib/membership-actions.ts");
  // Both gated reads strip the entries on the server before returning them.
  const gated = actions.match(/entriesForViewer\(read\.entries, member\)/g) ?? [];
  assert.equal(gated.length, 2);
  assert.match(actions, /const member = context\.access\.canView;/);
});

test("the member check fails closed", () => {
  const server = read("src/lib/membership.server.ts");
  assert.match(server, /if \(!user\) return \{ userId: null, member: false, staff: false, canView: false \}/);
  assert.match(server, /let member = false;/);
  assert.match(read("src/lib/membership.ts"), /return status === "active" \|\| status === "past_due";/);
});

test("the webhook verifies the signature before it reads the event, and is dormant without keys", () => {
  const hook = read("src/routes/api/stripe/webhook.ts");
  const verify = hook.indexOf("verifyStripeSignature(");
  const parse = hook.indexOf("JSON.parse(payload)");
  const dormant = hook.indexOf("if (!config.ready)");
  assert.ok(dormant > 0 && dormant < verify && verify < parse, "dormant check, then signature, then parse");
  assert.match(hook, /request\.text\(\)/, "verifies the raw body");
  assert.match(hook, /status: 503/);
  assert.match(hook, /status: 400/);
  assert.match(hook, /timingSafeEqual/);
});

test("dormant mode shows the interest form, never checkout", () => {
  const page = read("src/routes/membership/index.tsx");
  assert.match(page, /if \(!view\.open\) \{/);
  assert.match(page, /<InvolvementForm\s+intent="member"/);
  assert.match(read("src/lib/involvement.ts"), /title: "Membership opens soon — tell us you’re interested"/);
  const actions = read("src/lib/membership-actions.ts");
  const start = actions.slice(actions.indexOf("export const startMemberCheckout"));
  assert.ok(start.indexOf("if (!config.ready)") < start.indexOf("createMemberCheckout("));
});

test("membership interest and website requests reach the owner's desk", () => {
  const desk = read("src/lib/desk.ts");
  assert.match(desk, /\{ id: "member", label: "Member churches" \}/);
  assert.match(desk, /if \(intent === "member" \|\| intent === "website"\) return \["member"\];/);
});

test("/membership and /fellowship are in the sitemap; the welcome page is not", () => {
  const xml = buildSitemap();
  for (const path of ["/membership", "/fellowship"]) {
    assert.ok(STATIC_PATHS.includes(path));
    assert.ok(xml.includes(`<loc>https://www.unitedundergod.org${path}</loc>`), path);
  }
  assert.ok(!xml.includes("/membership/welcome"));
  assert.match(read("src/routes/membership/welcome.tsx"), /noindex: true/);
  const page = read("src/routes/membership/index.tsx");
  assert.match(page, /const TITLE = "Church Buying Program & Purchasing Group \| United Under God";/);
  assert.match(page, /church buying program and purchasing group/);
});

test("membership is linked from /buying, the catalogs, /organizations, and the nav", () => {
  assert.match(read("src/routes/buying/index.tsx"), /to="\/membership"/);
  assert.match(read("src/components/member-gate.tsx"), /to="\/membership"/);
  assert.match(read("src/routes/organizations.tsx"), /to="\/membership"/);
  assert.match(read("src/lib/content.ts"), /\{ to: "\/membership", label: "Member churches" \}/);
});

test("new pages keep the owner's copy rules", () => {
  const text = PAGES.map(read).join("\n");
  assert.ok(!/\bAI\b/.test(text), "no 'AI'");
  assert.ok(!NAME.test(text), "never name the installer");
  assert.ok(!/\blowest\b|\bcheapest\b|best price|save up to|guarantee/i.test(text), "no price promises");
  assert.ok(!/\d\s?%|\bpercent\b/i.test(text), "no discount amounts");
  assert.ok(!/\bsave (you )?\$|\bsave money\b|\bdiscounts? (of|up)\b/i.test(text), "no promised savings");
  // The only dollar amount is the membership price, stated once in membership.ts.
  const dollars = PAGES.filter((f) => f !== "src/lib/membership.ts").filter((f) => /\$\s?\d/.test(read(f)));
  assert.deepEqual(
    dollars,
    ["src/routes/membership/index.tsx"],
    "only /membership states the price (head and FAQ)",
  );
  assert.match(read("src/lib/membership.ts"), /export const MEMBER_PRICE_LABEL = "\$20 a month, per church";/);
  assert.match(read("src/lib/membership.ts"), /export const MEMBER_PRICE_CENTS = 2000;/);
});

test("the seal stays free, under “Take the seal”; statement of intent is explanation only", () => {
  const join = read("src/routes/join.tsx");
  assert.match(join, /<h1 className="mt-3 text-4xl">Take the seal\.<\/h1>/);
  assert.match(join, /The seal is a statement of intent/);
  assert.match(join, /It costs|is free|Nothing\. The seal is free/);
  assert.match(read("src/lib/involvement.ts"), /seal: \{\n {4}title: "Take the seal",/);
  for (const file of ["src/routes/join.tsx", "src/routes/doctrine.tsx", "src/lib/involvement.ts", "src/components/site-header.tsx"]) {
    const source = read(file);
    assert.ok(!/Make the statement of intent/.test(source), `${file} still headlines the statement of intent`);
  }
  assert.match(read("src/routes/membership/index.tsx"), /The seal stays free/);
});

test("Stripe money is tagged with the app slug for the owner desk", () => {
  const m = read("src/lib/membership.ts");
  assert.match(m, /app: APP_SLUG, app_slug: APP_SLUG/);
  assert.match(m, /export const APP_SLUG = "united-under-god";/);
});

test("the built client never carries Stripe calls or secrets", (t) => {
  const assets = walk(join(ROOT, ".vercel/output/static")).filter((f) => f.endsWith(".js"));
  if (!assets.length) return t.skip("no build output");
  for (const file of assets) {
    const text = readFileSync(file, "utf8");
    assert.ok(!text.includes("api.stripe.com"), `${file} calls Stripe`);
    assert.ok(!/STRIPE_(SECRET_KEY|WEBHOOK_SECRET)/.test(text), `${file} names a Stripe secret`);
    assert.ok(!text.includes("uug_member_churches"), `${file} carries membership SQL`);
  }
});
