import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readMediatorCaseFn, submitRecommendationFn } from "@/lib/case-actions";
import { CASE_STATUS_LABELS, type MediatorCaseView } from "@/lib/case-store";
import { pageHead } from "@/lib/seo";

/** A mediator's private page: read the case and add a recommendation. */
export const Route = createFileRoute("/buying/mediate/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : "",
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: ({ params, deps }) => readMediatorCaseFn({ data: { caseId: params.id, token: deps.t } }),
  component: MediatorPage,
  head: () => {
    const head = pageHead({
      title: "Mediation | United Under God",
      path: "/buying/mediate",
      noindex: true,
    });
    return { ...head, meta: [...head.meta, { name: "referrer", content: "no-referrer" }] };
  },
});

function MediatorPage() {
  const view = Route.useLoaderData();
  const { t } = Route.useSearch();
  const { id } = Route.useParams();
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Mediation</p>
        <Body view={view} caseId={id} token={t} />
        <p className="mt-12 border-t border-rule pt-6 text-sm text-muted">
          Cases are heard under the{" "}
          <Link
            to="/buying/vendor-terms"
            hash="covenant"
            className="text-forest underline-offset-4 hover:underline"
          >
            Vendor Covenant
          </Link>
          . Please keep the details of the case private.
        </p>
      </section>
    </SiteShell>
  );
}

function Body({
  view,
  caseId,
  token,
}: {
  view: MediatorCaseView | { state: "unavailable" };
  caseId: string;
  token: string;
}) {
  if (view.state === "unavailable") {
    return (
      <p className="mt-4 text-muted">
        This page could not be loaded just now. Please try again shortly.
      </p>
    );
  }
  if (view.state === "denied") {
    return (
      <>
        <h1 className="mt-3 text-3xl">This link is not valid</h1>
        <p className="mt-4 max-w-2xl text-muted">
          This page opens only from the private link in our email. Reply to the email and we will
          send it again.
        </p>
      </>
    );
  }
  return <OpenCase view={view} caseId={caseId} token={token} />;
}

function OpenCase({
  view,
  caseId,
  token,
}: {
  view: Extract<MediatorCaseView, { state: "open" }>;
  caseId: string;
  token: string;
}) {
  const { report } = view;
  const [timeline, setTimeline] = useState(view.timeline);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await submitRecommendationFn({ data: { caseId, token, body } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTimeline((list) => [
        ...list,
        {
          kind: "recommendation",
          author: `Mediator: ${view.mediator}`,
          body: body.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
      setBody("");
    } catch {
      setError("Your recommendation did not save. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mt-3 text-3xl">
        {report.churchName} and {report.vendorName}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {CASE_STATUS_LABELS[report.status]} · Thank you, {view.mediator}.
      </p>
      <dl className="mt-8 grid gap-4 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
        <div>
          <dt className="text-sm font-medium">What was bought</dt>
          <dd className="text-muted">
            {report.purchase} ({report.purchasedOn})
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium">What went wrong</dt>
          <dd className="whitespace-pre-line text-muted">{report.problem}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium">What would make it right</dt>
          <dd className="whitespace-pre-line text-muted">{report.wanted}</dd>
        </div>
      </dl>

      <h2 className="mt-10 text-xl">The record so far</h2>
      <ol className="mt-3 grid gap-3">
        {timeline.map((event, index) => (
          <li
            key={`${event.createdAt}-${index}`}
            className="rounded-lg bg-paper p-4 shadow-[var(--shadow-border)]"
          >
            <p className="text-xs text-subtle">
              {event.createdAt.slice(0, 16).replace("T", " ")} UTC · {event.author}
            </p>
            <p className="mt-1 whitespace-pre-line text-muted">{event.body}</p>
          </li>
        ))}
      </ol>

      {view.canRecommend ? (
        <form className="mt-8 grid gap-3" onSubmit={(event) => void onSubmit(event)}>
          <Label htmlFor="recommendation">Your recommendation</Label>
          <p className="text-sm text-muted">
            What should happen, and why? United Under God records the final decision.
          </p>
          <Textarea
            id="recommendation"
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={busy}
            required
          />
          {error ? (
            <p className="text-sm text-ink" role="alert">
              {error}
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={busy || !body.trim()}>
              {busy ? "Sending…" : "Add my recommendation"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-8 text-muted">This case has been decided. Thank you for your help.</p>
      )}
    </>
  );
}
