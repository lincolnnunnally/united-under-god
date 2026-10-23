import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verseEyebrow } from "@/components/verse-of-the-day";
import { subscribeToDailyVerse } from "@/lib/verse-subscribe";

export function VerseSignup({ sourcePath }: { sourcePath: string }) {
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    setWorking(true);
    try {
      const result = await subscribeToDailyVerse({
        data: {
          email,
          sourcePath,
          hp: String(data.get("website") || ""),
        },
      });
      if (result.ok) {
        setMessage(result.message);
        setEmail("");
      } else {
        setError(result.error);
      }
    } catch {
      setError("We could not take that just now. Please try again in a little while.");
    }
    setWorking(false);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]"
      aria-labelledby="verse-signup-title"
    >
      <p className={verseEyebrow}>Each morning</p>
      <h2 id="verse-signup-title" className="mt-3 text-2xl">
        Get the daily verse by email
      </h2>
      <p className="mt-3 text-muted">
        A verse in your inbox each day, with a plain word for the day and a link
        to read the whole page. We send it only after you confirm, and you can
        stop with one click whenever you want.
      </p>
      <div className="mt-5">
        <Label htmlFor="verse-email">Email</Label>
        <Input
          id="verse-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={320}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2"
        />
      </div>
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="verse-website">Website</label>
        <input id="verse-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" className="mt-4" disabled={working}>
        {working ? "Sending…" : "Send me the daily verse"}
      </Button>
      {message ? (
        <p className="mt-4 text-ink" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-mission" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-subtle">
        One note a day from United Under God. No ads.{" "}
        <Link to="/privacy" className="underline-offset-4 hover:underline">
          Privacy
        </Link>
      </p>
    </form>
  );
}
