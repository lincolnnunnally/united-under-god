import type { Style } from "@/lib/church-av-planner";

/**
 * A simple front view of the platform for each worship style. Traditional has
 * a pulpit and choir with no screen; blended adds side screens; modern has an
 * LED wall and stage lighting. Illustrative only — not a design.
 */
export function StageIllustration({ style, className }: { style: Style; className?: string }) {
  const caption =
    style === "traditional"
      ? "Traditional: pulpit, lectern, and choir. No screen behind the pulpit; speakers kept discreet at the sides."
      : style === "blended"
        ? "Blended: side screens for lyrics, leaving the cross and the center of the platform clear."
        : "Modern: an LED wall across the back of the stage, with lighting on a truss above the band.";
  return (
    <figure className={className}>
      <svg
        viewBox="0 0 320 190"
        role="img"
        aria-label={caption}
        className="h-auto w-full rounded-lg bg-cream shadow-[var(--shadow-border)]"
      >
        {/* back wall and floor */}
        <rect x="0" y="0" width="320" height="140" className="fill-surface" />
        <rect x="0" y="140" width="320" height="50" className="fill-rule" />
        {/* platform */}
        <rect x="40" y="122" width="240" height="20" rx="2" className="fill-paper stroke-ink/30" />

        {style === "traditional" ? <Traditional /> : null}
        {style === "blended" ? <Blended /> : null}
        {style === "modern" ? <Modern /> : null}

        {/* pews / seats */}
        {[0, 1, 2].map((row) => (
          <rect
            key={row}
            x={30 - row * 10}
            y={152 + row * 12}
            width={260 + row * 20}
            height="6"
            rx="3"
            className="fill-ink/25"
          />
        ))}
      </svg>
      <figcaption className="mt-2 text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}

function Cross({
  x = 160,
  y = 18,
  size = 1,
  className = "fill-forest",
}: {
  x?: number;
  y?: number;
  size?: number;
  className?: string;
}) {
  return (
    <g className={className}>
      <rect x={x - 3 * size} y={y} width={6 * size} height={44 * size} />
      <rect x={x - 15 * size} y={y + 11 * size} width={30 * size} height={6 * size} />
    </g>
  );
}

function Choir() {
  return (
    <g>
      <rect x="95" y="96" width="130" height="10" className="fill-ink/15" />
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={103 + i * 14.3} cy="90" r="5" className="fill-ink/45" />
      ))}
    </g>
  );
}

function Pulpit({ x = 160 }: { x?: number }) {
  return (
    <g className="fill-forest">
      <path d={`M${x - 14} 122 L${x - 10} 100 L${x + 10} 100 L${x + 14} 122 Z`} />
      <rect x={x - 16} y="97" width="32" height="4" rx="1" />
    </g>
  );
}

function SideSpeaker({ x }: { x: number }) {
  return <rect x={x} y="36" width="8" height="34" rx="2" className="fill-ink/50" />;
}

function Traditional() {
  return (
    <g>
      {/* arched window behind the cross */}
      <path d="M140 70 V30 a20 20 0 0 1 40 0 V70 Z" className="fill-paper/70" />
      <Cross y={22} size={0.9} />
      <Choir />
      <Pulpit x={118} />
      {/* lectern */}
      <g className="fill-forest/80">
        <rect x="198" y="104" width="4" height="18" />
        <path d="M188 104 L212 104 L208 98 L192 98 Z" />
      </g>
      <SideSpeaker x={22} />
      <SideSpeaker x={290} />
      {/* assistive listening symbol near the front pew */}
      <g transform="translate(286 150)" className="fill-none stroke-forest" strokeWidth="1.6">
        <path d="M0 10 C0 0 12 0 12 8 C12 14 6 13 6 18" />
        <path d="M15 2 C19 6 19 12 15 16" />
      </g>
    </g>
  );
}

function Blended() {
  return (
    <g>
      <Cross y={20} size={0.9} />
      {/* side screens */}
      <g className="fill-ink/80">
        <rect x="14" y="30" width="64" height="40" rx="2" />
        <rect x="242" y="30" width="64" height="40" rx="2" />
      </g>
      <g className="fill-paper/80">
        {[0, 1, 2].map((i) => (
          <rect key={`l${i}`} x="22" y={40 + i * 9} width={i === 2 ? 30 : 48} height="3" rx="1" />
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={`r${i}`} x="250" y={40 + i * 9} width={i === 2 ? 30 : 48} height="3" rx="1" />
        ))}
      </g>
      {/* piano */}
      <path d="M70 122 V104 H108 C112 104 112 112 106 112 H96 V122 Z" className="fill-ink/70" />
      <Pulpit x={160} />
      {/* small band: two singers and a guitarist */}
      {[205, 228, 251].map((x) => (
        <g key={x}>
          <circle cx={x} cy="96" r="5" className="fill-ink/45" />
          <rect x={x - 4} y="102" width="8" height="20" rx="3" className="fill-ink/35" />
        </g>
      ))}
    </g>
  );
}

function Modern() {
  return (
    <g>
      {/* lighting truss */}
      <rect x="20" y="6" width="280" height="5" className="fill-ink/70" />
      {[50, 100, 160, 220, 270].map((x) => (
        <g key={x}>
          <circle cx={x} cy="15" r="4" className="fill-ink/80" />
          <path
            d={`M${x - 3} 18 L${x - 22} 120 L${x + 22} 120 L${x + 3} 18 Z`}
            className="fill-paper/25"
          />
        </g>
      ))}
      {/* LED wall */}
      <rect x="40" y="24" width="240" height="72" rx="2" className="fill-forest" />
      <g className="stroke-paper/15" strokeWidth="0.6">
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={40 + (i + 1) * 20} y1="24" x2={40 + (i + 1) * 20} y2="96" />
        ))}
        {[1, 2, 3].map((i) => (
          <line key={`h${i}`} x1="40" y1={24 + i * 18} x2="280" y2={24 + i * 18} />
        ))}
      </g>
      <Cross x={160} y={38} size={0.8} className="fill-paper/85" />
      {/* band: drums, keys, singers */}
      <g className="fill-ink/70">
        <circle cx="160" cy="112" r="9" />
        <circle cx="146" cy="104" r="5" />
        <circle cx="174" cy="104" r="5" />
        <rect x="70" y="104" width="34" height="5" />
        <rect x="74" y="109" width="3" height="13" />
        <rect x="97" y="109" width="3" height="13" />
      </g>
      {[210, 236, 262].map((x) => (
        <g key={x}>
          <circle cx={x} cy="100" r="5" className="fill-ink/55" />
          <rect x={x - 4} y="106" width="8" height="16" rx="3" className="fill-ink/40" />
        </g>
      ))}
    </g>
  );
}
