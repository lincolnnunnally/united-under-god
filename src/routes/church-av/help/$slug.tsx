import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  AvHero,
  CaseStudyCard,
  FaqSection,
  ProcessSection,
  RequestSection,
  SectionIntro,
  TestimonialQuote,
} from "@/components/church-av";
import { LandingPointer } from "@/components/church-av-landing";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd, faqJsonLd, getService, INSTALLER_LINE } from "@/lib/church-av";
import {
  getHelpPage,
  helpArticleJsonLd,
  helpHowToJsonLd,
  helpPath,
  type HelpPage,
} from "@/lib/church-av-help";
import { HELP_LANDING } from "@/lib/church-av-landing";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/church-av/help/$slug")({
  component: HelpPageView,
  loader: ({ params }) => {
    const page = getHelpPage(params.slug);
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Church sound, video & lighting help" }] };
    const { page } = loaderData;
    const howTo = helpHowToJsonLd(page);
    return pageHead({
      title: page.title,
      description: page.description,
      path: helpPath(page),
      type: "article",
      jsonLd: [
        helpArticleJsonLd(page),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Church sound, video & lighting", path: "/church-av" },
          { name: "Help", path: "/church-av/help" },
          { name: page.label, path: helpPath(page) },
        ]),
        faqJsonLd(page.faq),
        ...(howTo ? [howTo] : []),
      ],
    });
  },
});

function HelpPageView() {
  const { page } = Route.useLoaderData();
  return (
    <SiteShell>
      <AvHero
        eyebrow={page.eyebrow}
        title={page.h1}
        crumbs={[
          { name: "Church sound, video & lighting", to: "/church-av" },
          { name: "Help", to: "/church-av/help" },
          { name: page.label },
        ]}
      >
        <p>{page.lead}</p>
      </AvHero>

      <article>
        <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <h2 className="text-3xl">{page.whyTitle}</h2>
          <div className="mt-6 space-y-5 text-lg text-ink/90">
            {page.why.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>

        <section className="border-y border-rule bg-cream">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
            <SectionIntro eyebrow="How we fix it" title="How we solve it in your sanctuary" />
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {page.fixes.map((fix) => (
                <div key={fix.title} className="border-t border-rule pt-5">
                  <h3 className="font-display text-xl">{fix.title}</h3>
                  <p className="mt-2 text-muted">{fix.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-sm text-muted">
              Related services:{" "}
              {page.services.map((id, i) => (
                <span key={id}>
                  {i > 0 ? " · " : ""}
                  <Link
                    to="/church-av"
                    hash={id}
                    className="text-forest underline-offset-4 hover:underline"
                  >
                    {getService(id)?.title ?? id}
                  </Link>
                </span>
              ))}
            </p>
          </div>
        </section>

        <FixItBand page={page} />

        {page.steps ? <Steps steps={page.steps} /> : null}

        <section className="bg-forest text-paper">
          <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
            <p className="text-xs font-semibold tracking-[0.18em] text-paper/60 uppercase">
              Why it matters
            </p>
            <h2 className="mt-3 text-3xl text-paper">How it serves your mission</h2>
            <div className="mt-6 space-y-5 text-lg text-paper/88">
              {page.mission.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionIntro eyebrow="Real projects" title="Churches that faced something similar">
            <p>From the project record of {INSTALLER_LINE}. Each one names where it is.</p>
          </SectionIntro>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {page.caseStudies.map((id) => (
              <CaseStudyCard key={id} id={id} />
            ))}
          </div>
          <TestimonialQuote id={page.testimonial} className="mt-10" />
        </section>
      </article>

      {HELP_LANDING[page.slug] ? <LandingPointer slug={HELP_LANDING[page.slug]} /> : null}

      <PlannerBand page={page} />

      <ProcessSection compact />

      <FaqSection faq={page.faq} />

      <RelatedHelp page={page} />

      <RequestSection
        heading="Tell us what you are hearing. We will fix it."
        source={{ path: helpPath(page), label: `Church AV help — ${page.label}` }}
      />
    </SiteShell>
  );
}

function Steps({ steps }: { steps: NonNullable<HelpPage["steps"]> }) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
      <h2 className="text-3xl">{steps.title}</h2>
      <p className="mt-4 text-muted">{steps.intro}</p>
      <ol className="mt-8 space-y-6">
        {steps.items.map((item, i) => (
          <li
            key={item.name}
            className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-rule pt-5"
          >
            <span className="font-display text-2xl text-forest">{i + 1}</span>
            <div>
              <h3 className="font-display text-lg">{item.name}</h3>
              <p className="mt-1 text-muted">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FixItBand({ page }: { page: HelpPage }) {
  return (
    <section className="print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl">We can fix this in your church.</h2>
          <p className="mt-3 text-muted">
            Tell us what you are hearing on Sunday. We will call you back, look at your room, and
            walk you through a plan that fits your sanctuary and how your church gives. Nothing
            here is a price or a quote.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <a href="#talk">
              Get this fixed
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link
              to="/church-av/planner"
              search={page.slug === "planning-a-new-building" ? {} : { problems: page.slug }}
            >
              Plan your room
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function PlannerBand({ page }: { page: HelpPage }) {
  return (
    <section className="border-y border-rule bg-cream">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl">Bringing this to a committee?</h2>
          <p className="mt-3 text-muted">
            The Church Room Planner asks a few questions about your room and your people and gives
            you a one-page summary to print or share: what to fix first, how it serves the mission,
            and how the process works.
          </p>
        </div>
        <Button asChild size="lg">
          <Link
            to="/church-av/planner"
            search={page.slug === "planning-a-new-building" ? {} : { problems: page.slug }}
          >
            Open the planner
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function RelatedHelp({ page }: { page: HelpPage }) {
  const related = page.related
    .map((slug) => getHelpPage(slug))
    .filter((p): p is HelpPage => Boolean(p));
  return (
    <section className="mx-auto max-w-3xl px-5 pb-16 md:px-8 md:pb-20">
      <h2 className="text-2xl">Related problems</h2>
      <ul className="mt-6 divide-y divide-rule border-y border-rule">
        {related.map((r) => (
          <li key={r.slug}>
            <Link
              to="/church-av/help/$slug"
              params={{ slug: r.slug }}
              className="flex items-center justify-between gap-4 py-3 text-ink underline-offset-4 hover:text-forest hover:underline"
            >
              <span>{r.h1}</span>
              <ArrowRight className="size-4 shrink-0 text-forest" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
