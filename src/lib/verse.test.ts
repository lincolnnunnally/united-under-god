import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  describe as describeVerse,
  formatDateKey,
  groupVerseDays,
  isPublicDomainTranslation,
  neighbours,
  passageInContext,
  verseSlug,
  verseTitle,
  type VerseDay,
} from "./verse.ts";

function day(dateKey: string, reference: string, extra: Partial<VerseDay> = {}): VerseDay {
  return {
    dateKey,
    reference,
    title: `Real Life Translation: ${reference}`,
    verseText: "text",
    translation: "BSB",
    livingTranslation: `RLT of ${reference}`,
    application: "",
    heartMessage: "",
    prayer: "",
    publishedAt: `${dateKey}T11:00:00Z`,
    ...extra,
  };
}

describe("verse of the day", () => {
  it("slugs a reference the way the brief asks", () => {
    assert.equal(verseSlug("2 Corinthians 1:3-4"), "2-corinthians-1-3-4");
    assert.equal(verseSlug("Psalm 23:1"), "psalm-23-1");
    assert.equal(verseSlug("  John 3:16 "), "john-3-16");
  });

  it("titles a page uniquely by reference", () => {
    assert.equal(
      verseTitle("2 Corinthians 1:3-4"),
      "2 Corinthians 1:3-4 — Verse of the Day | United Under God",
    );
  });

  it("groups repeated days into one page with first and last date", () => {
    const entries = groupVerseDays([
      day("2026-10-23", "2 Corinthians 1:3-4", { livingTranslation: "newest" }),
      day("2026-07-28", "2 Corinthians 1:3-4", { livingTranslation: "oldest" }),
      day("2026-08-01", "Isaiah 41:10"),
      day("bad", "John 3:16"),
      day("2026-08-02", ""),
    ]);
    assert.equal(entries.length, 2);
    const cor = entries.find((e) => e.slug === "2-corinthians-1-3-4")!;
    assert.equal(cor.firstDate, "2026-07-28");
    assert.equal(cor.lastDate, "2026-10-23");
    assert.equal(cor.dayCount, 2);
    assert.equal(cor.livingTranslation, "newest");
    const { prev, next } = neighbours(entries, "isaiah-41-10");
    assert.equal(prev?.slug, "2-corinthians-1-3-4");
    assert.equal(next, undefined);
  });

  it("republishes verbatim text only for public-domain translations", () => {
    assert.ok(isPublicDomainTranslation("BSB"));
    assert.ok(isPublicDomainTranslation("kjv"));
    for (const code of ["NIV", "ESV", "NLT", "NKJV", ""]) {
      assert.equal(isPublicDomainTranslation(code), false, code);
    }
  });

  it("links to /bible questions that cite the same book and chapter", () => {
    const questions = [
      { slug: "my-yoke-is-easy", question: "Easy yoke?", verses: [{ ref: "Matthew 11:28-30" }] },
      { slug: "new-heart", question: "New heart?", verses: [{ ref: "2 Corinthians 5:17" }] },
      { slug: "why-suffering", question: "Why?", verses: [{ ref: "Psalm 23" }] },
    ];
    assert.deepEqual(
      passageInContext("Matthew 11:28", questions).map((q) => q.slug),
      ["my-yoke-is-easy"],
    );
    assert.deepEqual(passageInContext("2 Corinthians 1:3-4", questions), []);
    assert.deepEqual(
      passageInContext("Psalms 23:1", questions).map((q) => q.slug),
      ["why-suffering"],
    );
  });

  it("formats dates and descriptions without drift", () => {
    assert.equal(formatDateKey("2026-10-23"), "October 23, 2026");
    const long = describeVerse({ reference: "X 1:1", livingTranslation: "word ".repeat(60), application: "" });
    assert.ok(long.length <= 158);
    assert.ok(long.endsWith("…"));
  });
});
