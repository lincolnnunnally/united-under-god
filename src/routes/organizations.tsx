import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SignInNudge } from "@/components/sign-in-nudge";
import { Button } from "@/components/ui/button";
import { ORG_TYPES } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/organizations")({
  component: OrganizationsPage,
  head: () =>
    pageHead({
      title: "For churches, charities, and businesses | United Under God",
      description: "Churches, charities, and Christian-owned businesses that work together save money and reach more of their town: the seal, group buying, outreach, and church tools.",
      path: "/organizations",
    }),
});

const HELPS = [
  {
    title: "The seal",
    body: "A free badge for your website, door, or letterhead that tells your community you stand with the wider church — linked to a public page anyone can check.",
    to: "/join",
    cta: "Take the seal",
  },
  {
    title: "Group buying",
    body: "Pool orders for toner, paper, and supplies with other churches and ministries, and pay less than you would on your own.",
    to: "/buying",
    cta: "Start saving",
  },
  {
    title: "The assessment",
    body: "A short, friendly walk-through that shows where your organization is losing money and time — toner, internet, office hours — with a clear next step for each.",
    to: "/assessment",
    cta: "Find your savings",
  },
  {
    title: "Tools for the work",
    body: "Church management, websites, food pantry and donation tools, and printer monitoring — built to work together so you enter information once and spend less time on admin.",
    to: "/apps",
    cta: "See the tools",
  },
  {
    title: "Sound, livestream & lighting",
    body: "Every word heard, every Sunday. Sound, streaming, and lighting planned and installed for your sanctuary, with your volunteers trained.",
    to: "/church-av",
    cta: "Talk with us",
  },
  {
    title: "Outreach your people will join",
    body: "Live on Mission gives your congregation simple, real ways to serve neighbors this week — and we help you plan it.",
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
            Do more ministry with the money, time, and people you already
            have.
          </h1>
          <p className="mt-5 max-w-2xl text-paper/88">
            Churches, charities, and Christian-owned businesses that work
            together save money, share the load, and reach more of their town.
            We provide the tools and the connections to make that easy.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-10 md:px-8">
        <SignInNudge about="group buying, outreach, and the seal" />
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
          <h2 className="max-w-2xl text-3xl">What your organization gets</h2>
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
              <Link to="/join">Join free</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/happenings">See what’s happening</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted">
            A business that sells to churches?{" "}
            <Link
              to="/buying/sell-to-churches"
              className="text-forest underline-offset-4 hover:underline"
            >
              See the church vendor program
            </Link>
            .
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
