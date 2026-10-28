import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  CaseStudyCard,
  ChurchConnectLinks,
  FaqSection,
  RequestSection,
  TestimonialQuote,
} from "@/components/church-av";
import { StageIllustration } from "@/components/church-av-stage";
import { Button } from "@/components/ui/button";
import { AV_PROCESS, INSTALLER_LINE } from "@/lib/church-av";
import { churchConnectLinks, LANDING_CHURCHCONNECT } from "@/lib/church-av-churchconnect";
import {
  getLanding,
  LANDING_COMPONENTS,
  LANDING_OUTCOMES,
  LANDING_STYLES,
  landingPath,
  type LandingPage,
  type LandingSlug,
} from "@/lib/church-av-landing";
import { cn } from "@/lib/utils";

/**
 * Shared sections for the church AV landing pages. Each page wraps itself in
 * <LandingLook>, which sets `av-look-<look>`: the colors, type, and spacing
 * for that page live in styles.css under that class and nowhere else, so the
 * rest of the site keeps its own look. The H1 and hero stay in each route.
 */

export function LandingLook({ page, children }: { page: LandingPage; children: ReactNode }) {
  return (
    <div className={cn("av-look", `av-look-${page.look}`)} data-av-look={page.look}>
      {children}
    </div>
  );
}

export function LandingCrumbs({ page }: { page: LandingPage }) {
  return (
    <nav aria-label="Breadcrumb" className="av-l-crumbs">
      <Link
        to="/church-av"
        activeOptions={{ exact: true }}
        className="underline-offset-4 hover:underline"
      >
        Church sound, video & lighting
      </Link>
      {" / "}
      <span aria-current="page">{page.label}</span>
    </nav>
  );
}

