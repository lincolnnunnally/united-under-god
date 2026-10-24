import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/vendor-portal-store";

/**
 * The vendor portal's session cookie. Server-only (the `.server` suffix keeps
 * `@tanstack/react-start/server` out of the browser bundle). The cookie holds
 * the session token; the database keeps only its hash.
 */

export function readPortalCookie(): string {
  try {
    return getCookie(SESSION_COOKIE) ?? "";
  } catch {
    return "";
  }
}

export function writePortalCookie(token: string) {
  setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function clearPortalCookie() {
  setCookie(SESSION_COOKIE, "", { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 0 });
}

/** The session token from a raw request's Cookie header (for server routes). */
export function portalCookieFrom(request: Request): string {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return "";
}

/** The request a server function is handling, or null. */
export function currentRequest(): Request | null {
  try {
    return getRequest() ?? null;
  } catch {
    return null;
  }
}
