import { createHmac, timingSafeEqual } from "node:crypto";
import { LEGAL } from "./content.ts";
import { isPublicDomainTranslation, verseSlug, type VerseDay } from "./verse.ts";

/** Free-plan caps returned by the Resend account this site already sends from. */
export const RESEND_DAILY_CAP = 100;
export const RESEND_MONTHLY_CAP = 3000;

/**
 * Verse letters stop this far under the cap so confirmations, desk mail, and
 * other apps on the same key still fit. The free plan rejects mail at the cap
 * rather than billing an overage; this keeps us off that line.
 */
export const RESEND_DAILY_HEADROOM = 15;
export const RESEND_MONTHLY_HEADROOM = 300;

/** Never more than this many verse letters in one day, even if headroom remains. */
export const VERSE_DAILY_SEND_CEILING = 80;

/** Confirmations stop one send under the hard cap. */
export const TRANSACTIONAL_HEADROOM = 1;

export const CONFIRM_TTL_SEC = 48 * 60 * 60;
export const UNSUBSCRIBE_TTL_SEC = 400 * 24 * 60 * 60;
export const CONFIRM_MAX_PER_HOUR = 3;

export const QA_MAILBOXES = new Set([
  "delivered@resend.dev",
  "bounced@resend.dev",
  "complained@resend.dev",
]);

