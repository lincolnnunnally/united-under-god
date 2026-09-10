import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AskBibleQuestion } from "@/components/ask-bible-question";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bibleLibrary, searchQuestions } from "@/lib/bible";

export const Route = createFileRoute("/bible/")({
  component: BibleIndex,
  head: () => ({
    meta: [
      { title: "Understanding the Bible — United Under God" },
      {
        name: "description",
        content:
          "Real questions. Short answers. The verses. Freedom first — not a system for managing sin.",
      },
    ],
  }),
});

const bibleLayout = getRouteApi("/bible");

function BibleIndex() {
  const indigo = bibleLayout.useLoaderData();
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchQuestions(query), [query]);

  if (indigo) {
    return (
      <main className="bible-main">
        <div className="bible-hero">
          <p className="bible-eyebrow">For people on a spiritual journey</p>
          <h1>Understanding the Bible</h1>
          <p>
            Real questions. Short answers. The verses. Freedom first — not a
            system for managing sin. Search the library, read one through, or
            send a question of your own.
          </p>
        </div>

        <label className="bible-search">
          Search questions
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="freedom, law, new heart, grace…"
          />
        </label>

        <div className="bible-list">
          {results.length === 0 ? (
            <p className="bible-empty">
              Nothing matches that yet. Send the question below — we will work
              it through.
            </p>
          ) : (
            results.map((item) => (
              <Link
                key={item.slug}
                to="/bible/$slug"
                params={{ slug: item.slug }}
                className="bible-card"
              >
                <p className="bible-eyebrow">{item.topics.join(" · ")}</p>
                <h2>{item.question}</h2>
                <p>{item.shortAnswer}</p>
              </Link>
            ))
          )}
        </div>

        <AskBibleQuestion variant="indigo" />
        <p className="bible-count">
          {bibleLibrary.questions.length} questions in the library. More land
          here when a conversation is ready to share.
        </p>
      </main>
    );
  }

  return (
    <>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            For people on a spiritual journey
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">Understanding the Bible</h1>
          <p className="mt-5 max-w-2xl text-muted">
            Real questions. Short answers. The verses. Freedom first — not a
            system for managing sin. Search the library, read one through, or
            send a question of your own.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <Label htmlFor="bible-search" className="sr-only">
          Search questions
        </Label>
        <Input
          id="bible-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search: freedom, law, new heart, grace…"
          className="max-w-xl"
        />

        {results.length === 0 ? (
          <p className="mt-10 max-w-prose text-muted">
            Nothing matches that yet. Send the question below — we will work it
            through.
          </p>
        ) : (
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {results.map((item) => (
              <li key={item.slug}>
                <Link
                  to="/bible/$slug"
                  params={{ slug: item.slug }}
                  className="block h-full rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] transition-[background-color] duration-[var(--motion-quick)] hover:bg-surface"
                >
                  <p className="text-xs font-semibold tracking-[0.14em] text-forest uppercase">
                    {item.topics.join(" · ")}
                  </p>
                  <h2 className="mt-3 font-display text-2xl italic leading-snug">
                    {item.question}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {item.shortAnswer}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-16 max-w-xl">
          <AskBibleQuestion variant="movement" />
        </div>
        <p className="mt-8 text-sm text-subtle">
          {bibleLibrary.questions.length} questions in the library. More land
          here when a conversation is ready to share.
        </p>
      </section>
    </>
  );
}
