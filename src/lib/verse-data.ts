import { createServerFn } from "@tanstack/react-start";
import type { VerseDay } from "@/lib/verse";

/**
 * Every day the ChurchConnect content hub published a verse to the
 * `unitedundergod` surface, newest first, one row per day. Read-only.
 *
 * Only rows the hub marked `published` count, and only when the source
 * library item is published or approved (never a draft or auto-saved item).
 */
const VERSE_DAYS_SQL = `
  select distinct on (f.doc->>'date_key')
    f.doc->>'date_key' as date_key,
    coalesce(f.doc->>'scripture_reference', '') as reference,
    coalesce(f.doc->>'title', '') as title,
    coalesce(f.doc->>'verse_text', '') as verse_text,
    coalesce(m.doc->>'translation', m.doc->'full_content'->>'translation', '') as translation,
    coalesce(f.doc->>'living_translation', '') as living_translation,
    coalesce(f.doc->>'application', '') as application,
    coalesce(f.doc->>'heart_message', '') as heart_message,
    coalesce(f.doc->>'prayer', '') as prayer,
    coalesce(f.doc->>'published_at', '') as published_at
  from cc_platform_content_feed f
  left join cc_master_content_library m on m.id = f.doc->>'content_id'
  where f.doc->>'surface' = 'unitedundergod'
    and f.doc->>'status' = 'published'
    and coalesce(f.doc->>'scripture_reference', '') <> ''
    and (m.id is null or m.doc->>'status' in ('published', 'approved'))
  order by f.doc->>'date_key' desc, f.doc->>'published_at' desc
  limit 3000
`;

type Row = Record<string, string | null>;

export const getVerseDays = createServerFn({ method: "GET" }).handler(
  async (): Promise<VerseDay[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    let rows: Row[];
    try {
      rows = await sql.query<Row>(VERSE_DAYS_SQL);
    } catch (error) {
      // A local PGLite database has no content hub tables: nothing published.
      if ((error as { code?: string })?.code === "42P01") return [];
      throw error;
    }
    return rows.map((r) => ({
      dateKey: r.date_key ?? "",
      reference: r.reference ?? "",
      title: r.title ?? "",
      verseText: r.verse_text ?? "",
      translation: r.translation ?? "",
      livingTranslation: r.living_translation ?? "",
      application: r.application ?? "",
      heartMessage: r.heart_message ?? "",
      prayer: r.prayer ?? "",
      publishedAt: r.published_at ?? "",
    }));
  },
);

/** Shared CDN caching for verse pages: fresh for 10 minutes, then revalidate. */
export const VERSE_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
};
