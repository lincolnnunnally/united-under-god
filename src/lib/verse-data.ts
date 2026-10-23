import { createServerFn } from "@tanstack/react-start";
import type { VerseDay } from "@/lib/verse";
import { loadVerseDays } from "@/lib/verse-feed";

export const getVerseDays = createServerFn({ method: "GET" }).handler(
  async (): Promise<VerseDay[]> => {
    const { getSql } = await import("@/lib/db");
    return loadVerseDays(await getSql());
  },
);

/** Shared CDN caching for verse pages: fresh for 10 minutes, then revalidate. */
export const VERSE_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
};
