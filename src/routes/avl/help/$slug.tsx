import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  AvlHero,
  AvlRequest,
  Cards,
  FaqList,
  Section,
  avlBreadcrumbs,
  avlFaqJsonLd,
  avlHead,
} from "@/components/sanctuary-avl";
import { HELP_PAGES, getHelpPage } from "@/lib/church-av-help";
import { AVL_NAME } from "@/lib/sanctuary-avl";

/**
 * The church AV help pages (src/lib/church-av-help.ts), told under the
 * Sanctuary AVL name. Same words and fixes; the case studies and the United
 * Under God planner stay on the United Under God pages.
 */
export const Route = createFileRoute("/avl/help/$slug")({
  component: HelpView,
  loader: ({ params }) => {
    const page = getHelpPage(params.slug);
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: AVL_NAME }] };
    const { page } = loaderData;
    const path = `/avl/help/${page.slug}`;
    return avlHead({
      title: page.title.replace(/\s*\|\s*United Under God$/, ""),
      description: page.description,
      path,
      type: "article",
      jsonLd: [
        avlBreadcrumbs([
          { name: AVL_NAME, path: "/avl" },
          { name: "Guides", path: "/avl/guides" },
          { name: page.label, path },
        ]),
        avlFaqJsonLd(page.faq),
      ],
    });
  },
});

function HelpView() {
  const { page } = Route.useLoaderData();
  return (
    <>
      <AvlHero eyebrow={page.eyebrow} title={page.h1}>
        <p>{page.lead}</p>
      </AvlHero>

      <article className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <h2 className="text-3xl text-heading">{page.whyTitle}</h2>
        <div className="mt-5 space-y-5 text-lg text-ink/90">
          {page.why.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </article>

      <section className="border-y border-rule bg-cream">
        <Section title="How it gets fixed">
          <Cards items={page.fixes} />
        </Section>
      </section>

      {page.steps ? (
        <Section title={page.steps.title} intro={<p>{page.steps.intro}</p>}>
          <ol className="max-w-3xl space-y-5">
            {page.steps.items.map((item, i) => (
              <li
                key={item.name}
                className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-rule pt-4"
              >
                <span className="font-display text-2xl text-forest">{i + 1}</span>
                <div>
                  <h3 className="font-display text-lg text-heading">{item.name}</h3>
                  <p className="mt-1 text-muted">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <Section title="Why it matters">
        <div className="max-w-3xl space-y-5 text-lg text-ink/90">
          {page.mission.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Section>

      <Section title="Questions">
        <div className="max-w-3xl">
          <FaqList faq={page.faq} />
        </div>
      </Section>

      <Section title="Related">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {HELP_PAGES.filter((p) => page.related.includes(p.slug)).map((p) => (
            <li key={p.slug}>
              <Link
                to="/avl/help/$slug"
                params={{ slug: p.slug }}
                className="text-forest hover:underline"
              >
                {p.label}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/avl/guides" className="text-forest hover:underline">
              All guides
            </Link>
          </li>
        </ul>
      </Section>

      <AvlRequest
        path={`/avl/help/${page.slug}`}
        label={`help: ${page.label}`}
        heading="Tell us what you are hearing"
      />
    </>
  );
}
