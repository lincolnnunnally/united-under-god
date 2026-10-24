import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteShell } from "@/components/site-shell";
import { VendorPortal } from "@/components/vendor-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readPortalFn, redeemPortalLinkFn, requestPortalLinkFn } from "@/lib/portal-actions";
import { pageHead } from "@/lib/seo";

/** The vendor portal: sign in by an emailed link, then manage the vendor's own record. */
export const Route = createFileRoute("/buying/portal")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : "",
  }),
  loader: () => readPortalFn(),
  component: PortalPage,
  head: () => {
    const head = pageHead({
      title: "Vendor portal | United Under God",
      path: "/buying/portal",
      noindex: true,
    });
    // The sign-in link carries a private token; do not leak it in a Referer.
    return { ...head, meta: [...head.meta, { name: "referrer", content: "no-referrer" }] };
  },
});

function PortalPage() {
  const read = Route.useLoaderData();
  const { t } = Route.useSearch();
  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">For vendors</p>
        {read.state === "unavailable" ? (
          <p className="mt-4 text-muted">The portal could not be loaded just now. Please try again shortly.</p>
        ) : read.state === "ok" ? (
          <VendorPortal initial={read} />
        ) : t ? (
          <Redeem token={t} />
        ) : (
          <SignIn />
        )}
      </section>
    </SiteShell>
  );
}

/** The emailed link lands here; one press trades it for a session (a mail scanner's visit does not). */
function Redeem({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    try {
      const result = await redeemPortalLinkFn({ data: { token } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await router.navigate({ to: "/buying/portal", search: { t: "" }, replace: true });
      await router.invalidate();
    } catch {
      setError("Sign-in did not go through. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mt-3 text-3xl">Sign in to your vendor portal</h1>
      <p className="mt-4 max-w-2xl text-muted">Press the button to finish signing in on this device.</p>
      {error ? (
        <p className="mt-4 text-sm text-ink" role="alert">
          {error}{" "}
          <Link to="/buying/portal" search={{ t: "" }} className="text-forest underline-offset-4 hover:underline">
            Ask for a new link
          </Link>
        </p>
      ) : null}
      <div className="mt-6">
        <Button type="button" disabled={busy} onClick={() => void go()}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </>
  );
}

function SignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await requestPortalLinkFn({
        data: { email: String(form.get("email") ?? ""), hp: String(form.get("fax") ?? "") },
      });
      if (!result.ok) setError(result.error);
      else setSent(true);
    } catch {
      setError("That did not go through. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <>
        <h1 className="mt-3 text-3xl">Check your email</h1>
        <p className="mt-4 max-w-2xl text-muted">
          If that email is on our vendor list, a sign-in link is on its way. It works once and
          expires soon. Nothing arrived? Check spam, or reply to any email from us.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="mt-3 text-3xl">Vendor portal</h1>
      <p className="mt-4 max-w-2xl text-muted">
        Update your profile, prices offered to the program, brochures and price sheets; see your
        standing and open bids; and send your monthly report. Enter the email you signed up with
        and we will send you a sign-in link. No password.
      </p>
      <form className="mt-8 grid max-w-md gap-4" onSubmit={(event) => void onSubmit(event)}>
        <div className="grid gap-1.5">
          <Label htmlFor="portal-email">Email</Label>
          <Input id="portal-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="portal-fax">Fax</label>
          <input id="portal-fax" name="fax" tabIndex={-1} autoComplete="off" />
        </div>
        {error ? (
          <p className="text-sm text-ink" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </div>
      </form>
      <p className="mt-8 text-sm text-muted">
        Not a program vendor yet?{" "}
        <Link to="/buying/vendors" className="text-forest underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
