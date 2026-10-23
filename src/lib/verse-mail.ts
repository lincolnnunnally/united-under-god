import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { LEGAL } from "./content.ts";
import { OWNER_EMAIL } from "./desk.ts";
import { isPublicDomainTranslation, verseSlug, type VerseDay } from "./verse.ts";

/** Free-plan caps returned by the Resend account this site already sends from. */
export const RESEND_DAILY_CAP = 100;
export const RESEND_MONTHLY_CAP = 3000;

/**
 * Verse letters stop this far under the cap so desk mail and other apps on the
 * same key still fit. Confirmation notes have their own small slice and are
 * not subtracted from this verse budget. The free plan rejects mail at the
 * cap rather than billing an overage.
 */
export const RESEND_DAILY_HEADROOM = 15;
export const RESEND_MONTHLY_HEADROOM = 300;

/** Never more than this many verse letters in one day, even if headroom remains. */
export const VERSE_DAILY_SEND_CEILING = 80;

/** Confirmations, across every address, stop here so they cannot eat the verse budget. */
export const CONFIRM_DAILY_CAP = 10;
export const CONFIRM_MONTHLY_CAP = 300;

/** One address may receive this many confirmation notes per UTC day. */
export const CONFIRM_PER_ADDRESS_PER_DAY = 3;

/** Sign-up attempts from one IP, whether or not a note goes out. */
export const SUBSCRIBE_IP_PER_HOUR = 5;
export const SUBSCRIBE_IP_PER_DAY = 20;

/** Missing or unreadable addresses share this one bucket. */
export const SHARED_IP_BUCKET = "shared";

/** Leading zero bits a browser must find before a sign-up counts. */
export const VERSE_POW_BITS = 16;
export const VERSE_POW_TTL_SEC = 10 * 60;

export const VERSE_NOT_OPEN = `The daily verse email is not open just yet. Write ${OWNER_EMAIL} and we will add you.`;
export const CONFIRM_CAP_MESSAGE = "Sign-ups are full for today. Please try again tomorrow.";

export const CONFIRM_TTL_SEC = 48 * 60 * 60;
export const UNSUBSCRIBE_TTL_SEC = 400 * 24 * 60 * 60;

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

/** Link tokens use only VERSE_LINK_SECRET. An empty value means do not send. */
export function verseLinkSecret(env: { VERSE_LINK_SECRET?: string } = process.env) {
  return env.VERSE_LINK_SECRET?.trim() ?? "";
}

const STREET_WORD =
  "street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|way|place|pl|circle|cir|highway|hwy|trail|trl|parkway|pkwy|terrace|ter|pike|route|rte|square|sq|alley|plaza|loop|path|row|cove|crossing";

/**
 * A PO Box, or a street number plus a street word (Street, Road, Ave, and so on).
 * A city, state, and ZIP such as "Vidalia, GA 30474" is not enough.
 */
export function isStreetOrPoBox(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 10 || trimmed.length > 240) return false;
  if (/\bP\.?\s*O\.?\s*Box\s+\d+/i.test(trimmed)) return true;
  if (!trimmed.includes(",")) return false;
  const street = new RegExp(
    `\\b\\d{1,6}\\b(?:\\s+[A-Za-z0-9.'-]+){0,5}\\s+(?:${STREET_WORD})\\b`,
    "i",
  );
  return street.test(trimmed);
}

