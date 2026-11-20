import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  AvlHero,
  AvlRequest,
  Cards,
  Checklist,
  PriceTable,
  Section,
  avlBreadcrumbs,
  avlHead,
} from "@/components/sanctuary-avl";
import { AVL_NAME, ROOM_SIZES, getRoomSize } from "@/lib/sanctuary-avl";

export const Route = createFileRoute("/avl/sizes/$slug")({
  component: SizePage,
  loader: ({ params }) => {
    const size = getRoomSize(params.slug);
    if (!size) throw notFound();
    return { size };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: AVL_NAME }] };
    const { size } = loaderData;
    const path = `/avl/sizes/${size.slug}`;
    return avlHead({
      title: size.title,
      description: size.description,
      path,
      type: "article",
      jsonLd: [
        avlBreadcrumbs([
          { name: AVL_NAME, path: "/avl" },
          { name: "Guides", path: "/avl/guides" },
          { name: size.label, path },
        ]),
      ],
    });
  },
});

function SizePage() {
  const { size } = Route.useLoaderData();
  return (
    <>
      <AvlHero eyebrow={`Room size · ${size.seats}`} title={size.title}>
        <p>{size.lead}</p>
      </AvlHero>

      <Section title="What a room this size usually looks like">
        <div className="max-w-3xl text-lg">
          <Checklist items={size.typical} />
        </div>
      </Section>

      <section className="border-y border-rule bg-cream">
        <Section title="What it needs">
          <Cards items={size.needs} />
        </Section>
      </section>

      <Section title="If the budget will not do it all at once">
        <ol className="max-w-3xl space-y-4 text-lg">
          {size.first.map((step, i) => (
            <li key={step} className="grid grid-cols-[2.5rem_1fr] gap-3">
              <span className="font-display text-2xl text-forest">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <section className="border-y border-rule bg-cream">
        <Section title="Ballpark ranges for this size">
          <PriceTable only={size} />
          <p className="mt-6">
            <Link
              to="/avl/guides/$slug"
              params={{ slug: "church-av-cost" }}
              className="text-forest hover:underline"
            >
              What moves the number up or down
            </Link>
          </p>
        </Section>
      </section>

      <Section title="Other room sizes">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {ROOM_SIZES.filter((s) => s.slug !== size.slug).map((s) => (
            <li key={s.slug}>
              <Link
                to="/avl/sizes/$slug"
                params={{ slug: s.slug }}
                className="text-forest hover:underline"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <AvlRequest path={`/avl/sizes/${size.slug}`} label={`room size: ${size.label}`} />
    </>
  );
}
