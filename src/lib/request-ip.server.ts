import { getRequest } from "@tanstack/react-start/server";

/**
 * The caller's IP for a server function, as Vercel reports it. Server-only
 * (keeps the `.server` suffix so `@tanstack/react-start/server` stays out of
 * the browser bundle). Returns '' when there is no request.
 */
export function requestIp(): string {
  try {
    const headers = getRequest()?.headers;
    if (!headers) return "";
    const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return (forwarded || headers.get("x-real-ip")?.trim() || "").slice(0, 80);
  } catch {
    return "";
  }
}
