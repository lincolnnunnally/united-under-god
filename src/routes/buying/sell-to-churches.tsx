import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Church,
  FileText,
  HandCoins,
  HeartHandshake,
  Inbox,
  MapPin,
  MousePointerClick,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FeeDisclosure } from "@/components/fee-disclosure";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { faqJsonLd } from "@/lib/church-av";
import {
  areaCount,
  programNumbers,
  roundedDown,
  type ChurchMarket,
  type StateCount,
} from "@/lib/church-market";
import { readChurchMarketFn } from "@/lib/market-actions";
import { pageHead, serviceJsonLd } from "@/lib/seo";
import {
  SELL_DESCRIPTION,
  SELL_PATH,
  SELL_TITLE,
  STEPS,
  marketLine,
  percent,
  reasons,
  sellFaq,
  type Reason,
} from "@/lib/sell-to-churches";
import { cn } from "@/lib/utils";
import { FEES } from "@/lib/vendor-terms";

export const Route = createFileRoute("/buying/sell-to-churches")({
  loader: () => readChurchMarketFn(),
  component: SellToChurchesPage,
  head: ({ loaderData }) =>
    pageHead({
      title: SELL_TITLE,
      description: SELL_DESCRIPTION,
      path: SELL_PATH,
      jsonLd: [
        serviceJsonLd({
          name: "Church vendor program",
          description:
            "A church purchasing program for suppliers: approved vendors are invited to group bids from churches in their categories and service area, quote online, and sell directly to churches.",
          path: SELL_PATH,
          serviceType: "Church purchasing program for suppliers",
          audience: "Businesses that sell to churches",
          offers: {
            price: "0",
            description: "Signing up is free. Fees apply only to program sales.",
          },
        }),
        faqJsonLd(sellFaq(loaderData?.market ?? null, programNumbers())),
      ],
    }),
});

/** Real vendor quotes go here once vendors give them. The section stays hidden while empty. */
const TESTIMONIALS: { quote: string; name: string; company: string }[] = [];

const REASON_ICONS: LucideIcon[] = [
  Inbox,
  Users,
  MousePointerClick,
  FileText,
  HandCoins,
  HeartHandshake,
  BadgeCheck,
  MapPin,
];

const fmt = (n: number) => n.toLocaleString("en-US");

function SellToChurchesPage() {
  const { market } = Route.useLoaderData();
  const program = programNumbers();
  const faq = sellFaq(market, program);

  return (
    <SiteShell>
      <Hero market={market} />
      <ProgramStats market={market} program={program} />
      {market ? <ServiceArea market={market} /> : null}
      <Reasons items={reasons()} />
      <HowItWorks />
      <Fees />
      {TESTIMONIALS.length ? <Testimonials /> : null}
      <FaqSection faq={faq} />
      <ClosingCta />
    </SiteShell>
  );
}

