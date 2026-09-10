import { cn } from "@/lib/utils";

type MarkSize = "sm" | "md" | "lg";

const SIZES: Record<
  MarkSize,
  { card: string; bar: string; word: string; heart: string; sub: string }
> = {
  sm: {
    card: "w-[13.5rem] rounded-lg p-3",
    bar: "gap-2 px-3 py-2",
    word: "text-[1.65rem] leading-none",
    heart: "size-10",
    sub: "mt-2 text-[0.7rem] tracking-[0.32em]",
  },
  md: {
    card: "w-[18rem] rounded-xl p-4",
    bar: "gap-3 px-4 py-2.5",
    word: "text-[2.35rem] leading-none",
    heart: "size-14",
    sub: "mt-2.5 text-xs tracking-[0.36em]",
  },
  lg: {
    card: "w-full max-w-[22rem] rounded-xl p-5 sm:max-w-[24rem]",
    bar: "gap-3 px-5 py-3",
    word: "text-[3rem] leading-none sm:text-[3.35rem]",
    heart: "size-16 sm:size-[4.5rem]",
    sub: "mt-3 text-sm tracking-[0.38em]",
  },
};

/** Original card layout: red bar, condensed word, heart of hands, tracked line under. */
export function LiveOnMissionMark({
  size = "md",
  className,
}: {
  size?: MarkSize;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div
      className={cn(
        "bg-paper text-ink shadow-[var(--shadow-soft)]",
        s.card,
        className,
      )}
    >
      <div className={cn("flex items-center justify-between bg-mission text-paper", s.bar)}>
        <span className={cn("font-mission text-paper", s.word)}>LIVE ON</span>
        <img
          src="/images/live-on-mission-heart-and-hands.png"
          alt=""
          className={cn("shrink-0 object-cover", s.heart)}
          width={72}
          height={72}
        />
      </div>
      <p
        className={cn(
          "pl-1 font-sans font-semibold text-ink uppercase",
          s.sub,
        )}
      >
        Mission
      </p>
    </div>
  );
}

export function LiveOnMissionLockup({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <img
        src="/images/live-on-mission-heart-and-hands.png"
        alt=""
        className="size-12 object-cover"
        width={48}
        height={48}
      />
      <div>
        <p className="font-mission text-2xl leading-none text-mission">LIVE ON</p>
        <p className="mt-0.5 text-[0.65rem] font-semibold tracking-[0.28em] text-ink uppercase">
          Mission
        </p>
      </div>
    </div>
  );
}
