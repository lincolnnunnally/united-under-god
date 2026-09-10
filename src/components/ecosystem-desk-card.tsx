import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DASHBOARD = "https://dashboard.unitedundergod.org";

export type DeskGlanceNumbers = {
  ticketsOpen: number;
  newUsers7d: number;
  newUsersPrev7d: number;
  activity?: {
    foodWaiting: number;
    goodsWaiting: number;
  };
};

export function EcosystemDeskCard({
  stats,
  reportingArmed,
}: {
  stats: DeskGlanceNumbers | null;
  reportingArmed: boolean;
}) {
  const waiting = stats?.ticketsOpen ?? 0;
  const week = stats?.newUsers7d ?? 0;
  const prev = stats?.newUsersPrev7d ?? 0;
  const activity = stats?.activity;

  return (
    <section className="rounded-xl bg-forest px-5 py-6 text-paper shadow-[var(--shadow-soft)] md:px-7">
      <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
        Two desks, one movement
      </p>
      <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-paper">
        This desk does the work. The owner desk sees the whole family.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-normal text-paper/80">
        Seals, pantry donors, and pickups stay here. Money, activity, and every
        other app live at the owner dashboard — pick an app there to open its
        own dashboard or its public site.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={DASHBOARD}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-paper px-4 text-sm font-medium text-ink hover:bg-cream"
        >
          Owner dashboard
          <ArrowUpRight className="size-4 shrink-0" />
        </a>
        <a
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-medium text-paper shadow-[inset_0_0_0_1px_rgba(243,238,228,0.28)] hover:bg-paper/10"
        >
          Public site
        </a>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <GlanceStat label="Waiting here" value={waiting} />
        <GlanceStat
          label="Hands this week"
          value={week}
          hint={trendHint(week, prev)}
        />
        <GlanceStat label="Food waiting" value={activity?.foodWaiting ?? 0} />
        <GlanceStat label="Goods waiting" value={activity?.goodsWaiting ?? 0} />
      </dl>

      <p className="mt-5 text-xs leading-normal text-paper/65">
        {reportingArmed
          ? "Counts from this desk (no names) report to the owner dashboard."
          : "This deploy has no stats token yet — the owner dashboard cannot see these numbers until reporting is armed on publish."}
      </p>
    </section>
  );
}

function trendHint(week: number, prev: number) {
  if (week > prev) return `up from ${prev}`;
  if (week < prev) return `down from ${prev}`;
  if (week === 0 && prev === 0) return null;
  return "same as last week";
}

function GlanceStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string | null;
}) {
  return (
    <div className="rounded-lg bg-paper/10 px-3 py-3">
      <dt className="text-xs font-semibold tracking-[0.14em] text-paper/55 uppercase">
        {label}
      </dt>
      <dd className={cn("mt-1 font-display text-2xl text-paper")}>{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-paper/55">{hint}</p> : null}
    </div>
  );
}
