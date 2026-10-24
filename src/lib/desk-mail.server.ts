import { getSql } from "@/lib/db";
import { claimDeskSend, releaseDeskSend, sendResendText } from "@/lib/desk-mail";

type SendArgs = {
  inquiryId: string;
  to: string[];
  subject: string;
  text: string;
};

async function sendOne(
  to: string,
  subject: string,
  text: string,
): Promise<{ status: string; error: string; rejected: boolean }> {
  const key = process.env.RESEND_API_KEY?.trim();

  if (key) {
    const result = await sendResendText({ to, subject, text, apiKey: key });
    return result.ok
      ? { status: "sent", error: "", rejected: false }
      : { status: "failed", error: result.error, rejected: result.rejected || result.error === "" };
  }

  const res = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(to)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: subject,
        _template: "box",
        _captcha: "false",
        message: text,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    return { status: "failed", error: body.slice(0, 400), rejected: true };
  }
  return { status: "sent", error: "", rejected: false };
}

export async function sendDeskEmails(args: SendArgs) {
  const unique = [
    ...new Set(args.to.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  ];
  const sql = await getSql();
  const now = new Date();
  let sent = 0;
  for (const to of unique) {
    let status = "failed";
    let error = "";
    try {
      const claimed = await claimDeskSend(sql, now, "desk", "inquiry");
      if (!claimed.ok) {
        console.error(`[desk-mail] ${claimed.reason} reached inquiry=${args.inquiryId}`);
        status = "skipped";
        error = claimed.reason === "monthly cap" ? "desk monthly cap" : "desk daily cap";
      } else {
        const result = await sendOne(to, args.subject, args.text);
        status = result.status;
        error = result.error;
        if (status === "sent") sent += 1;
        else if (result.rejected && claimed.reserved) await releaseDeskSend(sql, now, "desk");
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "send failed";
    }
    try {
      await sql`
        insert into email_log (id, inquiry_id, to_email, subject, status, error)
        values (
          ${crypto.randomUUID()},
          ${args.inquiryId},
          ${to},
          ${args.subject},
          ${status},
          ${error}
        )
      `;
    } catch {
      console.error(`[desk-mail] email log failed inquiry=${args.inquiryId}`);
    }
  }
  return { sent, attempted: unique.length };
}
