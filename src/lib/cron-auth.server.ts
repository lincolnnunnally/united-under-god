import { timingSafeEqual } from "node:crypto";

/**
 * Vercel cron calls send `Authorization: Bearer $CRON_SECRET`. Timing-safe,
 * like the stats token. No CRON_SECRET set means no call is accepted.
 */
export function cronTokenMatches(request: Request, secret = process.env.CRON_SECRET) {
  const expected = (secret || "").trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const presented = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
