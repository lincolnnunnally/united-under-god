/**
 * Serves /<INDEXNOW_KEY>.txt for IndexNow. The key is public by design (that
 * is how IndexNow checks the host) and is not written to logs. When the env
 * var is missing, this middleware does nothing.
 */
import { indexNowKeyFile } from "../../src/lib/verse-mail.ts";

interface IndexNowEvent {
  url: URL;
  req: { method?: string };
}

export default function indexNowKeyMiddleware(
  event: IndexNowEvent,
  next: () => unknown | Promise<unknown>,
): unknown {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return next();
  const hit = indexNowKeyFile(event.url.pathname, process.env.INDEXNOW_KEY);
  if (!hit) return next();
  return new Response(method === "HEAD" ? null : hit.body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
