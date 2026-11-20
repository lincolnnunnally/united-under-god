/**
 * Sanctuary AVL (owner, 2026-11-20): church audio, video and lighting under its
 * own name, served by this app at sanctuaryavl.unitedundergod.org.
 *
 * The pages live under /avl. On the Sanctuary AVL host the router reads "/"
 * as "/avl" and writes "/avl/..." back as "/...", so the subdomain shows clean
 * addresses while every route, form and server function stays the one this
 * app already has. On any other host /avl stays /avl (the nitro middleware in
 * server/middleware/sanctuary-avl.ts sends those visitors to the subdomain).
 *
 * Imported by node's test runner: no framework code, relative imports only.
 */

export const AVL_HOST = "sanctuaryavl.unitedundergod.org";
export const AVL_ORIGIN = `https://${AVL_HOST}`;
export const AVL_PREFIX = "/avl";

/** True for the Sanctuary AVL host (and its preview twins, e.g. sanctuaryavl.localhost). */
export function isAvlHost(host: string | null | undefined) {
  return /^sanctuaryavl\./i.test((host ?? "").split(":")[0].trim());
}

export function isAvlPath(path: string) {
  return path === AVL_PREFIX || path.startsWith(`${AVL_PREFIX}/`);
}

/** Paths the subdomain serves as-is: server endpoints and sitemaps. */
const PASSTHROUGH = [/^\/api\//, /^\/_serverFn\//, /^\/__grok\//, /^\/sitemap[\w-]*\.xml$/];

/** The internal route path for an address on the Sanctuary AVL host. */
export function avlInputPath(path: string) {
  if (isAvlPath(path) || PASSTHROUGH.some((re) => re.test(path))) return path;
  return path === "/" || path === "" ? AVL_PREFIX : `${AVL_PREFIX}${path}`;
}

/** The address shown on the Sanctuary AVL host for an internal route path. */
export function avlOutputPath(path: string) {
  if (!isAvlPath(path)) return path;
  return path.slice(AVL_PREFIX.length) || "/";
}

/** The public address of an /avl route path, e.g. "/avl/guides" → https://sanctuaryavl…/guides. */
export function avlUrl(path: string) {
  const out = avlOutputPath(path.startsWith("/") ? path : `/${path}`);
  return `${AVL_ORIGIN}${out === "/" ? "/" : out.replace(/\/+$/, "")}`;
}

/**
 * The Sanctuary AVL address for a /church-av page that moved there (owner, 2026-11-20), or "" if
 * the page did not move. `moved` is src/data/church-av-moved.json; a trailing slash is ignored.
 */
export function movedChurchAvUrl(
  path: string,
  moved: { origin: string; moved: Record<string, string> },
) {
  const bare = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const target = moved.moved[bare];
  return target ? `${moved.origin}${target}` : "";
}
