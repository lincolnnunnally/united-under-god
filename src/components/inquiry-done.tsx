import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { INQUIRY_FOLLOWUP } from "@/lib/desk";
import { cn } from "@/lib/utils";

export function InquiryDone({
  saved,
  emailed,
  className,
  showDetails,
  children,
}: {
  saved: boolean;
  emailed: boolean;
  className?: string;
  /** Food donors explain the Plenty booking even when the row was not stored. */
  showDetails?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-cream px-6 py-8 shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-md bg-forest text-paper">
        <Check className="size-5" />
      </div>
      {emailed ? (
        // One message only: when the form passes its own thank-you (children),
        // show that; otherwise fall back to the shared generic line.
        (saved || showDetails) && children ? (
          children
        ) : (
          <>
            <h3 className="mt-5 font-display text-2xl">Thank you.</h3>
            <p className="mt-3 max-w-prose text-muted">{INQUIRY_FOLLOWUP}</p>
          </>
        )
      ) : (
        children
      )}
    </div>
  );
}
