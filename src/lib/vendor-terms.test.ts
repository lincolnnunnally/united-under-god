import assert from "node:assert/strict";
import { test } from "node:test";
import { BUYING_MODELS } from "./church-spend.ts";
import {
  AGREE_LABEL,
  COVENANT,
  COVENANT_SINCE,
  FEES,
  FEE_DISCLOSURE,
  VENDOR_TERMS_VERSION,
  acceptedCovenant,
  covenantText,
  feeFor,
  feeSummary,
  needsCovenant,
  vendorCovenant,
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
  assert.equal(vendorTerms(changed)[2]!.heading, "The 3% rebate");
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

// --- the Vendor Covenant ------------------------------------------------------

test("the terms version is bumped for the covenant, and the covenant leads", () => {
  assert.equal(VENDOR_TERMS_VERSION, "2026-10-25");
  assert.ok(VENDOR_TERMS_VERSION > "2026-10-24", "newer than the version vendors first accepted");
  assert.equal(COVENANT_SINCE, VENDOR_TERMS_VERSION);
  const sections = vendorTerms();
  assert.equal(sections[0]!.heading, "The Vendor Covenant");
  assert.equal(sections[0]!.covenant, true);
  assert.equal(sections.filter((section) => section.covenant).length, 1);
  // Rates, reporting, and disclosure are still there, after the covenant.
  const headings = sections.map((section) => section.heading);
  for (const heading of [
    "The 2% rebate",
    "The 10% referral fee",
    "Reporting and when fees are due",
    "Disclosure",
  ]) {
    assert.ok(headings.indexOf(heading) > 0, heading);
  }
  assert.match(vendorTermsText(), new RegExp(AGREE_LABEL));
  assert.equal(AGREE_LABEL, "I agree to the Vendor Covenant and Vendor Terms");
});

test("the covenant says what the owner asked for, in short commitments", () => {
  const text = covenantText();
  const titles = vendorCovenant().points!.map((point) => point.title);
  assert.deepEqual(titles, [
    "Make it right.",
    "Stand behind your work.",
    "Go above and beyond.",
    "Care about the church’s success.",
    "Quote honestly.",
    "Answer problems quickly.",
    "Accept United Under God’s resolution.",
  ]);
  assert.match(text, /If it isn’t right for the church, you fix it, promptly/);
  assert.match(text, /costs the church nothing more/);
  assert.match(text, /Honor your warranty and your word/);
  assert.match(text, /the way you would want your own church served/);
  assert.match(text, /honest advice, even when it means a smaller sale/);
  assert.match(
    text,
    /final bill matches the quote, unless the church approves a change in writing/,
  );
  assert.match(text, /within 2 business days/);
  assert.match(text, /hears both sides and decides/);
  assert.match(text, /appoint a committee to mediate/);
  assert.match(text, /a repair, a redo, a credit, or a refund of the disputed part/);
  for (const step of [
    "warned",
    "placed on probation",
    "suspended from bid invitations and catalogs",
    "revoked from the program",
  ]) {
    assert.ok(text.includes(step), step);
  }
  assert.match(text, /recorded on your standing/);
  // No cash fines; no vetting checklist; the owner's copy rules.
  assert.ok(!/\bfine[sd]?\b|\$\d|penalty fee/i.test(text), "no cash fines");
  assert.ok(!/background check|reference call|certificate of insurance/i.test(text));
  assert.ok(!/\bAI\b/.test(text));
  assert.ok(!/\bmembers?(hip)?\b/i.test(text));
  assert.ok(!/guarantee/i.test(text));
  assert.ok(!new RegExp(["mes", "sen", "ger"].join(""), "i").test(text));
});

test("the response window comes from the covenant config", () => {
  assert.equal(COVENANT.responseBusinessDays, 2);
  assert.match(covenantText({ responseBusinessDays: 3 }), /within 3 business days/);
  assert.ok(!/2 business/.test(covenantText({ responseBusinessDays: 3 })));
});

test("vendors on an older version need to accept the new covenant", () => {
  assert.equal(needsCovenant("2026-10-24"), true);
  assert.equal(needsCovenant(""), true);
  assert.equal(needsCovenant(VENDOR_TERMS_VERSION), false);
  assert.equal(acceptedCovenant("2026-10-24"), false);
  assert.equal(acceptedCovenant(VENDOR_TERMS_VERSION), true);
});
