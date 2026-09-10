import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { LEGAL } from "@/lib/content";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [{ title: "Terms of Use — United Under God" }],
  }),
});

function TermsPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Legal</p>
        <h1 className="mt-3 text-4xl">Terms of Use</h1>
        <p className="mt-3 text-sm text-subtle">Last updated: September 2026</p>
        <div className="mt-8 space-y-5 text-muted">
          <p>
            This site is operated by {LEGAL.name}, a Georgia {LEGAL.status}, EIN{" "}
            {LEGAL.ein}. By using it you agree to what’s below. If something
            doesn’t sit right, write{" "}
            <a className="text-forest underline-offset-4 hover:underline" href="mailto:care@unitedundergod.org">
              care@unitedundergod.org
            </a>{" "}
            first.
          </p>
          <p className="rounded-xl bg-cream p-5 text-ink">
            The seal, the assessment, and this movement home are free. A gift is
            never required, and nothing is gated behind one.
          </p>
          <h2 className="pt-4 text-2xl text-ink">Gifts</h2>
          <p>
            Giving is optional. Gifts are tax-deductible to the extent allowed
            by law. A gift buys no standing, no seal, and no influence. The
            seal remains free and is never for sale.
          </p>
          <h2 className="pt-4 text-2xl text-ink">The library</h2>
          <p>
            Understanding the Bible is offered as pastoral help, not as a
            substitute for your own reading of Scripture or the care of a local
            church. Verses are quoted from the Berean Study Bible.
          </p>
          <p>
            <Link to="/privacy" className="text-forest underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </article>
    </SiteShell>
  );
}