export const VERSE_SITE = "https://www.unitedundergod.org";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function cleanSourcePath(path: string) {
  const trimmed = path.trim().slice(0, 120);
  if (!trimmed.startsWith("/verse") || /[\s?#]/.test(trimmed)) return "/verse";
  return trimmed;
}

export function isPlausibleEmail(value: string) {
  const email = normalizeEmail(value);
  return email.length >= 5 && email.length <= 320 && EMAIL_RE.test(email);
}

export function isQaMailbox(email: string) {
  return QA_MAILBOXES.has(normalizeEmail(email));
}

/** Production is the only place a real subscriber address may be mailed. */
export function liveMailAllowed(env: { VERCEL_ENV?: string } = process.env) {
  return env.VERCEL_ENV === "production";
}

export function recipientAllowed(email: string, allowLive: boolean) {
  if (allowLive) return isPlausibleEmail(email);
  return isQaMailbox(email);
}

export function verseLinkSecret(env: {
  VERSE_LINK_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
} = process.env) {
  return env.VERSE_LINK_SECRET?.trim() || env.BETTER_AUTH_SECRET?.trim() || "";
}

export function postalLine(env: { VERSE_POSTAL_ADDRESS?: string } = process.env) {
  const override = env.VERSE_POSTAL_ADDRESS?.trim();
  if (override) return override;
  return `${LEGAL.name}, Vidalia, Georgia`;
}

export function utcDayStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export function utcMonthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** "2026-10-23" in Vidalia. */
export function ministryToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function verseSendAllowance(input: {
  sentToday: number;
  sentThisMonth: number;
  dailyCap?: number;
  monthlyCap?: number;
}) {
  const dailyCap = input.dailyCap ?? RESEND_DAILY_CAP;
  const monthlyCap = input.monthlyCap ?? RESEND_MONTHLY_CAP;
  const dailyLeft = dailyCap - RESEND_DAILY_HEADROOM - Math.max(0, input.sentToday);
  const monthlyLeft = monthlyCap - RESEND_MONTHLY_HEADROOM - Math.max(0, input.sentThisMonth);
  const allowance = Math.max(0, Math.min(dailyLeft, monthlyLeft, VERSE_DAILY_SEND_CEILING));
  let reason = "";
  if (allowance <= 0) {
    reason = dailyLeft <= 0 ? "daily cap headroom" : "monthly cap headroom";
  } else if (allowance < VERSE_DAILY_SEND_CEILING && monthlyLeft <= dailyLeft) {
    reason = "monthly cap headroom";
  } else if (allowance < VERSE_DAILY_SEND_CEILING && dailyLeft < VERSE_DAILY_SEND_CEILING) {
    reason = "daily cap headroom";
  }
  return { allowance, reason };
}

export function transactionalAllowance(input: {
  sentToday: number;
  sentThisMonth: number;
  dailyCap?: number;
  monthlyCap?: number;
}) {
  const dailyCap = input.dailyCap ?? RESEND_DAILY_CAP;
  const monthlyCap = input.monthlyCap ?? RESEND_MONTHLY_CAP;
  const dailyLeft = dailyCap - TRANSACTIONAL_HEADROOM - Math.max(0, input.sentToday);
  const monthlyLeft = monthlyCap - TRANSACTIONAL_HEADROOM - Math.max(0, input.sentThisMonth);
  return Math.max(0, Math.min(dailyLeft, monthlyLeft));
}

type TokenPayload = { email: string; purpose: "confirm" | "unsubscribe"; exp: number };

function signBody(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signVerseToken(payload: TokenPayload, secret: string) {
  const body = Buffer.from(
    JSON.stringify({
      e: normalizeEmail(payload.email),
      p: payload.purpose === "confirm" ? "c" : "u",
      x: payload.exp,
    }),
  ).toString("base64url");
  return `${body}.${signBody(body, secret)}`;
}

export function verifyVerseToken(token: string, secret: string, nowSec = Math.floor(Date.now() / 1000)):
  | { ok: true; email: string; purpose: "confirm" | "unsubscribe" }
  | { ok: false } {
  if (!secret) return { ok: false };
  const dot = token.indexOf(".");
  if (dot <= 0) return { ok: false };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signBody(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      e?: unknown;
      p?: unknown;
      x?: unknown;
    };
    if (typeof parsed.e !== "string" || !isPlausibleEmail(parsed.e)) return { ok: false };
    if (parsed.p !== "c" && parsed.p !== "u") return { ok: false };
    if (typeof parsed.x !== "number" || parsed.x < nowSec) return { ok: false };
    return {
      ok: true,
      email: normalizeEmail(parsed.e),
      purpose: parsed.p === "c" ? "confirm" : "unsubscribe",
    };
  } catch {
    return { ok: false };
  }
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function confirmUrl(token: string, site = VERSE_SITE) {
  return `${site}/verse/confirm?token=${encodeURIComponent(token)}`;
}

export function unsubscribePageUrl(token: string, site = VERSE_SITE) {
  return `${site}/verse/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function unsubscribePostUrl(token: string, site = VERSE_SITE) {
  return `${site}/api/verse/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function listUnsubscribeHeaders(token: string, site = VERSE_SITE) {
  return {
    "List-Unsubscribe": `<${unsubscribePostUrl(token, site)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function footerLines(unsubUrl: string, address: string) {
  return [
    "",
    "You asked United Under God to send you a verse each day. Stop anytime:",
    unsubUrl,
    "",
    `${address}. EIN ${LEGAL.ein}.`,
    `${VERSE_SITE}/privacy`,
  ];
}

export function buildConfirmMail(args: {
  confirmToken: string;
  unsubscribeToken: string;
  site?: string;
  address: string;
}) {
  const site = args.site ?? VERSE_SITE;
  const url = confirmUrl(args.confirmToken, site);
  const unsub = unsubscribePageUrl(args.unsubscribeToken, site);
  const subject = "Confirm your daily verse";
  const text = [
    "A verse in your inbox each day — confirm and it is yours.",
    "",
    "You asked United Under God to email you the verse of the day, with a short word and a link to the full page. We will not start until you confirm.",
    "",
    `Confirm: ${url}`,
    "",
    "This link works for 48 hours. If you did not ask for this, you can ignore it.",
    ...footerLines(unsub, args.address),
  ].join("\n");
  const html = mailHtml({
    title: subject,
    heading: "Confirm your daily verse",
    paragraphs: [
      "A verse in your inbox each day — confirm and it is yours.",
      "You asked United Under God to email you the verse of the day, with a short word and a link to the full page. We will not start until you confirm.",
      "This link works for 48 hours. If you did not ask for this, you can ignore it.",
    ],
    action: { href: url, label: "Confirm my email" },
    unsub,
    address: args.address,
  });
  return { subject, text, html, headers: listUnsubscribeHeaders(args.unsubscribeToken, site) };
}

export function buildDailyVerseMail(args: {
  verse: VerseDay;
  token: string;
  site?: string;
  address: string;
}) {
  const site = args.site ?? VERSE_SITE;
  const slug = verseSlug(args.verse.reference);
  const page = `${site}/verse/${slug}`;
  const unsub = unsubscribePageUrl(args.token, site);
  const showText =
    Boolean(args.verse.verseText) && isPublicDomainTranslation(args.verse.translation);
  const subject = `${args.verse.reference} for today`.slice(0, 120);
  const lines = [
    `${args.verse.reference} is the verse for today.`,
    "",
  ];
  if (args.verse.livingTranslation) {
    lines.push(args.verse.livingTranslation, "");
  }
  if (showText) {
    lines.push(`“${args.verse.verseText}”`, `${args.verse.reference}`, "");
  }
  if (args.verse.application) {
    lines.push(args.verse.application, "");
  }
  lines.push(`Read the full page: ${page}`, ...footerLines(unsub, args.address));
  const paragraphs = [
    `${args.verse.reference} is the verse for today.`,
    args.verse.livingTranslation,
    showText ? `“${args.verse.verseText}”` : "",
    args.verse.application,
  ].filter(Boolean);
  const html = mailHtml({
    title: subject,
    heading: args.verse.reference,
    paragraphs,
    action: { href: page, label: "Read the full page" },
    unsub,
    address: args.address,
  });
  return {
    subject,
    text: lines.join("\n"),
    html,
    headers: listUnsubscribeHeaders(args.token, site),
    page,
  };
}

function mailHtml(args: {
  title: string;
  heading: string;
  paragraphs: string[];
  action: { href: string; label: string };
  unsub: string;
  address: string;
}) {
  const paragraphs = args.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1a1814;">${escapeHtml(p)}</p>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(args.title)}</title>
</head>
<body style="margin:0;background:#f3eee4;color:#1a1814;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee4;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:28px 28px 8px;font-family:Georgia, 'Times New Roman', serif;">
              <h1 style="margin:0 0 16px;font-size:28px;line-height:1.3;font-weight:500;color:#1a1814;">${escapeHtml(args.heading)}</h1>
              ${paragraphs}
              <p style="margin:8px 0 24px;">
                <a href="${escapeHtml(args.action.href)}" style="display:inline-block;background:#2e4a3c;color:#f3eee4;text-decoration:none;padding:12px 18px;border-radius:8px;font-family:Georgia, serif;font-size:16px;">${escapeHtml(args.action.label)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-family:Georgia, serif;font-size:13px;line-height:1.5;color:#6b645a;">
              <p style="margin:0 0 8px;">You asked United Under God to send you a verse each day.</p>
              <p style="margin:0 0 8px;"><a href="${escapeHtml(args.unsub)}" style="color:#2e4a3c;">Stop the daily verse</a></p>
              <p style="margin:0;">${escapeHtml(args.address)}. EIN ${escapeHtml(LEGAL.ein)}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function batchIdempotencyKey(dateKey: string, subscriberIds: string[]) {
  const joined = [...subscriberIds].sort().join(",");
  const digest = createHmac("sha256", "verse-daily").update(`${dateKey}:${joined}`).digest("hex").slice(0, 32);
  return `verse-daily/${dateKey}/${digest}`;
}

export function indexNowKeyFile(pathname: string, key: string | undefined) {
  const trimmed = key?.trim() ?? "";
  if (!/^[A-Za-z0-9-]{8,128}$/.test(trimmed)) return null;
  if (pathname !== `/${trimmed}.txt`) return null;
  return { body: trimmed };
}

export function indexNowPayload(args: { key: string; slugs: string[]; site?: string }) {
  const site = args.site ?? VERSE_SITE;
  const host = new URL(site).host;
  const key = args.key.trim();
  const pages = args.slugs.map((slug) => `${site}/verse/${slug}`);
  return {
    host,
    key,
    keyLocation: `${site}/${key}.txt`,
    urlList: [`${site}/verse`, ...pages],
  };
}

export function usableIndexNowKey(key: string | undefined) {
  const trimmed = key?.trim() ?? "";
  if (!trimmed) return "";
  return /^[A-Za-z0-9-]{8,128}$/.test(trimmed) ? trimmed : "";
}
