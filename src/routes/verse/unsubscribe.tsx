import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { verseEyebrow } from "@/components/verse-of-the-day";
import { pageHead } from "@/lib/seo";
import { unsubscribeDailyVerse } from "@/lib/verse-subscribe";

export const Route = createFileRoute("/verse/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  headers: () => ({ "Cache-Control": "private, no-store" }),
  head: () =>
    pageHead({
      title: "Stop the daily verse | United Under God",
      description: "Stop the daily verse email from United Under God.",
      path: "/verse/unsubscribe",
      noindex: true,
    }),
  component: UnsubscribeVersePage,
});

function UnsubscribeVersePage() {
  const { token } = Route.useSearch();
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || working) return;
    setWorking(true);
    try {
      const result = await unsubscribeDailyVerse({ data: { token } });
      setOk(result.ok);
      setMessage(result.message);
    } catch {
      setOk(false);
      setMessage("We could not stop that just now. Please try again in a little while.");
    }
    setWorking(false);
  }

  const heading = ok === null ? "Stop the daily verse" : ok ? "You're unsubscribed" : "That link didn't work";
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <p className={verseEyebrow}>Verse of the Day</p>
        <h1 className="mt-4 text-4xl">{heading}</h1>
        {token && ok === null ? (
          <form onSubmit={submit} className="mt-6">
            <p className="text-muted">
              Press the button and this inbox will not receive the daily verse.
            </p>
            <Button type="submit" className="mt-6" disabled={working}>
              {working ? "Stopping…" : "Stop the daily verse"}
            </Button>
          </form>
        ) : (
          <p className="mt-6 text-muted" role="status">
            {message || "That unsubscribe link is not valid."}
          </p>
        )}
        <p className="mt-8">
          <Link to="/verse" className="font-medium text-forest underline-offset-4 hover:underline">
            Back to the verse of the day
          </Link>
        </p>
      </article>
    </SiteShell>
  );
}
