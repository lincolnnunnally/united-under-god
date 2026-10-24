import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { canViewVendorFiles, portalVendorId } from "@/lib/vendor-file-access";
import { fileHeaders, readStoredFile } from "@/lib/vendor-files";

/**
 * Serves one vendor file from Postgres with its stored type and a safe
 * Content-Disposition. Every read passes canViewVendorFiles: a member church
 * or staff sees a listed vendor's files; a vendor signed in to its portal
 * sees its own.
 */
export const Route = createFileRoute("/api/vendor-files/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const noStore = { "Cache-Control": "no-store" };
        let file;
        try {
          file = await readStoredFile(await getSql(), params.id);
        } catch {
          return new Response("Not available right now.", { status: 503, headers: noStore });
        }
        if (!file) return new Response("Not found.", { status: 404, headers: noStore });
        if (!(await canViewVendorFiles(request, { ownerVendorId: file.vendorId }))) {
          return new Response("Member churches can open vendor files.", { status: 403, headers: noStore });
        }
        // An unlisted vendor's file (pending, suspended, revoked) goes only to that vendor.
        if (!file.vendorListed && (await portalVendorId(request)) !== file.vendorId) {
          return new Response("Not found.", { status: 404, headers: noStore });
        }
        return new Response(file.content as BodyInit, { status: 200, headers: fileHeaders(file) });
      },
    },
  },
});
