import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { sessionVendorId } from "@/lib/vendor-portal-store";
import { UPLOAD_CHUNK_BYTES, appendUpload, startUpload } from "@/lib/vendor-files";
import { portalCookieFrom } from "@/lib/vendor-session.server";

/**
 * Vendor file uploads from the portal, one piece at a time (each under the
 * host's request-size limit). The first piece starts the file and is checked
 * by its bytes; later pieces carry the file id and the offset they start at.
 * Needs the portal session cookie and a same-site request.
 */

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameSite(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/vendor-files/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!sameSite(request)) return json({ ok: false, error: "Upload from your vendor portal." }, 403);
        const length = Number(request.headers.get("content-length") ?? "0");
        if (length > UPLOAD_CHUNK_BYTES) return json({ ok: false, error: "That upload piece is too large." }, 413);
        let sql;
        try {
          sql = await getSql();
        } catch {
          return json({ ok: false, error: "Uploads are not available right now." }, 503);
        }
        const vendorId = await sessionVendorId(sql, portalCookieFrom(request));
        if (!vendorId) return json({ ok: false, error: "Your portal session ended. Sign in again." }, 401);
        const body = new Uint8Array(await request.arrayBuffer());
        if (body.length > UPLOAD_CHUNK_BYTES) return json({ ok: false, error: "That upload piece is too large." }, 413);
        const header = (name: string) => decodeURIComponent(request.headers.get(name) ?? "");
        try {
          const fileId = header("x-file-id");
          const out = fileId
            ? await appendUpload(sql, vendorId, fileId, Number(header("x-offset")), body)
            : await startUpload(
                sql,
                vendorId,
                {
                  filename: header("x-file-name"),
                  size: Number(header("x-file-size")),
                  kind: header("x-file-kind"),
                  title: header("x-file-title"),
                  category: header("x-file-category"),
                },
                body,
              );
          return json({ ok: true, ...out });
        } catch (err) {
          const plain = err instanceof Error && !("code" in err);
          if (!plain) console.error("[vendor-files] upload failed");
          return json({ ok: false, error: plain ? (err as Error).message : "That upload did not save." }, 400);
        }
      },
    },
  },
});
