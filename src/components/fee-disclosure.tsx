import { Link } from "@tanstack/react-router";
import { FEE_DISCLOSURE } from "@/lib/vendor-terms";
import { cn } from "@/lib/utils";

/** The plain fee line on /buying, each catalog page, and each vendor bid page. */
export function FeeDisclosure({ className }: { className?: string }) {
  return (
    <p className={cn("max-w-2xl text-sm text-muted", className)} data-fee-disclosure="">
      {FEE_DISCLOSURE}{" "}
      <Link to="/buying/vendor-terms" className="text-forest underline-offset-4 hover:underline">
        Vendor Terms
      </Link>
    </p>
  );
}
