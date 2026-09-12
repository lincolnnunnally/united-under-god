import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GiveForm } from "@/components/give-form";
import { GiveGoodsForm } from "@/components/give-goods-form";
import { InvolvementForm } from "@/components/involvement-form";
import { SiteShell } from "@/components/site-shell";
import { GIVE_WAYS, LEGAL } from "@/lib/content";
import type { InvolvementIntent } from "@/lib/involvement";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/give")({
  component: GivePage,
  head: () => ({
    meta: [{ title: "Give — United Under God" }],
  }),
});

const TABS: { id: InvolvementIntent; label: string }[] = [
  { id: "money", label: "Money" },
  { id: "time", label: "Time" },
  { id: "goods", label: "Goods" },
];

const SIDE: Record<
  "money" | "time" | "goods",
  { title: string; points: { lead: string; body: string }[] }
> = {
  money: {
    title: "Why your gift belongs here",
    points: [
      {
        lead: "It becomes meals.",
        body: "Food, fuel, and the people who pack boxes — so a household eats this week.",
      },
      {
        lead: "It becomes unity.",
        body: "Money keeps shared tools in reach of churches that cannot afford another software bill.",
      },
      {
        lead: "It becomes a life.",
        body: "Time and goods are the other two doors. Money is how the work stays standing.",
      },
    ],
  },
  time: {
    title: "Ordinary hours. Real work.",
    points: [
      {
        lead: "A shift, not a career.",
        body: "Pack boxes. Drive a route. Sit with someone. Offer the skill you already have.",
      },
      {
        lead: "Tell us when.",
        body: "Evenings, a Saturday, a truck you can bring. We will put you on something real.",
      },
      {
        lead: "Live on Mission.",
        body: "Time is how unity is worked out in action — not a poster on a wall.",
      },
    ],
  },
  goods: {
    title: "We come get it.",
    points: [
      {
        lead: "What is it?",
        body: "Clothes, furniture, household — so we know which box to check before we leave.",
      },
      {
        lead: "What should we bring?",
        body: "The vehicle and how many people to lift it. Stairs and weight belong in the notes.",
      },
      {
        lead: "When, and where.",
        body: "Days, a time window, your address, and a way to reach you. Then we show up.",
      },
    ],
  },
};

function GivePage() {
  const [tab, setTab] = useState<InvolvementIntent>("money");
  const side = SIDE[tab as "money" | "time" | "goods"];

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
            Give what you have
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">
            Time. Money. Goods. Everyone has something that can become love in
            action.
          </h1>
          <p className="mt-5 max-w-2xl text-paper/85">
            Donors are not spectators who fund a brand. You are part of the
            body. What you give feeds a family in Vidalia, funds tools churches
            actually use, and puts ordinary Christians on mission.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {GIVE_WAYS.map((way) => (
            <button
              key={way.id}
              type="button"
              onClick={() => setTab(way.id)}
              className={cn(
                "rounded-xl p-6 text-left shadow-[var(--shadow-border)] transition-[background-color,box-shadow] duration-[var(--motion-quick)]",
                tab === way.id ? "bg-forest text-paper" : "bg-cream text-ink hover:bg-surface",
              )}
            >
              <h2
                className={cn(
                  "font-display text-2xl italic",
                  tab === way.id ? "text-paper" : "text-ink",
                )}
              >
                {way.title}
              </h2>
              <p
                className={cn(
                  "mt-3 text-sm leading-relaxed",
                  tab === way.id ? "text-paper/80" : "text-muted",
                )}
              >
                {way.body}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div>
            <h2 className="text-2xl">{side.title}</h2>
            <ul className="mt-5 space-y-4 text-muted">
              {side.points.map((point) => (
                <li key={point.lead}>
                  <span className="font-medium text-ink">{point.lead}</span>{" "}
                  {point.body}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">
              {LEGAL.name} is a {LEGAL.status}. EIN {LEGAL.ein}. Gifts are
              tax-deductible to the extent allowed by law. Nothing here is
              behind this ask — the seal, the assessment, and the apps stay
              free.
            </p>
            <p className="mt-6 text-sm text-muted">
              Grocery stores: throw unsold food away and you deduct what you
              paid. Donate it to Plenty and you may deduct up to twice the cost —
              then neighbors who felt that kindness come back and spend in your
              store.{" "}
              <Link
                to="/food-donors"
                className="text-forest underline-offset-4 hover:underline"
              >
                See the business case
              </Link>
              .
            </p>
          </div>
          <div>
            <div className="mb-4 flex gap-2" role="tablist" aria-label="Give">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "min-h-11 rounded-md px-4 text-sm font-medium",
                    tab === item.id
                      ? "bg-forest text-paper"
                      : "bg-cream text-ink shadow-[var(--shadow-border)]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {tab === "money" ? (
              <GiveForm />
            ) : tab === "goods" ? (
              <GiveGoodsForm />
            ) : (
              <InvolvementForm intent={tab} />
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
