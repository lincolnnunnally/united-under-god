import { useId } from "react";
import { cn } from "@/lib/utils";

type SealMarkProps = {
  className?: string;
  title?: string;
};

/** Official seal: three interlocking rings, the cross, and the circular inscription. */
export function SealMark({ className, title = "United Under God seal" }: SealMarkProps) {
  return <OfficialSeal className={cn("block", className)} title={title} />;
}

export function SealBadge({ className }: { className?: string }) {
  return (
    <OfficialSeal
      className={cn("block size-52 text-forest sm:size-60", className)}
      title="United Under God seal. God's Kingdom, our purpose."
    />
  );
}

function OfficialSeal({ className, title }: { className?: string; title: string }) {
  const uid = useId();
  const top = `${uid}-top`;
  const bot = `${uid}-bot`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <circle cx="100" cy="100" r="97.2" fill="#F3EEE4" stroke="currentColor" strokeWidth="3.1" />
      <circle
        cx="100"
        cy="100"
        r="90.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.05"
        opacity="0.8"
      />
      <defs>
        <path id={top} d="M 32 100 A 68 68 0 0 1 168 100" fill="none" />
        <path id={bot} d="M 32 100 A 68 68 0 0 0 168 100" fill="none" />
      </defs>
      <text
        fill="currentColor"
        fontFamily="Figtree, Segoe UI, sans-serif"
        fontSize="10.2"
        fontWeight="650"
        letterSpacing="2.8"
      >
        <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">
          UNITED UNDER GOD
        </textPath>
      </text>
      <text
        fill="currentColor"
        fontFamily="Figtree, Segoe UI, sans-serif"
        fontSize="8.4"
        fontWeight="550"
        letterSpacing="1.7"
      >
        <textPath href={`#${bot}`} startOffset="50%" textAnchor="middle">
          GOD’S KINGDOM · OUR PURPOSE
        </textPath>
      </text>
      <circle cx="100" cy="100" r="56.5" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <g fill="none" stroke="currentColor" strokeWidth="2.05">
        <circle cx="100" cy="82.2" r="23.6" />
        <circle cx="84.4" cy="110.2" r="23.6" />
        <circle cx="115.6" cy="110.2" r="23.6" />
      </g>
      <path
        d="M100 68.2v48.2M84.2 91.2h31.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.15"
        strokeLinecap="round"
      />
    </svg>
  );
}
