import { DONOR_URL } from "@/lib/content";

export function QrCard({ className }: { className?: string }) {
  return (
    <aside
      className={
        className ??
        "flex flex-col items-center gap-4 rounded-xl bg-paper p-6 text-center shadow-[var(--shadow-border)] sm:flex-row sm:text-left"
      }
    >
      <img
        src="/qr-donate.svg"
        alt="QR code to unitedundergod.org/food-donors"
        className="seal-photo size-36 shrink-0 bg-paper"
        width={144}
        height={144}
      />
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
          For the break-room fridge
        </p>
        <p className="mt-2 font-display text-xl italic">Scan. Read. Sign up.</p>
        <p className="mt-2 text-sm text-muted">
          Scan this, enter a typical week of unsold food, and see what
          donating could be worth. Sign up in a minute — we handle the
          pickup. No app to download.
        </p>
        <p className="mt-3 font-mono text-sm text-ink">{DONOR_URL}</p>
      </div>
    </aside>
  );
}
