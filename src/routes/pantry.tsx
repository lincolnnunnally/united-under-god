import { createFileRoute, Link } from "@tanstack/react-router";
import { ImpactCalculator } from "@/components/impact-calculator";
import { DonorForm } from "@/components/donor-form";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { PLENTY_URL } from "@/lib/content";

export const Route = createFileRoute("/pantry")({
  component: PantryPage,
  head: () => ({
    meta: [{ title: "Vidalia food pantry — United Under God" }],
  }),
});

const PROTECTIONS = [
  {
    title: "Federal Good Samaritan protection",
    body: "The Bill Emerson Good Samaritan Food Donation Act says a grocer, restaurant, farmer, or other donor who gives apparently wholesome food in good faith to a nonprofit, for free distribution to people in need, is not subject to civil or criminal liability arising from the nature, age, packaging, or condition of that food — except in cases of gross negligence or intentional misconduct.",
  },
  {
    title: "Georgia’s own shield",
    body: "O.C.G.A. § 51-1-31 says a good-faith donor of canned or perishable food, apparently fit for human consumption, who gives it to a bona fide charitable or nonprofit organization, is not subject to criminal penalty or civil damages arising from the condition of the food — unless an injury is caused by recklessness or intentional misconduct.",
  },
  {
    title: "A recipient waiver, on top",
    body: "Every person who receives food from the Vidalia pantry signs a waiver before they take goods. That is an extra layer of protection for our donors, in addition to the federal and state statutes. We keep records so the gift, the waiver, and the household can be accounted for.",
  },
  {
    title: "Tracked on Plenty",
    body: "The pantry runs on Plenty. Intake, inventory, and distribution stay in one place. That means we can tell a donor — in numbers, not slogans — how many households ate because of food that would not have sold.",
  },
];

const STATS = [
  { value: "1 in 5", label: "people in the Vidalia-Lyons area live below the poverty line" },
  { value: "24%", label: "of children in Toombs County face food insecurity" },
  { value: "30–40%", label: "of the U.S. food supply is lost or wasted — much of it still good" },
];

function PantryPage() {
  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        <img
          src="/images/pantry.jpg"
          alt="Vidalia pantry shelves being stocked"
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/35" />
        <div className="relative mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            Vidalia, Georgia
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">
            The food you cannot sell is dinner in Toombs County.
          </h1>
          <p className="mt-5 max-w-2xl text-paper/88">
            We are opening a pantry in Vidalia. If you run a grocery store, a
            restaurant, or a farm, what walks out your back door can feed a
            neighbor tonight. You will see how many people ate because of you.
          </p>
          <div className="mt-8">
            <Button asChild variant="invert">
              <Link to="/food-donors">See what you’re missing — then sign up</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-12 md:grid-cols-3 md:px-8">
          {STATS.map((stat) => (
            <article key={stat.label} className="rounded-xl bg-paper px-5 py-6 shadow-[var(--shadow-border)]">
              <p className="font-display text-3xl text-forest">{stat.value}</p>
              <p className="mt-2 text-sm text-muted">{stat.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <p className="max-w-2xl text-sm text-muted">
          Neighbors who need food, and people who pack or shop the pantry, sign
          in on{" "}
          <a
            href={PLENTY_URL}
            className="text-forest underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Plenty
          </a>
          . Churches and businesses who want the seal or united buying sign in
          on this site.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          A letter to grocers
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl">
          You already know what walks out the back door into a dumpster.
        </h2>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div className="space-y-4 text-muted">
            <p>
              Bread that did not sell by closing. Produce that is still good
              and no longer pretty. Cans with a dent. Dairy a day from the date.
              Overstock from a truck that brought too much. That food is not
              trash. In Toombs County it is dinner.
            </p>
            <p>
              Give it. We will pick it up when we can, receive it with care,
              and put it in the hands of households who came asking. You reduce
              waste hauling. You may also qualify for a charitable deduction on
              donated inventory — speak with your accountant. And you will know,
              in numbers, how many people ate what you could not sell.
            </p>
            <p className="text-sm">
              Liability, waivers, and how the pantry is run are below. The short
              version: federal Good Samaritan law already stands behind a
              good-faith gift, and every family who receives food signs before
              they take it.
            </p>
          </div>
          <ImpactCalculator />
        </div>
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <h2 className="text-3xl">If you are wondering about liability</h2>
          <p className="mt-3 max-w-2xl text-muted">
            You should not have to be a lawyer to give bread away. Here is how
            donors are covered — a plain-language summary, not legal advice.
            The statute is the Bill Emerson Good Samaritan Food Donation Act,
            42 U.S.C. § 1791.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {PROTECTIONS.map((item) => (
              <article key={item.title} className="rounded-xl bg-paper p-6 shadow-[var(--shadow-border)]">
                <h3 className="font-display text-xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <h2 className="text-3xl">What a recipient agrees to</h2>
          <p className="mt-4 text-muted">
            Before anyone takes food, they sign. In plain terms, the waiver
            says they receive the goods as a gift, they accept them as-is, and
            they will not hold the pantry or its donors responsible for ordinary
            issues that can come with donated food. We keep the signed record
            with their visit. That is how we add a layer on top of the Good
            Samaritan Act — so a store manager does not have to wonder.
          </p>
          <div className="mt-6 rounded-xl bg-cream p-5 text-sm text-muted shadow-[var(--shadow-border)]">
            <p className="font-medium text-ink">The gift is free.</p>
            <p className="mt-2">
              Food from this pantry is never sold. Emerson protection applies
              to donations distributed at no cost (or a Good Samaritan reduced
              price that only covers handling). We distribute at zero cost.
            </p>
          </div>
          <p className="mt-6 text-sm text-muted">
            Households who need food, or people who can pack it:{" "}
            <Link to="/give" className="text-forest underline-offset-4 hover:underline">
              give time or goods
            </Link>
            . Churches who want this to be their town’s pantry too:{" "}
            <Link to="/join" className="text-forest underline-offset-4 hover:underline">
              take the seal
            </Link>
            .
          </p>
        </div>
        <DonorForm initialKind="food" lockKind />
      </section>

      <section className="border-t border-rule bg-forest px-5 py-14 text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl text-paper">Ready to put a truck on the dock?</h2>
            <p className="mt-2 max-w-xl text-sm text-paper/75">
              Tell us the store, the contact, and a rough sense of weekly
              surplus. We will follow up with pickup, paperwork, and a way to
              see the meals.
            </p>
          </div>
          <Button asChild variant="invert">
            <Link to="/give">Give in another way</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
