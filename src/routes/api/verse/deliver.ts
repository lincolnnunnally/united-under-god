import { createFileRoute } from "@tanstack/react-router";
import { cronSecretMatches, deliverDailyVerse } from "@/lib/verse-mail.server";

/**
 * After the content hub publishes (11:00 UTC), Vercel calls this once a day.
 * vercel.json schedules it at 13:00 UTC. Same handler can be called again with
 * the cron secret; a day that already sent does not send again.
 */
async function deliver(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    console.error("[verse-mail] CRON_SECRET is not set; not sending");
    return Response.json({ ok: false, reason: "not configured" }, { status: 401 });
  }
  if (!cronSecretMatches(request)) {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  try {
    const { getSql } = await import("@/lib/db");
    const result = await deliverDailyVerse(await getSql(), {
      apiKey: process.env.RESEND_API_KEY,
      indexNowKey: process.env.INDEXNOW_KEY,
    });
    return Response.json(result);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "42P01") {
      console.error("[verse-mail] subscriber table is not ready");
      return Response.json({ ok: false, reason: "not ready", sent: 0 });
    }
    console.error("[verse-mail] daily deliver failed");
    return Response.json({ ok: false, reason: "failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/verse/deliver")({
  server: {
    handlers: {
      GET: ({ request }) => deliver(request),
      POST: ({ request }) => deliver(request),
    },
  },
});
