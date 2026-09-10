import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LIVE_GIVE_URL, MIN_CENTS, MAX_CENTS, SUGGESTED, money } from "@/lib/giving-shared";
import { startGift } from "@/lib/start-gift";
import { LEGAL } from "@/lib/content";
import { cn } from "@/lib/utils";

export function GiveForm() {
  const [preset, setPreset] = useState<number | "custom">(SUGGESTED[1]);
  const [custom, setCustom] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const amountCents =
    preset === "custom"
      ? Math.round(Number(custom.replace(/[^0-9.]/g, "")) * 100)
      : preset;
  const valid =
    Number.isFinite(amountCents) &&
    amountCents >= MIN_CENTS &&
    amountCents <= MAX_CENTS;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!valid) {
      setError("Please choose an amount between $1 and $50,000.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    setWorking(true);
    try {
      const result = await startGift({
        data: {
          amountCents,
          recurring,
          email: String(data.get("email") || ""),
          name: String(data.get("name") || ""),
          message: String(data.get("message") || ""),
          anonymous: Boolean(data.get("anonymous")),
          hp: String(data.get("website") || ""),
          origin: window.location.origin,
        },
      });
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error || "We couldn't start that gift.");
    } catch {
      window.location.href = LIVE_GIVE_URL;
      return;
    }
    setWorking(false);
  }

  return (
    <form
      onSubmit={submit}
      className="relative rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] md:p-8"
    >
      <h3 className="font-display text-2xl">Give</h3>
      <p className="mt-2 text-sm text-muted">
        One gift or every month — whichever you can. You can stop a monthly
        gift any time. {LEGAL.name} is a {LEGAL.status}, EIN {LEGAL.ein}.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2" role="group" aria-label="How often">
        <button
          type="button"
          className={cn(
            "min-h-11 rounded-md text-sm font-medium",
            !recurring ? "bg-forest text-paper" : "bg-paper text-ink shadow-[var(--shadow-border)]",
          )}
          onClick={() => setRecurring(false)}
          aria-pressed={!recurring}
        >
          One time
        </button>
        <button
          type="button"
          className={cn(
            "min-h-11 rounded-md text-sm font-medium",
            recurring ? "bg-forest text-paper" : "bg-paper text-ink shadow-[var(--shadow-border)]",
          )}
          onClick={() => setRecurring(true)}
          aria-pressed={recurring}
        >
          Every month
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Amount">
        {SUGGESTED.map((cents) => (
          <button
            key={cents}
            type="button"
            className={cn(
              "min-h-11 rounded-md text-sm font-medium",
              preset === cents
                ? "bg-forest text-paper"
                : "bg-paper text-ink shadow-[var(--shadow-border)]",
            )}
            onClick={() => setPreset(cents)}
            aria-pressed={preset === cents}
          >
            {money(cents)}
          </button>
        ))}
        <button
          type="button"
          className={cn(
            "min-h-11 rounded-md text-sm font-medium",
            preset === "custom"
              ? "bg-forest text-paper"
              : "bg-paper text-ink shadow-[var(--shadow-border)]",
          )}
          onClick={() => setPreset("custom")}
          aria-pressed={preset === "custom"}
        >
          Another amount
        </button>
      </div>

      {preset === "custom" ? (
        <div className="mt-4 space-y-2">
          <Label htmlFor="give-custom">How much?</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted">$</span>
            <Input
              id="give-custom"
              inputMode="decimal"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="75"
              autoFocus
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <Label htmlFor="give-name">Your name</Label>
        <Input id="give-name" name="name" autoComplete="name" placeholder="So we know who to thank" />
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor="give-email">Email for your receipt</Label>
        <Input id="give-email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor="give-message">Anything you want to say (optional)</Label>
        <Textarea id="give-message" name="message" rows={3} />
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="anonymous" className="size-4 accent-forest" />
        Keep my gift anonymous.
      </label>
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="give-hp">Website</label>
        <input id="give-hp" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" className="mt-6 w-full" disabled={working || !valid}>
        {working
          ? "Taking you to checkout…"
          : valid
            ? `Give ${money(amountCents)}${recurring ? " a month" : ""}`
            : "Choose an amount"}
      </Button>
      {error ? (
        <p className="mt-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-4 text-xs text-subtle">
        Payment is handled by Stripe. We never see or store your card. Nothing
        on this site is gated behind a gift.
      </p>
    </form>
  );
}
