import type { Sql } from "./db.ts";
import { getSpendCategory } from "./church-spend.ts";

/**
 * Vendor files (brochures, price sheets, package and service descriptions),
 * stored in Postgres as bytea: no file service. PDF, JPG, PNG, and WebP only,
 * 5 MB each, 20 per vendor. The type is read from the file's first bytes, not
 * its name.
 *
 * Uploads arrive in chunks under the host's request-size limit; the row stays
 * 'uploading' until every byte is in, and only 'ready' files are served.
 *
 * Imported by node's test runner: relative imports, no framework code.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_VENDOR = 20;
/** Under the 4.5 MB request body limit on the host, with room for headers. */
export const UPLOAD_CHUNK_BYTES = 3 * 1024 * 1024;
/** An upload that has not finished in this long is abandoned and cleared. */
export const STALE_UPLOAD_MS = 60 * 60 * 1000;

export const FILE_KINDS = ["brochure", "price_sheet", "package", "service"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  brochure: "Brochure",
  price_sheet: "Price sheet",
  package: "Package description",
  service: "Service description",
};

export type FileType = {
  contentType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  extensions: string[];
};

export const FILE_TYPES: FileType[] = [
  { contentType: "application/pdf", extensions: ["pdf"] },
  { contentType: "image/jpeg", extensions: ["jpg", "jpeg"] },
  { contentType: "image/png", extensions: ["png"] },
  { contentType: "image/webp", extensions: ["webp"] },
];

export const ACCEPT_ATTRIBUTE = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

const ascii = (value: string) => [...value].map((char) => char.charCodeAt(0));

/** The real type from the first bytes, or null when it is none of the four. */
export function sniffFileType(bytes: Uint8Array): FileType | null {
  const find = (contentType: FileType["contentType"]) =>
    FILE_TYPES.find((type) => type.contentType === contentType) ?? null;
  if (startsWith(bytes, ascii("%PDF-"))) return find("application/pdf");
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return find("image/jpeg");
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return find("image/png");
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return find("image/webp");
  return null;
}

/** A file name safe for storage and for a Content-Disposition header. */
export function safeFilename(raw: string, extension: string): string {
  const base = raw
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9 ._-]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[ ._-]+|[ ._-]+$/g, "")
    .slice(0, 80);
  return `${base || "file"}.${extension}`;
}

export type UploadMeta = {
  filename: string;
  /** The total size the browser says the file is. */
  size: number;
  kind: string;
  title?: string;
  /** A catalog category id, or '' for all. */
  category?: string;
};

export type CleanUpload = {
  filename: string;
  size: number;
  kind: FileKind;
  title: string;
  category: string;
  contentType: FileType["contentType"];
};

/**
 * Every upload rule except the count: the size, the kind, the category, and a
 * type read from the first bytes that matches the file's extension.
 */
export function checkUpload(meta: UploadMeta, firstBytes: Uint8Array): CleanUpload {
  const size = Number(meta.size);
  if (!Number.isInteger(size) || size <= 0) throw new Error("That file is empty.");
  if (size > MAX_FILE_BYTES) throw new Error("Files can be up to 5 MB.");
  if (!(FILE_KINDS as readonly string[]).includes(meta.kind)) {
    throw new Error("Say whether it is a brochure, a price sheet, or a package or service description.");
  }
  const category = (meta.category ?? "").trim();
  if (category && !getSpendCategory(category)) throw new Error("That catalog is not on the list.");
  const extension = (meta.filename.match(/\.([A-Za-z0-9]+)$/)?.[1] ?? "").toLowerCase();
  const sniffed = sniffFileType(firstBytes);
  if (!sniffed) throw new Error("Upload a PDF, JPG, PNG, or WebP file.");
  if (!sniffed.extensions.includes(extension)) {
    throw new Error("The file's name does not match what is inside it. Upload a PDF, JPG, PNG, or WebP file.");
  }
  const filename = safeFilename(meta.filename, sniffed.extensions[0]!);
  const title = (meta.title ?? "").trim().replace(/\s+/g, " ").slice(0, 120) || filename;
  return { filename, size, kind: meta.kind as FileKind, title, category, contentType: sniffed.contentType };
}

