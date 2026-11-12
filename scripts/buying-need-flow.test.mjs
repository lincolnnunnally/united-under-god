import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

test("the public need form keeps deadline guidance and names who fills the order", () => {
  const page = read("src/routes/buying/need/index.tsx");
  assert.match(page, /min=\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\}/);
  assert.match(page, /insurance renewal or an event/);
  assert.match(page, /not guaranteed/);
  assert.match(page, /pay them directly/);
  assert.match(page, /We do not sell or deliver the order/);
  assert.match(page, /<FeeDisclosure \/>/);
  assert.match(page, /Your contact stays private/);
  assert.ok(!/within 24|same day|immediately|quote turnaround/i.test(page));
});

test("the private quote page is a closed door: noindex, no referrer, no supplier contact on the page", () => {
  const page = read("src/routes/buying/need/$token.tsx");
  assert.match(page, /noindex: true/);
  assert.match(page, /name: "referrer", content: "no-referrer"/);
  assert.match(page, /ORDER_RESPONSIBILITY/);
  assert.match(page, /Good through/);
  assert.match(page, /quote\.ended/);
  assert.match(page, /<FeeDisclosure/);
  assert.match(page, /not promised/);
  assert.ok(!page.includes("supplierEmail"));
  assert.ok(!page.includes("price_contact"));
});

test("server deadline checks and quote expiry live with the need, not a second workflow", () => {
  const needs = read("src/lib/church-needs.ts");
  assert.match(needs, /const neededBy = cleanNeededBy\(input\.neededBy\)/);
  assert.match(needs, /Every price on this line has ended/);
  assert.match(needs, /That price has ended/);
  assert.match(needs, /price_attested_at/);
  assert.match(needs, /ORDER_RESPONSIBILITY/);
  assert.match(needs, /SUPPLIER_RESPONSIBILITY/);
  assert.ok(!needs.includes("group-buy"), "custom needs stay off the group-buy spine");
});
