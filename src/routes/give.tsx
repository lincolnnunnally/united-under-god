import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GiveForm } from "@/components/give-form";
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

function GivePage() {
  const [tab, setTab] = useState<InvolvementIntent>("money");

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
            <h2 className="text-2xl">Why your gift belongs here</h2>
            <ul className="mt-5 space-y-4 text-muted">
              <li>
                <span className="font-medium text-ink">It becomes meals.</span>{" "}
                Food gifts move through the Vidalia pantry, so we can tell you
                what they became.
              </li>
              <li>
                <span className="font-medium text-ink">It becomes unity.</span>{" "}
                Money keeps shared tools in reach of churches that cannot
                afford another software bill.
              </li>
              <li>
                <span className="font-medium text-ink">It becomes a life.</span>{" "}
                Time is how Live on Mission stays a practice, not a poster.
              </li>
            </ul>
            <p className="mt-6 text-sm text-muted">
              {LEGAL.name} is a {LEGAL.status}. EIN {LEGAL.ein}. Gifts are
              tax-deductible to the extent allowed by law. Nothing here is
              behind this ask — the seal, the assessment, and the apps stay
              free.
            </p>
            <p className="mt-6 text-sm text-muted">
              Grocery stores, restaurants, and farms with unsold food — or anyone
              with furniture and clothes — have a dedicated path.{" "}
              <Link to="/donate" className="text-forest underline-offset-4 hover:underline">
                Donate and schedule pickup
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
            {tab === "money" ? <GiveForm /> : <InvolvementForm intent={tab} />}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