export function fullPostalAddress(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return isStreetOrPoBox(trimmed) ? trimmed : "";
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

/**
 * Confirmations draw from their own slice. `otherToday` / `otherThisMonth`
 * are verse letters and desk mail, not confirmations, so a confirmation
 * never shrinks the verse budget. The slice still stops short of the hard cap.
 */
export function confirmSendAllowed(input: {
  confirmsToday: number;
  confirmsThisMonth: number;
  otherToday: number;
  otherThisMonth: number;
  dailyCap?: number;
  monthlyCap?: number;
}) {
  if (input.confirmsToday >= CONFIRM_DAILY_CAP) return false;
  if (input.confirmsThisMonth >= CONFIRM_MONTHLY_CAP) return false;
  const dailyCap = input.dailyCap ?? RESEND_DAILY_CAP;
  const monthlyCap = input.monthlyCap ?? RESEND_MONTHLY_CAP;
  const dailyReserve = Math.max(0, RESEND_DAILY_HEADROOM - CONFIRM_DAILY_CAP);
  const monthlyReserve = Math.max(0, RESEND_MONTHLY_HEADROOM - CONFIRM_MONTHLY_CAP);
  if (input.otherToday + input.confirmsToday >= dailyCap - dailyReserve) return false;
  if (input.otherThisMonth + input.confirmsThisMonth >= monthlyCap - monthlyReserve) return false;
  return true;
}

export function ipSubscribeLimited(hourCount: number, dayCount: number) {
  return hourCount >= SUBSCRIBE_IP_PER_HOUR || dayCount >= SUBSCRIBE_IP_PER_DAY;
}

/** IPv4 stays whole. IPv6 is the /64 prefix. An empty value shares one bucket. */
export function subscribeIpBucket(ip: string | undefined) {
  let value = (ip ?? "").trim().toLowerCase();
  if (!value) return SHARED_IP_BUCKET;
  if (value.startsWith("[") && value.includes("]")) value = value.slice(1, value.indexOf("]"));
  const zone = value.indexOf("%");
  if (zone >= 0) value = value.slice(0, zone);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return value.slice(0, 64);
  if (!value.includes(":")) return value.slice(0, 64);
  const groups = expandIpv6(value);
  if (!groups) return SHARED_IP_BUCKET;
  return groups
    .slice(0, 4)
    .map((group) => group.padStart(4, "0"))
    .join(":");
}

function expandIpv6(value: string) {
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string) => (part ? part.split(":") : []);
  if (halves.length === 1) {
    const groups = parse(value);
    return groups.length === 8 && groups.every((group) => /^[0-9a-f]{1,4}$/i.test(group)) ? groups : null;
  }
  const left = parse(halves[0] ?? "");
  const right = parse(halves[1] ?? "");
  const groups = [...left, ...right];
  if (groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  return [...left, ...Array.from({ length: missing }, () => "0"), ...right];
}

export function issueVersePow(secret: string, nowSec: number, bits = VERSE_POW_BITS) {
  const width = Math.min(24, Math.max(8, Math.floor(bits)));
  const payload = Buffer.from(
    JSON.stringify({ i: randomBytes(9).toString("base64url"), x: nowSec + VERSE_POW_TTL_SEC, b: width }),
  ).toString("base64url");
  return { challenge: `${payload}.${signBody(payload, secret)}`, bits: width };
}

export function solveVersePow(challenge: string, bits: number) {
  for (let n = 0; n < 8_000_000; n += 1) {
    const nonce = String(n);
    if (powDigestBits(challenge, nonce) >= bits) return nonce;
  }
  return "";
}

export function verifyVersePow(challenge: string, nonce: string, secret: string, nowSec: number) {
  if (!secret || !challenge || challenge.length > 512 || !nonce || nonce.length > 16 || !/^\d+$/.test(nonce)) return false;
  const dot = challenge.indexOf(".");
  if (dot <= 0) return false;
  const payload = challenge.slice(0, dot);
  const sig = challenge.slice(dot + 1);
  const expected = signBody(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      x?: unknown;
      b?: unknown;
    };
    if (typeof parsed.x !== "number" || parsed.x < nowSec) return false;
    if (typeof parsed.b !== "number" || parsed.b < 8 || parsed.b > 24) return false;
    return powDigestBits(challenge, nonce) >= parsed.b;
  } catch {
    return false;
  }
}

function powDigestBits(challenge: string, nonce: string) {
  const digest = createHash("sha256").update(`${challenge}\n${nonce}`).digest();
  let bits = 0;
  for (const byte of digest) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    for (let i = 7; i >= 0; i -= 1) {
      if (byte & (1 << i)) return bits;
      bits += 1;
    }
    return bits;
  }
  return bits;
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

export function listUnsubscribeHeaders(token: string, site = VERSE_SITE, mailto = OWNER_EMAIL) {
  const mail = `mailto:${mailto}?subject=${encodeURIComponent("Stop the daily verse")}`;
  return {
    "List-Unsubscribe": `<${mail}>, <${unsubscribePostUrl(token, site)}>`,
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