function Hero({ market }: { market: ChurchMarket | null }) {
  return (
    <section className="relative isolate overflow-hidden bg-forest-deep text-paper">
      <img
        src="/images/sanctuary.jpg"
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover opacity-25"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-deep/70 via-forest-deep/85 to-forest-deep" />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.25fr_1fr] md:items-center md:px-8 md:py-24">
        <div>
          <nav aria-label="Breadcrumb" className="text-sm text-paper/70">
            <Link to="/buying" className="underline-offset-4 hover:text-paper hover:underline">
              Group buying
            </Link>
            {" / "}
            <span aria-current="page">Sell to churches</span>
          </nav>
          <p className="rise-in mt-6 text-xs font-semibold tracking-[0.18em] text-paper/75 uppercase">
            Church vendor program
          </p>
          <h1 className="rise-in rise-in-1 mt-3 max-w-2xl text-4xl text-paper md:text-5xl">
            Sell to churches without the cold calls.
          </h1>
          <p className="rise-in rise-in-2 mt-5 max-w-xl text-paper/85">
            Churches in our buying program pool what they need into group bids. Become a church
            supplier, and when a bid matches what you sell and where you serve, we send you a
            private link to quote online. Churches buy directly from you.
          </p>
          <div className="rise-in rise-in-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="invert">
              <Link to="/buying/vendors">
                Become a vendor partner
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
        </div>

        {market ? (
          <div className="rise-in rise-in-2 rounded-2xl bg-paper/8 p-6 shadow-[inset_0_0_0_1px_rgba(243,238,228,0.18)] backdrop-blur-sm sm:p-8">
            <div className="flex items-center gap-3 text-paper/75">
              <Church className="size-5" aria-hidden="true" />
              <span className="text-xs font-semibold tracking-[0.16em] uppercase">
                In our church directory
              </span>
            </div>
            <p className="mt-4 font-display text-6xl leading-none tabular-nums text-paper sm:text-7xl">
              {roundedDown(market.total)}
            </p>
            <p className="mt-2 text-lg text-paper">churches</p>
            <p className="mt-4 text-sm text-paper/75">{marketLine(market)}</p>
            <p className="mt-4 text-sm text-paper/75">
              <a href="#service-area" className="underline underline-offset-4 hover:text-paper">
                See how many are in your area
              </a>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProgramStats({
  market,
  program,
}: {
  market: ChurchMarket | null;
  program: { catalogs: number; items: number };
}) {
  const stats = [
    market ? { value: fmt(market.total), label: "churches in our church directory" } : null,
    market ? { value: fmt(market.states.length), label: "states in the directory" } : null,
    { value: fmt(program.catalogs), label: "buying catalogs open to bids" },
    { value: fmt(program.items), label: "items and services churches buy, listed" },
    market && market.approvedVendors > 0
      ? { value: fmt(market.approvedVendors), label: "approved vendors so far" }
      : null,
  ].filter((stat): stat is { value: string; label: string } => stat !== null);
  // Layout rule: never orphan a card. 2 -> pair, 3 -> three across, 4 -> 2x2, 5 -> 3 + 2.
  const cols =
    stats.length === 3
      ? "sm:grid-cols-3"
      : stats.length === 5
        ? "sm:grid-cols-6 sm:[&>*]:col-span-2 sm:[&>*:nth-child(n+4)]:col-span-3"
        : "grid-cols-2";

  return (
    <section className="border-b border-rule bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <ul className={cn("grid gap-4", cols)}>
          {stats.map((stat) => (
            <li
              key={stat.label}
              className="rounded-xl bg-paper p-5 shadow-[var(--shadow-border)] sm:p-6"
            >
              <p className="font-display text-3xl tabular-nums text-forest sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ServiceArea({ market }: { market: ChurchMarket }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const inArea = useMemo(() => areaCount(market.states, picked), [market.states, picked]);
  const max = market.states[0]?.count ?? 1;

  function toggle(code: string, on: boolean) {
    setPicked((set) => {
      const next = new Set(set);
      if (on) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  return (
    <section id="service-area" className="scroll-mt-24 border-b border-rule">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          The opportunity
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl">Your service area, in churches</h2>
        <p className="mt-4 max-w-2xl text-muted">
          Check the states you serve to see how many churches our church directory lists there.
          These are churches in the directory, not sign-ups or orders.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
          <div className="overflow-hidden rounded-xl bg-cream shadow-[var(--shadow-border)]">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Churches in our church directory, by state</caption>
              <thead>
                <tr className="border-b border-rule text-xs tracking-[0.12em] text-subtle uppercase">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    State
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Churches
                  </th>
                  <th scope="col" className="hidden w-2/5 px-4 py-3 font-semibold sm:table-cell">
                    <span className="sr-only">Share</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {market.states.map((row) => (
                  <StateRow
                    key={row.code}
                    row={row}
                    max={max}
                    checked={picked.has(row.code)}
                    onChange={(on) => toggle(row.code, on)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-rule font-medium">
                  <td className="px-4 py-3">All {market.states.length} states</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(market.total)}</td>
                  <td className="hidden sm:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div
            className="rounded-xl bg-forest p-6 text-paper shadow-[var(--shadow-soft)] sm:p-8 md:sticky md:top-24"
            aria-live="polite"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-paper/75 uppercase">
              Your service area
            </p>
            {picked.size ? (
              <>
                <p className="mt-3 font-display text-5xl tabular-nums">{fmt(inArea)}</p>
                <p className="mt-1 text-paper/85">
                  churches in {picked.size} {picked.size === 1 ? "state" : "states"}
                </p>
              </>
            ) : (
              <p className="mt-3 font-display text-2xl">Check the states you serve.</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="invert"
                onClick={() => setPicked(new Set(market.states.map((row) => row.code)))}
              >
                Select all
              </Button>
              {picked.size ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPicked(new Set())}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <p className="mt-5 text-sm text-paper/75">
              Counts are churches listed in our church directory. Each church chooses freely; a
              listing is not an order.
            </p>
            <Button asChild variant="invert" className="mt-6 w-full sm:w-auto">
              <Link to="/buying/vendors">
                Sign up for bids in your area
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StateRow({
  row,
  max,
  checked,
  onChange,
}: {
  row: StateCount;
  max: number;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  const id = `area-${row.code}`;
  return (
    <tr className={cn("transition-colors duration-[var(--motion-quick)]", checked && "bg-paper")}>
      <td className="px-4 py-1">
        <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            id={id}
            type="checkbox"
            className="size-4 accent-[var(--color-forest)]"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className="font-medium text-ink">{row.name}</span>
        </label>
      </td>
      <td className="px-4 py-1 text-right tabular-nums">{fmt(row.count)}</td>
      <td className="hidden px-4 py-1 sm:table-cell" aria-hidden="true">
        <div className="h-2 rounded-full bg-rule/60">
          <div
            className="h-2 rounded-full bg-forest transition-[width] duration-[var(--motion-medium)]"
            style={{ width: `${Math.max(4, Math.round((row.count / max) * 100))}%` }}
          />
        </div>
      </td>
    </tr>
  );
}

function Reasons({ items }: { items: Reason[] }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Why partner</p>
      <h2 className="mt-3 max-w-2xl text-3xl">A better way to become a church supplier</h2>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2">
        {items.map((item, i) => {
          const Icon = REASON_ICONS[i % REASON_ICONS.length];
          return (
            <li
              key={item.title}
              className="flex gap-4 rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-forest text-paper">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-xl">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-rule bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          How it works
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl">From sign-up to serving churches</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl bg-paper p-6 shadow-[var(--shadow-border)]">
              <span className="font-display text-4xl text-forest tabular-nums">{i + 1}</span>
              <h3 className="mt-3 font-display text-xl">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <Button asChild size="lg">
            <Link to="/buying/vendors">
              Start your sign-up
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Fees() {
  const cards = [
    {
      rate: percent(FEES.rebate.percent),
      title: "Catalog and recurring sales",
      body: "Toner, paper, janitorial supplies, and recurring services such as cleaning, lawn care, or pest control.",
    },
    {
      rate: percent(FEES.referral.percent),
      title: "Referred projects",
      body: "Project work from a church introduced to you through the program, such as roofing, HVAC, paving, or renovation.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Fees</p>
      <h2 className="mt-3 max-w-2xl text-3xl">You pay only when you are paid</h2>
      <p className="mt-4 max-w-2xl text-muted">
        No sign-up fee and no monthly fee. A fee is due {FEES.dueDays} days after a church pays you,
        and you report program sales {FEES.reporting}.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] sm:p-8"
          >
            <p className="font-display text-6xl leading-none text-forest tabular-nums">
              {card.rate}
            </p>
            <h3 className="mt-4 font-display text-xl">{card.title}</h3>
            <p className="mt-2 text-sm text-muted">{card.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">
        Read the full{" "}
        <Link to="/buying/vendor-terms" className="text-forest underline-offset-4 hover:underline">
          Vendor Terms
        </Link>
        .
      </p>
      <FeeDisclosure className="mt-3" />
    </section>
  );
}

function Testimonials() {
  const rows = TESTIMONIALS.length >= 2 ? "sm:grid-cols-2" : "";
  return (
    <section className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="max-w-2xl text-3xl">From vendor partners</h2>
        <ul className={cn("mt-10 grid gap-5", rows)}>
          {TESTIMONIALS.map((item) => (
            <li key={item.name} className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]">
              <blockquote className="font-display text-lg italic">“{item.quote}”</blockquote>
              <p className="mt-4 text-sm text-muted">
                {item.name}, {item.company}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FaqSection({ faq }: { faq: { q: string; a: string }[] }) {
  return (
    <section className="border-t border-rule bg-cream">
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Questions</p>
        <h2 className="mt-3 text-3xl">What vendors ask first</h2>
        <div className="mt-8 grid gap-3">
          {faq.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl bg-paper px-5 shadow-[var(--shadow-border)]"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-display text-lg">
                {item.q}
                <span
                  aria-hidden="true"
                  className="text-forest transition-transform duration-[var(--motion-quick)] group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="bg-forest text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h2 className="max-w-xl text-3xl text-paper">Ready to serve churches?</h2>
          <p className="mt-3 max-w-xl text-paper/85">
            Sign up free, tell us what you supply and where, and we will review your company before
            your first bid invitation.
          </p>
        </div>
        <Button asChild size="lg" variant="invert" className="shrink-0">
          <Link to="/buying/vendors">
            Become a vendor partner
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
