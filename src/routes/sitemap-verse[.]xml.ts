import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/seo";
import { groupVerseDays } from "@/lib/verse";
import { getVerseDays, VERSE_CACHE_HEADERS } from "@/lib/verse-data";

/**
 * Every published verse page, read live: a new verse can appear any day, so
 * these URLs cannot live in the build-time public/sitemap.xml. robots.txt
 * lists this sitemap next to that one.
 */
export const Route = createFileRoute("/sitemap-verse.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = groupVerseDays(await getVerseDays());
        const urls = entries
          .map(
            (e) =>
              `  <url><loc>${SITE_URL}/verse/${e.slug}</loc><lastmod>${e.lastDate}</lastmod></url>`,
          )
          .join("\n");
        const latest = entries.reduce((m, e) => (e.lastDate > m ? e.lastDate : m), "");
        const index = `  <url><loc>${SITE_URL}/verse</loc>${latest ? `<lastmod>${latest}</lastmod>` : ""}</url>`;
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[index, urls].filter(Boolean).join("\n")}\n</urlset>\n`;
        return new Response(body, {
          headers: { "Content-Type": "application/xml; charset=utf-8", ...VERSE_CACHE_HEADERS },
        });
      },
    },
  },
});
