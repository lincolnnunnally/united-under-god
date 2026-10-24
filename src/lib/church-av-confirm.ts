import type { Sql } from "./db.ts";
import { claimDeskSend, releaseDeskSend, sendResendText } from "./desk-mail.ts";

/**
 * The instant reply to a church that just sent the sound and video request
 * (inquiry kind "av"). Transactional: they asked, so we say we heard them and
 * what happens next. It goes through the same Resend sender as the owner
 * notices (desk-mail.ts), with replies landing in the owner's inbox.
 *
 * Rules (also enforced by scripts/church-av.test.mjs and the unit test): the
 * installer is never named, linked, or pictured, and its phone and email are
 * never printed. No prices or amounts, no ranking promises, and none of the
 * words the church AV pages avoid.
 *
 * This file is imported by node's test runner, so it uses relative imports
 * and keeps its own copy of the planner problem labels. scripts/church-av.test.mjs
 * checks that copy against src/lib/church-av-help.ts.
 */

const SITE = "https://www.unitedundergod.org";
export const AV_PLANNER_URL = `${SITE}/church-av/planner`;
const SUMMARY_PREFIX = `${SITE}/church-av/planner/summary`;

/** The planner's problem checkboxes: slug and label as in church-av-help.ts. */
export const AV_CONFIRM_HELP = [
  { slug: "cant-hear-in-the-back", label: "People can’t hear in the back" },
  { slug: "hearing-aids-squeal-or-echo", label: "Hearing aids squeal or echo" },
  { slug: "livestream-keeps-dropping", label: "The livestream keeps dropping" },
  { slug: "feedback-during-the-sermon", label: "Feedback during the sermon" },
  { slug: "volunteers-cant-run-the-board", label: "Volunteers can’t run the board" },
  { slug: "older-members-staying-home", label: "Older members are staying home" },
];

export const AV_CONFIRM_SUBJECT = "We received your church sound and video request";

/** At most this many help pages, so the email stays short. */
const HELP_LIMIT = 2;

function cleanName(name: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * The planner's "Committee summary:" link, only when it points at our own
 * summary page. Anything else in the message is never echoed back.
 */
export function committeeSummaryUrl(message: string): string | null {
  const match = /Committee summary:\s*(\S+)/.exec(message);
  if (!match) return null;
  let url: URL;
  try {
    url = new URL(match[1]);
  } catch {
    return null;
  }
  if (url.origin !== SITE || url.pathname !== "/church-av/planner/summary") return null;
  const href = url.toString();
  return href.startsWith(SUMMARY_PREFIX) ? href : null;
}

/** Problem slugs the church checked in the planner, in planner order. */
export function checkedProblems(message: string, summaryUrl: string | null): string[] {
  const found = new Set<string>();
  if (summaryUrl) {
    const raw = new URL(summaryUrl).searchParams.get("problems") ?? "";
    for (const slug of raw.split(",")) found.add(slug.trim());
  }
  const line = /What is not working:\s*(.+)/.exec(message)?.[1] ?? "";
  for (const label of line.split(";")) {
    const hit = AV_CONFIRM_HELP.find((h) => h.label === label.trim());
    if (hit) found.add(hit.slug);
  }
  return AV_CONFIRM_HELP.filter((h) => found.has(h.slug)).map((h) => h.slug);
}

export function usedPlanner(message: string) {
  return /Church Room Planner answers:|Committee summary:/.test(message);
}

export function buildAvConfirmation(inquiry: {
  name: string;
  phone?: string;
  message?: string;
}): { subject: string; text: string } {
  const message = inquiry.message ?? "";
  const name = cleanName(inquiry.name) || "friend";
  const summary = committeeSummaryUrl(message);
  const planner = usedPlanner(message);
  const help = checkedProblems(message, summary)
    .slice(0, HELP_LIMIT)
    .map((slug) => AV_CONFIRM_HELP.find((h) => h.slug === slug)!);
  const reach = inquiry.phone?.trim()
    ? "We will call you within one business day to talk through your room and what you are hearing."
    : "We will reach out within one business day to talk through your room and what you are hearing. Reply with a good number to call, and we will use that.";

  const lines = [
    `Dear ${name},`,
    "",
    "Thank you for writing to us about the sound in your sanctuary. We received your request, and a real person reads every one.",
    "",
    "What happens next:",
    `1. ${reach}`,
    "2. Then we set a time to walk through the sanctuary with you.",
    "3. After that, we build a design for your room.",
    "",
    "Nothing you sent us is a price or a quote.",
  ];
  if (summary) {
    lines.push("", "Share this with your committee or board:", summary);
  }
  if (help.length) {
    lines.push("", "These pages speak to what you told us:");
    for (const h of help) lines.push(`- ${h.label}: ${SITE}/church-av/help/${h.slug}`);
  }
  if (!planner) {
    lines.push(
      "",
      "If it would help to put your room into words before we talk, the Church Room Planner walks through it one question at a time:",
      AV_PLANNER_URL,
    );
  }
  lines.push(
    "",
    "If anything changes or you think of something, just reply to this email.",
    "",
    "Grace and peace,",
    "United Under God",
  );
  return { subject: AV_CONFIRM_SUBJECT, text: lines.join("\n") };
}

/**
 * Sends the confirmation to the church. Never throws: the inquiry is already
 * saved, so a mail failure is logged (inquiry id only, no address or body)
 * and the submit goes on.
 */
export async function sendAvConfirmation(args: {
  inquiry: { id: string; name: string; email: string; phone?: string; message?: string };
  apiKey?: string;
  fetchImpl?: typeof fetch;
  sql?: Sql;
  now?: Date;
}): Promise<{ sent: boolean }> {
  const to = args.inquiry.email.trim();
  const at = to.indexOf("@");
  if (at < 1 || to.lastIndexOf(".") < at + 2 || /\s/.test(to)) return { sent: false };
  const now = args.now ?? new Date();
  let reserved = false;
  if (args.sql) {
    try {
      const claimed = await claimDeskSend(args.sql, now, "av", "av");
      if (!claimed.ok) {
        console.error(`[desk-mail] av confirmation held inquiry=${args.inquiry.id}`);
        return { sent: false };
      }
      reserved = claimed.reserved;
    } catch {
      reserved = false;
    }
  }
  try {
    const mail = buildAvConfirmation(args.inquiry);
    const result = await sendResendText({
      to,
      subject: mail.subject,
      text: mail.text,
      apiKey: args.apiKey,
      fetchImpl: args.fetchImpl,
    });
    if (!result.ok) {
      if (reserved && args.sql && (result.rejected || result.error === "")) {
        try {
          await releaseDeskSend(args.sql, now, "av");
        } catch {
          /* a release error must not change the outcome */
        }
      }
      console.error(`[desk-mail] av confirmation failed inquiry=${args.inquiry.id}`);
      return { sent: false };
    }
    return { sent: true };
  } catch {
    console.error(`[desk-mail] av confirmation failed inquiry=${args.inquiry.id}`);
    return { sent: false };
  }
}
