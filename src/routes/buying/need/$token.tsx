import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NEED_STATUS_LABELS } from "@/lib/church-needs";
import { chooseNeedQuoteFn, declineNeedQuotesFn, readNeedFn, type NeedView } from "@/lib/need-actions";
import { pageHead } from "@/lib/seo";

/** A church's private page for its need. Opens only from the emailed link. */
export const Route = createFileRoute("/buying/need/$token")({
  loader: ({ params }) => readNeedFn({ data: { token: params.token } }),
  component: NeedTokenPage,
  head: () => {
    const head = pageHead({
      title: "Your need | United Under God",
      path: "/buying/need",
      noindex: true,
    });
    // The path carries the church's private token; do not leak it in a Referer.
    return { ...head, meta: [...head.meta, { name: "referrer", content: "no-referrer" }] };
  },
});

function NeedTokenPage() {
  const view = Route.useLoaderData();
  const { token } = Route.useParams();
  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-5 py-16 md:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          Your church’s need
        </p>
        <NeedBody view={view} token={token} />
        <p className="mt-12 border-t border-rule pt-6 text-sm text-muted">
          Suppliers never see your name or contact information. Questions? Reply to our email, or
          write to{" "}
          <a href="mailto:lincoln@unitedundergod.org" className="text-forest underline-offset-4 hover:underline">
            lincoln@unitedundergod.org
          </a>
          .
        </p>
      </section>
    </SiteShell>
  );
}

function NeedBody({ view, token }: { view: NeedView | { state: "unavailable" }; token: string }) {
  if (view.state === "unavailable") {
    return (
      <p className="mt-4 text-muted">This page could not be loaded just now. Please try again shortly.</p>
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
        <p className="mt-4">
          <Link to="/buying/need" className="text-forest underline-offset-4 hover:underline">
            Post a new need
          </Link>
        </p>
      </>
    );
  }
  return <OpenNeed view={view} token={token} />;
}

function money(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : value;
}

function OpenNeed({ view, token }: { view: Extract<NeedView, { state: "open" }>; token: string }) {
  const [status, setStatus] = useState(view.status);
  const [chosenId, setChosenId] = useState(view.chosenQuoteId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");

  async function choose(quoteId: string) {
    setBusy(true);
    setError("");
    try {
      const result = await chooseNeedQuoteFn({ data: { token, quoteId } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setChosenId(quoteId);
      setStatus("chosen");
    } catch {
      setError("Your choice did not save. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    setError("");
    try {
      const result = await declineNeedQuotesFn({ data: { token, note } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus("closed");
    } catch {
      setError("That did not save. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  const chosen = view.quotes.find((quote) => quote.id === chosenId);
  const open = status === "quotes_sent";

  return (
    <>
      <h1 className="mt-3 text-3xl">{view.title}</h1>
      <p className="mt-3 text-sm text-muted">
        {view.churchName} · {view.place} · Status: {NEED_STATUS_LABELS[status]}
      </p>
      <dl className="mt-8 grid gap-4 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium">Category</dt>
          <dd className="text-muted">{view.category}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium">How many</dt>
          <dd className="text-muted">{view.quantity || "Not given"}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium">Needed by</dt>
          <dd className="text-muted">{view.neededBy || "No date given"}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium">Posted</dt>
          <dd className="text-muted">{view.createdAt.slice(0, 10)}</dd>
        </div>
        {view.details ? (
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium">Details</dt>
            <dd className="whitespace-pre-line text-muted">{view.details}</dd>
          </div>
        ) : null}
      </dl>

      {status === "new" || status === "bidding" ? (
        <p className="mt-8 max-w-2xl text-muted">
          We are asking suppliers to quote. When the quotes are in, we will email you, and they will
          show here side by side.
        </p>
      ) : null}

      {status === "chosen" ? (
        <div className="mt-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]" role="status">
          <h2 className="font-display text-xl">Thank you. We have your choice.</h2>
          <p className="mt-2 text-muted">
            {chosen ? `You chose ${chosen.vendorName}. ` : ""}We have emailed you how to reach the
            supplier, and sent them your details so they can contact you about the order.
          </p>
        </div>
      ) : null}

      {status === "closed" ? (
        <div className="mt-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]" role="status">
          <h2 className="font-display text-xl">This need is closed</h2>
          <p className="mt-2 text-muted">
            Thank you for letting us know. If something changes, you can always{" "}
            <Link to="/buying/need" className="text-forest underline-offset-4 hover:underline">
              post a new need
            </Link>
            .
          </p>
        </div>
      ) : null}

      {view.quotes.length ? (
        <div className="mt-10">
          <h2 className="text-2xl">Your quotes, side by side</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Prices are each, for what you asked for. Choose one and we will introduce you to that
            supplier. There is no obligation.
          </p>
          <ul
            className={
              view.quotes.length === 3
                ? "mt-6 grid gap-4 md:grid-cols-3"
                : "mt-6 grid gap-4 md:grid-cols-2"
            }
          >
            {view.quotes.map((quote) => (
              <li
                key={quote.id}
                className={
                  quote.id === chosenId
                    ? "flex flex-col rounded-xl bg-cream p-5 shadow-[0_0_0_2px_var(--color-forest)]"
                    : "flex flex-col rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]"
                }
              >
                <h3 className="font-display text-lg">{quote.vendorName}</h3>
                <p className="mt-2 text-2xl text-ink">
                  {money(quote.unitPrice)} <span className="text-sm text-muted">each</span>
                </p>
                <p className="mt-1 text-xs text-subtle">
                  Price held for {quote.termMonths} {quote.termMonths === 1 ? "month" : "months"}
                </p>
                {quote.notes ? <p className="mt-3 flex-1 text-sm text-muted">{quote.notes}</p> : <span className="flex-1" />}
                {open ? (
                  <div className="mt-4">
                    <Button type="button" disabled={busy} onClick={() => void choose(quote.id)}>
                      Choose this quote
                    </Button>
                  </div>
                ) : quote.id === chosenId ? (
                  <p className="mt-4 text-sm font-medium text-forest">Your choice</p>
                ) : null}
              </li>
            ))}
          </ul>
          {open ? (
            <div className="mt-8 grid gap-3">
              {declining ? (
                <>
                  <Label htmlFor="need-note">What would work better? (optional)</Label>
                  <Textarea
                    id="need-note"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    disabled={busy}
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="secondary" disabled={busy} onClick={() => void decline()}>
                      None of these work
                    </Button>
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => setDeclining(false)}>
                      Back
                    </Button>
                  </div>
                </>
              ) : (
                <div>
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => setDeclining(true)}>
                    None of these work
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
