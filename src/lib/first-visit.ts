/**
 * Where a visitor first came from, kept in their own browser so a sign-up can say how it found us
 * (owner, 2026-11-18: the first vendor signed up and nothing showed where they came from).
 *
 * The first page of a visit to this site writes one note: the site that sent them (the referrer's host,
 * only when it is another site), the page they landed on, and any utm_source / utm_medium / utm_campaign.
 * Later pages never overwrite it. A sign-up form reads it back as one line. Nothing leaves the browser
 * until the person submits a form; no cookie, no third party. Storage that is blocked or full reads as "".
 */
const KEY = "uug_first_visit";

export type FirstVisit = { ref: string; path: string; utm: string; at: string };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Plain text for one line: no control characters, at most 300 characters. */
function clean(value: string): string {
  const printable = Array.from(value, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch));
  return printable.join("").trim().slice(0, 300);
}

export function noteFirstVisit(win: Window = window): void {
  try {
    if (win.localStorage.getItem(KEY)) return;
    const here = win.location;
    const ref = hostOf(win.document.referrer);
    const params = new URLSearchParams(here.search);
    const utm = ["utm_source", "utm_medium", "utm_campaign"]
      .map((name) => params.get(name))
      .filter(Boolean)
      .join(" / ");
    const note: FirstVisit = {
      ref: ref && ref !== here.hostname.replace(/^www\./, "") ? ref : "",
      path: here.pathname,
      utm,
      at: new Date().toISOString(),
    };
    win.localStorage.setItem(KEY, JSON.stringify(note));
  } catch {
    // storage blocked: nothing is kept
  }
}

/** One line for a sign-up: "from google.com, landed on /buying/sell-to-churches, 2026-11-18". */
export function describeFirstVisit(raw: string | null): string {
  if (!raw) return "";
  try {
    const note = JSON.parse(raw) as Partial<FirstVisit>;
    const parts = [
      note.ref ? `from ${note.ref}` : "typed in or bookmarked (no other site sent them)",
      note.path ? `landed on ${note.path}` : "",
      note.utm ? `campaign ${note.utm}` : "",
      note.at ? String(note.at).slice(0, 10) : "",
    ].filter(Boolean);
    return clean(parts.join(", "));
  } catch {
    return "";
  }
}

export function readFirstVisit(win: Window = window): string {
  try {
    return describeFirstVisit(win.localStorage.getItem(KEY));
  } catch {
    return "";
  }
}
