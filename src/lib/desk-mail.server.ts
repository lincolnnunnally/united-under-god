import { getSql } from "@/lib/db";

type SendArgs = {
  inquiryId: string;
  to: string[];
  subject: string;
  text: string;
};

async function sendOne(to: string, subject: string, text: string): Promise<{ status: string; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() || "United Under God <lincoln@unitedundergod.org>";

  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { status: "failed", error: body.slice(0, 400) };
    }
    return { status: "sent", error: "" };
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
    return { status: "failed", error: body.slice(0, 400) };
  }
  return { status: "sent", error: "" };
}

export async function sendDeskEmails(args: SendArgs) {
  const unique = [
    ...new Set(args.to.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  ];
  const sql = await getSql();
  let sent = 0;
  for (const to of unique) {
    let status = "failed";
    let error = "";
    try {
      const result = await sendOne(to, args.subject, args.text);
      status = result.status;
      error = result.error;
      if (status === "sent") sent += 1;
    } catch (err) {
      error = err instanceof Error ? err.message : "send failed";
    }
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
  }
  return { sent, attempted: unique.length };
}
