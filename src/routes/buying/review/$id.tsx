import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readReviewPageFn, submitReviewFn } from "@/lib/public-vendor-actions";
import { pageHead } from "@/lib/seo";
import type { ReviewPageView } from "@/lib/review-store";

/** A church's private page to review a vendor after a program job. */
export const Route = createFileRoute("/buying/review/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : "",
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: ({ params, deps }) => readReviewPageFn({ data: { requestId: params.id, token: deps.t } }),
  component: ReviewPage,
  head: () => {
    const head = pageHead({
      title: "Review a program vendor | United Under God",
      path: "/buying/review",
      noindex: true,
    });
    // The link carries the church's private token; do not leak it in a Referer.
    return { ...head, meta: [...head.meta, { name: "referrer", content: "no-referrer" }] };
  },
});

function ReviewPage() {
  const view = Route.useLoaderData();
  const { t } = Route.useSearch();
  const { id } = Route.useParams();
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          Verified review
        </p>
        <Body view={view} requestId={id} token={t} />
      </section>
    </SiteShell>
  );
}

const SELECT_CLASS =
  "min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)] md:text-sm";

function Body({
  view,
  requestId,
  token,
}: {
  view: ReviewPageView | { state: "unavailable" };
  requestId: string;
  token: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (view.state === "unavailable") {
    return <p className="mt-4 text-muted">This page could not be loaded just now. Please try again shortly.</p>;
  }
  if (view.state === "denied") {
    return (
      <>
        <h1 className="mt-3 text-3xl">This link is not valid</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Reviews open only from the private link in our email. Check that the whole link was
          copied, or reply to the email and we will send it again.
        </p>
      </>
    );
  }
  if (view.state === "inactive") {
    return (
      <>
        <h1 className="mt-3 text-3xl">This review is closed</h1>
        <p className="mt-4 max-w-2xl text-muted">This vendor is no longer in the program.</p>
      </>
    );
  }
  if (view.state === "done" || done) {
    return (
      <>
        <h1 className="mt-3 text-3xl">Thank you</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Your review of {view.company} is in. It helps other churches choose well.
        </p>
        <p className="mt-4">
          <Link to="/buying" className="text-forest underline-offset-4 hover:underline">
            Group buying
          </Link>
        </p>
      </>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    setBusy(true);
    setError("");
    try {
      const result = await submitReviewFn({
        data: {
          requestId,
          token,
          overall: Number(value("overall")),
          quality: Number(value("quality")),
          onTime: value("onTime"),
          billMatched: value("billMatched"),
          hireAgain: value("hireAgain"),
          comment: value("comment"),
          showChurchName: form.get("showChurchName") === "on",
        },
      });
      if (!result.ok) setError(result.error);
      else setDone(true);
    } catch {
      setError("Your review did not save. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mt-3 text-3xl">How did {view.company} do?</h1>
      <p className="mt-4 max-w-2xl text-muted">
        For {view.churchName}: {view.job}. Only churches that bought through the program can
        review a vendor. We publish honest reviews, good or bad.
      </p>
      <form className="mt-8 grid gap-6" onSubmit={(event) => void onSubmit(event)}>
        <Stars name="overall" label="Overall, how did it go?" />
        <Stars name="quality" label="Quality of the work or goods" />
        <YesNo name="onTime" label="Was it on time?" />
        <YesNo name="billMatched" label="Did the final bill match the quote?" />
        <YesNo name="hireAgain" label="Would you hire them again?" />
        <div className="grid gap-1.5">
          <Label htmlFor="review-comment">In a few words, how did it go?</Label>
          <Textarea id="review-comment" name="comment" rows={5} required maxLength={4000} />
          <p className="text-xs text-subtle">
            Please leave out anyone's phone number, address, or other private details.
          </p>
        </div>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" name="showChurchName" className="mt-0.5 size-4 accent-[var(--color-forest)]" />
          <span>
            Show {view.churchName} as the author. If you leave this unticked, the review says “A
            program church.” Your own name and email are never shown.
          </span>
        </label>
        {error ? (
          <p className="text-sm text-ink" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send review"}
          </Button>
        </div>
      </form>
    </>
  );
}

function Stars({ name, label }: { name: string; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`review-${name}`}>{label}</Label>
      <select id={`review-${name}`} name={name} required defaultValue="" className={SELECT_CLASS}>
        <option value="" disabled>
          Choose 1 to 5
        </option>
        <option value="5">5 · Excellent</option>
        <option value="4">4 · Good</option>
        <option value="3">3 · Fair</option>
        <option value="2">2 · Poor</option>
        <option value="1">1 · Very poor</option>
      </select>
    </div>
  );
}

function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <fieldset className="grid gap-1">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex gap-6">
        {["yes", "no"].map((value) => (
          <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name={name} value={value} required className="size-4 accent-[var(--color-forest)]" />
            {value === "yes" ? "Yes" : "No"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
