import { createFileRoute, Link } from "@tanstack/react-router";
import { DonorBenefits } from "@/components/donor-benefits";
import { DonorForm } from "@/components/donor-form";
import { QrCard } from "@/components/qr-card";
import { SiteShell } from "@/components/site-shell";
import { StoreCalculator } from "@/components/store-calculator";
import { Button } from "@/components/ui/button";
import { LEGAL, PLENTY_STORES } from "@/lib/content";

export const Route = createFileRoute("/food-donors")({
  component: FoodDonorsPage,
  head: () => ({
    meta: [
      {
        title:
          "Throw it away, deduct the cost. Donate it, you may deduct twice as much — United Under God",
      },
    ],
  }),
});

function FoodDonorsPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            Grocery stores · farms · kitchens
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">
            <span className="block min-w-0 max-w-full">Throw it away, deduct the cost.</span>
            <span className="block min-w-0 max-w-full">Donate it — you may deduct twice as much.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-paper/85">
            United Under God, Inc. is the 501(c)(3). Sign up once here so the
            tax record is clean. Plenty is the pantry program that picks up the
            food. Receipts always say United Under God, Inc.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="invert">
              <a href="#calculator">See what you are missing</a>
            </Button>
            <Button asChild variant="outline">
              <a href="#signup">Sign up with the charity</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="calculator" className="scroll-mt-24 border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <StoreCalculator />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <DonorBenefits />
        <p className="mt-8 max-w-3xl text-sm text-muted">
          {LEGAL.name} is a {LEGAL.status}, EIN {LEGAL.ein}. Plenty is our
          pantry program, not a second charity. Plain-language summary, not
          legal or tax advice. Statutes: IRC §170(e)(3); 42 U.S.C. § 1791;
          O.C.G.A. § 51-1-31. Speak with your accountant and counsel.
        </p>
      </section>

      <section id="signup" className="scroll-mt-24 border-y border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-20">
          <div className="min-w-0">
            <h2 className="text-3xl">
              <span className="block min-w-0 max-w-full">Sign up once here.</span>
              <span className="block min-w-0 max-w-full">Then live in Plenty for pickups.</span>
            </h2>
            <ol className="mt-6 space-y-4 text-muted">
              <li>
                <span className="font-medium text-ink">1. Raise a hand here.</span>{" "}
                We keep the donor of record — name, store, contact, gift type,
                tax letter.
              </li>
              <li>
                <span className="font-medium text-ink">2. Tell Plenty when food is ready.</span>{" "}
                Pickup window, load, driver, what left the dock.
              </li>
              <li>
                <span className="font-medium text-ink">3. Receipts say United Under God, Inc.</span>{" "}
                Plenty is a program. There is one charity.
              </li>
            </ol>
            <p className="mt-6 text-sm text-muted">
              Already on the list?{" "}
              <a
                href={PLENTY_STORES}
                className="text-forest underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Request a pickup on Plenty
              </a>
              . Neighbors who need food also sign in there.{" "}
              <Link to="/pantry" className="text-forest underline-offset-4 hover:underline">
                Vidalia pantry story
              </Link>
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
