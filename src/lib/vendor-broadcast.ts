import type { Sql } from "./db.ts";
import { getSpendCategory, getSpendSubcategory } from "./church-spend.ts";
import {
  bidStates,
  cleanStates,
  listVendors,
  vendorServesArea,
  vendorServesCategory,
  type SendMail,
  type VendorRow,
} from "./vendor-store.ts";
import { isRankedCategory } from "./vendor-rank.ts";
import { PORTAL_PATH } from "./vendor-portal-store.ts";

/**
 * One message from the owner to every approved vendor serving a catalog
 * (optionally one subcategory, optionally an area), for example "We're
 * refreshing Janitorial Supplies — please update your pricing in your
 * portal." Every send is logged, and a send key from the preview makes
 * pressing Send twice send once.
 *
 * Imported by node's test runner: relative imports, no framework code. Mail is
 * passed in as a function, so nothing here sends on its own.
 */

export type BroadcastTarget = { category: string; subcategory?: string; area?: string };

export type CleanTarget = { category: string; subcategory: string; area: string };

export function cleanTarget(input: BroadcastTarget): CleanTarget {
  const category = getSpendCategory(input.category);
  if (!category || !isRankedCategory(category)) throw new Error("Pick a catalog vendors serve.");
  const subcategory = (input.subcategory ?? "").trim();
  if (subcategory && !getSpendSubcategory(category.id, subcategory)) {
    throw new Error("That subcategory is not in this catalog.");
  }
  const area = cleanStates(input.area ?? "").join(", ");
  return { category: category.id, subcategory, area };
}

/** Approved vendors, not suspended or revoked, serving the catalog (and subcategory and area). */
export function broadcastRecipients(vendors: VendorRow[], target: CleanTarget): VendorRow[] {
  const match = { category: target.category, subcategory: target.subcategory, area: target.area };
  return vendors.filter(
    (vendor) =>
      vendor.status === "approved" &&
      vendor.consequence !== "suspension" &&
      vendor.consequence !== "revocation" &&
      vendorServesCategory(vendor, match) &&
      vendorServesArea(vendor, match),
  );
}

export function describeTarget(target: CleanTarget): string {
  const category = getSpendCategory(target.category);
  const sub = target.subcategory ? getSpendSubcategory(target.category, target.subcategory) : undefined;
  const states = bidStates(target.area);
  return [
    category?.name ?? target.category,
    sub ? `: ${sub.name}` : "",
    states.length ? ` (${states.join(", ")})` : "",
  ].join("");
}

export function cleanMessage(input: { subject: string; body: string }) {
  const subject = input.subject.trim().replace(/\s+/g, " ");
  const body = input.body.trim();
  if (!subject) throw new Error("Write a subject.");
  if (subject.length > 160) throw new Error("Keep the subject under 160 characters.");
  if (!body) throw new Error("Write the message.");
  if (body.length > 6000) throw new Error("Keep the message under 6000 characters.");
  return { subject, body };
}

/** The email each vendor gets. The desk shows this exact text before anything is sent. */
export function broadcastEmail(args: {
  vendor: Pick<VendorRow, "company" | "contactName">;
  target: CleanTarget;
  subject: string;
  body: string;
  siteUrl: string;
}) {
  return {
    subject: args.subject,
    text: [
      args.vendor.contactName ? `Hello ${args.vendor.contactName},` : "Hello,",
      "",
      args.body,
      "",
      `Sign in to your vendor portal to update your profile, prices, and files: ${args.siteUrl}${PORTAL_PATH}`,
      "",
      `You are getting this because ${args.vendor.company} serves ${describeTarget(args.target)} in the United Under God buying program. Questions? Reply to this email.`,
      "",
      "United Under God, Inc.",
    ].join("\n"),
  };
}

export async function previewBroadcast(
  sql: Sql,
  input: BroadcastTarget & { subject: string; body: string },
  siteUrl: string,
) {
  const target = cleanTarget(input);
  const message = cleanMessage(input);
  const recipients = broadcastRecipients(await listVendors(sql), target);
  const sample = recipients[0] ?? { company: "Vendor company", contactName: "Contact name" };
  return {
    target,
    targetName: describeTarget(target),
    recipients: recipients.map((vendor) => ({ id: vendor.id, company: vendor.company, email: vendor.email })),
    email: broadcastEmail({ vendor: sample, target, ...message, siteUrl }),
    /** Send with this key; a second Send with it sends nothing new. */
    sendKey: crypto.randomUUID(),
  };
}

