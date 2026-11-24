import { createFileRoute, Link } from "@tanstack/react-router";
import { AvlHero, AvlRequest, Section, SizeCards, avlHead } from "@/components/sanctuary-avl";
import { withoutSlugs } from "@/lib/articles";
import { ARTICLE_CACHE_HEADERS, getAvlLibraryGuides } from "@/lib/articles-data";
import { HELP_PAGES } from "@/lib/church-av-help";
import { GUIDES } from "@/lib/sanctuary-avl";

export const Route = createFileRoute("/avl/guides/")({
  component: GuidesIndex,
  // Hand-written guides first, then published guides from the shared library
  // (lpl_articles, app `sanctuary-avl`), newest first. A slow or failing read
  // shows the hand-written guides alone.
  loader: async () => ({
    library: withoutSlugs(
      await getAvlLibraryGuides(),
      GUIDES.map((g) => g.slug),
    ),
  }),
  headers: () => ARTICLE_CACHE_HEADERS,
  head: () =>
    avlHead({
      title: "Church Sound, Lighting & Video Guides",
      description:
        "Plain guides for pastors and church committees: costs, signs it is time to upgrade, LED walls, choosing an installer, and what your room size needs.",
      path: "/avl/guides",
    }),
});

function GuidesIndex() {
  const { library } = Route.useLoaderData();
  return (
    <>
      <AvlHero eyebrow="Guides" title="Guides for pastors and committees" cta={false}>
        <p>What it costs, what your room needs, and how to fix what is in the way of worship.</p>
      </AvlHero>
      <Section title="Start here">
        <ul className="grid gap-4 md:grid-cols-2">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link
                to="/avl/guides/$slug"
                params={{ slug: guide.slug }}
                className="block h-full rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <span className="font-display text-xl text-heading">{guide.label}</span>
                <span className="mt-2 block text-sm text-muted">{guide.description}</span>
              </Link>
            </li>
          ))}
          {library.map((guide) => (
            <li key={guide.slug}>
              <Link
                to="/avl/guides/$slug"
                params={{ slug: guide.slug }}
                className="block h-full rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <span className="font-display text-xl text-heading">{guide.title}</span>
                {guide.excerpt ? (
                  <span className="mt-2 block text-sm text-muted">{guide.excerpt}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <section className="border-y border-rule bg-cream">
        <Section title="By the size of your room">
          <SizeCards />
        </Section>
      </section>
      <Section title="Fixing a problem you hear on Sunday">
        <ul className="grid gap-3 sm:grid-cols-2">
          {HELP_PAGES.map((page) => (
            <li key={page.slug}>
              <Link
                to="/avl/help/$slug"
                params={{ slug: page.slug }}
                className="text-forest hover:underline"
              >
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <AvlRequest path="/avl/guides" label="guides" />
    </>
  );
}
