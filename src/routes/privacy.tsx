import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { LEGAL } from "@/lib/content";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [{ title: "Privacy Policy — United Under God" }],
  }),
});

function PrivacyPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Legal</p>
        <h1 className="mt-3 text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-subtle">Last updated: September 2026</p>
        <div className="mt-8 space-y-5 text-muted">
          <p>
            {LEGAL.name} is a {LEGAL.status}, EIN {LEGAL.ein}. We treat your
            information the way we’d want ours treated — carefully, briefly, and
            never as a product we sell.
          </p>
          <p className="rounded-xl bg-cream p-5 text-ink">
            We will never sell your data. We will never advertise to you using
            your data. We do not use tracking or advertising cookies.
          </p>
          <h2 className="pt-4 text-2xl text-ink">What we collect</h2>
          <p>
            When you raise your hand, take the seal, donate food, or send a
            Bible question, we keep the name, email, organization, and message
            you typed so we can follow up. On this preview those notes live in
            your browser until we connect the live desk.
          </p>
          <h2 className="pt-4 text-2xl text-ink">Gifts</h2>
          <p>
            Card gifts, when enabled, are processed by Stripe. We never see or
            store a card number. Food and goods donations are logged so we can
            pick them up and report meals served.
          </p>
          <h2 className="pt-4 text-2xl text-ink">Your rights</h2>
          <p>
            Write{" "}
            <a className="text-forest underline-offset-4 hover:underline" href="mailto:care@unitedundergod.org">
              care@unitedundergod.org
            </a>{" "}
            to see, correct, or delete what you sent us.
          </p>
          <p>
            <Link to="/terms" className="text-forest underline-offset-4 hover:underline">
              Terms of Use
            </Link>
          </p>
        </div>
      </article>
    </SiteShell>
  );
}
