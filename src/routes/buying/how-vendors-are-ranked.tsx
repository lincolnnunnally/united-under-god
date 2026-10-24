import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { RankingDisclosure } from "@/components/vendor-ranking";
import { pageHead } from "@/lib/seo";
import { MIN_RECORD, RANK_WEIGHTS } from "@/lib/vendor-rank";

export const Route = createFileRoute("/buying/how-vendors-are-ranked")({
  component: RankingPage,
  head: () =>
    pageHead({
      title: "How vendors are ranked | United Under God",
      description:
        "How program vendors are ranked in the United Under God church buying catalogs: service record first, then price to the church, then support for the program. Verified church reviews only.",
      path: "/buying/how-vendors-are-ranked",
    }),
});

const FACTORS = [
  {
    title: "Service record",
    points: RANK_WEIGHTS.service,
    text: "Verified reviews from churches that bought through the program, and the vendor's history under the Vendor Covenant: problems decided against it, and whether it made them right on time.",
  },
  {
    title: "Price to the church",
    points: RANK_WEIGHTS.price,
    text: "The vendor's quoted and awarded prices, item by item, against the other quotes for the same items. The closer to the best quote, the higher the score.",
  },
  {
    title: "Support for the program",
    points: RANK_WEIGHTS.support,
    text: "A vendor may offer United Under God more than the minimum rebate or referral fee in a catalog, often with help from its manufacturers. Offering more counts, but only a little.",
  },
];

function RankingPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link to="/buying" className="underline-offset-4 hover:text-ink hover:underline">
              Group buying
            </Link>
            {" / "}
            <span aria-current="page">How vendors are ranked</span>
          </nav>
          <h1 className="mt-6 text-4xl">How vendors are ranked</h1>
          <p className="mt-5 text-muted">
            Every approved vendor that serves a buying catalog is listed in it. Vendors with a
            record are ranked, and the vendor at the top is marked Preferred. Churches always buy
            from whichever vendor they choose.
          </p>
          <RankingDisclosure className="mt-4" />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <h2 className="text-2xl">What counts</h2>
        <p className="mt-3 text-muted">Each vendor gets a score out of 100 in each catalog:</p>
        <ul className="mt-6 grid gap-6">
          {FACTORS.map((factor) => (
            <li key={factor.title} className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
              <p className="font-display text-xl">
                {factor.title}
                <span className="text-muted"> · up to {factor.points} points</span>
              </p>
              <p className="mt-2 text-muted">{factor.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted">
          When two vendors have the same score, the one with the better service record ranks
          first.
        </p>

        <h2 className="mt-12 text-2xl">Fees count, but price counts more</h2>
        <p className="mt-3 text-muted">
          A higher fee only earns credit as far as the vendor's price stays fair, and price is
          worth more than twice as much as the fee. A vendor that raises its prices to pay a higher
          fee loses more on price than it gains, so it ranks lower, not higher. The ranking is
          built so that the church's price comes before the program's income.
        </p>

        <h2 className="mt-12 text-2xl">Who is ranked</h2>
        <p className="mt-3 text-muted">
          To be ranked, a vendor must have accepted the current{" "}
          <Link to="/buying/vendor-terms" hash="covenant" className="text-forest underline-offset-4 hover:underline">
            Vendor Covenant
          </Link>{" "}
          and must not be on probation, suspended, or revoked under it. A suspended or revoked
          vendor is not listed at all.
        </p>
        <p className="mt-3 text-muted">
          A score shows only once a vendor has a record: at least {MIN_RECORD.reviews} verified
          church reviews, or a bid it won. Until then the vendor is listed as “New to the program”
          and is never placed above a vendor with a record.
        </p>

        <h2 className="mt-12 text-2xl">Verified reviews only</h2>
        <p className="mt-3 text-muted">
          Only a church that bought through the program can review a vendor. After a job, we send
          the church contact a private link to say how it went: overall, the quality of the work,
          whether it was on time, whether the final bill matched the quote, whether they would
          hire the vendor again, and a few words.
        </p>
        <p className="mt-3 text-muted">
          We publish honest reviews, good or bad. A review is hidden only if it is abusive, uses
          profanity, or shares private information, never for being negative, and every hide is
          recorded with its reason. A hidden review's ratings still count in the score. A review
          shows the church's name only if the church chooses; otherwise it says it came from a
          program church.
        </p>

        <h2 className="mt-12 text-2xl">What is not ranked</h2>
        <p className="mt-3 text-muted">
          Insurance, health and retirement benefits, banking and loans, payroll and payroll tax,
          and audit and tax preparation are handled through licensed or qualified providers by
          introduction. They are not ranked and carry no program fee.
        </p>
        <p className="mt-3 text-muted">
          A ranking is not a promise of sales to any vendor, and not a promise to any church about
          a vendor's work. If a program vendor doesn’t make it right,{" "}
          <Link to="/buying/report" className="text-forest underline-offset-4 hover:underline">
            tell us
          </Link>
          .
        </p>
      </section>
    </SiteShell>
  );
}
