import { createFileRoute, getRouteApi, Link, notFound } from "@tanstack/react-router";
import { bibleLibrary, getQuestion } from "@/lib/bible";

export const Route = createFileRoute("/bible/$slug")({
  component: BibleQuestionPage,
  loader: ({ params }) => {
    const item = getQuestion(params.slug);
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.question} — Understanding the Bible`
          : "Understanding the Bible",
      },
      ...(loaderData
        ? [{ name: "description", content: loaderData.shortAnswer }]
        : []),
    ],
  }),
});

const bibleLayout = getRouteApi("/bible");

function BibleQuestionPage() {
  const item = Route.useLoaderData();
  const indigo = bibleLayout.useLoaderData();
  const related = bibleLibrary.questions
    .filter((q) => q.slug !== item.slug && q.topics.some((t) => item.topics.includes(t)))
    .slice(0, 3);

  if (indigo) {
    return (
      <main className="bible-main bible-article">
        <p className="bible-eyebrow">
          <Link to="/bible">Understanding the Bible</Link>
        </p>
        <h1>{item.question}</h1>
        <p className="bible-lede">
          <strong>{item.shortAnswer}</strong>
        </p>
        {item.answer.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <h2>Verses</h2>
        <ul className="bible-verses">
          {item.verses.map((verse) => (
            <li key={verse.ref}>
              <strong>{verse.ref}</strong> — {verse.note}
            </li>
          ))}
        </ul>
        <p className="bible-next">
          <strong>A next step.</strong> {item.nextStep}
        </p>
        <p>
          <Link className="bible-btn" to="/bible">
            More questions
          </Link>
        </p>
        {related.length > 0 ? (
          <aside className="bible-related">
            <p className="bible-eyebrow">Keep reading</p>
            {related.map((q) => (
              <Link key={q.slug} to="/bible/$slug" params={{ slug: q.slug }}>
                {q.question}
              </Link>
            ))}
          </aside>
        ) : null}
      </main>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
      <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
        <Link to="/bible" className="underline-offset-4 hover:underline">
          Understanding the Bible
        </Link>
      </p>
      <h1 className="mt-4 text-4xl">{item.question}</h1>
      <p className="mt-6 text-lg text-ink">
        <strong>{item.shortAnswer}</strong>
      </p>
      <div className="mt-6 space-y-4 text-muted">
        {item.answer.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <h2 className="mt-10 text-2xl">Verses</h2>
      <ul className="mt-4 space-y-3 text-muted">
        {item.verses.map((verse) => (
          <li key={verse.ref}>
            <strong className="text-ink">{verse.ref}</strong> — {verse.note}
          </li>
        ))}
      </ul>
      <p className="mt-8 rounded-xl bg-cream p-5 text-muted shadow-[var(--shadow-border)]">
        <strong className="text-ink">A next step.</strong> {item.nextStep}
      </p>
      <p className="mt-8">
        <Link
          to="/bible"
          className="font-medium text-forest underline-offset-4 hover:underline"
        >
          More questions
        </Link>
      </p>
      {related.length > 0 ? (
        <aside className="mt-12 border-t border-rule pt-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Keep reading
          </p>
          <ul className="mt-4 space-y-3">
            {related.map((q) => (
              <li key={q.slug}>
                <Link
                  to="/bible/$slug"
                  params={{ slug: q.slug }}
                  className="font-display text-xl italic text-ink underline-offset-4 hover:underline"
                >
                  {q.question}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}
