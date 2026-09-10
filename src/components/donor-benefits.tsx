import { Link } from "@tanstack/react-router";
import { DONOR_BENEFITS } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  compact?: boolean;
  className?: string;
};

export function DonorBenefits({ compact = false, className }: Props) {
  const items = compact ? DONOR_BENEFITS : DONOR_BENEFITS;

  return (
    <div className={className}>
      {compact ? (
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
              For grocers, restaurants, and farms
            </p>
            <h2 className="mt-3 text-3xl text-paper">
              Throwing food away is the expensive option.
            </h2>
            <p className="mt-4 text-paper/80">
              You are leaving a deduction, two legal shields, and a cleaner
              store on the table. Families who eat from a pantry still shop
              yours. Scan, read, sign up. Pickup is scheduled.
            </p>
          </div>
          <Button asChild variant="invert" className="shrink-0">
            <Link to="/food-donors">See what you’re missing</Link>
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            What you miss by not donating
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl">
            Four facts. Then a pickup on the dock.
          </h2>
        </div>
      )}

      <ol
        className={cn(
          "mt-10 grid gap-6",
          compact ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2",
        )}
      >
        {items.map((item) => (
          <li
            key={item.kicker}
            className={cn(
              compact
                ? "border-t border-paper/20 pt-4"
                : "rounded-xl bg-paper p-6 shadow-[var(--shadow-border)]",
            )}
          >
            <p
              className={cn(
                "text-xs font-semibold tracking-[0.16em] uppercase",
                compact ? "text-paper/55" : "text-forest",
              )}
            >
              {item.kicker}
            </p>
            <h3
              className={cn(
                "mt-2 font-display text-xl italic leading-snug",
                compact ? "text-paper" : "text-ink",
              )}
            >
              {item.title}
            </h3>
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                compact ? "text-paper/85" : "text-ink",
              )}
            >
              {item.lead}
            </p>
            {compact ? null : (
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
