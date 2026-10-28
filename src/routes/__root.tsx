import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ldJsonMeta, ORGANIZATION_JSON_LD } from "@/lib/seo";
import appCss from "../styles.css?url";

const APP_NAME = "United Under God";

export const Route = createRootRoute({
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
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=standard1" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png?v=standard1" },
      { rel: "shortcut icon", href: "/favicon.ico?v=standard1" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png?v=standard1" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/seal-180.png?v=standard1" },
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
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
