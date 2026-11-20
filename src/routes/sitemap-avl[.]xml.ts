import { createFileRoute } from "@tanstack/react-router";
import { HELP_PAGES } from "@/lib/church-av-help";
import { avlPaths } from "@/lib/sanctuary-avl";
import { avlUrl } from "@/lib/sanctuary-avl-host";

/**
 * Sanctuary AVL's pages at their subdomain addresses. public/robots.txt lists
 * this sitemap; the subdomain serves the same robots.txt as www.
 */
export const Route = createFileRoute("/sitemap-avl.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = avlPaths(HELP_PAGES.map((p) => p.slug))
          .map((path) => `  <url><loc>${avlUrl(path)}</loc></url>`)
          .join("\n");
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
