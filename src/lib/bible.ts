import library from "@/data/bible-library.json";

export type BibleVerse = { ref: string; note: string };

export type BibleQuestion = {
  slug: string;
  question: string;
  shortAnswer: string;
  answer: string[];
  verses: BibleVerse[];
  nextStep: string;
  topics: string[];
};

export const BIBLE_HOST = "https://bible.unitedundergod.org";

export const bibleLibrary = library as {
  title: string;
  audience: string;
  questions: BibleQuestion[];
};

export function getQuestion(slug: string) {
  return bibleLibrary.questions.find((item) => item.slug === slug);
}

export function searchQuestions(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return bibleLibrary.questions;
  return bibleLibrary.questions.filter((item) => {
    const hay = [
      item.question,
      item.shortAnswer,
      item.topics.join(" "),
      ...item.verses.map((v) => v.ref),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
