import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { canViewVendorFiles } from "@/lib/vendor-file-access";
import { fileHeaders, readServableFile } from "@/lib/vendor-files";

/**
 * Serves one vendor file from Postgres with its stored type and a safe
 * Content-Disposition. Every read passes canViewVendorFiles first.
 */
export const Route = createFileRoute("/api/vendor-files/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!(await canViewVendorFiles(request))) {
          return new Response("Not available.", { status: 403, headers: { "Cache-Control": "no-store" } });
        }
        let file;
        try {
          file = await readServableFile(await getSql(), params.id);
        } catch {
          return new Response("Not available right now.", { status: 503 });
        }
        if (!file) return new Response("Not found.", { status: 404 });
        return new Response(file.content as BodyInit, { status: 200, headers: fileHeaders(file) });
      },
    },
  },
});
