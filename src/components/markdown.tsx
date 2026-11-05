import { Fragment, type ReactNode } from "react";

/**
 * A small Markdown renderer for published articles. It builds React elements
 * only and never sets raw HTML, so any HTML in the source shows as text.
 * Supports headings, paragraphs, block quotes, lists, rules, fenced code,
 * and inline bold, italic, code, and links (http, https, mailto, or a path
 * on this site).
 */
export function Markdown({ source }: { source: string }) {
  return <>{renderBlocks(source.replace(/\r\n?/g, "\n"))}</>;
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; text: string }
  | { type: "rule" };

function parseBlocks(src: string): Block[] {
  const lines = src.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  const isBlank = (l: string) => l.trim() === "";
  const isListItem = (l: string) => /^\s*([-*+]|\d+[.)])\s+/.test(l);
  const startsBlock = (l: string) =>
    /^#{1,6}\s/.test(l) || /^\s*>/.test(l) || /^```/.test(l) || isListItem(l) || /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ type: "quote", text: body.join("\n") });
      continue;
    }
    if (isListItem(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && !isBlank(lines[i])) {
        const l = lines[i];
        if (isListItem(l)) items.push(l.replace(/^\s*([-*+]|\d+[.)])\s+/, ""));
        else if (items.length) items[items.length - 1] += ` ${l.trim()}`;
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const body: string[] = [];
    while (i < lines.length && !isBlank(lines[i]) && !(body.length && startsBlock(lines[i]))) {
      body.push(lines[i++]);
    }
    blocks.push({ type: "paragraph", text: body.join("\n") });
  }
  return blocks;
}

function renderBlocks(src: string): ReactNode[] {
  return parseBlocks(src).map((b, k) => {
    switch (b.type) {
      case "heading": {
        // The page title is the only h1; article headings start at h2.
        const level = Math.min(Math.max(b.level + 1, 2), 4);
        if (level === 2) return <h2 key={k} className="mt-10 text-2xl md:text-3xl">{inline(b.text)}</h2>;
        if (level === 3) return <h3 key={k} className="mt-8 text-xl md:text-2xl">{inline(b.text)}</h3>;
        return <h4 key={k} className="mt-6 text-lg">{inline(b.text)}</h4>;
      }
      case "paragraph":
        return <p key={k} className="mt-5 text-lg leading-relaxed text-muted">{inline(b.text)}</p>;
      case "quote":
        return (
          <blockquote key={k} className="mt-6 border-l-2 border-forest pl-5 font-display text-xl leading-snug text-ink italic">
            {renderBlocks(b.text)}
          </blockquote>
        );
      case "list": {
        const items = b.items.map((it, j) => <li key={j}>{inline(it)}</li>);
        const cls = "mt-5 space-y-2 pl-6 text-lg leading-relaxed text-muted";
        return b.ordered ? (
          <ol key={k} className={`${cls} list-decimal`}>{items}</ol>
        ) : (
          <ul key={k} className={`${cls} list-disc`}>{items}</ul>
        );
      }
      case "code":
        return (
          <pre key={k} className="mt-6 overflow-x-auto rounded-lg bg-cream p-4 text-sm text-ink">
            <code>{b.text}</code>
          </pre>
        );
      case "rule":
        return <hr key={k} className="my-10 border-rule" />;
    }
  });
}

/** Only links that go somewhere safe: web, mail, or a path on this site. */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^(https?:|mailto:)/i.test(href)) return href;
  if (/^\/(?!\/)/.test(href) || href.startsWith("#")) return href;
  return null;
}

const INLINE = /(`[^`]+`)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|(\*\*|__)(.+?)\4|(\*|_)(?!\s)(.+?)\6/;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push(...withBreaks(rest, key++));
      break;
    }
    if (m.index > 0) out.push(...withBreaks(rest.slice(0, m.index), key++));
    if (m[1]) {
      out.push(<code key={key++} className="rounded bg-cream px-1 text-[0.9em] text-ink">{m[1].slice(1, -1)}</code>);
    } else if (m[2] !== undefined) {
      const href = safeHref(m[3]);
      const external = href ? /^https?:/i.test(href) : false;
      out.push(
        href ? (
          <a
            key={key++}
            href={href}
            className="font-medium text-forest underline underline-offset-4"
            {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}
          >
            {inline(m[2])}
          </a>
        ) : (
          <Fragment key={key++}>{inline(m[2])}</Fragment>
        ),
      );
    } else if (m[5] !== undefined) {
      out.push(<strong key={key++} className="font-semibold text-ink">{inline(m[5])}</strong>);
    } else if (m[7] !== undefined) {
      out.push(<em key={key++}>{inline(m[7])}</em>);
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

/** A single line break inside a paragraph is a space, as in standard Markdown. */
function withBreaks(text: string, key: number): ReactNode[] {
  return [<Fragment key={key}>{text.replace(/\s*\n\s*/g, " ")}</Fragment>];
}
