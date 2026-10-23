import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import {
  VerseBody,
  VerseDates,
  verseEyebrow,
  VerseNextSteps,
} from "@/components/verse-of-the-day";
import { absoluteUrl, ORG_ID, pageHead } from "@/lib/seo";
import { describe, formatDateKey, groupVerseDays, verseSlug } from "@/lib/verse";
import { getVerseDays, VERSE_CACHE_HEADERS } from "@/lib/verse-data";

export const Route = createFileRoute("/verse/")({
  loader: async () => {
    const days = await getVerseDays();
    const today = days[0];
    const entries = groupVerseDays(days);
    const recent = [...entries].sort((a, b) => b.lastDate.localeCompare(a.lastDate)).slice(0, 30);
    return { today, recent };
  },
  headers: () => VERSE_CACHE_HEADERS,
  head: ({ loaderData }) =>
    pageHead({
      title: "Verse of the Day | United Under God",
      description: loaderData?.today
        ? `Today's verse, ${describe(loaderData.today)}`
        : "A verse from Scripture each day, with a Real Life Translation and a way to live it today.",
      path: "/verse",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Verse of the Day",
          url: absoluteUrl("/verse"),
          publisher: { "@id": ORG_ID },
          hasPart: (loaderData?.recent ?? []).map((e) => ({
            "@type": "Article",
            headline: `${e.reference} — Verse of the Day`,
            url: absoluteUrl(`/verse/${e.slug}`),
            datePublished: e.firstDate,
          })),
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Verse of the Day", item: absoluteUrl("/verse") },
          ],
        },
      ],
    }),
  component: VerseIndex,
});

function VerseIndex() {
  const { today, recent } = Route.useLoaderData();
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <p className={verseEyebrow}>Verse of the Day</p>
        {today ? (
          <>
            <h1 className="mt-4 text-4xl">{today.reference}</h1>
            <p className="mt-2 text-sm text-subtle">{formatDateKey(today.dateKey)}</p>
            <div className="mt-8">
              <VerseBody verse={today} />
            </div>
            <p className="mt-8">
              <Link
                to="/verse/$slug"
                params={{ slug: verseSlug(today.reference) }}
                className="font-medium text-forest underline-offset-4 hover:underline"
              >
                Open the page for {today.reference}
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-4xl">Verse of the Day</h1>
            <p className="mt-6 text-muted">
              No verse has been published here yet. Come back tomorrow.
            </p>
          </>
        )}

        {recent.length > 0 ? (
          <section className="mt-14 border-t border-rule pt-8">
            <h2 className="text-2xl">Recent verses</h2>
            <ul className="mt-5 space-y-4">
              {recent.map((e) => (
                <li key={e.slug}>
                  <Link
                    to="/verse/$slug"
                    params={{ slug: e.slug }}
                    className="font-display text-xl text-ink italic underline-offset-4 hover:underline"
                  >
                    {e.reference}
                  </Link>
                  <p className="text-sm text-subtle">
                    <VerseDates first={e.firstDate} last={e.lastDate} count={e.dayCount} />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-14">
          <VerseNextSteps />
        </div>
      </article>
    </SiteShell>
  );
}
