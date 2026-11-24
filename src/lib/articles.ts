/** Pure helpers for article pages (no server imports, so they can be unit tested). */

export const TITLE_MAX = 65;
const BRAND = " | United Under God";

/**
 * A search title of at most 65 characters: "{title} | United Under God" when
 * it fits, the bare title when only that fits, otherwise the title cut at a
 * word boundary with an ellipsis.
 */
export function articleTitle(title: string) {
  const t = title.trim().replace(/\s+/g, " ");
  if (t.length + BRAND.length <= TITLE_MAX) return `${t}${BRAND}`;
  if (t.length <= TITLE_MAX) return t;
  const cut = t.slice(0, TITLE_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 40 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "")}…`;
}

/** "November 5, 2026" from an ISO timestamp, in UTC so server and browser agree. */
export function formatArticleDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The public-row rule for one app's writing in the shared lpl_articles table,
 * with the app key bound as `appParam` (e.g. "$1"). The server connection may
 * bypass RLS, so the rule is stated in every query, not left to the policy.
 */
export function publishedRule(appParam = "$1") {
  return `app = ${appParam} and status = 'published' and coalesce(published_at, publish_at) <= now()`;
}

/**
 * `promise`, or `fallback` if it rejects or takes longer than `ms`. Library
 * reads on pages that also have hand-written content use this, so a slow or
 * failing database never takes the hand-written pages down with it.
 */
export function withFallback<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise.catch(() => fallback), late]).finally(() => clearTimeout(timer));
}

/** Library rows whose slug a hand-written page does not already use (hand-written wins). */
export function withoutSlugs<T extends { slug: string }>(rows: T[], taken: Iterable<string>) {
  const skip = new Set(taken);
  return rows.filter((row) => row.slug && !skip.has(row.slug));
}
