import { useMemo, useState } from "react";
import { LBS_PER_MEAL } from "@/lib/content";

const MIN = 10;
const MAX = 800;
const DEFAULT = 80;

export function ImpactCalculator() {
  const [lbs, setLbs] = useState(DEFAULT);

  const stats = useMemo(() => {
    const mealsWeek = Math.round(lbs / LBS_PER_MEAL);
    const mealsYear = mealsWeek * 52;
    const boxesWeek = Math.max(1, Math.round(lbs / 22));
    return { mealsWeek, mealsYear, boxesWeek };
  }, [lbs]);

  return (
    <div className="min-w-0 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:p-7">
      <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
        What your unsold food becomes
      </p>
      <h3 className="mt-2 font-display text-2xl">
        Estimate the neighbors you could feed.
      </h3>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Feeding America counts about {LBS_PER_MEAL} pounds as one meal. Move
        the slider to match what your store cannot sell in a typical week —
        dented cans, day-old bread, produce past peak display, close-dated
        dairy.
      </p>

      <label className="mt-6 block">
        <span className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Pounds per week</span>
          <span className="font-display text-xl tabular-nums text-forest">
            {lbs}
          </span>
        </span>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={5}
          value={lbs}
          onChange={(e) => setLbs(Number(e.target.value))}
          className="mt-3 h-11 w-full accent-forest"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={lbs}
        />
      </label>

      <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Meals this week" value={stats.mealsWeek.toLocaleString()} />
        <Stat
          label="Pantry boxes this week"
          value={stats.boxesWeek.toLocaleString()}
        />
        <Stat
          label="Meals in a year"
          value={stats.mealsYear.toLocaleString()}
        />
      </dl>
      <p className="mt-4 text-xs text-subtle">
        A pantry box here is counted as about 22 pounds — several days of
        groceries for a household. These are estimates, not a promise of
        servings. The pantry will track actual meals through Plenty so donors
        can see what their food became.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg bg-paper px-2 py-3 shadow-[var(--shadow-border)] sm:px-3 sm:py-4">
      <dt className="text-xs leading-snug tracking-[0.06em] text-subtle uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl leading-none font-medium tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}
