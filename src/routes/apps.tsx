import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { APPS } from "@/lib/content";

export const Route = createFileRoute("/apps")({
  component: AppsPage,
  head: () => ({
    meta: [{ title: "Tools for the work — United Under God" }],
  }),
});

function AppsPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Tools for a people on mission
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">
            Apps are doors. They are not the movement.
          </h1>
          <p className="mt-5 max-w-2xl text-muted">
            United Under God is the vision: united, loving, active. These tools
            exist so churches, households, and shops can practice that in
            ordinary life — some faith-forward, some simply useful. Start
            anywhere. Come back to the seal.
          </p>
        </div>
      </section>

      <AppGroup
        title="Hope and transformation"
        lead="Where people meet God in the middle of real life."
        items={APPS.hope}
      />
      <AppGroup
        title="Church and community"
        lead="For gathering people, and for running the work without drowning in it."
        items={APPS.church}
      />
      <AppGroup
        title="Practical tools"
        lead="The unglamorous things that free a church or a shop to do the actual ministry."
        items={APPS.practical}
      />

      <section className="border-t border-rule bg-cream px-5 py-12 text-center">
        <p className="text-muted">
          The movement home is here.{" "}
          <Link to="/" className="text-forest underline-offset-4 hover:underline">
            Return to United Under God
          </Link>
          .
        </p>
      </section>
    </SiteShell>
  );
}

function AppGroup({
  title,
  lead,
  items,
}: {
  title: string;
  lead: string;
  items: readonly { name: string; href: string; blurb: string }[];
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">{lead}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((app) => (
          <li key={app.name}>
            {app.href.startsWith("/") ? (
              <Link
                to={app.href as "/donate"}
                className="flex h-full flex-col rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-lg">{app.name}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-subtle" />
                </span>
                <span className="mt-2 text-sm text-muted">{app.blurb}</span>
              </Link>
            ) : (
              <a
                href={app.href}
                target="_blank"
                rel="noreferrer"
                className="flex h-full flex-col rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-lg">{app.name}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-subtle" />
                </span>
                <span className="mt-2 text-sm text-muted">{app.blurb}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
