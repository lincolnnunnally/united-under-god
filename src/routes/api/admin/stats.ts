import { createFileRoute } from "@tanstack/react-router";
import { readOpsStats, statsTokenMatches } from "@/lib/ops-report.server";

export const Route = createFileRoute("/api/admin/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!statsTokenMatches(request)) {
          return Response.json(
            { ok: false, message: "A valid stats token is required." },
            { status: 401 },
          );
        }
        const stats = await readOpsStats();
        return Response.json(stats);
      },
    },
  },
});
