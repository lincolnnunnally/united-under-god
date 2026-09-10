import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[transform,background-color,color,box-shadow,opacity] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-forest-deep shadow-[var(--shadow-border)]",
        secondary:
          "bg-cream text-ink shadow-[var(--shadow-border)] hover:bg-surface",
        outline:
          "bg-transparent text-paper shadow-[inset_0_0_0_1px_rgba(243,238,228,0.38)] hover:bg-paper/10",
        ghost: "bg-transparent text-ink hover:bg-cream",
        invert: "bg-paper text-ink hover:bg-cream",
        mission:
          "bg-mission text-paper hover:bg-mission-deep shadow-[var(--shadow-border)]",
      },
      size: {
        default: "min-h-11 px-5 text-sm",
        lg: "min-h-12 px-6 text-base",
        sm: "min-h-10 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
