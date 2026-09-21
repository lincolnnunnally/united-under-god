import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { SUPER_EMAILS } from "@/lib/desk";
import {
  addQuote,
  createBid,
  listBook,
  publishAward,
  readDesk,
  setBidStatus,
  setItemWinners,
  setQuoteStatus,
  type PublicBookEntry,
  type SourceDesk,
} from "@/lib/source-store";

const createBidInput = z.object({
  title: z.string(),
  summary: z.string().optional().default(""),
  neededBy: z.string().optional().default(""),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.string().optional().default("1"),
        unit: z.string().optional().default(""),
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

async function assertStaff(userId: string) {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const sql = await getSql();
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

async function deskFor(userId: string): Promise<SourceDesk> {
  await assertStaff(userId);
  const sql = await getSql();
  return readDesk(sql);
}

export const listPublishedBook = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ entries: PublicBookEntry[] }> => {
    const sql = await getSql();
    return { entries: await listBook(sql) };
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
    const sql = await getSql();
    await createBid(sql, data, context.userId);
    return readDesk(sql);
  });

export const setSourceBidStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(bidStatusInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    await setBidStatus(sql, data.bidId, data.status);
    return readDesk(sql);
  });

export const addSourceQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(addQuoteInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    await addQuote(sql, data, context.userId);
    return readDesk(sql);
  });

export const setSourceQuoteStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(quoteStatusInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    await setQuoteStatus(sql, data.quoteId, data.status);
    return readDesk(sql);
  });

export const setSourceWinners = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(winnersInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    await setItemWinners(sql, data.itemId, data.quoteIds, context.userId);
    return readDesk(sql);
  });

export const publishSourceAward = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(publishInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    await publishAward(sql, data.awardId, context.userId);
    return readDesk(sql);
  });

export type { PublicBookEntry, SourceBid, SourceDesk } from "@/lib/source-store";
