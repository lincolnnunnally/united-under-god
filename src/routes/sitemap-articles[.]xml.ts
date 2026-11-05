import { createFileRoute } from "@tanstack/react-router";
import { ARTICLE_CACHE_HEADERS, getArticles } from "@/lib/articles-data";
import { SITE_URL } from "@/lib/seo";

/**
 * Every published article, read live from lpl_articles: new writing can
 * appear any day, so these URLs cannot live in the build-time
 * public/sitemap.xml. robots.txt lists this sitemap next to that one.
 */
export const Route = createFileRoute("/sitemap-articles.xml")({
  server: {
    handlers: {
      GET: async () => {
        const articles = await getArticles();
        const day = (iso: string) => iso.slice(0, 10);
        const latest = articles[0]?.publishedAt ? day(articles[0].publishedAt) : "";
        const lines = [
          `  <url><loc>${SITE_URL}/articles</loc>${latest ? `<lastmod>${latest}</lastmod>` : ""}</url>`,
          ...articles.map(
            (a) =>
              `  <url><loc>${SITE_URL}/articles/${encodeURIComponent(a.slug)}</loc>${a.publishedAt ? `<lastmod>${day(a.publishedAt)}</lastmod>` : ""}</url>`,
          ),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}\n</urlset>\n`;
        return new Response(body, {
          headers: { "Content-Type": "application/xml; charset=utf-8", ...ARTICLE_CACHE_HEADERS },
        });
      },
    },
  },
});
