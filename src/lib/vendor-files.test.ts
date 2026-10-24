import assert from "node:assert/strict";
import { test } from "node:test";
import { freshProgramDb } from "./program-test-db.ts";
import { cleanVendorSignup, createVendor, updateVendor } from "./vendor-store.ts";
import { VENDOR_TERMS_VERSION } from "./vendor-terms.ts";
import {
  MAX_FILES_PER_VENDOR,
  MAX_FILE_BYTES,
  UPLOAD_CHUNK_BYTES,
  appendUpload,
  checkUpload,
  contentDisposition,
  deleteVendorFile,
  fileHeaders,
  listOwnFiles,
  listVendorFiles,
  readServableFile,
  safeFilename,
  sniffFileType,
  startUpload,
} from "./vendor-files.ts";

const PDF = new TextEncoder().encode("%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const WEBP = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBPVP8 ")]);
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");
const GIF = new TextEncoder().encode("GIF89a......");

function meta(filename: string, size: number, extra: Partial<Parameters<typeof checkUpload>[0]> = {}) {
  return { filename, size, kind: "brochure", title: "", category: "", ...extra };
}

test("upload validation: the type comes from the first bytes, and must match the name", () => {
  assert.equal(sniffFileType(PDF)?.contentType, "application/pdf");
  assert.equal(sniffFileType(PNG)?.contentType, "image/png");
  assert.equal(sniffFileType(JPG)?.contentType, "image/jpeg");
  assert.equal(sniffFileType(WEBP)?.contentType, "image/webp");
  assert.equal(sniffFileType(HTML), null);
  assert.equal(sniffFileType(GIF), null, "GIF is not allowed");
  assert.equal(sniffFileType(new Uint8Array()), null);

  assert.equal(checkUpload(meta("Price Sheet.PDF", PDF.length), PDF).contentType, "application/pdf");
  assert.equal(checkUpload(meta("photo.jpeg", JPG.length), JPG).filename, "photo.jpg");
  assert.equal(checkUpload(meta("photo.webp", WEBP.length), WEBP).contentType, "image/webp");
  // An HTML page renamed to .pdf is refused by its bytes.
  assert.throws(() => checkUpload(meta("brochure.pdf", HTML.length), HTML), /PDF, JPG, PNG, or WebP/);
  // A real PNG named .pdf is refused: the name must match what is inside.
  assert.throws(() => checkUpload(meta("brochure.pdf", PNG.length), PNG), /does not match/);
  assert.throws(() => checkUpload(meta("brochure", PDF.length), PDF), /does not match/);
  assert.throws(() => checkUpload(meta("anim.gif", GIF.length), GIF), /PDF, JPG, PNG, or WebP/);
  assert.throws(() => checkUpload(meta("a.pdf", PDF.length, { kind: "video" }), PDF), /brochure/);
  assert.throws(() => checkUpload(meta("a.pdf", PDF.length, { category: "nope" }), PDF), /catalog/);
});

test("upload validation: size", () => {
  assert.equal(MAX_FILE_BYTES, 5 * 1024 * 1024);
  assert.ok(UPLOAD_CHUNK_BYTES < 4.5 * 1024 * 1024, "each piece fits the host's request limit");
  assert.ok(checkUpload(meta("a.pdf", MAX_FILE_BYTES), PDF));
  assert.throws(() => checkUpload(meta("a.pdf", MAX_FILE_BYTES + 1), PDF), /up to 5 MB/);
  assert.throws(() => checkUpload(meta("a.pdf", 0), PDF), /empty/);
});

