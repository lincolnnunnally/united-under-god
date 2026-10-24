import assert from "node:assert/strict";
import { test } from "node:test";
import type { Sql } from "./db.ts";
import { freshProgramDb, linkIn, mailbox } from "./program-test-db.ts";
import { bidTemplate } from "./church-spend.ts";
import { createBid } from "./source-store.ts";
import {
  cleanVendorSignup,
  createVendor,
  readInvitedBid,
  sendInvites,
  updateVendor,
  type VendorSignupInput,
} from "./vendor-store.ts";
import { FEE_OFFER_MAX, VENDOR_TERMS_VERSION } from "./vendor-terms.ts";
import {
  LOGIN_LINK_MINUTES,
  PORTAL_PATH,
  acceptTermsInPortal,
  cleanMonth,
  decideCategoryRequest,
  endSession,
  listCategoryRequests,
  listOffers,
  portalBidLink,
  readPortal,
  redeemLoginLink,
  requestLoginLink,
  saveProfile,
  sessionVendorId,
  setOffer,
  submitReport,
} from "./vendor-portal-store.ts";
import { listReviewRequests } from "./review-store.ts";

const SITE = "https://www.unitedundergod.org";
const NOW = new Date("2026-10-24T15:00:00Z");

function signup(overrides: Partial<VendorSignupInput> = {}): VendorSignupInput {
  return {
    company: "Coastal Office Supply",
    contactName: "Dana Reed",
    email: "Dana@Coastal.example",
    phone: "(912) 555-0100",
    website: "coastal.example",
    categories: ["printing-copiers/toner-ink", "janitorial-supplies"],
    states: ["GA"],
    places: "",
    nationwide: false,
    insured: "yes",
    notes: "",
    agreed: true,
    termsVersion: VENDOR_TERMS_VERSION,
    ...overrides,
  };
}

async function approved(sql: Sql, overrides: Partial<VendorSignupInput> = {}) {
  const { id } = await createVendor(sql, cleanVendorSignup(signup(overrides)), { ip: "203.0.113.9" });
  await updateVendor(sql, id, { status: "approved" }, "lincoln");
  return id;
}

async function signIn(sql: Sql, now = NOW, email = "dana@coastal.example") {
  const box = mailbox();
  await requestLoginLink(sql, { email, ip: "203.0.113.9", siteUrl: SITE, send: box.send, now });
  const { token } = linkIn(box.sent[0]!.text, PORTAL_PATH);
  return (await redeemLoginLink(sql, token, now)).sessionToken;
}

// --- magic-link access -----------------------------------------------------------

