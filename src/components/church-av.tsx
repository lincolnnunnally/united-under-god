import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { InvolvementForm } from "@/components/involvement-form";
import { Button } from "@/components/ui/button";
import {
  AV_CASE_STUDIES,
  AV_GEAR,
  AV_PROCESS,
  AV_STATS,
  approxMiles,
  getService,
  getTestimonial,
  type Faq,
  type NearbyProject,
  type Project,
} from "@/lib/church-av";
import type { ChurchConnectLink } from "@/lib/church-av-churchconnect";
import { HELP_PAGES, type HelpPage } from "@/lib/church-av-help";
import { cn } from "@/lib/utils";

/** Shared sections for /church-av and its state and city pages. */

export function AvHero({
  eyebrow,
  title,
  children,
  crumbs,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  crumbs?: { name: string; to?: string; params?: Record<string, string> }[];
}) {
  return (
    <section className="relative isolate overflow-hidden tone-night bg-ink text-paper">
      <img
        src="/images/sanctuary.jpg"
        alt="A congregation in worship, one hand raised toward the stage"
        className="absolute inset-0 size-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/40" />
      <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        {crumbs ? (
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-paper/70">
            {crumbs.map((crumb, i) => (
              <span key={crumb.name}>
                {i > 0 ? " / " : ""}
                {crumb.to ? (
                  <Link
                    to={crumb.to as "/church-av"}
                    params={crumb.params as never}
                    className="underline-offset-4 hover:text-paper hover:underline"
                  >
                    {crumb.name}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.name}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl text-paper">{title}</h1>
        <div className="mt-5 max-w-2xl text-lg text-paper/88">{children}</div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="invert" size="lg">
            <a href="#talk">
              Tell us about your sanctuary
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/church-av/planner">Plan your room in 5 minutes</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function StatsRow() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {AV_STATS.map((stat) => (
        <div key={stat.label} className="border-t border-rule pt-4">
          <p className="font-display text-4xl text-forest">{stat.value}</p>
          <p className="mt-1 text-sm text-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ProcessSection({ compact = false }: { compact?: boolean }) {
  return (
    <section className="border-y border-rule bg-forest text-paper">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-paper/80 uppercase">
          How the installation team works
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl text-paper">Dream, Design, Deliver, Dedication</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {AV_PROCESS.map((step, i) => (
            <article key={step.step} className="border-t border-paper/20 pt-5">
              <p className="font-display text-sm text-paper/80">0{i + 1}</p>
              <h3 className="mt-2 font-display text-xl text-paper italic">{step.step}</h3>
              <p className="mt-2 text-sm text-paper/80">{step.lead}</p>
              {compact ? null : (
                <ul className="mt-3 space-y-1 text-sm text-paper/80">
                  {step.bullets.map((bullet) => (
                    <li key={bullet}>· {bullet}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialQuote({ id, className }: { id: string; className?: string }) {
  const t = getTestimonial(id);
  return (
    <figure className={cn("rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]", className)}>
      <blockquote className="font-display text-lg leading-relaxed text-ink">“{t.text}”</blockquote>
      <figcaption className="mt-4 text-sm text-muted">
        <span className="font-semibold text-ink">{t.name}</span>, {t.title}, {t.church}, {t.city}
      </figcaption>
    </figure>
  );
}

export function CaseStudyCard({ id, distance }: { id: string; distance?: string }) {
  const study = AV_CASE_STUDIES[id];
  if (!study) return null;
  return (
    <article className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]">
      <p className="text-xs font-semibold tracking-[0.14em] text-forest uppercase">
        {study.city}
        {distance ? ` · ${distance}` : ""}
      </p>
      <h3 className="mt-2 font-display text-xl">{study.name}</h3>
      <p className="mt-3 text-sm text-muted">{study.summary}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-ink">
        {study.highlights.map((h) => (
          <li key={h} className="border-l-2 border-forest pl-3">
            {h}
          </li>
        ))}
      </ul>
    </article>
  );
}

/** A plain list of churches the installation team has served, with optional distances. */
export function ProjectList({ projects }: { projects: (Project | NearbyProject)[] }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {projects.map((p) => {
        const near = "miles" in p ? p : null;
        return (
          <li
            key={`${p.church}-${p.city}`}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <span className="text-ink">{p.church}</span>
            <span className="text-sm text-muted">
              {p.city}, {p.state}
              {near && !near.inCity ? ` · ${approxMiles(near.miles)}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function SituationList({ items }: { items: { service: string; text: string }[] }) {
  return (
    <div className={cn("grid gap-6", items.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2")}>
      {items.map((item) => {
        const service = getService(item.service);
        return (
          <article key={item.text} className="border-t border-rule pt-5">
            <h3 className="font-display text-lg">
              <Link
                to="/church-av"
                hash={item.service}
                className="text-forest underline-offset-4 hover:underline"
              >
                {service?.title ?? item.service}
              </Link>
            </h3>
            <p className="mt-2 text-sm text-muted">{item.text}</p>
          </article>
        );
      })}
    </div>
  );
}

export function FaqSection({
  faq,
  title = "Questions churches ask",
}: {
  faq: Faq[];
  title?: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
      <h2 className="text-3xl">{title}</h2>
      <dl className="mt-8 space-y-6">
        {faq.map((item) => (
          <div key={item.q} className="border-t border-rule pt-5">
            <dt className="font-display text-lg text-ink">{item.q}</dt>
            <dd className="mt-2 text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function GearList() {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {AV_GEAR.map((group) => (
        <div key={group.category} className="border-t border-rule pt-5">
          <h3 className="font-display text-lg">{group.category}</h3>
          <p className="mt-2 text-sm text-muted">{group.brands.join(" · ")}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * The one request form for every church AV page. It posts to the same
 * inquiry pipeline as before (intent "av"); only the City prefill and the
 * "Sent from" line differ per page.
 */
export function RequestSection({
  heading = "Tell us about your room.",
  place,
  defaultCity,
  source,
  attachment,
  messageLabel,
  submitLabel,
  lead,
  children,
}: {
  heading?: string;
  place?: string;
  defaultCity?: string;
  source: { path: string; label: string };
  attachment?: string;
  messageLabel?: string;
  submitLabel?: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id="talk" className="scroll-mt-24 bg-cream print:hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <h2 className="text-3xl">{heading}</h2>
          {lead ?? (
            <p className="mt-4 text-muted">
              A few lines is enough{place ? `, and tell us where in ${place} you are` : ""}. We will
              call you back to talk through what you are hearing, what you would like to change, and
              what a sensible next step looks like. Nothing here is a price or a quote.
            </p>
          )}
          {children}
          <p className="mt-6 text-sm text-muted">
            Running the rest of the church too?{" "}
            <Link to="/apps" className="text-forest underline-offset-4 hover:underline">
              See our tools for churches
            </Link>{" "}
            — church management, websites, and outreach help.
          </p>
        </div>
        <InvolvementForm
          intent="av"
          defaultCity={defaultCity}
          source={source}
          attachment={attachment}
          messageLabel={messageLabel}
          submitLabel={submitLabel}
        />
      </div>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">{eyebrow}</p>
      ) : null}
      <h2 className={cn("text-3xl", eyebrow ? "mt-3" : "")}>{title}</h2>
      {children ? <div className="mt-4 text-muted">{children}</div> : null}
    </div>
  );
}

/**
 * Problem-first help pages and the planner, for the hub, state, and city
 * pages. Pass `pages` to show a relevant subset; the planner is always offered.
 */
export function HelpLinks({
  pages = HELP_PAGES,
  title = "Start with the problem you have",
  eyebrow = "Help for pastors and committees",
}: {
  pages?: HelpPage[];
  title?: string;
  eyebrow?: string;
}) {
  return (
    <section className="border-y border-rule bg-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1fr_1.3fr] md:px-8 md:py-20">
        <div>
          <SectionIntro eyebrow={eyebrow} title={title}>
            <p>
              Plain-language explanations of why it happens, what fixes it, and how fixing it serves
              your congregation. Or answer a few questions and get a summary to bring to your
              committee.
            </p>
          </SectionIntro>
          <Button asChild className="mt-6">
            <Link to="/church-av/planner">
              Open the Church Room Planner
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <ul className="divide-y divide-rule border-y border-rule self-start">
          {pages.map((page) => (
            <li key={page.slug}>
              <Link
                to="/church-av/help/$slug"
                params={{ slug: page.slug }}
                className="flex items-center justify-between gap-4 py-3 text-ink underline-offset-4 hover:text-forest hover:underline"
              >
                <span>{page.label}</span>
                <ArrowRight className="size-4 shrink-0 text-forest" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * "Already on ChurchConnect?" cross-link. ChurchConnect's own /church-av pages
 * cover the livestream link on the church's page and the sound booth schedule;
 * the room itself is planned here.
 */
export function ChurchConnectLinks({
  links,
  title = "Already on ChurchConnect?",
}: {
  links: ChurchConnectLink[];
  title?: string;
}) {
  if (!links.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
      <SectionIntro eyebrow="ChurchConnect" title={title}>
        <p>
          ChurchConnect, from the same family as United Under God, can show your watch-live link on
          your church page and schedule the people who run sound, slides, and camera. The room
          itself is planned here.
        </p>
      </SectionIntro>
      <ul className="mt-6 grid gap-3">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <a
              href={link.href}
              className="inline-flex items-center gap-2 font-semibold text-forest underline-offset-4 hover:underline"
            >
              {link.label}
              <ArrowRight className="size-4" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
