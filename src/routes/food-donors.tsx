import { createFileRoute, Link } from "@tanstack/react-router";
import { DonorBenefits } from "@/components/donor-benefits";
import { DonorForm } from "@/components/donor-form";
import { ImpactCalculator } from "@/components/impact-calculator";
import { StoreCalculator } from "@/components/store-calculator";
import { QrCard } from "@/components/qr-card";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { DONOR_URL, LEGAL, PLENTY_DONATE, PLENTY_URL } from "@/lib/content";

export const Route = createFileRoute("/food-donors")({
  component: FoodDonorsPage,
  head: () => ({
    meta: [
      { title: "Throw it away, deduct the cost. Donate it, you may deduct twice as much — United Under God" },
    ],
  }),
});

function FoodDonorsPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            For grocery stores, farms, and kitchens
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">
            Throw it away, deduct the cost. Donate it, you may deduct twice as much.
          </h1>
          <p className="mt-5 max-w-2xl text-paper/85">
            A grocery store is a business. Toss unsold food and you write off
            what you paid. Give it to Plenty and you may write off twice that —
            then people who felt the kindness come back and spend leftover money
            in your aisles. Sign up here and we will schedule pickup.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="invert">
              <a href="#signup">Sign up to donate food</a>
            </Button>
            <Button asChild variant="outline">
              <a href={PLENTY_DONATE} target="_blank" rel="noreferrer">
                Give on Plenty
              </a>
            </Button>
            <p className="font-mono text-sm text-paper/70">{DONOR_URL}</p>
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

      <section
        id="signup"
        className="scroll-mt-24 border-y border-rule bg-cream"
      >
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-20">
          <div className="min-w-0">
            <h2 className="text-3xl">Punch in one week of what you throw.</h2>
            <p className="mt-4 text-muted">
              A grocer who donates is making a better number. Throw it away and
              you deduct cost. Donate it and you may deduct twice as much — then
              the neighbor who felt that kindness comes back and spends leftover
              money in your store. If your banner already says you feed kids,
              meat and dairy can match that. Recipients sign. We pick up.
            </p>
            <div className="mt-8">
              <StoreCalculator />
            </div>
            <div className="mt-8">
              <ImpactCalculator />
            </div>
            <p className="mt-6 text-sm text-muted">
              The Vidalia pantry story, the waiver, and the letter to grocers
              live on the{" "}
              <Link
                to="/pantry"
                className="text-forest underline-offset-4 hover:underline"
              >
                pantry page
              </Link>
              . Grocers can also give on{" "}
              <a
                href={PLENTY_URL}
                target="_blank"
                rel="noreferrer"
                className="text-forest underline-offset-4 hover:underline"
              >
                plenty.unitedundergod.org
              </a>
              .
            </p>
          </div>
          <DonorForm initialKind="food" lockKind />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <QrCard />
      </section>
    </SiteShell>
  );
}
