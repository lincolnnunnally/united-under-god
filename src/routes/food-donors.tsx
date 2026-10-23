import { createFileRoute, Link } from "@tanstack/react-router";
import { DonorBenefits } from "@/components/donor-benefits";
import { DonorForm } from "@/components/donor-form";
import { QrCard } from "@/components/qr-card";
import { SiteShell } from "@/components/site-shell";
import { StoreCalculator } from "@/components/store-calculator";
import { Button } from "@/components/ui/button";
import { LEGAL, PLENTY_STORES } from "@/lib/content";
import { pageHead, serviceJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/food-donors")({
  component: FoodDonorsPage,
  head: () =>
    pageHead({
      title: "Donate unsold food: you may deduct twice | United Under God",
      description: "Grocery stores, restaurants, and farms: donate unsold food instead of throwing it away. You may deduct up to twice the cost. Sign up once; receipts come from a 501(c)(3).",
      path: "/food-donors", jsonLd: [serviceJsonLd({ name: "Food donor sign-up and tax receipts", description: "Grocery stores, restaurants, farms, and distributors sign up once to donate unsold food to the Plenty pantry in Vidalia and receive receipts from United Under God, Inc.", path: "/food-donors", audience: "Grocery stores, restaurants, farms, and distributors", areaServed: "Vidalia, Georgia" })],
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
            Sign up once with United Under God, Inc., a 501(c)(3) nonprofit,
            and you get a tax receipt for every donation. Our Vidalia food
            pantry, Plenty, picks up the food.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="invert">
              <a href="#calculator">See what you are missing</a>
            </Button>
            <Button asChild variant="outline">
              <a href="#signup">Sign up to donate</a>
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
          food pantry program. Plain-language summary, not
          legal or tax advice. Statutes: IRC §170(e)(3); 42 U.S.C. § 1791;
          O.C.G.A. § 51-1-31. Speak with your accountant and counsel.
        </p>
      </section>

      <section id="signup" className="scroll-mt-24 border-y border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-20">
          <div className="min-w-0">
            <h2 className="text-3xl">
              <span className="block min-w-0 max-w-full">Sign up once.</span>
              <span className="block min-w-0 max-w-full">We pick it up.</span>
            </h2>
            <ol className="mt-6 space-y-4 text-muted">
              <li>
                <span className="font-medium text-ink">1. Sign up here.</span>{" "}
                Tell us your store and contact so we can send your tax
                receipts.
              </li>
              <li>
                <span className="font-medium text-ink">2. Let us know when food is ready.</span>{" "}
                Schedule a pickup on Plenty, our pantry app, and we send a
                driver.
              </li>
              <li>
                <span className="font-medium text-ink">3. Get your receipt.</span>{" "}
                Every donation is receipted by United Under God, Inc., for
                your records and your accountant.
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
              .{" "}
              <Link to="/pantry" className="text-forest underline-offset-4 hover:underline">
                Learn about the Vidalia pantry
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
