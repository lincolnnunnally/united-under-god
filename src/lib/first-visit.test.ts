import assert from "node:assert/strict";
import { test } from "node:test";
import { describeFirstVisit, noteFirstVisit, readFirstVisit } from "./first-visit.ts";

function fakeWindow(url: string, referrer: string, store: Map<string, string> = new Map()) {
  const parsed = new URL(url);
  return {
    location: { hostname: parsed.hostname, pathname: parsed.pathname, search: parsed.search },
    document: { referrer },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  } as unknown as Window;
}

test("the first page of a visit is kept, and later pages never overwrite it", () => {
  const store = new Map<string, string>();
  noteFirstVisit(fakeWindow("https://www.unitedundergod.org/buying/sell-to-churches?utm_source=newsletter", "https://www.google.com/", store));
  noteFirstVisit(fakeWindow("https://www.unitedundergod.org/buying/vendors", "https://www.unitedundergod.org/buying/sell-to-churches", store));
  const line = readFirstVisit(fakeWindow("https://www.unitedundergod.org/buying/vendors", "", store));
  assert.match(line, /^from google\.com, landed on \/buying\/sell-to-churches, campaign newsletter, \d{4}-\d{2}-\d{2}$/);
});

test("a visit from this site itself, or typed in, says no other site sent them", () => {
  const store = new Map<string, string>();
  noteFirstVisit(fakeWindow("https://www.unitedundergod.org/buying", "https://unitedundergod.org/", store));
  assert.match(readFirstVisit(fakeWindow("https://www.unitedundergod.org/", "", store)), /^typed in or bookmarked/);
});

test("blocked storage and bad notes read as nothing", () => {
  const blocked = { localStorage: { getItem: () => { throw new Error("blocked"); } } } as unknown as Window;
  assert.equal(readFirstVisit(blocked), "");
  assert.equal(describeFirstVisit("not json"), "");
  assert.equal(describeFirstVisit(null), "");
});
