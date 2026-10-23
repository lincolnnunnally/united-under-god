/**
 * Verse of the Day: pure helpers shared by the /verse routes, the verse
 * sitemap, and their tests. No database or framework imports here.
 *
 * Source: the ChurchConnect content hub publishes one feed row per day to the
 * `unitedundergod` surface (cc_platform_content_feed). These pages only read
 * what the hub already published; they never write or generate text.
 */

/** One published feed row for the unitedundergod surface (one per day). */
export type VerseDay = {
  dateKey: string; // YYYY-MM-DD
  reference: string;
  title: string;
  verseText: string;
  translation: string;
  livingTranslation: string;
  application: string;
  heartMessage: string;
  prayer: string;
  publishedAt: string;
};

/** One page: a reference and every day it was the verse of the day. */
export type VerseEntry = VerseDay & {
  slug: string;
  firstDate: string;
  lastDate: string;
  dayCount: number;
};

/**
 * Translations whose text may be republished in full. The Berean Standard
 * Bible has been public domain since 2023; KJV, ASV, WEB and YLT are too.
 * Anything else (NIV, ESV, NLT, ...) shows only the hub's own Real Life
 * Translation and the reference.
 */
const PUBLIC_DOMAIN = new Set(["BSB", "KJV", "ASV", "WEB", "YLT"]);

export const TRANSLATION_NAMES: Record<string, string> = {
  BSB: "Berean Standard Bible",
  KJV: "King James Version",
  ASV: "American Standard Version",
  WEB: "World English Bible",
  YLT: "Young's Literal Translation",
};

export function isPublicDomainTranslation(code: string) {
  return PUBLIC_DOMAIN.has(code.trim().toUpperCase());
}

/** "2 Corinthians 1:3-4" -> "2-corinthians-1-3-4" */
export function verseSlug(reference: string) {
  return reference
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Group daily rows into one entry per reference, ordered by first appearance
 * (oldest first). Each entry carries the newest row's text for that
 * reference, the first and last date it ran, and how many days.
 */
export function groupVerseDays(days: VerseDay[]): VerseEntry[] {
  const sorted = [...days]
    .filter((d) => d.reference.trim() && /^\d{4}-\d{2}-\d{2}$/.test(d.dateKey))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const bySlug = new Map<string, VerseEntry>();
  for (const day of sorted) {
    const slug = verseSlug(day.reference);
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (!existing) {
      bySlug.set(slug, { ...day, slug, firstDate: day.dateKey, lastDate: day.dateKey, dayCount: 1 });
    } else {
      bySlug.set(slug, {
        ...day,
        slug,
        firstDate: existing.firstDate,
        lastDate: day.dateKey,
        dayCount: existing.dayCount + 1,
      });
    }
  }
  return [...bySlug.values()].sort((a, b) => a.firstDate.localeCompare(b.firstDate));
}

/** The previous and next distinct verse around `slug`, by first appearance. */
export function neighbours(entries: VerseEntry[], slug: string) {
  const i = entries.findIndex((e) => e.slug === slug);
  if (i < 0) return { prev: undefined, next: undefined };
  return { prev: entries[i - 1], next: entries[i + 1] };
}

type Ref = { book: string; chapter: number };

/** "2 Corinthians 1:3-4" -> { book: "2 corinthians", chapter: 1 }. Psalm/Psalms match. */
export function parseReference(reference: string): Ref | undefined {
  const m = reference.trim().match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z .]*?)\s+(\d+)(?::|\s*$)/);
  if (!m) return undefined;
  const book = m[1].toLowerCase().replace(/\s+/g, " ").replace(/^psalms$/, "psalm");
  return { book, chapter: Number(m[2]) };
}

/**
 * The /bible question pages that cite the same book and chapter, so a reader
 * can see the passage worked through in context. Empty when none exists.
 */
export function passageInContext<
  Q extends { slug: string; question: string; verses: { ref: string }[] },
>(reference: string, questions: Q[]) {
  const target = parseReference(reference);
  if (!target) return [];
  const out: { slug: string; question: string; ref: string }[] = [];
  for (const q of questions) {
    const hit = q.verses.find((v) => {
      const r = parseReference(v.ref);
      return r && r.book === target.book && r.chapter === target.chapter;
    });
    if (hit) out.push({ slug: q.slug, question: q.question, ref: hit.ref });
  }
  return out;
}

/** "2026-10-23" -> "October 23, 2026" without timezone drift. */
export function formatDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** A search description from the hub's own words, cut at a word boundary. */
export function describe(entry: Pick<VerseDay, "reference" | "livingTranslation" | "application">) {
  const base = (entry.livingTranslation || entry.application || "").replace(/\s+/g, " ").trim();
  const text = `${entry.reference}: ${base}`;
  if (text.length <= 158) return text;
  const cut = text.slice(0, 155);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function verseTitle(reference: string) {
  return `${reference} — Verse of the Day | United Under God`;
}
