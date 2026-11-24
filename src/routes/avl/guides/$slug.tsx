import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  AvlHero,
  AvlRequest,
  Checklist,
  FaqList,
  PriceTable,
  Section,
  SizeCards,
  avlBreadcrumbs,
  avlFaqJsonLd,
  avlHead,
} from "@/components/sanctuary-avl";
import { Markdown } from "@/components/markdown";
import { ARTICLE_CACHE_HEADERS, getAvlLibraryGuide, type Article } from "@/lib/articles-data";
import { avlUrl } from "@/lib/sanctuary-avl-host";
import { AVL_NAME, GUIDES, UPGRADE_SIGNS, getGuide, type Guide } from "@/lib/sanctuary-avl";

/**
 * A hand-written guide (src/lib/sanctuary-avl.ts) or, when no hand-written
 * guide has the slug, a published guide from the shared library
 * (lpl_articles, app `sanctuary-avl`). Hand-written always wins a slug clash.
 */
type Loaded = { guide: Guide; library: null } | { guide: null; library: Article };

export const Route = createFileRoute("/avl/guides/$slug")({
  component: GuidePage,
  loader: async ({ params }): Promise<Loaded> => {
    const guide = getGuide(params.slug);
    if (guide) return { guide, library: null };
    const library = await getAvlLibraryGuide({ data: params.slug });
    if (!library) throw notFound();
    return { guide: null, library };
  },
  headers: ({ loaderData }) => (loaderData?.library ? ARTICLE_CACHE_HEADERS : undefined),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: AVL_NAME }] };
    if (loaderData.library) return libraryHead(loaderData.library);
    const { guide } = loaderData;
    const path = `/avl/guides/${guide.slug}`;
    return avlHead({
      title: guide.title,
      description: guide.description,
      path,
      type: "article",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.h1,
          description: guide.description,
          url: avlUrl(path),
          publisher: { "@type": "Organization", name: AVL_NAME },
        },
        avlBreadcrumbs([
          { name: AVL_NAME, path: "/avl" },
          { name: "Guides", path: "/avl/guides" },
          { name: guide.label, path },
        ]),
        avlFaqJsonLd(guide.faq),
      ],
    });
  },
});

function libraryHead(article: Article) {
  const path = `/avl/guides/${article.slug}`;
  const description = article.seoDescription || article.excerpt;
  return avlHead({
    title: article.seoTitle || article.title,
    description,
    path,
    type: "article",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        ...(description ? { description } : {}),
        url: avlUrl(path),
        mainEntityOfPage: avlUrl(path),
        ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
        ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
        ...(article.tags.length ? { keywords: article.tags.join(", ") } : {}),
        publisher: { "@type": "Organization", name: AVL_NAME },
      },
      avlBreadcrumbs([
        { name: AVL_NAME, path: "/avl" },
        { name: "Guides", path: "/avl/guides" },
        { name: article.title, path },
      ]),
    ],
  });
}

function GuidePage() {
  const loaded = Route.useLoaderData();
  if (loaded.library) return <LibraryGuidePage article={loaded.library} />;
  const { guide } = loaded;
  return (
    <>
      <AvlHero eyebrow="Guide" title={guide.h1}>
        <p>{guide.lead}</p>
      </AvlHero>

      {guide.priceTable ? (
        <Section title="Ballpark ranges by room size">
          <PriceTable />
        </Section>
      ) : null}

      {guide.slug === "signs-your-church-needs-an-av-upgrade" ? <Signs /> : null}

      <article className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        {guide.sections.map((section) => (
          <section key={section.heading} className="mb-12 last:mb-0">
            <h2 className="text-3xl text-heading">{section.heading}</h2>
            <div className="mt-5 space-y-5 text-lg text-ink/90">
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            {section.bullets ? (
              <div className="mt-5 text-lg text-ink/90">
                <Checklist items={section.bullets} />
              </div>
            ) : null}
          </section>
        ))}
      </article>

      <section className="border-y border-rule bg-cream">
        <Section title="What your room size needs">
          <SizeCards />
        </Section>
      </section>

      <Section title="Questions">
        <div className="max-w-3xl">
          <FaqList faq={guide.faq} />
        </div>
      </Section>

      <MoreGuides current={guide} />

      <AvlRequest path={`/avl/guides/${guide.slug}`} label={`guide: ${guide.label}`} />
    </>
  );
}

function LibraryGuidePage({ article }: { article: Article }) {
  return (
    <>
      <AvlHero eyebrow="Guide" title={article.title}>
        {article.excerpt ? <p>{article.excerpt}</p> : null}
      </AvlHero>

      <article className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <Markdown source={article.bodyMd} />
      </article>

      <section className="border-y border-rule bg-cream">
        <Section title="What your room size needs">
          <SizeCards />
        </Section>
      </section>

      <MoreGuides current={article} />

      <AvlRequest path={`/avl/guides/${article.slug}`} label={`guide: ${article.title}`} />
    </>
  );
}

function Signs() {
  return (
    <Section>
      <ol className="grid gap-4 md:grid-cols-2">
        {UPGRADE_SIGNS.map((sign, i) => (
          <li key={sign.title} className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]">
            <p className="font-display text-sm text-forest">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="mt-1 font-display text-xl text-heading">{sign.title}</h3>
            <p className="mt-2 text-muted">{sign.body}</p>
            {sign.help ? (
              <Link
                to="/avl/help/$slug"
                params={{ slug: sign.help }}
                className="mt-3 inline-block text-sm text-forest hover:underline"
              >
                Why it happens and how to fix it
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}

function MoreGuides({ current }: { current: { slug: string } }) {
  const others = GUIDES.filter((g) => g.slug !== current.slug);
  return (
    <Section title="More guides">
      <ul className="grid gap-3 sm:grid-cols-3">
        {others.map((g) => (
          <li key={g.slug}>
            <Link
              to="/avl/guides/$slug"
              params={{ slug: g.slug }}
              className="text-forest hover:underline"
            >
              {g.label}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
