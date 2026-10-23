import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequestSection } from "@/components/church-av";
import { PlannerSummary, SummaryActions } from "@/components/church-av-planner";
import { SiteShell } from "@/components/site-shell";
import {
  answersToSearch,
  cleanAnswers,
  isComplete,
  loadSaved,
  plannerMessage,
  type Answers,
  type PlannerSearch,
} from "@/lib/church-av-planner";
import { absoluteUrl, pageHead } from "@/lib/seo";

const PATH = "/church-av/planner/summary";

/**
 * The shareable, printable committee summary. The answers ride in the link so
 * a pastor can send it to the committee; without them it falls back to the
 * answers saved in this browser. Per-church, so it stays out of search.
 */
export const Route = createFileRoute("/church-av/planner/summary")({
  component: SummaryPage,
  validateSearch: (search: Record<string, unknown>): PlannerSearch =>
    answersToSearch(cleanAnswers(search)),
  head: () =>
    pageHead({
      title: "Committee Summary · Church Room Planner | United Under God",
      description: "A church’s Church Room Planner answers and recommendation, ready to print.",
      path: PATH,
      noindex: true,
    }),
});

function SummaryPage() {
  const search = Route.useSearch();
  const fromLink = cleanAnswers(search);
  const [answers, setAnswers] = useState<Answers | null>(isComplete(fromLink) ? fromLink : null);
  const [checked, setChecked] = useState(isComplete(fromLink));

  useEffect(() => {
    if (checked) return;
    const saved = loadSaved();
    if (saved && isComplete(saved.answers)) setAnswers(saved.answers);
    setChecked(true);
  }, [checked]);

  const summaryUrl = answers
    ? `${absoluteUrl(PATH)}?${new URLSearchParams(answersToSearch(answers)).toString()}`
    : "";

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16 print:p-0">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase print:hidden">
          Church Room Planner
        </p>
        <h1 className="mt-3 text-4xl print:hidden">Committee summary</h1>
        {answers ? (
          <>
            <p className="mt-4 max-w-2xl text-muted print:hidden">
              A plain-language plan built from one church’s answers. Print it for the committee, or
              send it to us and we will call to talk it through.
            </p>
            <div className="mt-6 mb-12 print:hidden">
              <SummaryActions answers={answers} />
              <p className="mt-4 text-sm">
                <Link
                  to="/church-av/planner"
                  className="text-forest underline-offset-4 hover:underline"
                >
                  Change the answers in the planner
                </Link>
              </p>
            </div>
            <PlannerSummary answers={answers} />
          </>
        ) : (
          <p className="mt-4 max-w-2xl text-muted">
            {checked ? "There is no summary here yet. " : "Loading… "}
            <Link
              to="/church-av/planner"
              className="text-forest underline-offset-4 hover:underline"
            >
              Answer seven short questions in the Church Room Planner
            </Link>{" "}
            and your committee summary will appear.
          </p>
        )}
      </section>
      {answers ? (
        <RequestSection
          heading="Send this to us."
          source={{ path: PATH, label: "Church Room Planner summary" }}
          attachment={plannerMessage(answers, summaryUrl)}
          messageLabel="Anything else we should know? (optional)"
          submitLabel="Send this to us"
          lead={
            <p className="mt-4 text-muted">
              The answers and recommendation above are attached to this request. We will call you
              back to talk through your room.
            </p>
          }
        />
      ) : null}
    </SiteShell>
  );
}
