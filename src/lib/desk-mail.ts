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
