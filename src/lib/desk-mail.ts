import { OWNER_EMAIL } from "./desk.ts";

/** Verified Resend sending domain for this account: emails.unitedundergod.org */
export const DEFAULT_DESK_FROM =
  "United Under God <no-reply@emails.unitedundergod.org>";

export function deskFromAddress(env: { RESEND_FROM?: string } = process.env) {
  const override = env.RESEND_FROM?.trim();
  return override || DEFAULT_DESK_FROM;
}

/**
 * The inquiry row is already saved. A mail failure must not reject the submit.
 * The log line names the inquiry id and kind only — no addresses, no body.
 */
export async function sendResendText(args: {
  to: string;
  subject: string;
  text: string;
  apiKey?: string;
  from: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean }> {
  const key = args.apiKey?.trim();
  if (!key) return { ok: false };
  try {
    const res = await (args.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from,
        to: [args.to],
        subject: args.subject,
        text: args.text,
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/**
 * Resend only, to the literal owner address. No notify_routes read and no
 * email_log write, so it still works when the database is down.
 */
export async function sendHardcodedOwnerEmail(args: {
  subject: string;
  text: string;
  apiKey?: string;
  from?: string;
  fetchImpl?: typeof fetch;
  logKind: string;
  logLabel: "unsaved" | "routes";
}): Promise<{ sent: number; attempted: number }> {
  const result = await sendResendText({
    to: OWNER_EMAIL,
    subject: args.subject,
    text: args.text,
    apiKey: args.apiKey,
    from: args.from ?? deskFromAddress(),
    fetchImpl: args.fetchImpl,
  });
  if (!result.ok) {
    console.error(
      `[desk-mail] ${args.logLabel} email failed kind=${args.logKind}`,
    );
    return { sent: 0, attempted: 1 };
  }
  return { sent: 1, attempted: 1 };
}

export async function finishDeskSend<T extends { sent: number; attempted: number }>(
  inquiry: { id: string; kind: string },
  send: () => Promise<T>,
): Promise<T | { sent: 0; attempted: 0 }> {
  try {
    const mail = await send();
    if (mail.sent < mail.attempted) {
      console.error(
        `[desk-mail] send failed inquiry=${inquiry.id} kind=${inquiry.kind} sent=${mail.sent} attempted=${mail.attempted}`,
      );
    }
    return mail;
  } catch {
    console.error(
      `[desk-mail] send failed inquiry=${inquiry.id} kind=${inquiry.kind}`,
    );
    return { sent: 0, attempted: 0 };
  }
}