test("portal sign-in: a one-time link to the vendor's email, only a hash stored", async () => {
  const sql = await freshProgramDb();
  const vendorId = await approved(sql);
  const box = mailbox();
  const out = await requestLoginLink(sql, {
    email: " DANA@coastal.example ",
    ip: "203.0.113.9",
    siteUrl: SITE,
    send: box.send,
    now: NOW,
  });
  assert.deepEqual(out, { sent: true, reason: "" });
  assert.equal(box.sent.length, 1);
  assert.equal(box.sent[0]!.to, "dana@coastal.example");
  assert.match(box.sent[0]!.text, new RegExp(`expires in ${LOGIN_LINK_MINUTES} minutes`));
  const { url, token } = linkIn(box.sent[0]!.text, PORTAL_PATH);
  assert.equal(url.pathname, PORTAL_PATH);
  const stored = await sql<{ token_hash: string }>`select token_hash from source_vendor_login_links`;
  assert.notEqual(stored[0]!.token_hash, token, "the token itself is not stored");
  assert.match(stored[0]!.token_hash, /^[0-9a-f]{64}$/);

  // A second request inside a minute sends nothing.
  const again = await requestLoginLink(sql, { email: "dana@coastal.example", ip: "", siteUrl: SITE, send: box.send, now: NOW });
  assert.equal(again.reason, "throttled");
  assert.equal(box.sent.length, 1);

  // Unknown emails get the same quiet answer and no email.
  const unknown = await requestLoginLink(sql, { email: "who@else.example", ip: "", siteUrl: SITE, send: box.send, now: NOW });
  assert.deepEqual(unknown, { sent: false, reason: "unknown" });
  assert.equal(box.sent.length, 1);

  // The link works once, then is spent.
  const session = await redeemLoginLink(sql, token, NOW);
  assert.equal(session.vendorId, vendorId);
  assert.equal(await sessionVendorId(sql, session.sessionToken, NOW), vendorId);
  await assert.rejects(redeemLoginLink(sql, token, NOW), /expired or was already used/);

  // A wrong or malformed token, or an expired link, opens nothing.
  await assert.rejects(redeemLoginLink(sql, "x".repeat(43), NOW), /expired or was already used/);
  await assert.rejects(redeemLoginLink(sql, "short", NOW), /not valid/);
  const late = mailbox();
  const later = new Date(NOW.getTime() + 5 * 60_000);
  await requestLoginLink(sql, { email: "dana@coastal.example", ip: "", siteUrl: SITE, send: late.send, now: later });
  const stale = linkIn(late.sent[0]!.text, PORTAL_PATH).token;
  await assert.rejects(
    redeemLoginLink(sql, stale, new Date(later.getTime() + (LOGIN_LINK_MINUTES + 1) * 60_000)),
    /expired/,
  );

  // Sessions: unknown and ended sessions read as nobody; removal ends access.
  assert.equal(await sessionVendorId(sql, "y".repeat(43), NOW), null);
  assert.equal(await sessionVendorId(sql, "", NOW), null);
  assert.equal(await sessionVendorId(sql, session.sessionToken, new Date(NOW.getTime() + 31 * 86_400_000)), null);
  const second = await signIn(sql, new Date(NOW.getTime() + 60 * 60_000));
  await endSession(sql, second);
  assert.equal(await sessionVendorId(sql, second, NOW), null);
  await updateVendor(sql, vendorId, { status: "removed" }, "lincoln");
  assert.equal(await sessionVendorId(sql, session.sessionToken, NOW), null);
});

// --- profile, category re-approval -----------------------------------------------

test("profile edits apply now; category changes wait for the owner", async () => {
  const sql = await freshProgramDb();
  const vendorId = await approved(sql);
  const before = await readPortal(sql, vendorId, NOW);
  const out = await saveProfile(sql, vendorId, {
    description: "Toner, paper, and cleaning supplies for churches in Georgia.",
    website: "coastal.example/churches",
    phone: "912-555-0199",
    nationwide: false,
    states: ["GA", "SC"],
    places: "Savannah",
    categories: [...before.vendor.categories, "office-supplies/office-paper"],
  });
  assert.equal(out.categoriesPending, true);
  const view = await readPortal(sql, vendorId, NOW);
  assert.equal(view.vendor.description, "Toner, paper, and cleaning supplies for churches in Georgia.");
  assert.equal(view.vendor.website, "https://coastal.example/churches");
  assert.equal(view.vendor.phone, "912-555-0199");
  assert.deepEqual(view.vendor.states, ["GA", "SC"]);
  assert.deepEqual(view.vendor.categories, before.vendor.categories, "categories are unchanged until approved");
  assert.ok(view.vendor.requestedCategories.includes("office-supplies/office-paper"));

  const waiting = await listCategoryRequests(sql);
  assert.equal(waiting.length, 1);
  assert.deepEqual(waiting[0]!.added, ["office-supplies/office-paper"]);
  await decideCategoryRequest(sql, vendorId, true, "lincoln");
  const approvedView = await readPortal(sql, vendorId, NOW);
  assert.ok(approvedView.vendor.categories.includes("office-supplies/office-paper"));
  assert.deepEqual(approvedView.vendor.requestedCategories, []);
  assert.equal((await listCategoryRequests(sql)).length, 0);

  // Declined: nothing changes.
  await saveProfile(sql, vendorId, { ...approvedView.vendor, places: "", categories: ["grounds"] });
  await decideCategoryRequest(sql, vendorId, false, "lincoln");
  assert.deepEqual((await readPortal(sql, vendorId, NOW)).vendor.categories, approvedView.vendor.categories);

  // Saving the same categories asks for nothing.
  const same = await saveProfile(sql, vendorId, { ...approvedView.vendor, places: "" });
  assert.equal(same.categoriesPending, false);

  await assert.rejects(
    saveProfile(sql, vendorId, { ...approvedView.vendor, places: "", categories: ["insurance"] }),
    /handled separately/,
  );
  await assert.rejects(saveProfile(sql, vendorId, { ...approvedView.vendor, places: "", phone: "12" }), /phone/);
});

