import assert from "node:assert/strict";
import { test } from "node:test";
import { BUYING_MODELS } from "./church-spend.ts";
import {
  FEES,
  FEE_DISCLOSURE,
  feeFor,
  feeSummary,
  vendorTerms,
  vendorTermsText,
  type FeeConfig,
} from "./vendor-terms.ts";

test("the owner's rates: 2% on catalog and contract, 10% on project and referral", () => {
  assert.deepEqual(feeFor("catalog"), { kind: "rebate", percent: 2 });
  assert.deepEqual(feeFor("contract"), { kind: "rebate", percent: 2 });
  assert.deepEqual(feeFor("project"), { kind: "referral", percent: 10 });
  assert.deepEqual(feeFor("referral"), { kind: "referral", percent: 10 });
  assert.equal(feeFor("referral", true), null, "licensed parts are not under these terms");
  for (const model of BUYING_MODELS) assert.ok(feeFor(model), `${model} has a fee`);
});

test("the fee config drives the terms text", () => {
  const text = vendorTermsText();
  assert.match(text, /rebate of 2% of your sales/);
  assert.match(text, /referral fee of 10% of each job/);
  assert.match(text, /monthly/);
  assert.match(text, /due 30 days after you are paid/);

  const changed: FeeConfig = {
    ...FEES,
    rebate: { ...FEES.rebate, percent: 3 },
    referral: { ...FEES.referral, percent: 12 },
    dueDays: 45,
  };
  const other = vendorTermsText(changed);
  assert.match(other, /rebate of 3% of your sales/);
  assert.match(other, /referral fee of 12% of each job/);
  assert.match(other, /due 45 days/);
  assert.ok(!/\b2%|\b10%|30 days/.test(other), "no rate is typed into the copy by hand");
  assert.match(feeSummary(changed), /3% rebate.*12% referral fee/);
  assert.equal(vendorTerms(changed)[1]!.heading, "The 3% rebate");
});

test("the terms say what the owner decided, and nothing licensed", () => {
  const text = vendorTermsText();
  assert.match(text, /buy directly from you/);
  assert.match(text, /chooses freely/);
  assert.match(text, /remove a vendor/);
  assert.match(text, /does not report or does not pay/);
  assert.match(text, /retains these rebates/);
  assert.match(text, /sound, livestream, and lighting/);
  assert.match(text, /building and facilities projects/);
  // Licensed lines are named only to say they are handled separately.
  assert.match(text, /handled separately/);
  assert.ok(!/premium|underwrit|fiduciary|broker/i.test(text), "no licensed-industry terms");
  assert.ok(!/\bAI\b/.test(text));
  assert.ok(!/lowest|cheapest|best price|save up to/i.test(text));
  assert.ok(!/\bmembers?(hip)?\b/i.test(text));
  assert.ok(!new RegExp(["mes", "sen", "ger"].join(""), "i").test(text));
});

test("the disclosure line is short, plain, and says UUG retains the rebates", () => {
  assert.match(FEE_DISCLOSURE, /pay United Under God rebates and referral fees/);
  assert.match(
    FEE_DISCLOSURE,
    /United Under God retains these rebates to support the buying program and its service to churches/,
  );
  assert.ok(FEE_DISCLOSURE.length < 220);
  assert.ok(!/\d/.test(FEE_DISCLOSURE), "no amounts on church pages");
});
