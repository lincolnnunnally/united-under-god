import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { AvHero, RequestSection, SectionIntro } from "@/components/church-av";
import { PlannerSummary, PlannerWizard, SummaryActions } from "@/components/church-av-planner";
import { SiteShell } from "@/components/site-shell";
import { breadcrumbJsonLd } from "@/lib/church-av";
import { HELP_PAGES } from "@/lib/church-av-help";
import {
  answersToSearch,
  cleanAnswers,
  plannerMessage,
  type Answers,
  type PlannerSearch,
} from "@/lib/church-av-planner";
import { absoluteUrl, pageHead } from "@/lib/seo";

const PATH = "/church-av/planner";
const DESCRIPTION =
  "A few questions about your sanctuary, your people, and what is not working, and a plain-language plan to print and bring to your church committee.";

export const Route = createFileRoute("/church-av/planner/")({
  component: PlannerPage,
  validateSearch: (search: Record<string, unknown>): PlannerSearch =>
    answersToSearch(cleanAnswers(search)),
  head: () =>
    pageHead({
      title: "Church Room Planner: Sound, Hearing & Livestream | United Under God",
      description: DESCRIPTION,
      path: PATH,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Plan better sound, hearing help, and livestream for your sanctuary",
          description: DESCRIPTION,
          url: absoluteUrl(PATH),
          step: [
            "Choose how your church worships: traditional, blended, or modern.",
            "Tell us how many seats the sanctuary has.",
            "Describe the room: when it was built, the ceiling, and the surfaces.",
            "Choose what is not working.",
            "Say whether you livestream or want to.",
            "Note any building plans.",
            "Say who makes the decision, then read and print the committee summary.",
          ].map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
        },
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Church sound, video & lighting", path: "/church-av" },
          { name: "Church Room Planner", path: PATH },
        ]),
      ],
    }),
});

function PlannerPage() {
  const search = Route.useSearch();
  const [state, setState] = useState<{ answers: Answers; finished: boolean } | null>(null);
  const onAnswers = useCallback(
    (answers: Answers, finished: boolean) => setState({ answers, finished }),
    [],
  );
  const finished = state?.finished ? state.answers : null;
  const summaryUrl = finished
    ? `${absoluteUrl("/church-av/planner/summary")}?${new URLSearchParams(answersToSearch(finished)).toString()}`
    : "";

  return (
    <SiteShell>
      <div className="print:hidden">
        <AvHero
          eyebrow="Church Room Planner · For pastors and committees"
          title="Plan your room before you call anyone"
          crumbs={[
            { name: "Church sound, video & lighting", to: "/church-av" },
            { name: "Church Room Planner" },
          ]}
        >
          <p>
            Seven short questions about your sanctuary, your people, and what is not working. You
            get a plain-language recommendation and a one-page summary to print for your committee.
            No prices, no sales call unless you ask for one.
          </p>
        </AvHero>
      </div>

      <section className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16 print:p-0">
        <div className="print:hidden">
          <PlannerWizard initialProblem={search.problems} onAnswers={onAnswers} />
        </div>
        {finished ? (
          <div className="mt-12 print:mt-0">
            <div className="mb-8 print:hidden">
              <SectionIntro eyebrow="Your plan" title="Your committee summary">
                <p>
                  Print it, share the link, or send it to us and we will call you to talk it
                  through.
                </p>
              </SectionIntro>
              <div className="mt-6">
                <SummaryActions answers={finished} />
              </div>
            </div>
            <PlannerSummary answers={finished} />
          </div>
        ) : (
          <div className="mt-12 print:hidden">
            <p className="text-sm text-muted">
              Want to read first? Start with the problem you have:
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {HELP_PAGES.map((p) => (
                <li key={p.slug}>
                  <Link
                    to="/church-av/help/$slug"
                    params={{ slug: p.slug }}
                    className="text-forest underline-offset-4 hover:underline"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {finished ? (
        <RequestSection
          heading="Send this to us."
          source={{ path: PATH, label: "Church Room Planner" }}
          attachment={plannerMessage(finished, summaryUrl)}
          messageLabel="Anything else we should know? (optional)"
          submitLabel="Send this to us"
          lead={
            <p className="mt-4 text-muted">
              Your answers and the recommendation are attached to this request, so we see everything
              you see. We will call you back to talk through your room and a sensible next step.
              Nothing here is a price or a quote.
            </p>
          }
        />
      ) : (
        <RequestSection source={{ path: PATH, label: "Church Room Planner" }} />
      )}
    </SiteShell>
  );
}