// --- fee offers: floors enforced ----------------------------------------------------

test("offers: per catalog, at or above the floor, only where the vendor serves", async () => {
  const sql = await freshProgramDb();
  const vendorId = await approved(sql);
  const offers = await listOffers(sql, vendorId, (await readPortal(sql, vendorId, NOW)).vendor.categories);
  assert.deepEqual(offers.map((row) => row.category), ["printing-copiers", "janitorial-supplies"]);
  assert.deepEqual(offers[0]!.floors, { rebate: 2, referral: 10 }, "toner and copiers: catalog and project items");
  assert.deepEqual(offers[1]!.floors, { rebate: 2 }, "janitorial supplies: catalog and contract only");
  assert.equal(offers[0]!.rebate, null, "nothing saved yet means the floor");

  await assert.rejects(setOffer(sql, vendorId, { category: "printing-copiers", rebate: "1.5" }), /at least 2%/);
  await assert.rejects(setOffer(sql, vendorId, { category: "printing-copiers", rebate: "0" }), /at least 2%/);
  await assert.rejects(
    setOffer(sql, vendorId, { category: "printing-copiers", rebate: String(FEE_OFFER_MAX + 5) }),
    /or less/,
  );
  await assert.rejects(setOffer(sql, vendorId, { category: "grounds", rebate: "3" }), /a catalog you serve/);
  await assert.rejects(setOffer(sql, vendorId, { category: "insurance", rebate: "3" }), /no program fee/);

  await assert.rejects(
    setOffer(sql, vendorId, { category: "printing-copiers", rebate: "3", referral: "9" }),
    /at least 10%/,
  );
  const saved = await setOffer(sql, vendorId, { category: "printing-copiers", rebate: "3.5", referral: "12" });
  assert.deepEqual(saved, { rebate: 3.5, referral: 12 });
  const rows = await sql`select rebate_percent, referral_percent from source_vendor_offers where vendor_id = ${vendorId}`;
  assert.equal(Number(rows[0]!.rebate_percent), 3.5);
  assert.equal(Number(rows[0]!.referral_percent), 12);
  const janitorial = await setOffer(sql, vendorId, { category: "janitorial-supplies", rebate: "4", referral: "30" });
  assert.deepEqual(janitorial, { rebate: 4, referral: null }, "a fee kind the catalog does not carry is ignored");
  // Blank goes back to the floor.
  assert.deepEqual(await setOffer(sql, vendorId, { category: "printing-copiers", rebate: "", referral: "" }), {
    rebate: 2,
    referral: 10,
  });

  // A vendor still on older terms accepts the current ones first.
  await sql`update source_vendors set terms_version = '2026-10-25' where id = ${vendorId}`;
  await assert.rejects(setOffer(sql, vendorId, { category: "printing-copiers", rebate: "3" }), /Accept the current Vendor Terms/);
  await assert.rejects(
    acceptTermsInPortal(sql, vendorId, { agreed: false, termsVersion: VENDOR_TERMS_VERSION, ip: "" }),
    /Tick/,
  );
  await acceptTermsInPortal(sql, vendorId, { agreed: true, termsVersion: VENDOR_TERMS_VERSION, ip: "203.0.113.9" });
  assert.deepEqual(await setOffer(sql, vendorId, { category: "janitorial-supplies", rebate: "3" }), { rebate: 3, referral: null });
});

// --- monthly reports and the review request -----------------------------------------

