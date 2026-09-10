import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-md bg-paper px-3.5 py-3 text-base text-ink shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-[var(--motion-quick)] placeholder:text-subtle focus-visible:shadow-[0_0_0_2px_var(--color-forest)] disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
