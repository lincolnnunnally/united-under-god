import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import {
  VerseBody,
  VerseDates,
  verseEyebrow,
  VerseNextSteps,
} from "@/components/verse-of-the-day";
import { VerseSignup } from "@/components/verse-signup";
import { bibleLibrary } from "@/lib/bible";
import { absoluteUrl, OG_IMAGE, ORG_ID, pageHead } from "@/lib/seo";
import {
  describe,
  formatDateKey,
  groupVerseDays,
  neighbours,
  passageInContext,
  verseTitle,
} from "@/lib/verse";
import { getVerseDays, VERSE_CACHE_HEADERS } from "@/lib/verse-data";

export const Route = createFileRoute("/verse/$slug")({
  loader: async ({ params }) => {
    const entries = groupVerseDays(await getVerseDays());
    const entry = entries.find((e) => e.slug === params.slug);
    if (!entry) throw notFound();
    const { prev, next } = neighbours(entries, entry.slug);
    const pick = (e: typeof entry | undefined) =>
      e ? { slug: e.slug, reference: e.reference, firstDate: e.firstDate } : null;
    return {
      entry,
      prev: pick(prev),
      next: pick(next),
      inContext: passageInContext(entry.reference, bibleLibrary.questions),
    };
  },
  headers: () => VERSE_CACHE_HEADERS,
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Verse of the Day | United Under God" }] };
    const { entry } = loaderData;
    const path = `/verse/${params.slug}`;
    const description = describe(entry);
    return pageHead({
      title: verseTitle(entry.reference),
      description,
      path,
      type: "article",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${entry.reference} — Verse of the Day`,
          description,
          url: absoluteUrl(path),
          mainEntityOfPage: absoluteUrl(path),
          image: OG_IMAGE,
          datePublished: entry.firstDate,
          dateModified: entry.lastDate,
          author: { "@id": ORG_ID },
          publisher: { "@id": ORG_ID },
          about: { "@type": "CreativeWork", name: entry.reference, isPartOf: { "@type": "Book", name: "The Bible" } },
          isPartOf: { "@type": "CollectionPage", name: "Verse of the Day", url: absoluteUrl("/verse") },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Verse of the Day", item: absoluteUrl("/verse") },
            { "@type": "ListItem", position: 3, name: entry.reference, item: absoluteUrl(path) },
          ],
        },
      ],
    });
  },
  component: VersePage,
});

function VersePage() {
  const { entry, prev, next, inContext } = Route.useLoaderData();
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <nav aria-label="Breadcrumb" className={verseEyebrow}>
          <Link to="/verse" className="underline-offset-4 hover:underline">
            Verse of the Day
          </Link>
        </nav>
        <h1 className="mt-4 text-4xl">{entry.reference}</h1>
        <p className="mt-2 text-sm text-subtle">
          <VerseDates first={entry.firstDate} last={entry.lastDate} count={entry.dayCount} />
        </p>

        <div className="mt-8">
          <VerseBody verse={entry} />
        </div>

        <div className="mt-12">
          <VerseSignup sourcePath={`/verse/${entry.slug}`} />
        </div>

        {inContext.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-2xl">Read it in context</h2>
            <ul className="mt-3 space-y-2">
              {inContext.map((q) => (
                <li key={q.slug}>
                  <Link
                    to="/bible/$slug"
                    params={{ slug: q.slug }}
                    className="font-medium text-forest underline-offset-4 hover:underline"
                  >
                    {q.question}
                  </Link>{" "}
                  <span className="text-sm text-subtle">({q.ref})</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav
          aria-label="More verses"
          className="mt-12 flex flex-col gap-4 border-t border-rule pt-8 sm:flex-row sm:justify-between"
        >
          {prev ? (
            <Link
              to="/verse/$slug"
              params={{ slug: prev.slug }}
              rel="prev"
              className="text-muted underline-offset-4 hover:underline"
            >
              ← {prev.reference}
              <span className="block text-sm text-subtle">{formatDateKey(prev.firstDate)}</span>
            </Link>
          ) : (
            <span />
          )}
          <Link to="/verse" className="text-muted underline-offset-4 hover:underline">
            All verses
          </Link>
          {next ? (
            <Link
              to="/verse/$slug"
              params={{ slug: next.slug }}
              rel="next"
              className="text-muted underline-offset-4 hover:underline sm:text-right"
            >
              {next.reference} →
              <span className="block text-sm text-subtle">{formatDateKey(next.firstDate)}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <div className="mt-12">
          <VerseNextSteps />
        </div>
      </article>
    </SiteShell>
  );
}
