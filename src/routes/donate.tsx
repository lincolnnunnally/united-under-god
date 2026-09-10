import { createFileRoute, Link } from "@tanstack/react-router";
import { DonorBenefits } from "@/components/donor-benefits";
import { DonorForm } from "@/components/donor-form";
import { ImpactCalculator } from "@/components/impact-calculator";
import { QrCard } from "@/components/qr-card";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { DONOR_PATHS, DONOR_URL, LEGAL, PLENTY_DONATE, PLENTY_URL } from "@/lib/content";

export const Route = createFileRoute("/donate")({
  component: DonatePage,
  head: () => ({
    meta: [{ title: "Donate food and goods — United Under God" }],
  }),
});

function DonatePage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            For stores, farms, kitchens, and anyone with a surplus
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">
            You are missing more by throwing it away than by giving it.
          </h1>
          <p className="mt-5 max-w-2xl text-paper/85">
            A deduction. Two legal shields. A register that does not shrink.
            Fresher shelves. Neighbors fed. Two doors into the same pantry:
            this page, or Plenty.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="invert">
              <a href={PLENTY_DONATE} target="_blank" rel="noreferrer">
                Give on Plenty
              </a>
            </Button>
            <p className="self-center font-mono text-sm text-paper/70">{DONOR_URL}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <DonorBenefits />
        <p className="mt-8 max-w-3xl text-sm text-muted">
          {LEGAL.name} is a {LEGAL.status}, EIN {LEGAL.ein}. Plain-language
          summary, not legal or tax advice. Statutes: IRC §170(e)(3); 42 U.S.C.
          § 1791; O.C.G.A. § 51-1-31. Speak with your accountant and counsel.
          Recipients sign a waiver before they take food.
        </p>
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <h2 className="max-w-2xl text-3xl">Two doors into Plenty. One pantry.</h2>
          <p className="mt-4 max-w-2xl text-muted">
            Grocers can give on{" "}
            <a
              href={PLENTY_URL}
              target="_blank"
              rel="noreferrer"
              className="text-forest underline-offset-4 hover:underline"
            >
              plenty.unitedundergod.org
            </a>{" "}
            or right here. Same pantry. Same meals. Furniture, clothes, and
            household goods go to Operate.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {DONOR_PATHS.map((path) => (
              <article
                key={path.id}
                className="rounded-xl bg-paper p-6 shadow-[var(--shadow-border)]"
              >
                <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
                  {path.desk}
                </p>
                <h3 className="mt-2 font-display text-xl">{path.title}</h3>
                <p className="mt-2 text-sm text-muted">{path.who}</p>
                <p className="mt-3 text-sm text-ink">{path.blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-20">
        <div>
          <h2 className="text-3xl">See the meals. Then give the food.</h2>
          <p className="mt-4 text-muted">
            A grocer who donates is not losing a customer. They are feeding a
            neighbor who will still buy what the pantry cannot give — and they
            may deduct what the dumpster would have eaten for free.
          </p>
          <div className="mt-8">
            <ImpactCalculator />
          </div>
          <p className="mt-6 text-sm text-muted">
            The Vidalia pantry story, the waiver, and the letter to grocers live
            on the{" "}
            <Link to="/pantry" className="text-forest underline-offset-4 hover:underline">
              pantry page
            </Link>
            .
          </p>
        </div>
        <DonorForm />
      </section>

      <section className="border-t border-rule bg-cream px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <QrCard />
        </div>
      </section>
    </SiteShell>
  );
}
