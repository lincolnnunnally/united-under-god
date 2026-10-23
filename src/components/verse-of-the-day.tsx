import { Link } from "@tanstack/react-router";
import {
  formatDateKey,
  isPublicDomainTranslation,
  TRANSLATION_NAMES,
  type VerseDay,
} from "@/lib/verse";

const eyebrow = "text-xs font-semibold tracking-[0.18em] text-forest uppercase";

/**
 * The verse exactly as the content hub published it. The hub's own
 * paraphrase is the "Real Life Translation"; the verbatim Bible text is shown
 * only when the hub recorded a public-domain translation for it.
 */
export function VerseBody({ verse }: { verse: VerseDay }) {
  const code = verse.translation.trim().toUpperCase();
  const showText = Boolean(verse.verseText) && isPublicDomainTranslation(code);
  return (
    <div className="space-y-8">
      {verse.livingTranslation ? (
        <section>
          <p className={eyebrow}>Real Life Translation</p>
          <p className="mt-3 font-display text-2xl leading-snug text-ink italic md:text-3xl">
            {verse.livingTranslation}
          </p>
        </section>
      ) : null}

      {showText ? (
        <blockquote className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]">
          <p className="text-lg leading-relaxed text-ink">“{verse.verseText}”</p>
          <footer className="mt-3 text-sm text-subtle">
            {verse.reference} · {TRANSLATION_NAMES[code] ?? code} (public domain)
          </footer>
        </blockquote>
      ) : null}

      {verse.application ? (
        <section>
          <h2 className="text-2xl">Live it today</h2>
          <p className="mt-3 leading-relaxed text-muted">{verse.application}</p>
        </section>
      ) : null}

      {verse.heartMessage ? (
        <section>
          <h2 className="text-2xl">For your heart</h2>
          <p className="mt-3 leading-relaxed text-muted">{verse.heartMessage}</p>
        </section>
      ) : null}

      {verse.prayer ? (
        <section>
          <h2 className="text-2xl">Prayer</h2>
          <p className="mt-3 leading-relaxed text-muted">{verse.prayer}</p>
        </section>
      ) : null}
    </div>
  );
}

export function VerseDates({ first, last, count }: { first: string; last: string; count: number }) {
  if (first === last) return <>Verse of the Day on {formatDateKey(first)}</>;
  return (
    <>
      Verse of the Day on {count} days, {formatDateKey(first)} to {formatDateKey(last)}
    </>
  );
}

/** A gentle next step: the seal and church tools. */
export function VerseNextSteps() {
  return (
    <aside className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]">
      <p className={eyebrow}>A next step</p>
      <ul className="mt-4 space-y-3 text-muted">
        <li>
          <Link to="/join" className="font-medium text-forest underline-offset-4 hover:underline">
            Take the seal
          </Link>{" "}
          — stand with Christians, churches and businesses working together under God.
        </li>
        <li>
          <Link to="/apps" className="font-medium text-forest underline-offset-4 hover:underline">
            Tools for your church
          </Link>{" "}
          — apps and services that help a church do the work in front of it.
        </li>
        <li>
          <Link to="/bible" className="font-medium text-forest underline-offset-4 hover:underline">
            Understanding the Bible
          </Link>{" "}
          — real questions, short answers, and the verses to read for yourself.
        </li>
      </ul>
    </aside>
  );
}

export { eyebrow as verseEyebrow };
