import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { LEGAL } from "@/lib/content";

export const Route = createFileRoute("/give/thanks")({
  component: GiveThanks,
  head: () => ({
    meta: [{ title: "Thank you — United Under God" }],
  }),
});

function GiveThanks() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-5 py-20 md:px-8 md:py-28">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          Received
        </p>
        <h1 className="mt-3 text-4xl">Thank you.</h1>
        <p className="mt-5 text-lg text-muted">
          Your gift goes into the work — tools churches actually use, meals in
          Vidalia, and people on mission. A receipt with EIN {LEGAL.ein} comes
          from Stripe to the email you gave.
        </p>
        <p className="mt-4 text-muted">
          Nothing here was behind that gift. The seal stays free. The library
          stays free. The ask never becomes a gate.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/">Back to the movement</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/bible">Read the library</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
