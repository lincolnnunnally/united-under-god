import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
// The installer's name, assembled so this file does not contain it either.
const NAME = new RegExp(["mes", "sen", "ger"].join(""), "i");

const NEW_FILES = [
  "src/lib/price-contact.ts",
  "src/lib/price-term.ts",
  "src/lib/price-program.ts",
  "src/lib/price-actions.ts",
  "src/components/program-price.tsx",
  "src/components/price-contact-fields.tsx",
  "src/components/source-prices.tsx",
  "src/routes/api/cron/price-review.ts",
];

test("migration 0012 is the next number, additive, and idempotent", () => {
  const numbered = readdirSync(join(ROOT, "migrations")).filter((f) => f.startsWith("0012_"));
  assert.deepEqual(numbered, ["0012_program_price_honor.sql"]);
  const sqlText = read("migrations/0012_program_price_honor.sql")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = sqlText.replace(/on delete cascade/gi, "");
  assert.ok(!/\b(drop|rename|truncate|delete|update|insert)\b/i.test(statements), "nothing destructive, no row changed");
  assert.ok(!/alter\s+column/i.test(sqlText), "no retyping");
  for (const stmt of sqlText
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    assert.match(stmt, /if not exists/i, `not idempotent: ${stmt.slice(0, 60)}`);
  }
  assert.ok(!/\btoken text\b/.test(sqlText), "no tokens stored");
});

test("the daily job is a Vercel cron on a route protected by CRON_SECRET", () => {
  const config = JSON.parse(read("vercel.json"));
  const cron = (config.crons ?? []).find((row) => row.path === "/api/cron/price-review");
  assert.ok(cron, "vercel.json schedules the price review");
  assert.match(cron.schedule, /^\d+ \d+ \* \* \*$/, "once a day");
  const route = read("src/routes/api/cron/price-review.ts");
  assert.match(route, /if \(!cronTokenMatches\(request\)\)/);
  assert.match(route, /status: 401/);
  assert.match(route, /sendHardcodedOwnerEmail/, "the digest goes to the owner only");
  const auth = read("src/lib/cron-auth.server.ts");
  assert.match(auth, /process\.env\.CRON_SECRET/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /if \(!expected\) return false;/, "no secret set: nothing is accepted");
});

test("the price desk and the member orders log are staff only", () => {
  const actions = read("src/lib/price-actions.ts");
  const staffFns = [
    "readPriceDeskFn",
    "previewPriceRequestFn",
    "sendPriceRequestFn",
    "reopenPriceBidFn",
    "extendPriceTermFn",
    "decidePriceConfirmationFn",
    "publishUpdatedPricesFn",
  ];
  for (const name of staffFns) {
    const body = actions.slice(actions.indexOf(`export const ${name}`));
    const end = body.indexOf("export const", 10);
    const fn = end > 0 ? body.slice(0, end) : body;
    assert.match(fn, /authMiddleware/, `${name} needs a session`);
    assert.match(fn, /assertStaff|priceWrite/, `${name} is staff only`);
  }
  assert.match(actions, /async function priceWrite[\s\S]*?await assertStaff\(userId\)/);
  // Member orders are only read inside the staff view.
  assert.equal((actions.match(/readMemberOrders\(/g) ?? []).length, 1);
  // The one member write checks the member gate on the server.
  const order = actions.slice(actions.indexOf("export const recordMemberOrderFn"));
  assert.match(order, /viewerMiddleware/);
  assert.match(order, /if \(!access\.userId \|\| !access\.canView\)/);
  // No public page reads the orders.
  for (const page of ["src/routes/buying/index.tsx", "src/routes/buying/$category.tsx", "src/routes/buying/vendor/$id.tsx"]) {
    assert.ok(!/readMemberOrders|source_member_orders|readPriceDeskFn/.test(read(page)), page);
  }
});

test("quotes carry the authorized price contact and attestation everywhere they are entered", () => {
  const bid = read("src/routes/buying/bids/$id.tsx");
  assert.match(bid, /<PriceContactFields\b/);
  assert.match(bid, /attestation=\{attestationText\(vendor\.company\)\}/);
  assert.match(bid, /priceContact: contact,\s*attested,/);
  const desk = read("src/routes/buying/desk.tsx");
  assert.match(desk, /<PriceContactFields\b/);
  assert.match(desk, /priceContact: contact,\s*attested,/);
  assert.match(desk, /<PriceTermPicker\b/);
  assert.match(desk, /<PriceSection \/>/);
  assert.match(read("src/lib/source-actions.ts"), /attested: z\.boolean\(\)/);
  assert.match(read("src/lib/vendor-actions.ts"), /attested: z\.boolean\(\)/);
  assert.match(read("src/lib/vendor-actions.ts"), /ip: await callerIp\(\)/);
  assert.match(read("src/lib/price-contact.ts"), /I am authorized to commit \$\{name\} to these prices for member churches of United Under God for the price term\./);
  const portal = read("src/components/vendor-portal.tsx");
  assert.match(portal, /<Prices read=\{read\} run=\{run\} \/>/);
  assert.match(portal, /<DefaultPriceContact\b/);
});

test("catalog pages draw awarded prices through ProgramPrice, after the server gate", () => {
  for (const page of ["src/routes/buying/index.tsx", "src/routes/buying/$category.tsx"]) {
    const source = read(page);
    assert.match(source, /<ProgramPrice\b/, page);
    assert.match(source, /<PriceLabel\b/, page);
  }
  const card = read("src/components/program-price.tsx");
  assert.match(card, /if \(entry\.priceStatus === "ended"\) return <EndedLine/);
  assert.match(card, /if \(entry\.locked\) return <MemberLockedLine/);
  assert.match(card, /Price term ended, being refreshed\./);
  for (const step of ["Contact the vendor.", "Say you are a United Under God member church and give reference", "If they won’t honor the program price,"]) {
    assert.ok(card.includes(step), step);
  }
  assert.match(card, /Copy order details/);
  assert.match(card, /We ordered this/);
  assert.match(card, /search=\{\{ type: "price", ref: entry\.referenceCode/);
  // The lock stays an allow-list; priceStatus is the only new open field.
  assert.match(read("src/lib/membership.ts"), /const OPEN_FIELDS = \["id", "title", "unit", "quantity", "category", "catalogItem", "publishedAt", "priceStatus"\];/);
});

test("the report form offers 'Program price not honored' with the reference", () => {
  const page = read("src/routes/buying/report.tsx");
  assert.match(page, /Program price not honored/);
  assert.match(page, /name="reference"/);
  assert.match(page, /problemType,\s*referenceCode: value\("reference"\)/);
  assert.match(read("src/lib/case-actions.ts"), /referenceCode: z\.string\(\)/);
});

test("new copy keeps the owner's rules", () => {
  for (const file of NEW_FILES) {
    const copy = read(file)
      .split("\n")
      .filter((line) => !line.startsWith("import "))
      .join("\n");
    assert.ok(!/\bAI\b/.test(copy), `${file}: no 'AI'`);
    assert.ok(!NAME.test(copy), `${file}: never name the installer`);
    assert.ok(!/\blowest\b|\bcheapest\b|best price|save up to|guarantee/i.test(copy), `${file}: no promises`);
    assert.ok(!/\bdiscount|\bsave (you )?money\b|\d\s?% off/i.test(copy), `${file}: no promised discounts`);
    assert.ok(!/church-av|ChurchAv/.test(copy), `${file}: nothing on the church AV pages`);
  }
});
