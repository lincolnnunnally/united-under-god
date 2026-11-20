import { createRootRoute, HeadContent, Outlet, redirect, Scripts } from "@tanstack/react-router";
import moved from "@/data/church-av-moved.json";
import { movedChurchAvUrl } from "@/lib/sanctuary-avl-host";
import { AuthProvider } from "@/lib/auth/provider";
import { FirstVisitNote } from "@/components/first-visit-note";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ldJsonMeta, ORGANIZATION_JSON_LD } from "@/lib/seo";
import appCss from "../styles.css?url";

const APP_NAME = "United Under God";

export const Route = createRootRoute({
  // Owner (2026-11-20): Sanctuary AVL is the main site. A /church-av page it covers goes there
  // however the visitor arrives; server/middleware/sanctuary-avl.ts answers a direct visit first.
  beforeLoad: ({ location }) => {
    const href = movedChurchAvUrl(location.pathname, moved);
    if (href) throw redirect({ href: href + (location.searchStr ?? ""), statusCode: 308 });
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "United. Loving. Active." },
      {
        name: "description",
        content:
          "United, loving, and active. A movement of Christians united under the authority of God — in love for one another, and in work that makes the world look more like His Kingdom.",
      },
      { name: "theme-color", content: "#101010" },
      ldJsonMeta(ORGANIZATION_JSON_LD),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=standard2" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png?v=standard2" },
      { rel: "shortcut icon", href: "/favicon.ico?v=standard2" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png?v=standard2" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/seal-180.png?v=standard2" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;500;600;700&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <FirstVisitNote />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
