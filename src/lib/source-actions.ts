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
  setBidTerm,
  setItemWinners,
  setQuoteStatus,
  type BuyingCatalogRead,
  type PublicBookEntry,
  type SourceDesk,
} from "@/lib/source-store";
import { sendResendText } from "@/lib/desk-mail";
import { ensureBookTerms } from "@/lib/price-term";
import { SITE_URL } from "@/lib/seo";
import {
  listCovenantLinks,
  listInvites,
  listVendors,
  previewCovenantLink,
  previewInvites,
  sendCovenantLink,
  sendInvites,
  updateVendor,
  type CovenantLinkRow,
  type InviteRow,
  type SendInvitesResult,
  type VendorRow,
} from "@/lib/vendor-store";
import {
  addCaseEntry,
  addCommitteePerson,
  assignMediators,
  decideCase,
  escalateCase,
  markRemedy,
  previewChurchDecision,
  previewMediatorNotice,
  previewVendorNotice,
  readCases,
  sendChurchDecision,
  sendMediatorLinks,
  sendVendorNotice,
  setCaseStatus,
  setCommitteeActive,
  type CaseRow,
  type CommitteePerson,
  type MediatorSendResult,
} from "@/lib/case-store";

/** The desk: bids and quotes, plus the vendor list, the invitation log, and cases. */
export type DeskView = SourceDesk & {
  vendors: VendorRow[];
  invites: InviteRow[];
  /** False when migrations/0007_source_vendors.sql is not applied yet. */
  vendorsReady: boolean;
  cases: CaseRow[];
  committee: CommitteePerson[];
  covenantLinks: CovenantLinkRow[];
  /** False when migrations/0008_source_vendor_cases.sql is not applied yet. */
  casesReady: boolean;
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

const priceContactInput = z.object({
  name: z.string().max(400),
  title: z.string().max(400),
  email: z.string().max(400),
  phone: z.string().max(100),
});

const addQuoteInput = z.object({
  bidId: z.string(),
  vendorName: z.string(),
  vendorContact: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  priceContact: priceContactInput,
  attested: z.boolean(),
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
export async function deskSql() {
  try {
    return await getSql();
  } catch (err) {
    if (!isBuyingDbUnavailable(err)) throw err;
    throw new DbUnavailableError("The database is not available, so this was not saved.");
  }
}

/** Throws 403 unless the caller is staff. Returns a label for the case timeline. */
export async function assertStaff(userId: string): Promise<string> {
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
  return `United Under God${email ? ` (${email})` : ""}`;
}

/** 42P01: the vendor tables are not there yet (0007 not applied). */
function missingTable(err: unknown) {
  return Boolean(err && typeof err === "object" && "code" in err && String(err.code) === "42P01");
}

async function deskView(sql: Sql): Promise<DeskView> {
  try {
    // Entries published before references existed get their reference and term.
    await ensureBookTerms(sql);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code !== "42P01" && code !== "42703") throw err;
  }
  const desk = await readDesk(sql);
  const noCases = { cases: [], committee: [], covenantLinks: [], casesReady: false };
  let vendors: VendorRow[];
  let invites: InviteRow[];
  try {
    vendors = await listVendors(sql);
    invites = await listInvites(sql);
  } catch (err) {
    if (!missingTable(err)) throw err;
    return { ...desk, vendors: [], invites: [], vendorsReady: false, ...noCases };
  }
  try {
    const { cases, committee } = await readCases(sql);
    const covenantLinks = await listCovenantLinks(sql);
    return { ...desk, vendors, invites, vendorsReady: true, cases, committee, covenantLinks, casesReady: true };
  } catch (err) {
    if (!missingTable(err)) throw err;
    return { ...desk, vendors, invites, vendorsReady: true, ...noCases };
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

/** The price term for prices awarded from this bid: 6, 12, or a custom number of months. */
export const setSourceBidTerm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ bidId: z.string().max(80), months: z.string().max(10) }))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const sql = await deskSql();
    await setBidTerm(sql, data.bidId, data.months);
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

// ---------------------------------------------------------------------------
// Cases, committee, and covenant re-acceptance (staff only)
// ---------------------------------------------------------------------------

const deskMail = ({ to, subject, text }: { to: string; subject: string; text: string }) =>
  sendResendText({ to, subject, text, apiKey: process.env.RESEND_API_KEY });

const caseIdInput = z.object({ caseId: z.string().max(80) });

/** Run a case write as staff and return the fresh desk. */
async function caseWrite(userId: string, work: (sql: Sql, author: string) => Promise<unknown>) {
  const author = await assertStaff(userId);
  const sql = await deskSql();
  await work(sql, author);
  return deskView(sql);
}

export const setCaseStatusFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ caseId: z.string().max(80), status: z.string().max(40) }))
  .handler(async ({ data, context }) =>
    caseWrite(context.userId, (sql, author) => setCaseStatus(sql, data.caseId, data.status, author)),
  );