/**
 * Content-Disposition for serving a stored file. Images open in the browser;
 * PDFs download. The name is the stored safe name, quoted, plus an RFC 5987
 * copy, so nothing a vendor typed can break the header.
 */
export function contentDisposition(filename: string, contentType: string): string {
  const safe = filename.replace(/[^A-Za-z0-9 ._-]/g, "") || "file";
  const disposition = contentType.startsWith("image/") ? "inline" : "attachment";
  return `${disposition}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

/** Headers for serving a stored file. */
export function fileHeaders(file: { filename: string; contentType: string; size: number }) {
  return {
    "Content-Type": file.contentType,
    "Content-Length": String(file.size),
    "Content-Disposition": contentDisposition(file.filename, file.contentType),
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    "Cache-Control": "private, max-age=300",
    "Referrer-Policy": "no-referrer",
  };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export type VendorFileRow = {
  id: string;
  vendorId: string;
  category: string;
  kind: FileKind;
  title: string;
  filename: string;
  contentType: string;
  size: number;
  status: string;
  createdAt: string;
};

function text(value: unknown) {
  return String(value ?? "");
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return text(value);
}

function mapFile(row: Record<string, unknown>): VendorFileRow {
  const kind = text(row.kind);
  return {
    id: text(row.id),
    vendorId: text(row.vendor_id),
    category: text(row.category),
    kind: ((FILE_KINDS as readonly string[]).includes(kind) ? kind : "brochure") as FileKind,
    title: text(row.title),
    filename: text(row.filename),
    contentType: text(row.content_type),
    size: Number(row.size_bytes ?? 0),
    status: text(row.status),
    createdAt: iso(row.created_at),
  };
}

function toBytes(chunk: Uint8Array): Uint8Array {
  // node-postgres sends a Buffer as bytea; PGLite takes any Uint8Array.
  const NodeBuffer = (globalThis as { Buffer?: { from(data: Uint8Array): Uint8Array } }).Buffer;
  return NodeBuffer ? NodeBuffer.from(chunk) : chunk;
}

const FILE_COLUMNS = "id, vendor_id, category, kind, title, filename, content_type, size_bytes, status, created_at";

/** Ready files, without their bytes. */
export async function listVendorFiles(sql: Sql, vendorIds?: string[]): Promise<VendorFileRow[]> {
  const rows = vendorIds
    ? vendorIds.length
      ? await sql.query(
          `select ${FILE_COLUMNS} from source_vendor_files where status = 'ready' and vendor_id = any($1) order by created_at`,
          [vendorIds],
        )
      : []
    : await sql.query(
        `select ${FILE_COLUMNS} from source_vendor_files where status = 'ready' order by created_at`,
      );
  return rows.map(mapFile);
}

/**
 * Start an upload with its first chunk. Checks the type, size, and count, and
 * clears this vendor's abandoned uploads first. Returns the new file id and
 * whether it is already complete.
 */
export async function startUpload(
  sql: Sql,
  vendorId: string,
  meta: UploadMeta,
  chunk: Uint8Array,
  now = new Date(),
): Promise<{ id: string; received: number; ready: boolean }> {
  const clean = checkUpload(meta, chunk);
  if (chunk.length === 0 || chunk.length > clean.size) throw new Error("That upload did not arrive whole.");
  if (chunk.length > UPLOAD_CHUNK_BYTES) throw new Error("That upload piece is too large.");
  const stale = new Date(now.getTime() - STALE_UPLOAD_MS).toISOString();
  await sql`
    delete from source_vendor_files
    where vendor_id = ${vendorId} and status = 'uploading' and created_at < ${stale}
  `;
  const count = await sql<{ n: number }>`
    select count(*)::int as n from source_vendor_files where vendor_id = ${vendorId}
  `;
  if (Number(count[0]?.n ?? 0) >= MAX_FILES_PER_VENDOR) {
    throw new Error(`You can keep up to ${MAX_FILES_PER_VENDOR} files. Remove one to add another.`);
  }
  const id = crypto.randomUUID();
  const ready = chunk.length === clean.size;
  await sql`
    insert into source_vendor_files (
      id, vendor_id, category, kind, title, filename, content_type, size_bytes, content,
      status, ready_at
    ) values (
      ${id}, ${vendorId}, ${clean.category}, ${clean.kind}, ${clean.title}, ${clean.filename},
      ${clean.contentType}, ${clean.size}, ${toBytes(chunk)}, ${ready ? "ready" : "uploading"},
      ${ready ? now.toISOString() : null}
    )
  `;
  return { id, received: chunk.length, ready };
}

/** Add the next chunk at the exact offset the stored bytes have reached. */
export async function appendUpload(
  sql: Sql,
  vendorId: string,
  fileId: string,
  offset: number,
  chunk: Uint8Array,
): Promise<{ id: string; received: number; ready: boolean }> {
  if (chunk.length === 0 || chunk.length > UPLOAD_CHUNK_BYTES) {
    throw new Error("That upload piece is the wrong size.");
  }
  const rows = await sql<{ received: number; size_bytes: number }>`
    update source_vendor_files set content = content || ${toBytes(chunk)}
    where id = ${fileId} and vendor_id = ${vendorId} and status = 'uploading'
      and octet_length(content) = ${offset}
      and octet_length(content) + ${chunk.length} <= size_bytes
    returning octet_length(content) as received, size_bytes
  `;
  const row = rows[0];
  if (!row) throw new Error("That upload could not continue. Start it again.");
  const received = Number(row.received);
  const ready = received === Number(row.size_bytes);
  if (ready) {
    await sql`
      update source_vendor_files set status = 'ready', ready_at = now()
      where id = ${fileId} and vendor_id = ${vendorId}
    `;
  }
  return { id: fileId, received, ready };
}

export async function deleteVendorFile(sql: Sql, vendorId: string, fileId: string) {
  const rows = await sql<{ id: string }>`
    delete from source_vendor_files where id = ${fileId} and vendor_id = ${vendorId} returning id
  `;
  if (!rows[0]) throw new Error("That file is not in your portal.");
}

/** Every file of a vendor (portal view), including unfinished uploads. */
export async function listOwnFiles(sql: Sql, vendorId: string): Promise<VendorFileRow[]> {
  const rows = await sql.query(
    `select ${FILE_COLUMNS} from source_vendor_files where vendor_id = $1 order by created_at`,
    [vendorId],
  );
  return rows.map(mapFile);
}

/**
 * One file with its bytes, for the file route: ready, and from a vendor that
 * is listed in the catalogs (approved, not suspended or revoked).
 */
export async function readServableFile(
  sql: Sql,
  fileId: string,
): Promise<(VendorFileRow & { content: Uint8Array }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(fileId)) return null;
  const rows = await sql`
    select f.*, v.status as vendor_status,
      coalesce(to_jsonb(v) ->> 'consequence', '') as vendor_consequence
    from source_vendor_files f join source_vendors v on v.id = f.vendor_id
    where f.id = ${fileId} and f.status = 'ready'
  `;
  const row = rows[0];
  if (!row) return null;
  const consequence = text(row.vendor_consequence);
  if (text(row.vendor_status) !== "approved" || consequence === "suspension" || consequence === "revocation") {
    return null;
  }
  const content = row.content instanceof Uint8Array ? row.content : new Uint8Array();
  return { ...mapFile(row), content };
}

/** "1.2 MB" or "340 KB". */
export function fileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function fileCatalogName(categoryId: string) {
  return categoryId ? (getSpendCategory(categoryId)?.name ?? "") : "";
}
