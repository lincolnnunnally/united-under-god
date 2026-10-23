import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { verseEyebrow } from "@/components/verse-of-the-day";
import { confirmDailyVerse } from "@/lib/verse-subscribe";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/verse/confirm")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => confirmDailyVerse({ data: { token: deps.token } }),
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
  const result = Route.useLoaderData();
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <p className={verseEyebrow}>Verse of the Day</p>
        <h1 className="mt-4 text-4xl">{result.ok ? "You're confirmed" : "We couldn't confirm that"}</h1>
        <p className="mt-6 text-muted" role="status">
          {result.message}
        </p>
      </article>
    </SiteShell>
  );
}
