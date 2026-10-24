import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MemberHome } from "@/components/member-home";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { hasMemberAccess } from "@/lib/membership";
import { confirmMemberCheckout } from "@/lib/membership-actions";
import type { MemberChurch } from "@/lib/membership-store";
import { pageHead } from "@/lib/seo";

/** Stripe Checkout's success_url. Private; never in the sitemap. */
export const Route = createFileRoute("/membership/welcome")({
  component: WelcomePage,
  head: () =>
    pageHead({ title: "Welcome, member church | United Under God", path: "/membership/welcome", noindex: true }),
});

function WelcomePage() {
  const { user, isPending } = useCurrentUserState();
  const [church, setChurch] = useState<MemberChurch | null | undefined>(undefined);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (isPending || !user) return;
    const sessionId = new URLSearchParams(window.location.search).get("session_id") ?? "";
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      setChurch(null);
      return;
    }
    void confirmMemberCheckout({ data: { sessionId } })
      .then((result) => setChurch(result.church))
      .catch(() => setChurch(null));
  }, [isPending, user, tries]);

  // The webhook may land a few seconds after the redirect; look again briefly.
  useEffect(() => {
    if (church && !hasMemberAccess(church.status) && tries < 5) {
      const timer = window.setTimeout(() => setTries((n) => n + 1), 3000);
      return () => window.clearTimeout(timer);
    }
  }, [church, tries]);

  if (!isPending && !user) return <RedirectToSignIn to="/login?next=/membership" />;

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        {church === undefined ? (
          <div className="h-64 animate-pulse rounded-xl bg-cream" />
        ) : church && hasMemberAccess(church.status) ? (
          <>
            <h1 className="sr-only">Welcome, member church</h1>
            <MemberHome church={church} open />
          </>
        ) : (
          <div>
            <h1 className="text-4xl">Thank you.</h1>
            <p className="mt-4 text-muted">
              {church && tries < 5
                ? "We are confirming your payment with Stripe. This usually takes a few seconds."
                : "Your payment is still being confirmed. Refresh this page in a minute. If you were charged and this does not change, email lincoln@unitedundergod.org and we will set it right."}
            </p>
            <Button asChild className="mt-6" variant="secondary">
              <Link to="/membership">Back to membership</Link>
            </Button>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
