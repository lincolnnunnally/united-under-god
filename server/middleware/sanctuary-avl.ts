/**
 * Sanctuary AVL lives at sanctuaryavl.unitedundergod.org (src/lib/sanctuary-avl-host.ts).
 * Its pages are this app's /avl routes, so www.unitedundergod.org/avl/... would
 * show them too; send those visitors (and search engines) to the subdomain so
 * the brand has one address. Previews and local hosts are left alone.
 */
import { avlUrl, isAvlPath } from "../../src/lib/sanctuary-avl-host";

const MAIN_HOSTS = new Set(["www.unitedundergod.org", "unitedundergod.org"]);

interface AvlEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

export default function sanctuaryAvlMiddleware(
  event: AvlEvent,
  next: () => unknown | Promise<unknown>,
): unknown | Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return next();
  const host = (
    event.req.headers.get("x-forwarded-host") ??
    event.req.headers.get("host") ??
    event.url.host
  )
    .split(",")[0]
    .split(":")[0]
    .trim()
    .toLowerCase();
  if (!MAIN_HOSTS.has(host) || !isAvlPath(event.url.pathname)) return next();
  return new Response(null, {
    status: 308,
    headers: { location: avlUrl(event.url.pathname) + event.url.search },
  });
}