test("names and headers are safe to serve", () => {
  assert.equal(safeFilename("../../etc/passwd\r\n.pdf", "pdf"), "passwd.pdf");
  assert.equal(safeFilename('a"b;c<d>.pdf', "pdf"), "abcd.pdf");
  assert.equal(safeFilename("....pdf", "pdf"), "file.pdf");
  assert.equal(safeFilename("Ünïcode brochure.pdf", "pdf"), "Unicode brochure.pdf");
  assert.equal(
    contentDisposition("price sheet.pdf", "application/pdf"),
    `attachment; filename="price sheet.pdf"; filename*=UTF-8''price%20sheet.pdf`,
  );
  assert.match(contentDisposition("photo.png", "image/png"), /^inline; /);
  assert.ok(!/[\r\n"]/.test(contentDisposition('x"\r\ny.pdf', "application/pdf").replace(/filename="[^"]*"/, "")));
  const headers = fileHeaders({ filename: "a.pdf", contentType: "application/pdf", size: 10 });
  assert.equal(headers["Content-Type"], "application/pdf");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.match(headers["Content-Security-Policy"], /sandbox/);
});

test("storage: chunks, count limit, only ready files from listed vendors are served", async () => {
  const sql = await freshProgramDb();
  const { id: vendorId } = await createVendor(
    sql,
    cleanVendorSignup({
      company: "Shine",
      contactName: "Sam",
      email: "sam@shine.example",
      phone: "404-555-0100",
      categories: ["janitorial-supplies"],
      states: ["GA"],
      nationwide: false,
      insured: "yes",
      agreed: true,
      termsVersion: VENDOR_TERMS_VERSION,
    }),
    { ip: "" },
  );
  await updateVendor(sql, vendorId, { status: "approved" }, "lincoln");

  // A file in two pieces: not served until the last byte is in.
  const whole = new Uint8Array([...PDF, ...new Uint8Array(40).fill(65)]);
  const first = whole.slice(0, 20);
  const rest = whole.slice(20);
  const started = await startUpload(sql, vendorId, meta("Price sheet.pdf", whole.length, { kind: "price_sheet" }), first);
  assert.equal(started.ready, false);
  assert.equal(await readServableFile(sql, started.id), null, "not served while uploading");
  await assert.rejects(appendUpload(sql, vendorId, started.id, 5, rest), /could not continue/, "wrong offset");
  await assert.rejects(appendUpload(sql, "someone-else", started.id, 20, rest), /could not continue/);
  const done = await appendUpload(sql, vendorId, started.id, 20, rest);
  assert.deepEqual(done, { id: started.id, received: whole.length, ready: true });
  const served = await readServableFile(sql, started.id);
  assert.ok(served);
  assert.deepEqual([...served!.content], [...whole]);
  assert.equal(served!.contentType, "application/pdf");
  assert.equal(served!.filename, "Price sheet.pdf");
  // More bytes than declared are refused.
  await assert.rejects(appendUpload(sql, vendorId, started.id, whole.length, PDF), /could not continue/);

  // The count: 20 per vendor.
  for (let i = 1; i < MAX_FILES_PER_VENDOR; i += 1) {
    await startUpload(sql, vendorId, meta(`f${i}.png`, PNG.length), PNG);
  }
  assert.equal((await listOwnFiles(sql, vendorId)).length, MAX_FILES_PER_VENDOR);
  await assert.rejects(startUpload(sql, vendorId, meta("one-more.png", PNG.length), PNG), /up to 20 files/);
  await deleteVendorFile(sql, vendorId, started.id);
  await startUpload(sql, vendorId, meta("one-more.png", PNG.length), PNG);
  await assert.rejects(deleteVendorFile(sql, "someone-else", (await listOwnFiles(sql, vendorId))[0]!.id), /not in your portal/);

  // An abandoned upload is cleared after an hour and frees its place.
  await deleteVendorFile(sql, vendorId, (await listOwnFiles(sql, vendorId))[0]!.id);
  const stuck = await startUpload(sql, vendorId, meta("stuck.pdf", 100), PDF);
  assert.equal(stuck.ready, false);
  await startUpload(sql, vendorId, meta("later.pdf", PDF.length), PDF, new Date(Date.now() + 2 * 3_600_000)).catch(
    (err) => assert.fail(err),
  );
  assert.ok(!(await listOwnFiles(sql, vendorId)).some((file) => file.id === stuck.id));

  // Public lists show ready files only; a suspended vendor's files are not served.
  const listed = await listVendorFiles(sql, [vendorId]);
  assert.ok(listed.every((file) => file.status === "ready"));
  await sql`update source_vendors set status = 'paused', consequence = 'suspension' where id = ${vendorId}`;
  assert.equal(await readServableFile(sql, listed[0]!.id), null);
  assert.equal(await readServableFile(sql, "not-a-uuid"), null);
});
