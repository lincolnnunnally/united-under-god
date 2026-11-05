import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { absoluteUrl, ORG_ID, pageHead } from "@/lib/seo";
import { ARTICLE_CACHE_HEADERS, formatArticleDate, getArticles } from "@/lib/articles-data";

const eyebrow = "text-xs font-semibold tracking-[0.18em] text-forest uppercase";

export const Route = createFileRoute("/articles/")({
  loader: async () => ({ articles: await getArticles() }),
  headers: () => ARTICLE_CACHE_HEADERS,
  head: ({ loaderData }) =>
    pageHead({
      title: "Articles | United Under God",
      description:
        "Writing from United Under God: what it looks like for Christians, churches, and neighbors to live united under God.",
      path: "/articles",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Articles",
          url: absoluteUrl("/articles"),
          publisher: { "@id": ORG_ID },
          hasPart: (loaderData?.articles ?? []).slice(0, 50).map((a) => ({
            "@type": "Article",
            headline: a.title,
            url: absoluteUrl(`/articles/${a.slug}`),
            datePublished: a.publishedAt,
            author: { "@type": "Person", name: a.author },
          })),
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Articles", item: absoluteUrl("/articles") },
          ],
        },
      ],
    }),
  component: ArticlesIndex,
});

function ArticlesIndex() {
  const { articles } = Route.useLoaderData();
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <p className={eyebrow}>Articles</p>
        <h1 className="mt-4 text-4xl md:text-5xl">Articles</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Writing on unity, faith, and the good work God’s people do together.
        </p>

        {articles.length === 0 ? (
          <p className="mt-12 border-t border-rule pt-8 text-lg text-muted">
            New writing is on the way.
          </p>
        ) : (
          <ul className="mt-12 divide-y divide-rule border-t border-rule">
            {articles.map((a) => (
              <li key={a.slug} className="py-8">
                <Link
                  to="/articles/$slug"
                  params={{ slug: a.slug }}
                  className="font-display text-2xl text-ink underline-offset-4 hover:underline"
                >
                  {a.title}
                </Link>
                <p className="mt-2 text-sm text-subtle">
                  {[formatArticleDate(a.publishedAt), a.author].filter(Boolean).join(" · ")}
                </p>
                {a.excerpt ? <p className="mt-3 leading-relaxed text-muted">{a.excerpt}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteShell>
  );
}
