import assert from "node:assert/strict";
import { test } from "node:test";
import { freshProgramDb, linkIn, mailbox } from "./program-test-db.ts";
import { cleanVendorSignup, createVendor, updateVendor } from "./vendor-store.ts";
import { VENDOR_TERMS_VERSION } from "./vendor-terms.ts";
import { REVIEW_PAGE_PATH, sendReviewRequest, submitReview } from "./review-store.ts";
import { saveProfile } from "./vendor-portal-store.ts";
import { startUpload } from "./vendor-files.ts";
import {
  catalogVendorsForViewer,
  lockCatalogVendor,
  lockVendorProfile,
  vendorProfileForViewer,
} from "./vendor-listing.ts";
import { canViewVendorFiles } from "./vendor-file-access.ts";

const SITE = "https://www.unitedundergod.org";
const PDF = new TextEncoder().encode("%PDF-1.7\nprice sheet\n");

/** Strings that must never reach a viewer who is not a member church. */
const SECRET = [
  "Floors since 1998",
  "shine.example",
  "sam@shine.example",
  "404-555-0123",
  "Fall price sheet",
  "/api/vendor-files/",
  "Spotless every week",
];

async function seeded() {
  const sql = await freshProgramDb();
  const { id } = await createVendor(
    sql,
    cleanVendorSignup({
      company: "Shine Janitorial",
      contactName: "Sam Cole",
      email: "sam@shine.example",
      phone: "404-555-0123",
      website: "shine.example",
      categories: ["janitorial-supplies"],
      states: ["GA"],
      nationwide: false,
      insured: "yes",
      agreed: true,
      termsVersion: VENDOR_TERMS_VERSION,
    }),
    { ip: "" },
  );
  await updateVendor(sql, id, { status: "approved" }, "lincoln");
  await saveProfile(sql, id, {
    description: "Floors since 1998.",
    website: "shine.example",
    phone: "404-555-0123",
    nationwide: false,
    states: ["GA"],
    places: "",
    categories: (await sql<{ categories: string[] }>`select categories from source_vendors where id = ${id}`)[0]!
      .categories,
  });
  await startUpload(sql, id, { filename: "fall.pdf", size: PDF.length, kind: "price_sheet", title: "Fall price sheet" }, PDF);
  // Three verified reviews: a record, so the vendor is ranked and Preferred.
  for (const church of ["A", "B", "C"]) {
    const box = mailbox();
    const out = await sendReviewRequest(
      sql,
      { vendorId: id, category: "janitorial-supplies", churchName: `Church ${church}`, email: `${church}@x.example`, job: "Supplies" },
      { sentBy: "lincoln", siteUrl: SITE, send: box.send },
    );
    const { token } = linkIn(box.sent[0]!.text, REVIEW_PAGE_PATH);
    await submitReview(sql, {
      requestId: out.id,
      token,
      overall: 5,
      quality: 5,
      onTime: "yes",
      billMatched: "yes",
      hireAgain: "yes",
      comment: "Spotless every week.",
      showChurchName: false,
    });
  }
  return { sql, id };
}

test("catalog: a non-member gets names, the count, and Preferred only; a member gets everything", async () => {
  const { sql, id } = await seeded();
  const locked = await catalogVendorsForViewer(sql, "janitorial-supplies", { member: false });
  assert.equal(locked.member, false);
  assert.equal(locked.count, 1);
  assert.equal(locked.filesVisible, false);
  assert.deepEqual(locked.vendors, [{ id, company: "Shine Janitorial", preferred: true, locked: true }]);
  const lockedJson = JSON.stringify(locked);
  for (const secret of SECRET) assert.ok(!lockedJson.includes(secret), `non-member sees ${secret}`);
  assert.ok(!/reviewCount|reviewAverage|score|website|phone|email|files/.test(JSON.stringify(locked.vendors)));

  const open = await catalogVendorsForViewer(sql, "janitorial-supplies", { member: true });
  assert.equal(open.member, true);
  const json = JSON.stringify(open);
  for (const secret of ["Floors since 1998", "shine.example", "sam@shine.example", "404-555-0123", "Fall price sheet"]) {
    assert.ok(json.includes(secret), `member misses ${secret}`);
  }
  const vendor = open.vendors[0]!;
  assert.ok(!vendor.locked && vendor.files.length === 1 && vendor.reviewCount === 3);
});

test("the vendor's email: member churches and staff see it; non-members never do", async () => {
  const { sql, id } = await seeded();
  const member = await catalogVendorsForViewer(sql, "janitorial-supplies", { member: true });
  const card = member.vendors[0]!;
  assert.ok(!card.locked);
  if (!card.locked) assert.equal(card.email, "sam@shine.example");
  const profile = await vendorProfileForViewer(sql, id, { member: true });
  assert.ok(profile && !profile.locked);
  if (profile && !profile.locked) assert.equal(profile.email, "sam@shine.example");

  const locked = await catalogVendorsForViewer(sql, "janitorial-supplies", { member: false });
  assert.ok(!JSON.stringify(locked).includes("sam@shine.example"));
  assert.ok(!("email" in locked.vendors[0]!));
  const lockedProfile = await vendorProfileForViewer(sql, id, { member: false });
  assert.ok(!JSON.stringify(lockedProfile).includes("sam@"));
  assert.ok(!("email" in lockedProfile!));
});

test("profile: a non-member gets the name, catalogs, and standing; a member gets reviews and files", async () => {
  const { sql, id } = await seeded();
  const locked = await vendorProfileForViewer(sql, id, { member: false });
  assert.ok(locked?.locked);
  assert.deepEqual(Object.keys(locked!).sort(), ["catalogs", "company", "id", "locked"]);
  assert.equal(locked!.catalogs[0]!.preferred, true);
  const lockedJson = JSON.stringify(locked);
  for (const secret of SECRET) assert.ok(!lockedJson.includes(secret), `non-member sees ${secret}`);

  const open = await vendorProfileForViewer(sql, id, { member: true });
  assert.ok(open && !open.locked);
  assert.equal(open.reviews.length, 3);
  assert.match(open.reviews[0]!.comment, /Spotless every week/);
  assert.equal(open.files[0]!.title, "Fall price sheet");
  assert.equal(open.website, "https://shine.example");
});

test("the locks are allow-lists: a field added later is withheld by default", () => {
  const vendor = lockCatalogVendor({ id: "v", company: "C", preferred: false, phone: "1", secretNew: "x" } as never);
  assert.deepEqual(vendor, { id: "v", company: "C", preferred: false, locked: true });
  const profile = lockVendorProfile({ id: "v", company: "C", catalogs: [], reviews: [{}], newField: 1 } as never);
  assert.deepEqual(profile, { id: "v", company: "C", catalogs: [], locked: true });
});

test("vendor files are closed without a request (member check fails closed)", async () => {
  assert.equal(await canViewVendorFiles(null), false);
  assert.equal(await canViewVendorFiles(undefined, { ownerVendorId: "v" }), false);
});
