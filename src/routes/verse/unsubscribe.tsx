import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { verseEyebrow } from "@/components/verse-of-the-day";
import { pageHead } from "@/lib/seo";
import { unsubscribeDailyVerse } from "@/lib/verse-subscribe";

export const Route = createFileRoute("/verse/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => unsubscribeDailyVerse({ data: { token: deps.token } }),
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
  const result = Route.useLoaderData();
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <p className={verseEyebrow}>Verse of the Day</p>
        <h1 className="mt-4 text-4xl">{result.ok ? "You're unsubscribed" : "That link didn't work"}</h1>
        <p className="mt-6 text-muted" role="status">
          {result.message}
        </p>
        <p className="mt-8">
          <Link to="/verse" className="font-medium text-forest underline-offset-4 hover:underline">
            Back to the verse of the day
          </Link>
        </p>
      </article>
    </SiteShell>
  );
}
