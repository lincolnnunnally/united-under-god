import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { APPS, type AppEntry } from "@/lib/content";
import { absoluteUrl, pageHead } from "@/lib/seo";

const GROUPS = [
  {
    id: "hope",
    title: "Hope and transformation",
    lead: "Where people meet God in the middle of real life: faith, family, friendship, and purpose.",
    items: APPS.hope,
  },
  {
    id: "church",
    title: "Church and community",
    lead: "For running your church and serving your town, without drowning in admin.",
    items: APPS.church,
  },
  {
    id: "practical",
    title: "Practical tools",
    lead: "Websites, supplies, goods, and everyday tools that save money and time.",
    items: APPS.practical,
  },
] as const;

function hostOf(href: string) {
  try {
    return new URL(href).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const ALL_APPS = GROUPS.flatMap((group) => group.items);

const DESCRIPTION =
  "Every app and service from the United Under God family: ChurchConnect, Plenty food pantry, Live On Mission, EasyPeazy websites, group buying, and more.";

export const Route = createFileRoute("/apps")({
  component: AppsPage,
  head: () =>
    pageHead({
      title: "Apps and services for churches and families | United Under God",
      description: DESCRIPTION,
      path: "/apps",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "United Under God apps and services",
          url: absoluteUrl("/apps"),
          numberOfItems: ALL_APPS.length,
          itemListElement: ALL_APPS.map((app, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: app.name,
            url: absoluteUrl(app.href),
            description: app.blurb,
          })),
        },
      ],
    }),
});

function AppsPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Apps and services
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">
            Practical help for churches, families, and businesses.
          </h1>
          <p className="mt-5 max-w-2xl text-muted">
            Tools that take busywork off your plate and services that help
            you serve your community. Some are faith-focused, some are simply
            useful. Each one below says who it is for and links to its own
            site, where you can sign up.
          </p>
          <nav aria-label="Jump to a group" className="mt-8 flex flex-wrap gap-3 text-sm">
            {GROUPS.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="rounded-full bg-paper px-4 py-2 shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
              >
                {group.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {GROUPS.map((group) => (
        <AppGroup key={group.id} id={group.id} title={group.title} lead={group.lead} items={group.items} />
      ))}

      <section className="border-t border-rule bg-cream px-5 py-12 text-center">
        <p className="text-muted">
          Not sure where to start?{" "}
          <Link to="/organizations" className="text-forest underline-offset-4 hover:underline">
            See what we offer organizations
          </Link>{" "}
          or{" "}
          <Link to="/" hash="raise-your-hand" className="text-forest underline-offset-4 hover:underline">
            tell us what you need
          </Link>
          .
        </p>
      </section>
    </SiteShell>
  );
}

function AppGroup({
  id,
  title,
  lead,
  items,
}: {
  id: string;
  title: string;
  lead: string;
  items: readonly AppEntry[];
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-24 px-5 py-12 md:px-8">
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">{lead}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((app) => (
          <AppCard key={app.slug} app={app} />
        ))}
      </div>
    </section>
  );
}

function AppCard({ app }: { app: AppEntry }) {
  const internal = app.href.startsWith("/");
  const linkClass =
    "mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-forest underline-offset-4 hover:underline";
  return (
    <article
      id={app.slug}
      className="flex h-full scroll-mt-24 flex-col rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]"
    >
      <h3 className="font-display text-lg">{app.name}</h3>
      <p className="mt-1 text-xs font-semibold tracking-[0.06em] text-subtle">For: {app.who}</p>
      <p className="mt-2 flex-1 text-sm text-muted">{app.blurb}</p>
      {internal ? (
        <Link to={app.href as "/bible"} className={linkClass}>
          Read more about {app.name}
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      ) : (
        <a href={app.href} target="_blank" rel="noopener" className={linkClass}>
          Visit {app.name} at {hostOf(app.href)}
          <ArrowUpRight className="size-4 shrink-0" />
        </a>
      )}
    </article>
  );
}
