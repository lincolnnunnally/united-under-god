import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { INQUIRY_FOLLOWUP } from "@/lib/desk";
import { cn } from "@/lib/utils";

export function InquiryDone({
  saved,
  emailed,
  className,
  children,
}: {
  saved: boolean;
  emailed: boolean;
  className?: string;
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
        <>
          <h3 className="mt-5 font-display text-2xl">We received it.</h3>
          <p className="mt-3 max-w-prose text-muted">{INQUIRY_FOLLOWUP}</p>
          {saved ? <div className="mt-6">{children}</div> : null}
        </>
      ) : (
        children
      )}
    </div>
  );
}