test("monthly reports: sales, none, and a closed job that asks the church for a review", async () => {
  const sql = await freshProgramDb();
  const vendorId = await approved(sql);
  const box = mailbox();
  const args = { siteUrl: SITE, send: box.send, now: NOW };

  assert.equal(cleanMonth("2026-10", NOW), "2026-10");
  assert.throws(() => cleanMonth("2026-11", NOW), /once it has started/);
  assert.throws(() => cleanMonth("2024-01", NOW), /last two years/);
  assert.throws(() => cleanMonth("October", NOW), /Pick the month/);

  await submitReport(sql, vendorId, { month: "2026-09", kind: "none" }, args);
  await submitReport(sql, vendorId, { month: "2026-10", kind: "sales", category: "printing-copiers", amount: "$1,250.00" }, args);
  await assert.rejects(
    submitReport(sql, vendorId, { month: "2026-10", kind: "sales", category: "grounds", amount: "10" }, args),
    /catalog you serve/,
  );
  assert.equal(box.sent.length, 0, "sales and none reports send nothing");

  await assert.rejects(
    submitReport(sql, vendorId, { month: "2026-10", kind: "job", category: "janitorial-supplies", amount: "400", description: "Floor care kit" }, args),
    /church's name/,
  );
  const job = await submitReport(
    sql,
    vendorId,
    {
      month: "2026-10",
      kind: "job",
      category: "janitorial-supplies",
      amount: "400",
      description: "Floor care kit and training",
      churchName: "Grace Chapel",
      contactName: "Pat Lee",
      email: "Pat@Grace.example",
      closedOn: "2026-10-20",
    },
    args,
  );
  assert.equal(job.reviewRequest, "sent");
  assert.equal(box.sent.length, 1);
  assert.equal(box.sent[0]!.to, "pat@grace.example");
  assert.match(box.sent[0]!.text, /told us it finished a job for Grace Chapel/);
  assert.match(box.sent[0]!.text, /Floor care kit and training/);
  const requests = await listReviewRequests(sql);
  assert.equal(requests.length, 1);
  assert.equal(requests[0]!.origin, "report");
  assert.equal(requests[0]!.reportId, job.id);

  const view = await readPortal(sql, vendorId, NOW);
  assert.deepEqual(view.reports.map((row) => row.kind).sort(), ["job", "none", "sales"]);
  assert.equal(view.reports.find((row) => row.kind === "sales")!.amount, "1250.00");
});

// --- the portal view: score, standing, invitations -------------------------------------

test("the portal shows the vendor's own score breakdown, standing, and open invitations", async () => {
  const sql = await freshProgramDb();
  const vendorId = await approved(sql);
  const bidId = await createBid(sql, bidTemplate("printing-copiers", "toner-ink"), "lincoln");
  const box = mailbox();
  await sendInvites(sql, { bidId, vendorIds: [vendorId], userId: "lincoln", siteUrl: SITE, send: box.send });

  const view = await readPortal(sql, vendorId, NOW);
  const toner = view.scores.find((row) => row.category === "printing-copiers")!;
  assert.equal(toner.newToProgram, true, "no record yet");
  assert.equal(toner.score, null);
  assert.ok(toner.breakdown.points.service > 0, "the math still shows");
  assert.deepEqual(view.weights, { service: 50, price: 35, support: 15 });
  assert.equal(view.invites.length, 1);
  assert.equal(view.invites[0]!.bidId, bidId);

  // Opening the bid from the portal uses its own link; the email link still works.
  const emailToken = linkIn(box.sent[0]!.text, "/buying/bids/").token;
  const path = await portalBidLink(sql, vendorId, view.invites[0]!.inviteId);
  const portalToken = new URL(`${SITE}${path}`).searchParams.get("t")!;
  assert.notEqual(portalToken, emailToken);
  assert.equal((await readInvitedBid(sql, bidId, portalToken)).state, "open");
  assert.equal((await readInvitedBid(sql, bidId, emailToken)).state, "open");
  // Another vendor cannot mint a link to this invitation.
  const other = await approved(sql, { company: "Other", email: "o@other.example" });
  await assert.rejects(portalBidLink(sql, other, view.invites[0]!.inviteId), /not in your portal/);

  // On probation: the portal says so; the public never does.
  await sql`update source_vendors set consequence = 'probation' where id = ${vendorId}`;
  const probation = await readPortal(sql, vendorId, NOW);
  assert.equal(probation.scores[0]!.ineligible, "On probation");
});
