import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readVendorCaseFn, submitVendorResponseFn } from "@/lib/case-actions";
import type { VendorCaseView } from "@/lib/case-store";
import { pageHead } from "@/lib/seo";

/** The vendor's private page for a church's concern. Opens only from the emailed link. */
export const Route = createFileRoute("/buying/cases/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : "",
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: ({ params, deps }) => readVendorCaseFn({ data: { caseId: params.id, token: deps.t } }),
  component: VendorCasePage,
  head: () => {
    const head = pageHead({
      title: "A church's concern | United Under God",
      path: "/buying/cases",
      noindex: true,
    });
    // The link carries the vendor's private token; do not leak it in a Referer.
    return { ...head, meta: [...head.meta, { name: "referrer", content: "no-referrer" }] };
  },
});

function VendorCasePage() {
  const view = Route.useLoaderData();
  const { t } = Route.useSearch();
  const { id } = Route.useParams();
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          A church’s concern
        </p>
        <CaseBody view={view} caseId={id} token={t} />
        <p className="mt-12 border-t border-rule pt-6 text-sm text-muted">
          Every program vendor agrees to the{" "}
          <Link
            to="/buying/vendor-terms"
            hash="covenant"
            className="text-forest underline-offset-4 hover:underline"
          >
            Vendor Covenant
          </Link>
          .
        </p>
      </section>
    </SiteShell>
  );
}

function CaseBody({
  view,
  caseId,
  token,
}: {
  view: VendorCaseView | { state: "unavailable" };
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
          This page opens only from the private link in our email. Check that the whole link was
          copied, or reply to the email and we will send it again.
        </p>
      </>
    );
  }
  if (view.state === "closed") {
    return (
      <>
        <h1 className="mt-3 text-3xl">This case is closed</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Thank you. Reply to our email with any questions.
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
  view: Extract<VendorCaseView, { state: "open" }>;
  caseId: string;
  token: string;
}) {
  const { report } = view;
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ body: string; createdAt: string }[]>(view.responses);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await submitVendorResponseFn({ data: { caseId, token, body } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent((list) => [...list, { body: body.trim(), createdAt: new Date().toISOString() }]);
      setBody("");
    } catch {
      setError("Your response did not save. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mt-3 text-3xl">
        {report.churchName} raised a concern with {view.vendor}
      </h1>
      {view.due ? <p className="mt-3 text-ink">Please respond by {view.due}.</p> : null}
      <dl className="mt-8 grid gap-4 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
        <div>
          <dt className="text-sm font-medium">Contact</dt>
          <dd className="text-muted">{report.contactName}</dd>
        </div>
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

      {sent.length ? (
        <div className="mt-8">
          <h2 className="text-xl">Your response so far</h2>
          <ul className="mt-3 grid gap-3">
            {sent.map((row) => (
              <li
                key={row.createdAt}
                className="rounded-lg bg-paper p-4 shadow-[var(--shadow-border)]"
              >
                <p className="text-xs text-subtle">
                  {row.createdAt.slice(0, 16).replace("T", " ")} UTC
                </p>
                <p className="mt-1 whitespace-pre-line text-muted">{row.body}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form className="mt-8 grid gap-3" onSubmit={(event) => void onSubmit(event)}>
        <Label htmlFor="vendor-response">
          {sent.length ? "Add to your response" : "Your response"}
        </Label>
        <p className="text-sm text-muted">
          Tell us what happened from your side and what you will do to make it right. If you and the
          church settle it directly, tell us that too.
        </p>
        <Textarea
          id="vendor-response"
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
            {busy ? "Sending…" : "Send my response"}
          </Button>
        </div>
      </form>
    </>
  );
}
