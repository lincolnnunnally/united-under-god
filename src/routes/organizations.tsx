import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SignInNudge } from "@/components/sign-in-nudge";
import { Button } from "@/components/ui/button";
import { ORG_TYPES } from "@/lib/content";

export const Route = createFileRoute("/organizations")({
  component: OrganizationsPage,
  head: () => ({
    meta: [{ title: "For organizations — United Under God" }],
  }),
});

const HELPS = [
  {
    title: "The seal",
    body: "A free, verifiable statement of intent — to be united under God and to fulfill the biblical mandate. Display it. Mean it.",
    to: "/join",
    cta: "Take the seal",
  },
  {
    title: "United buying",
    body: "One little church buying one toner at retail is a habit, not a plan. Together we bid the way Georgia’s offices do: shared catalogs, each organization buying what it needs, everyone paying less.",
    to: "/buying",
    cta: "Join the catalogs",
  },
  {
    title: "The assessment",
    body: "A lot of organizations don’t know what they don’t know. In a short sitting: toner, internet, office time — in dollars and hours, with a next step. Not a grade. A way forward.",
    to: "/assessment",
    cta: "Take the assessment",
  },
  {
    title: "Tools for the work",
    body: "ChurchConnect, Plenty, Operate, websites, printer watching. Not to replace what you have — to help you operate at your best on God’s principles. Enter once. The right desk runs it.",
    to: "/apps",
    cta: "See the tools",
  },
  {
    title: "A people on mission",
    body: "Hand Live on Mission to your congregation — the original heart of hands. One invitation, one workbench, one testimony. Not a second church. A people who do the work.",
    to: "/mission",
    cta: "Live on Mission",
  },
] as const;

function OrganizationsPage() {
  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        <img
          src="/images/fellowship.jpg"
          alt="Pastors and local leaders gathered around a table"
          className="absolute inset-0 size-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            Churches · businesses · charities · civic work
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">
            Christian-led organizations, operating as one body — and benefiting
            from the Kingdom they actually belong to.
          </h1>
          <p className="mt-5 max-w-2xl text-paper/88">
            Jesus instructed us to be united. When we obey, we live better: we
            buy together, serve together, forgive one another, and stop wasting
            the strength of a town on silos.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-10 md:px-8">
        <SignInNudge about="buying, mission, and the seal" />
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-2">
          {ORG_TYPES.map((item) => (
            <article key={item.title} className="border-t border-rule pt-6">
              <h2 className="text-2xl">{item.title}</h2>
              <p className="mt-3 text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <h2 className="max-w-2xl text-3xl">What you gain by standing with us</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {HELPS.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="group flex flex-col rounded-xl bg-paper p-6 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <h3 className="font-display text-xl">{item.title}</h3>
                <p className="mt-3 flex-1 text-sm text-muted">{item.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-forest">
                  {item.cta}
                  <ArrowRight className="size-4 transition-transform duration-[var(--motion-quick)] group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/join">Take the seal</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/happenings">How the work stays organized</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
