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
