import { createFileRoute, Link } from "@tanstack/react-router";
import { GiveForm } from "@/components/give-form";
import { GoodsExchange } from "@/components/goods-exchange";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { LEGAL } from "@/lib/content";

export const Route = createFileRoute("/donate")({
  component: DonatePage,
  head: () => ({
    meta: [{ title: "Donate — United Under God" }],
  }),
});

function DonatePage() {
  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        <img
          src="/images/hands.jpg"
          alt="Hands packing food into bags"
          className="absolute inset-0 size-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            Keep this work moving
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">
            Give so neighbors eat, churches stay equipped, and the movement
            stays honest.
          </h1>
          <p className="mt-5 max-w-2xl text-paper/85">
            Money is how a pantry stays stocked, how shared tools stay in reach
            of a little church, and how Live on Mission stays a practice. A
            gift here is not a brand donation. It is the body at work.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:items-start md:px-8 md:py-20">
        <div>
          <h2 className="text-3xl">Your gift becomes action.</h2>
          <ul className="mt-6 space-y-4 text-muted">
            <li>
              <span className="font-medium text-ink">Meals in Vidalia.</span>{" "}
              Food, fuel, and the people who pack boxes — so a household eats
              this week, not someday.
            </li>
            <li>
              <span className="font-medium text-ink">Tools churches can actually use.</span>{" "}
              Shared systems so a congregation is not paying retail for software
              it barely uses.
            </li>
            <li>
              <span className="font-medium text-ink">People on mission.</span>{" "}
              Ordinary Christians seeing a need, doing the thing, and telling
              the story.
            </li>
          </ul>
          <p className="mt-6 text-sm text-muted">
            {LEGAL.name} is a {LEGAL.status}. EIN {LEGAL.ein}. Gifts are
            tax-deductible to the extent allowed by law. Nothing on this site
            is gated behind a gift.
          </p>
        </div>
        <GiveForm />
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Clothes, furniture, household goods
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl">
            Donate what is in your way.
          </h2>
          <p className="mt-4 max-w-2xl text-muted">
            Share what you no longer need. Someone values it. If a neighbor
            already asked for a couch, a coat, a crib — we can take yours
            straight to them and skip the warehouse.
          </p>
          <p className="mt-4 max-w-2xl text-sm text-muted">
            Prefer to give time instead?{" "}
            <Link
              to="/give"
              className="text-forest underline-offset-4 hover:underline"
            >
              Offer hours on the Give page
            </Link>
            .
          </p>
          <div className="mt-10">
            <GoodsExchange />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <div className="flex flex-col gap-6 rounded-xl bg-forest px-6 py-8 text-paper md:flex-row md:items-center md:justify-between md:px-10">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
              Grocery stores, restaurants, and farms
            </p>
            <h2 className="mt-2 text-2xl text-paper">
              Unsold food has its own page — and a signup.
            </h2>
            <p className="mt-3 text-sm text-paper/80">
              Tax benefits, legal protection, and a pickup on the dock. That
              information belongs with the store manager, not at the top of
              this gift page.
            </p>
          </div>
          <Button asChild variant="invert" className="shrink-0">
            <Link to="/food-donors">Food donor information</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