export type BroadcastResult = {
  broadcastId: string;
  sent: string[];
  failed: { vendorId: string; error: string }[];
  skipped: { vendorId: string; reason: string }[];
};

/**
 * Send the message once to each vendor the target matches now. The broadcast
 * and each send are logged; a vendor already sent under this key is skipped.
 */
export async function sendBroadcast(
  sql: Sql,
  input: BroadcastTarget & { subject: string; body: string; sendKey: string },
  args: { userId: string; siteUrl: string; send: SendMail },
): Promise<BroadcastResult> {
  const target = cleanTarget(input);
  const message = cleanMessage(input);
  const sendKey = input.sendKey.trim();
  if (!/^[0-9a-f-]{36}$/i.test(sendKey)) throw new Error("Preview the message again, then send.");
  await sql`
    insert into source_broadcasts (id, send_key, category, subcategory, area, subject, body, sent_by)
    values (${crypto.randomUUID()}, ${sendKey}, ${target.category}, ${target.subcategory}, ${target.area},
      ${message.subject}, ${message.body}, ${args.userId})
    on conflict (send_key) do nothing
  `;
  const rows = await sql`select * from source_broadcasts where send_key = ${sendKey}`;
  const broadcast = rows[0];
  if (!broadcast) throw new Error("The message was not saved. Try again.");
  if (String(broadcast.category) !== target.category) {
    throw new Error("Preview the message again, then send.");
  }
  const broadcastId = String(broadcast.id);
  const saved = {
    subject: String(broadcast.subject),
    body: String(broadcast.body),
  };
  const result: BroadcastResult = { broadcastId, sent: [], failed: [], skipped: [] };
  for (const vendor of broadcastRecipients(await listVendors(sql), target)) {
    const claimed = await sql<{ id: string }>`
      insert into source_broadcast_sends (id, broadcast_id, vendor_id, email, email_status)
      values (${crypto.randomUUID()}, ${broadcastId}, ${vendor.id}, ${vendor.email}, ${"sending"})
      on conflict (broadcast_id, vendor_id) do nothing
      returning id
    `;
    if (!claimed[0]) {
      result.skipped.push({ vendorId: vendor.id, reason: "already sent this message" });
      continue;
    }
    const email = broadcastEmail({ vendor, target, ...saved, siteUrl: args.siteUrl });
    let outcome: { ok: boolean; error: string };
    try {
      outcome = await args.send({ to: vendor.email, subject: email.subject, text: email.text });
    } catch {
      outcome = { ok: false, error: "send failed" };
    }
    const error = outcome.ok ? "" : outcome.error || "mail is not set up (no RESEND_API_KEY)";
    await sql`
      update source_broadcast_sends set email_status = ${outcome.ok ? "sent" : "failed"},
        email_error = ${error.slice(0, 500)}, sent_at = now()
      where id = ${claimed[0].id}
    `;
    if (outcome.ok) result.sent.push(vendor.id);
    else result.failed.push({ vendorId: vendor.id, error });
  }
  return result;
}

export type BroadcastLogRow = {
  id: string;
  target: string;
  subject: string;
  sentBy: string;
  createdAt: string;
  sent: number;
  failed: number;
};

export async function listBroadcasts(sql: Sql): Promise<BroadcastLogRow[]> {
  const rows = await sql`
    select b.*,
      (select count(*)::int from source_broadcast_sends s where s.broadcast_id = b.id and s.email_status = 'sent') as sent,
      (select count(*)::int from source_broadcast_sends s where s.broadcast_id = b.id and s.email_status = 'failed') as failed
    from source_broadcasts b order by b.created_at desc limit 100
  `;
  return rows.map((row) => ({
    id: String(row.id),
    target: describeTarget({
      category: String(row.category),
      subcategory: String(row.subcategory ?? ""),
      area: String(row.area ?? ""),
    }),
    subject: String(row.subject),
    sentBy: String(row.sent_by ?? ""),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    sent: Number(row.sent ?? 0),
    failed: Number(row.failed ?? 0),
  }));
}
