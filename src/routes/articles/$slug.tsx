import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Markdown } from "@/components/markdown";
import { SiteShell } from "@/components/site-shell";
import { absoluteUrl, OG_IMAGE, ORG_ID, pageHead } from "@/lib/seo";
import { ARTICLE_CACHE_HEADERS, formatArticleDate, getArticle } from "@/lib/articles-data";

const eyebrow = "text-xs font-semibold tracking-[0.18em] text-forest uppercase";

export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ params }) => {
    const article = await getArticle({ data: params.slug });
    if (!article) throw notFound();
    return { article };
  },
  headers: () => ARTICLE_CACHE_HEADERS,
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Articles | United Under God" }] };
    const { article } = loaderData;
    const path = `/articles/${params.slug}`;
    const description = article.seoDescription || article.excerpt || undefined;
    const head = pageHead({
      title: `${article.seoTitle || article.title} | United Under God`,
      description,
      path,
      type: "article",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          ...(description ? { description } : {}),
          url: absoluteUrl(path),
          mainEntityOfPage: absoluteUrl(path),
          image: OG_IMAGE,
          datePublished: article.publishedAt,
          ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
          author: { "@type": "Person", name: "Lincoln Nunnally" },
          publisher: { "@id": ORG_ID },
          ...(article.tags.length ? { keywords: article.tags.join(", ") } : {}),
          isPartOf: { "@type": "CollectionPage", name: "Articles", url: absoluteUrl("/articles") },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Articles", item: absoluteUrl("/articles") },
            { "@type": "ListItem", position: 3, name: article.title, item: absoluteUrl(path) },
          ],
        },
      ],
    });
    return {
      ...head,
      meta: [
        ...head.meta,
        { property: "article:published_time", content: article.publishedAt },
        { property: "article:author", content: article.author },
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { article } = Route.useLoaderData();
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <nav aria-label="Breadcrumb" className={eyebrow}>
          <Link to="/articles" className="underline-offset-4 hover:underline">
            Articles
          </Link>
        </nav>
        <h1 className="mt-4 text-4xl md:text-5xl">{article.title}</h1>
        <p className="mt-3 text-sm text-subtle">
          {[article.author, formatArticleDate(article.publishedAt)].filter(Boolean).join(" · ")}
          {article.scriptureRef ? ` · ${article.scriptureRef}` : null}
        </p>
        {article.excerpt ? (
          <p className="mt-6 font-display text-2xl leading-snug text-ink italic">{article.excerpt}</p>
        ) : null}

        <div className="mt-8">
          <Markdown source={article.bodyMd} />
        </div>

        <nav aria-label="More articles" className="mt-14 border-t border-rule pt-8">
          <Link to="/articles" className="text-muted underline-offset-4 hover:underline">
            ← All articles
          </Link>
        </nav>
      </article>
    </SiteShell>
  );
}
