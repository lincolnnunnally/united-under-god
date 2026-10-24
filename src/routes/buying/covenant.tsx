import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { CovenantBlock } from "@/components/vendor-covenant";
import { acceptCovenantFn, readCovenantLinkFn } from "@/lib/case-actions";
import { pageHead } from "@/lib/seo";
import { AGREE_LABEL, VENDOR_TERMS_VERSION, termsChange, vendorCovenant } from "@/lib/vendor-terms";
import type { CovenantLinkView } from "@/lib/vendor-store";

/** A vendor's private page to accept a new version of the covenant and terms. */
export const Route = createFileRoute("/buying/covenant")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : "",
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: ({ deps }) => readCovenantLinkFn({ data: { token: deps.t } }),
  component: CovenantPage,
  head: () => {
    const head = pageHead({
      title: "Accept the Vendor Covenant | United Under God",
      path: "/buying/covenant",
      noindex: true,
    });
    return { ...head, meta: [...head.meta, { name: "referrer", content: "no-referrer" }] };
  },
});

function CovenantPage() {
  const view = Route.useLoaderData();
  const { t } = Route.useSearch();
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">For vendors</p>
        <Body view={view} token={t} />
      </section>
    </SiteShell>
  );
}

function Body({
  view,
  token,
}: {
  view: CovenantLinkView | { state: "unavailable" };
  token: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

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
  if (view.state === "inactive") {
    return (
      <>
        <h1 className="mt-3 text-3xl">This link is not active</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Reply to our email if you think this is a mistake.
        </p>
      </>
    );
  }
  if (view.state === "accepted" || accepted) {
    return (
      <>
        <h1 className="mt-3 text-3xl">Thank you</h1>
        <p className="mt-4 max-w-2xl text-muted">
          {view.company} has accepted the Vendor Covenant and Vendor Terms version{" "}
          {VENDOR_TERMS_VERSION}.
        </p>
      </>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const agreed = Boolean(new FormData(event.currentTarget).get("agreed"));
    if (!agreed) {
      setError(`Tick “${AGREE_LABEL}” to accept.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await acceptCovenantFn({
        data: { token, agreed, termsVersion: VENDOR_TERMS_VERSION },
      });
      if (!result.ok) setError(result.error);
      else setAccepted(true);
    } catch {
      setError("That did not save. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mt-3 text-3xl">{view.company}: please accept the Vendor Covenant</h1>
      <p className="mt-4 max-w-2xl text-muted">
        {view.acceptedVersion
          ? `You accepted the Vendor Terms version ${view.acceptedVersion}. `
          : ""}
        {termsChange()}
      </p>
      <div className="mt-8">
        <CovenantBlock section={vendorCovenant()} />
      </div>
      <p className="mt-6 text-sm text-muted">
        Read the full{" "}
        <Link
          to="/buying/vendor-terms"
          target="_blank"
          className="text-forest underline-offset-4 hover:underline"
        >
          Vendor Covenant and Vendor Terms
        </Link>{" "}
        (version {VENDOR_TERMS_VERSION}).
      </p>
      <form className="mt-6 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="agreed"
            required
            className="mt-0.5 size-4 accent-[var(--color-forest)]"
          />
          <span>
            {AGREE_LABEL} (version {VENDOR_TERMS_VERSION}).
          </span>
        </label>
        {error ? (
          <p className="text-sm text-ink" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Accept"}
          </Button>
        </div>
      </form>
    </>
  );
}
