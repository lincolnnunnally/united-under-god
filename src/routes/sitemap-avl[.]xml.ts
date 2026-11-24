import { createFileRoute } from "@tanstack/react-router";
import { withoutSlugs } from "@/lib/articles";
import { getAvlLibraryGuides } from "@/lib/articles-data";
import { HELP_PAGES } from "@/lib/church-av-help";
import { GUIDES, avlPaths } from "@/lib/sanctuary-avl";
import { avlUrl } from "@/lib/sanctuary-avl-host";

/**
 * Sanctuary AVL's pages at their subdomain addresses. public/robots.txt lists
 * this sitemap; the subdomain serves the same robots.txt as www. Published
 * library guides (lpl_articles, app `sanctuary-avl`) are read live; if that
 * read fails the hand-written pages are still listed.
 */
export const Route = createFileRoute("/sitemap-avl.xml")({
  server: {
    handlers: {
      GET: async () => {
        const library = withoutSlugs(
          await getAvlLibraryGuides(),
          GUIDES.map((g) => g.slug),
        );
        const urls = [
          ...avlPaths(HELP_PAGES.map((p) => p.slug)).map(
            (path) => `  <url><loc>${avlUrl(path)}</loc></url>`,
          ),
          ...library.map(
            (g) =>
              `  <url><loc>${avlUrl(`/avl/guides/${encodeURIComponent(g.slug)}`)}</loc>${g.publishedAt ? `<lastmod>${g.publishedAt.slice(0, 10)}</lastmod>` : ""}</url>`,
          ),
        ].join("\n");
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
