import { Link } from "@tanstack/react-router";
import { RANKING_DISCLOSURE } from "@/lib/vendor-rank";
import { cn } from "@/lib/utils";

/**
 * The ranking disclosure, linked to the page that explains it. Rendered
 * wherever the ranking or the Preferred badge appears.
 */
export function RankingDisclosure({ className }: { className?: string }) {
  return (
    <p className={cn("max-w-2xl text-sm text-muted", className)} data-ranking-disclosure="">
      {RANKING_DISCLOSURE}{" "}
      <Link
        to="/buying/how-vendors-are-ranked"
        className="text-forest underline-offset-4 hover:underline"
      >
        How vendors are ranked
      </Link>
    </p>
  );
}

/** The badge on the top eligible vendor in a catalog. Only beside a RankingDisclosure. */
export function PreferredBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-forest px-2.5 py-0.5 text-xs font-semibold text-paper",
        className,
      )}
      data-preferred-badge=""
    >
      Preferred
    </span>
  );
}

/** "Score 82 of 100" for a ranked vendor, or "New to the program". */
export function ScoreLine({
  score,
  newToProgram,
  className,
}: {
  score: number | null;
  newToProgram: boolean;
  className?: string;
}) {
  if (score !== null) {
    return <span className={cn("text-sm font-medium text-ink", className)}>Score {score} of 100</span>;
  }
  if (newToProgram) return <span className={cn("text-sm text-muted", className)}>New to the program</span>;
  return null;
}

/** "4.6 of 5 from 7 verified church reviews". */
export function ReviewLine({ count, average }: { count: number; average: number }) {
  if (count === 0) return <span className="text-sm text-muted">No verified reviews yet</span>;
  return (
    <span className="text-sm text-muted">
      {average.toFixed(1)} of 5 from {count} verified church {count === 1 ? "review" : "reviews"}
    </span>
  );
}
