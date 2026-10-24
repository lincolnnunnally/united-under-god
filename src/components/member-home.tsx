import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { InvolvementForm } from "@/components/involvement-form";
import { Button } from "@/components/ui/button";
import { openBillingPortal } from "@/lib/membership-actions";
import type { MemberChurch } from "@/lib/membership-store";

/** A signed-in member church: its status, billing, and what to do next. */
export function MemberHome({ church, open }: { church: MemberChurch; open: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function billing() {
    setBusy(true);
    setError("");
    try {
      const result = await openBillingPortal();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Billing could not open just now. Please try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Member church</p>
      <h2 className="mt-2 text-3xl">{church.churchName} is a member church.</h2>
      {church.status === "past_due" ? (
        <p className="mt-4 rounded-lg bg-cream px-4 py-3 text-sm text-ink shadow-[var(--shadow-border)]" role="status">
          The last payment did not go through. Stripe will try again; you can update the card under
          Manage billing.
        </p>
      ) : null}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        <NextStep to="/buying" title="Open the buying catalogs" body="Vendor contacts and awarded prices are visible to you now." />
        <NextStep to="/fellowship" title="Pastor fellowship" body="Tell us your area and we will gather pastors near you." />
        <NextStep to="/buying/report" title="Report a problem" body="If a program vendor doesn’t make it right, we will see it through." />
        <NextStep to="/account" title="Your account" body="Your details, the seal, and what you stand in." />
      </ul>
      {open ? (
        <div className="mt-6">
          <Button variant="secondary" disabled={busy} onClick={() => void billing()}>
            {busy ? "Opening…" : "Manage billing"}
          </Button>
          {error ? (
            <p className="mt-3 text-sm text-ink" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      <div id="website" className="mt-12 scroll-mt-24">
        <InvolvementForm
          intent="website"
          source={{ path: "/membership", label: `Member church website request: ${church.churchName}` }}
          messageLabel="The name or address you would like, and anything you already have"
        />
      </div>
    </div>
  );
}

function NextStep({ to, title, body }: { to: "/buying" | "/fellowship" | "/buying/report" | "/account"; title: string; body: string }) {
  return (
    <li>
      <Link
        to={to}
        className="flex h-full flex-col rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)]"
      >
        <span className="font-display text-lg text-ink">{title}</span>
        <span className="mt-1 text-sm text-muted">{body}</span>
      </Link>
    </li>
  );
}