/** "Plan your room" with the page's planner preset, plus the request anchor. */
export function LandingActions({ page, className }: { page: LandingPage; className?: string }) {
  return (
    <div className={cn("av-l-actions flex flex-col gap-3 sm:flex-row", className)}>
      <Button asChild size="lg" className="av-l-cta">
        <Link to="/church-av/planner" search={page.planner}>
          {page.plannerLabel}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="secondary" className="av-l-cta-alt">
        <a href="#talk">Tell us about your church</a>
      </Button>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="av-l-eyebrow">{children}</p>;
}

export function LandingBenefits({ page }: { page: LandingPage }) {
  return (
    <section className="av-l-section av-l-benefits">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <Eyebrow>What changes for your people</Eyebrow>
          <h2 className="av-l-h2">{page.benefitsTitle}</h2>
        </div>
        <div className="av-l-benefit-grid">
          {page.benefits.map((b, i) => (
            <article key={b.title} className="av-l-benefit">
              <p className="av-l-benefit-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="av-l-h3">{b.title}</h3>
              <p className="av-l-body">{b.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingStage({ page }: { page: LandingPage }) {
  const many = page.stages.length > 1;
  return (
    <section className="av-l-section av-l-stage">
      <div
        className={cn(
          "mx-auto grid max-w-6xl gap-10 px-5 md:px-8",
          many ? "" : "md:grid-cols-[1fr_1.2fr] md:items-center",
        )}
      >
        <div className="max-w-2xl">
          <Eyebrow>Your platform</Eyebrow>
          <h2 className="av-l-h2">{page.stageTitle}</h2>
          <p className="av-l-body mt-4">{page.stageBody}</p>
        </div>
        <div className={cn("min-w-0", many ? "grid gap-6 md:grid-cols-3" : "")}>
          {page.stages.map((style) => (
            <StageIllustration key={style} style={style} className="av-l-stage-figure min-w-0" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingProof({ page }: { page: LandingPage }) {
  return (
    <section className="av-l-section av-l-proof">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <Eyebrow>Real churches</Eyebrow>
          <h2 className="av-l-h2">Churches that wanted the same thing</h2>
          <p className="av-l-body mt-4">
            From the project record of {INSTALLER_LINE}. Each one names where it is.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {page.caseStudies.map((id) => (
            <CaseStudyCard key={id} id={id} />
          ))}
        </div>
        <TestimonialQuote id={page.testimonial} className="av-l-quote mt-10" />
      </div>
    </section>
  );
}

export function LandingProcess() {
  return (
    <section className="av-l-section av-l-process">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <Eyebrow>How the installation team works</Eyebrow>
          <h2 className="av-l-h2">Dream, Design, Deliver, Dedication</h2>
        </div>
        <ol className="av-l-process-grid">
          {AV_PROCESS.map((step, i) => (
            <li key={step.step} className="av-l-step">
              <p className="av-l-step-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="av-l-h3">{step.step}</h3>
              <p className="av-l-body">{step.lead}</p>
              <ul className="av-l-step-list">
                {step.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="av-l-warranty">
          Every installation comes with a 1-year parts and labor warranty, training once everything
          is tested, and on-site help the first Sunday.
        </p>
      </div>
    </section>
  );
}

export function LandingPlanBand({ page }: { page: LandingPage }) {
  return (
    <section className="av-l-section av-l-plan">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="max-w-2xl">
          <h2 className="av-l-h2">Bringing this to a committee?</h2>
          <p className="av-l-body mt-3">
            The Church Room Planner asks a few short questions about your room and your people and
            gives you a one-page summary to print: what to do first, how it serves the mission, and
            how the process works.
          </p>
        </div>
        <Button asChild size="lg" className="av-l-cta shrink-0">
          <Link to="/church-av/planner" search={page.planner}>
            {page.plannerLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function LandingFaq({ page }: { page: LandingPage }) {
  return (
    <div className="av-l-faq">
      <FaqSection faq={page.faq} />
    </div>
  );
}

export function LandingRequest({ page }: { page: LandingPage }) {
  return (
    <div className="av-l-request">
      <RequestSection
        heading="Tell us about your church."
        source={{ path: landingPath(page), label: `Church AV — ${page.label}` }}
      />
    </div>
  );
}

/** Links to the other directions, at the foot of each landing page. */
export function LandingOthers({ page }: { page: LandingPage }) {
  const others = [...LANDING_STYLES, ...LANDING_OUTCOMES, ...LANDING_COMPONENTS].filter(
    (s) => s !== page.slug,
  );
  return (
    <section className="av-l-section av-l-others">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <h2 className="av-l-h3">Looking for something else?</h2>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {others.map((slug) => {
            const other = getLanding(slug);
            return (
              <li key={slug}>
                <Link to={landingPath(other) as "/church-av"} className="av-l-link">
                  {other.cardTitle}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/**
 * "Problems this ends", beside the hero on the part-of-the-work pages (sound,
 * video, lighting, hearing help). Colors come from the page's look.
 */
export function LandingPains({ page }: { page: LandingPage }) {
  if (!page.pains?.length) return null;
  return (
    <div className="av-part-pains">
      <p className="av-l-eyebrow">Problems this ends</p>
      <ul className="mt-4 space-y-3">
        {page.pains.map((pain) => (
          <li key={pain} className="flex gap-3">
            <span className="av-part-check" aria-hidden="true">
              ✓
            </span>
            <span>{pain}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Every section below the hero, in order. */
export function LandingBody({ page }: { page: LandingPage }) {
  return (
    <>
      <LandingBenefits page={page} />
      <LandingStage page={page} />
      <LandingProof page={page} />
      <LandingProcess />
      <LandingPlanBand page={page} />
      <LandingFaq page={page} />
      <LandingOthers page={page} />
      <ChurchConnectLinks links={churchConnectLinks(LANDING_CHURCHCONNECT[page.slug] ?? [])} />
      <LandingRequest page={page} />
    </>
  );
}

/**
 * "Choose your direction" for the /church-av hub: three style cards and two
 * outcome cards. Each card carries a small swatch of its page's look.
 */
export function DirectionCards() {
  const card = (slug: LandingSlug, withStage: boolean) => {
    const page = getLanding(slug);
    return (
      <li key={slug} className={cn("av-dir-card", `av-dir-${page.look}`)}>
        <Link
          to={landingPath(page) as "/church-av"}
          className="group flex h-full flex-col rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
        >
          <span className="av-dir-swatch" aria-hidden="true" />
          {withStage ? (
            <StageIllustration
              style={slug as "traditional"}
              className="mt-4 [&_figcaption]:hidden"
            />
          ) : null}
          <span className="mt-4 font-display text-xl text-ink group-hover:underline">
            {page.cardTitle}
          </span>
          <span className="mt-2 text-sm text-muted">{page.cardBody}</span>
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-forest">
            {page.label}
            <ArrowRight className="size-4" />
          </span>
        </Link>
      </li>
    );
  };
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Choose your direction
          </p>
          <h2 className="mt-3 text-3xl">How does your church worship?</h2>
          <p className="mt-4 text-muted">
            Start with the room you have and the result you want. Each page is written for churches
            like yours.
          </p>
        </div>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {LANDING_STYLES.map((slug) => card(slug, true))}
        </ul>
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {LANDING_OUTCOMES.map((slug) => card(slug, false))}
        </ul>
        <h3 className="mt-12 text-2xl">Or start with one part of the work</h3>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_COMPONENTS.map((slug) => card(slug, false))}
        </ul>
      </div>
    </section>
  );
}

/** A short pointer from a help page or the planner to a landing page. */
export function LandingPointer({
  slug,
  lead = "A page for churches like yours",
}: {
  slug: LandingSlug;
  lead?: string;
}) {
  const page = getLanding(slug);
  return (
    <section className="border-y border-rule bg-cream print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">{lead}</p>
          <p className="mt-2 font-display text-2xl">{page.cardTitle}</p>
          <p className="mt-2 text-muted">{page.cardBody}</p>
        </div>
        <Button asChild size="lg" variant="secondary" className="shrink-0">
          <Link to={landingPath(page) as "/church-av"}>
            Read the page
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
