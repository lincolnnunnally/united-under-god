import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { DbUnavailableError, getSql, type Sql } from "@/lib/db";
import { SUPER_EMAILS } from "@/lib/desk";
import {
  addQuote,
  createBid,
  isBuyingDbUnavailable,
  publishAward,
  readBuyingBook,
  readBuyingCatalog,
  readDesk,
  setBidArea,
  setBidStatus,
  setItemWinners,
  setQuoteStatus,
  type BuyingCatalogRead,
  type PublicBookEntry,
  type SourceDesk,
} from "@/lib/source-store";
import { sendResendText } from "@/lib/desk-mail";
import { SITE_URL } from "@/lib/seo";
import {
  listInvites,
  listVendors,
  previewInvites,
  sendInvites,
  updateVendor,
  type InviteRow,
  type SendInvitesResult,
  type VendorRow,
} from "@/lib/vendor-store";

/** The desk: bids and quotes, plus the vendor list and the invitation log. */
export type DeskView = SourceDesk & {
  vendors: VendorRow[];
  invites: InviteRow[];
  /** False when migrations/0007_source_vendors.sql is not applied yet. */
  vendorsReady: boolean;
};

const createBidInput = z.object({
  title: z.string(),
  summary: z.string().optional().default(""),
  neededBy: z.string().optional().default(""),
  category: z.string().optional().default(""),
  subcategory: z.string().optional().default(""),
  area: z.string().optional().default(""),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.string().optional().default("1"),
        unit: z.string().optional().default(""),
        catalogItem: z.string().optional().default(""),
      }),
    )
    .min(1),
});

const addQuoteInput = z.object({
  bidId: z.string(),
  vendorName: z.string(),
  vendorContact: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  lines: z.array(
    z.object({
      itemId: z.string(),
      unitPrice: z.string().optional().default(""),
      notes: z.string().optional().default(""),
    }),
  ),
});

const quoteStatusInput = z.object({
  quoteId: z.string(),
  status: z.string(),
});

const bidStatusInput = z.object({
  bidId: z.string(),
  status: z.string(),
});

const winnersInput = z.object({
  itemId: z.string(),
  quoteIds: z.array(z.string()),
});

const publishInput = z.object({
  awardId: z.string(),
});

const bidAreaInput = z.object({ bidId: z.string(), area: z.string() });

const vendorUpdateInput = z.object({
  vendorId: z.string(),
  status: z.string().optional(),
  categories: z.array(z.string()).max(200).optional(),
  states: z.array(z.string()).max(60).optional(),
  places: z.string().optional(),
  nationwide: z.boolean().optional(),
});

const invitePreviewInput = z.object({ bidId: z.string() });
const inviteSendInput = z.object({ bidId: z.string(), vendorIds: z.array(z.string()).min(1).max(200) });

/** Desk reads and writes. A missing database throws; it never looks like a saved desk. */
async function deskSql() {
  try {
    return await getSql();
  } catch (err) {
    if (!isBuyingDbUnavailable(err)) throw err;
    throw new DbUnavailableError("The database is not available, so this was not saved.");
  }
}

async function assertStaff(userId: string) {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const sql = await deskSql();
  const users = await sql<{ email: string }>`select email from "user" where id = ${userId}`;
  const session = await getSessionUser();
  const email = (users[0]?.email || session?.email || "").trim().toLowerCase();
  const byEmail = email
    ? await sql`select id from staff where lower(email) = ${email} and active = true`
    : [];
  const byUser = byEmail[0]
    ? []
    : await sql`select id from staff where user_id = ${userId} and active = true`;
  const isSuper = SUPER_EMAILS.includes(email);
  if (!byEmail[0] && !byUser[0] && !isSuper) {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}

/** 42P01: the vendor tables are not there yet (0007 not applied). */
function missingTable(err: unknown) {
  return Boolean(err && typeof err === "object" && "code" in err && String(err.code) === "42P01");
}

async function deskView(sql: Sql): Promise<DeskView> {
  const desk = await readDesk(sql);
  try {
    return { ...desk, vendors: await listVendors(sql), invites: await listInvites(sql), vendorsReady: true };
  } catch (err) {
    if (!missingTable(err)) throw err;
    return { ...desk, vendors: [], invites: [], vendorsReady: false };
  }
}

async function deskFor(userId: string): Promise<DeskView> {
  await assertStaff(userId);
  const sql = await deskSql();
  return deskView(sql);
}

export const listPublishedBook = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ entries: PublicBookEntry[]; unavailable: boolean }> => {
    return readBuyingBook(() => getSql());
  },
);

/** Public: the buying book plus which list items are on an open bid (no vendors, no quotes). */
export const listCatalogBook = createServerFn({ method: "GET" }).handler(
  async (): Promise<BuyingCatalogRead> => {
    return readBuyingCatalog(() => getSql());
  },
);

export const readSourceDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => deskFor(context.userId));

export const createSourceBid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createBidInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    await createBid(sql, data, context.userId);
    return deskView(sql);
  });

export const setSourceBidStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(bidStatusInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    await setBidStatus(sql, data.bidId, data.status);
    return deskView(sql);
  });

export const addSourceQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(addQuoteInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    await addQuote(sql, data, context.userId);
    return deskView(sql);
  });

export const setSourceQuoteStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(quoteStatusInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    await setQuoteStatus(sql, data.quoteId, data.status);
    return deskView(sql);
  });

export const setSourceWinners = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(winnersInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    await setItemWinners(sql, data.itemId, data.quoteIds, context.userId);
    return deskView(sql);
  });

export const publishSourceAward = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(publishInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    await publishAward(sql, data.awardId, context.userId);
    return deskView(sql);
  });

export const setSourceBidArea = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(bidAreaInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    await setBidArea(sql, data.bidId, data.area);
    return deskView(sql);
  });

export const updateSourceVendor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(vendorUpdateInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    const { vendorId, ...patch } = data;
    await updateVendor(sql, vendorId, patch, context.userId);
    return deskView(sql);
  });

/** Who matches the bid and the exact email. Sends nothing. */
export const previewSourceInvites = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(invitePreviewInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    return previewInvites(sql, data.bidId, SITE_URL);
  });

/** Sends only when staff press Send, only to the vendors chosen, once per vendor per bid. */
export const sendSourceInvites = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(inviteSendInput)
  .handler(async ({ data, context }): Promise<{ desk: DeskView; result: SendInvitesResult }> => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    const result = await sendInvites(sql, {
      bidId: data.bidId,
      vendorIds: data.vendorIds,
      userId: context.userId,
      siteUrl: SITE_URL,
      send: ({ to, subject, text }) =>
        sendResendText({ to, subject, text, apiKey: process.env.RESEND_API_KEY }),
    });
    return { desk: await deskView(sql), result };
  });

export type { InviteRow, SendInvitesResult, VendorRow } from "@/lib/vendor-store";

export type {
  BiddingItem,
  BuyingCatalogRead,
  PublicBookEntry,
  SourceBid,
  SourceDesk,
} from "@/lib/source-store";
