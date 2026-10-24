import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MemberBenefits } from "@/components/member-gate";
import { Button } from "@/components/ui/button";
import { MEMBER_PRICE_LABEL, hasMemberAccess } from "@/lib/membership";
import { readMembership, type MembershipView } from "@/lib/membership-actions";

/**
 * On /account: a member church sees "Member church" and its benefits; anyone
 * else sees the invitation. Display only; the gate itself is server-side.
 */
export function MemberStatusCard() {
  const [view, setView] = useState<MembershipView | null>(null);

  useEffect(() => {
    void readMembership()
      .then(setView)
      .catch(() => setView(null));
  }, []);

  if (!view) return null;

  if (view.member && view.church) {
    return (
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Member church</p>
          <h2 className="mt-2 text-2xl">{view.church.churchName}</h2>
          {view.church.status === "past_due" ? (
            <p className="mt-2 text-sm text-ink">The last payment did not go through. Update the card under Manage billing.</p>
          ) : null}
          <MemberBenefits className="mt-6" />
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/membership" hash="become">Membership and billing</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/membership" hash="website">Request your church website</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const started = view.church && !hasMemberAccess(view.church.status) && view.church.status !== "canceled";
  return (
    <section className="border-b border-rule">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div>
          <h2 className="font-display text-xl">Become a member church</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Vendor contacts and awarded prices in the buying catalogs, a church website, pastor
            fellowship, and help when a vendor falls short. {MEMBER_PRICE_LABEL}.
          </p>
        </div>
        <Button asChild>
          <Link to="/membership" hash="become">
            {started ? "Finish membership" : "See membership"}
          </Link>
        </Button>
      </div>
    </section>
  );
}
