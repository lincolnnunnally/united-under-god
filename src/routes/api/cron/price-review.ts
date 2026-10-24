import { createFileRoute } from "@tanstack/react-router";
import { cronTokenMatches } from "@/lib/cron-auth.server";
import { getSql } from "@/lib/db";
import { sendHardcodedOwnerEmail } from "@/lib/desk-mail";
import { runPriceReminders } from "@/lib/price-program";
import { ensureBookTerms } from "@/lib/price-term";
import { SITE_URL } from "@/lib/seo";

/**
 * The daily price-term job, called by the Vercel cron in vercel.json. Vercel
 * sends `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET set, or
 * with any other token, the route answers 401 and does nothing.
 *
 * It gives older book entries their reference and term, then emails the
 * owner one digest of prices whose term ends within 45 days (each term once,
 * one email a day at most). Nothing goes to vendors from here.
 */
export const Route = createFileRoute("/api/cron/price-review")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronTokenMatches(request)) {
          return Response.json({ ok: false, message: "A valid cron token is required." }, { status: 401 });
        }
        const sql = await getSql();
        const assigned = await ensureBookTerms(sql);
        const run = await runPriceReminders(sql, {
          siteUrl: SITE_URL,
          send: async (notice) => {
            const out = await sendHardcodedOwnerEmail({
              subject: notice.subject,
              text: notice.text,
              apiKey: process.env.RESEND_API_KEY,
              logKind: "price-review",
              logLabel: "routes",
            });
            return out.sent > 0 ? { ok: true, error: "" } : { ok: false, error: "the digest email did not send" };
          },
        });
        return Response.json({ ok: true, assigned, ...run });
      },
    },
  },
});
