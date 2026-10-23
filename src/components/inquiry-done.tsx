import { useEffect, useRef, type ReactNode } from "react";
import { INQUIRY_FOLLOWUP } from "@/lib/desk";
import { cn } from "@/lib/utils";

/** Fraunces heading, one 16px line, then the sign-off. */
export function InquiryThanks({ line }: { line: string }) {
  return (
    <>
      <h3 className="font-display text-[32px] leading-[1.15] text-ink">Thank you.</h3>
      <p className="mt-3 max-w-prose text-[16px] leading-normal text-ink">{line}</p>
      <p className="mt-[0.85rem] text-[16px] leading-normal text-muted">— United Under God</p>
    </>
  );
}

export function InquiryDone({
  emailed,
  className,
  children,
}: {
  saved: boolean;
  emailed: boolean;
  className?: string;
  /** Food donors explain the Plenty booking even when the row was not stored. */
  showDetails?: boolean;
  children?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const fallback = <InquiryThanks line={INQUIRY_FOLLOWUP} />;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-xl bg-cream px-6 py-8 shadow-[var(--shadow-border)] outline-none",
        className,
      )}
    >
      {emailed ? (children ? children : fallback) : children}
    </div>
  );
}
