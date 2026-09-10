import { createFileRoute, Link } from "@tanstack/react-router";
import { InvolvementForm } from "@/components/involvement-form";
import { SealBadge } from "@/components/seal-mark";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { SEAL_STATEMENT } from "@/lib/content";

export const Route = createFileRoute("/join")({
  component: JoinPage,
  head: () => ({
    meta: [{ title: "Take the seal — United Under God" }],
  }),
});

function JoinPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[auto_1fr] md:px-8 md:py-20">
          <SealBadge />
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
              The seal — free, always
            </p>
            <h1 className="mt-3 text-4xl">Make the statement of intent.</h1>
            <p className="mt-5 max-w-prose text-muted">
              The seal is not a fee, a contract, or a membership club. It is a
              public way to say: we desire to be unified under God, and we
              intend to fulfill what Jesus asked of His church — love one
              another, and let good work be seen.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div className="space-y-8">
          <article>
            <h2 className="text-xl">What the statement means</h2>
            <div className="mt-4 space-y-3 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
              {SEAL_STATEMENT.map((line) => (
                <p key={line} className="font-display text-lg italic leading-snug">
                  {line}
                </p>
              ))}
            </div>
          </article>
          <article>
            <h2 className="text-xl">What you receive</h2>
            <p className="mt-3 text-muted">
              A public page for your organization, your place among the bodies
              standing together, and the seal itself — a badge you can put on
              your site, your door, your letterhead. It always links back, so
              it can always be verified.
            </p>
          </article>
          <article>
            <h2 className="text-xl">What it costs</h2>
            <p className="mt-3 text-muted">
              Nothing. The seal is free. It is not for sale, and it never will
              be. A bought seal would mean nothing.
            </p>
          </article>
          <article>
            <h2 className="text-xl">What you keep</h2>
            <p className="mt-3 text-muted">
              Your denomination. Your associations. Your name. We are not
              trying to replace anyone. We are here so the church in a town can
              actually be one, and so Christian-led businesses, charities, and
              civic work can operate as part of the same Kingdom.
            </p>
          </article>
          <p className="text-sm text-muted">
            Looking for the tools that come with the fellowship?{" "}
            <Link to="/organizations" className="text-forest underline-offset-4 hover:underline">
              See what organizations receive
            </Link>
            .
          </p>
        </div>
        <div>
          <InvolvementForm intent="seal" />
          <p className="mt-4 text-xs text-subtle">
            Every application is reviewed personally. The seal means something
            because someone stands at the door.
          </p>
        </div>
      </section>

      <section className="border-t border-rule bg-forest px-5 py-14 text-paper md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl text-paper">The seal is a beginning, not a badge collection.</h2>
            <p className="mt-2 max-w-xl text-sm text-paper/75">
              After you take it, live it — pantry shifts, reconciled
              relationships, a first act of mission this week.
            </p>
          </div>
          <Button asChild variant="invert">
            <Link to="/mission">Live on Mission</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
