import { useMemo, useState } from "react";
import { money, storeBenefit } from "@/lib/store-math";

export function StoreCalculator() {
  const [cost, setCost] = useState("200");
  const [wouldSell, setWouldSell] = useState("600");
  const [haul, setHaul] = useState("25");
  const [weeks, setWeeks] = useState("52");

  const result = useMemo(
    () =>
      storeBenefit({
        cost: Number(cost) || 0,
        wouldSell: Number(wouldSell) || 0,
        haulFee: Number(haul) || 0,
        weeks: Number(weeks) || 52
      }),
    [cost, wouldSell, haul, weeks]
  );

  return (
    <div className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:p-7">
      <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
        Your numbers
      </p>
      <h3 className="mt-2 font-display text-2xl">
        See what throwing it away actually costs you
      </h3>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Meat and dairy managers can punch in one week of what goes in the
        dumpster. The tax line is cost plus half the profit you would have
        made, up to twice the cost.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">What you paid for that food this week</span>
          <input
            className="mt-2 h-11 w-full rounded-md bg-paper px-3 shadow-[var(--shadow-border)]"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">What it would have sold for</span>
          <input
            className="mt-2 h-11 w-full rounded-md bg-paper px-3 shadow-[var(--shadow-border)]"
            inputMode="decimal"
            value={wouldSell}
            onChange={(e) => setWouldSell(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Dumpster / hauling fee this week</span>
          <input
            className="mt-2 h-11 w-full rounded-md bg-paper px-3 shadow-[var(--shadow-border)]"
            inputMode="decimal"
            value={haul}
            onChange={(e) => setHaul(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Weeks like this in a year</span>
          <input
            className="mt-2 h-11 w-full rounded-md bg-paper px-3 shadow-[var(--shadow-border)]"
            inputMode="numeric"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-6 space-y-3 rounded-lg bg-paper px-4 py-4 shadow-[var(--shadow-border)]">
        <p>
          <span className="font-medium text-ink">Throw it away. </span>
          <span className="text-muted">
            Write-off {money(result.dumpster)}. Still pay {money(result.haul)} to
            haul it.
          </span>
        </p>
        <p>
          <span className="font-medium text-ink">Donate it. </span>
          <span className="text-muted">
            Write-off {money(result.donate)}
            {result.capped ? " (at the twice-cost cap)" : ""}. We pick it up.
          </span>
        </p>
        <p className="font-display text-xl text-forest">
          This week, donating may be worth {money(result.weekly)} more than the
          dumpster. Over a year: {money(result.yearly)}.
        </p>
        <p className="text-xs text-subtle">
          People who felt the kindness still spend leftover money in your store.
          Not legal or tax advice. Show these numbers to your accountant (IRC
          § 170(e)(3)).
        </p>
      </div>
    </div>
  );
}