export const addCaseEntryFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      caseId: z.string().max(80),
      kind: z.enum(["note", "message"]),
      body: z.string().max(8000),
    }),
  )
  .handler(async ({ data, context }) =>
    caseWrite(context.userId, (sql, author) =>
      addCaseEntry(sql, data.caseId, { kind: data.kind, body: data.body }, author),
    ),
  );

/** The exact email to the vendor. Sends nothing. */
export const previewVendorNoticeFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(caseIdInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return previewVendorNotice(await deskSql(), data.caseId, SITE_URL);
  });

export const sendVendorNoticeFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(caseIdInput)
  .handler(async ({ data, context }) => {
    let result = { ok: false, error: "" };
    const desk = await caseWrite(context.userId, async (sql, author) => {
      result = await sendVendorNotice(sql, {
        caseId: data.caseId,
        author,
        siteUrl: SITE_URL,
        send: deskMail,
      });
    });
    return { desk, result };
  });

export const addCommitteePersonFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().max(200), email: z.string().max(240) }))
  .handler(async ({ data, context }) =>
    caseWrite(context.userId, (sql) => addCommitteePerson(sql, data)),
  );

export const setCommitteeActiveFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ personId: z.string().max(80), active: z.boolean() }))
  .handler(async ({ data, context }) =>
    caseWrite(context.userId, (sql) => setCommitteeActive(sql, data.personId, data.active)),
  );

export const assignMediatorsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ caseId: z.string().max(80), personIds: z.array(z.string()).min(1).max(20) }))
  .handler(async ({ data, context }) =>
    caseWrite(context.userId, (sql, author) =>
      assignMediators(sql, data.caseId, data.personIds, author),
    ),
  );

export const previewMediatorNoticeFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(caseIdInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return previewMediatorNotice(await deskSql(), data.caseId, SITE_URL);
  });

export const sendMediatorLinksFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ caseId: z.string().max(80), personIds: z.array(z.string()).min(1).max(20) }))
  .handler(async ({ data, context }) => {
    let result: MediatorSendResult = { sent: [], failed: [] };
    const desk = await caseWrite(context.userId, async (sql, author) => {
      result = await sendMediatorLinks(sql, {
        caseId: data.caseId,
        personIds: data.personIds,
        author,
        siteUrl: SITE_URL,
        send: deskMail,
      });
    });
    return { desk, result };
  });

export const decideCaseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      caseId: z.string().max(80),
      finding: z.string().max(40),
      remedyKind: z.string().max(40),
      remedyText: z.string().max(2000).optional().default(""),
      remedyDue: z.string().max(20).optional().default(""),
      consequence: z.string().max(40),
      note: z.string().max(4000).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) =>
    caseWrite(context.userId, (sql, author) => {
      const { caseId, ...decision } = data;
      return decideCase(sql, caseId, decision, { userId: context.userId, author });
    }),
  );

export const markRemedyFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ caseId: z.string().max(80), done: z.boolean() }))
  .handler(async ({ data, context }) =>
    caseWrite(context.userId, (sql, author) => markRemedy(sql, data.caseId, data.done, author)),
  );

/** One click: the vendor's standing steps up one level, recorded on the case. */
export const escalateCaseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(caseIdInput)
  .handler(async ({ data, context }) =>
    caseWrite(context.userId, (sql, author) => escalateCase(sql, data.caseId, author)),
  );

export const previewChurchDecisionFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(caseIdInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return previewChurchDecision(await deskSql(), data.caseId);
  });

export const sendChurchDecisionFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(caseIdInput)
  .handler(async ({ data, context }) => {
    let result = { ok: false, error: "" };
    const desk = await caseWrite(context.userId, async (sql, author) => {
      result = await sendChurchDecision(sql, { caseId: data.caseId, author, send: deskMail });
    });
    return { desk, result };
  });

const vendorIdInput = z.object({ vendorId: z.string().max(80) });

export const previewCovenantLinkFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(vendorIdInput)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return previewCovenantLink(await deskSql(), data.vendorId, SITE_URL);
  });

export const sendCovenantLinkFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(vendorIdInput)
  .handler(async ({ data, context }) => {
    let result = { ok: false, error: "" };
    const desk = await caseWrite(context.userId, async (sql) => {
      result = await sendCovenantLink(sql, {
        vendorId: data.vendorId,
        userId: context.userId,
        siteUrl: SITE_URL,
        send: deskMail,
      });
    });
    return { desk, result };
  });

export type { CaseRow, CommitteePerson, MediatorSendResult } from "@/lib/case-store";
export type { CovenantLinkRow, InviteRow, SendInvitesResult, VendorRow } from "@/lib/vendor-store";

export type {
  BiddingItem,
  BuyingCatalogRead,
  PublicBookEntry,
  SourceBid,
  SourceDesk,
} from "@/lib/source-store";
