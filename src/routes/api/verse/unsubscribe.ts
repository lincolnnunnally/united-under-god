import { createFileRoute } from "@tanstack/react-router";
import { unsubscribeVerseToken } from "@/lib/verse-mail.server";

/** One-click List-Unsubscribe POST. A valid signed token stops the mail. */
async function oneClick(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) return new Response(null, { status: 400 });
  try {
    const { getSql } = await import("@/lib/db");
    const result = await unsubscribeVerseToken(await getSql(), token);
    if (!result.ok) return new Response(null, { status: 400 });
    return new Response(null, { status: 200 });
  } catch {
    console.error("[verse-mail] one-click unsubscribe failed");
    return new Response(null, { status: 500 });
  }
}

export const Route = createFileRoute("/api/verse/unsubscribe")({
  server: {
    handlers: {
      POST: ({ request }) => oneClick(request),
      GET: ({ request }) => oneClick(request),
    },
  },
});
