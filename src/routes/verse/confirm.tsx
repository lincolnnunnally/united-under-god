import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { verseEyebrow } from "@/components/verse-of-the-day";
import { confirmDailyVerse } from "@/lib/verse-subscribe";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/verse/confirm")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  headers: () => ({ "Cache-Control": "private, no-store" }),
  head: () =>
    pageHead({
      title: "Confirm your daily verse | United Under God",
      description: "Confirm the email that should receive the verse of the day.",
      path: "/verse/confirm",
      noindex: true,
    }),
  component: ConfirmVersePage,
});

function ConfirmVersePage() {
  const { token } = Route.useSearch();
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || working) return;
    setWorking(true);
    try {
      const result = await confirmDailyVerse({ data: { token } });
      setOk(result.ok);
      setMessage(result.message);
    } catch {
      setOk(false);
      setMessage("We could not confirm that just now. Please try again in a little while.");
    }
    setWorking(false);
  }

  const heading = ok === null ? "Confirm your daily verse" : ok ? "You're confirmed" : "We couldn't confirm that";
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <p className={verseEyebrow}>Verse of the Day</p>
        <h1 className="mt-4 text-4xl">{heading}</h1>
        {token && ok === null ? (
          <form onSubmit={submit} className="mt-6">
            <p className="text-muted">
              A verse each morning starts when you confirm. We will not send it until you press the button.
            </p>
            <Button type="submit" className="mt-6" disabled={working}>
              {working ? "Confirming…" : "Confirm my email"}
            </Button>
          </form>
        ) : (
          <p className="mt-6 text-muted" role="status">
            {message || "That confirmation link is not valid, or it has expired. Sign up again on the verse page."}
          </p>
        )}
      </article>
    </SiteShell>
  );
}
