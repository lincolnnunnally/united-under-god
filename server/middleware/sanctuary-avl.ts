/**
 * Sanctuary AVL lives at sanctuaryavl.unitedundergod.org (src/lib/sanctuary-avl-host.ts).
 * Its pages are this app's /avl routes, so www.unitedundergod.org/avl/... would
 * show them too; send those visitors (and search engines) to the subdomain so
 * the brand has one address. Previews and local hosts are left alone.
 *
 * The /church-av pages that Sanctuary AVL now covers (src/data/church-av-moved.json) go there
 * too, each to the page that does the same job (owner, 2026-11-20: Sanctuary AVL is the main site).
 */
import moved from "../../src/data/church-av-moved.json";
import { avlUrl, isAvlPath, movedChurchAvUrl } from "../../src/lib/sanctuary-avl-host";

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
  if (!MAIN_HOSTS.has(host)) return next();
  const location = isAvlPath(event.url.pathname)
    ? avlUrl(event.url.pathname)
    : movedChurchAvUrl(event.url.pathname, moved);
  if (!location) return next();
  return new Response(null, {
    status: 308,
    headers: { location: location + event.url.search },
  });
}
