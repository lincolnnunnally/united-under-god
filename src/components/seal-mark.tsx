import { cn } from "@/lib/utils";

type SealMarkProps = {
  className?: string;
  title?: string;
};

/**
 * The battle standard (owner decision 2026-10-27): an open ring that breaks at
 * the lower left and lower right, a shield-shaped U with a pointed base, and a
 * cross that rises out of the U to a spear point. Emblem only — the lettering
 * lives in the full lockup image (/images/uug-standard.jpg). Draws in
 * `currentColor`, so callers tint it with a text color (stone by default).
 * Same geometry as /images/seal.svg and /favicon.svg.
 */
export function SealMark({ className, title = "United Under God" }: SealMarkProps) {
  return <BattleStandard className={cn("block text-forest", className)} title={title} bold />;
}

export function SealBadge({ className }: { className?: string }) {
  return (
    <BattleStandard
      className={cn("block size-52 text-forest sm:size-60", className)}
      title="United Under God standard. God's Kingdom, our purpose."
    />
  );
}

/** Decorative copy of the emblem (aria-hidden) in the surrounding text color, for wordmarks that carry their own label. */
export function SealGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox={VIEW_BOX} className={className} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path d={RING_BOLD} />
        <path d={SHIELD_U} />
        <path d={SPEAR_CROSS} />
      </g>
    </svg>
  );
}

const VIEW_BOX = "226 4 500 500";
const RING =
  "M384.1 476.5L341.8 469A240 240 0 1 1 610.2 469L567.9 476.5L583.5 472.2A229 229 0 1 0 368.5 472.2Z";
const RING_BOLD =
  "M385.7 472.8L340.7 470.6A242 242 0 1 1 611.3 470.6L566.3 472.8L580.2 466A222 222 0 1 0 371.8 466Z";
const SHIELD_U =
  "M382 150L326 150L335 159L335 338C335 392 400 432 476 466C552 432 617 392 617 338L617 159L626 150L570 150L570 325Q570 375 492.5 402L459.5 402Q382 375 382 325Z";
const SPEAR_CROSS =
  "M476 90L492.5 107L492.5 176L543 176L543 207L492.5 207L492.5 410L459.5 410L459.5 207L409 207L409 176L459.5 176L459.5 107Z";

/** `bold` thickens the ring for small marks (header, footer, tab), where the fine ring vanishes. */
function BattleStandard({
  className,
  title,
  bold = false,
}: {
  className?: string;
  title: string;
  bold?: boolean;
}) {
  return (
    <svg viewBox={VIEW_BOX} className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <g fill="currentColor">
        <path d={bold ? RING_BOLD : RING} />
        <path d={SHIELD_U} />
        <path d={SPEAR_CROSS} />
      </g>
    </svg>
  );
}
