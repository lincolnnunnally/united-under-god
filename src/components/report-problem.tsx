import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** The reassurance line and link to /buying/report, on /buying, each catalog page, and the covenant. */
export function ReportProblemLink({ className }: { className?: string }) {
  return (
    <p className={cn("max-w-2xl text-sm text-muted", className)} data-report-problem="">
      If a program vendor doesn’t make it right, tell us. We will hear it and see it through.{" "}
      <Link to="/buying/report" className="text-forest underline-offset-4 hover:underline">
        Report a problem
      </Link>
    </p>
  );
}

/** The small public line on an awarded price from a vendor that accepted the covenant. */
export function CovenantBadge({ className }: { className?: string }) {
  return (
    <span className={cn("text-xs text-forest", className)} data-covenant-badge="">
      Stands behind the{" "}
      <Link to="/buying/vendor-terms" className="underline-offset-4 hover:underline">
        Vendor Covenant
      </Link>
    </span>
  );
}
