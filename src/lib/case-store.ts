import type { Sql } from "./db.ts";
import {
  TOKEN_SHAPE,
  cleanConsequence,
  hashInviteToken,
  newInviteToken,
  type SendMail,
  type VendorRow,
} from "./vendor-store.ts";
import {
  CONSEQUENCES,
  CONSEQUENCE_LABELS,
  COVENANT,
  VENDOR_TERMS_PATH,
  type Consequence,
} from "./vendor-terms.ts";

/**
 * Cases: a church reports a problem with a program vendor, United Under God
 * hears both sides, may appoint mediators, decides, and follows the remedy
 * through. The outcome is recorded on the vendor's standing.
 *
 * Imported by node's test runner: relative imports, no framework code. Mail is
 * passed in as a function, so nothing here sends on its own. Nothing here is
 * read by a public page; case details never leave the desk and the private
 * links.
 */

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

export const CASE_STATUSES = ["open", "waiting_vendor", "mediation", "decided", "closed"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  open: "Open",
  waiting_vendor: "Waiting on vendor",
  mediation: "In mediation",
  decided: "Decided",
  closed: "Closed",
};

export const FINDINGS = ["at_fault", "partly", "not_at_fault"] as const;
export type Finding = (typeof FINDINGS)[number];

export const FINDING_LABELS: Record<Finding, string> = {
  at_fault: "Vendor at fault",
  partly: "Vendor partly at fault",
  not_at_fault: "Vendor not at fault",
};

export const REMEDY_KINDS = ["none", "repair", "redo", "credit", "refund", "other"] as const;
export type RemedyKind = (typeof REMEDY_KINDS)[number];

export const REMEDY_LABELS: Record<RemedyKind, string> = {
  none: "No remedy owed",
  repair: "Repair",
  redo: "Redo the work",
  credit: "Credit",
  refund: "Refund of the disputed part",
  other: "Other",
};

/** Timeline entry kinds. A "note" is internal to the desk; mediators do not see it. */
export type CaseEventKind =
  | "report"
  | "vendor_notified"
  | "vendor_response"
  | "note"
  | "message"
  | "mediators"
  | "mediator_notified"
  | "recommendation"
  | "decision"
  | "remedy"
  | "escalation"
  | "church_told"
  | "status";

export const INTERNAL_EVENT_KINDS: CaseEventKind[] = ["note"];

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function todayIso(now = new Date()) {
  return isoDate(now);
}

/** The date `days` business days after `from` (Saturdays and Sundays skipped). */
export function addBusinessDays(from: Date, days: number): string {
  const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let left = days;
  while (left > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return isoDate(date);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// The church's report
// ---------------------------------------------------------------------------

/** The kinds of problem a church can pick. '' is "something else". */
export const PROBLEM_TYPES = ["", "price_not_honored"] as const;
export type ProblemType = (typeof PROBLEM_TYPES)[number];

export const PROBLEM_TYPE_LABELS: Record<ProblemType, string> = {
  "": "Something else",
  price_not_honored: "Program price not honored",
};

const REFERENCE = /^UUG-\d{4}-\d{4,}$/;

export type ReportInput = {
  /** '' or price_not_honored. */
  problemType?: string;
  /** The program reference the church gave the vendor, if any (UUG-2026-0142). */
  referenceCode?: string;
  churchName: string;
  contactName: string;
  email: string;
  phone: string;
  vendorId: string;
  purchase: string;
  purchasedOn: string;
  problem: string;
  wanted: string;
};

export type CleanReport = Omit<ReportInput, "problemType" | "referenceCode"> & {
  problemType: ProblemType;
  referenceCode: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function need(value: string | undefined, message: string, max: number) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) throw new Error(message);
  if (trimmed.length > max) throw new Error("That is too long to store. Please shorten it.");
  return trimmed;
}

/** Every report rule. Throws a sentence the church can act on. */
export function cleanReport(input: ReportInput): CleanReport {
  const churchName = need(input.churchName, "Enter your church’s name.", 160);
  const contactName = need(input.contactName, "Enter your name.", 120);
  const email = need(input.email, "Enter an email address.", 200).toLowerCase();
  if (!EMAIL.test(email)) throw new Error("Enter a working email address.");
  const phone = need(input.phone, "Enter a phone number.", 40);
  if ((phone.match(/\d/g) ?? []).length < 7) throw new Error("Enter a working phone number.");
  const vendorId = need(input.vendorId, "Pick the vendor you bought from.", 80);
  const purchase = need(input.purchase, "Tell us what you bought.", 400);
  const purchasedOn = need(input.purchasedOn, "Tell us about when you bought it.", 80);
  const problem = need(input.problem, "Tell us what went wrong.", 4000);
  const wanted = need(input.wanted, "Tell us what would make it right.", 2000);
  const problemType = (PROBLEM_TYPES as readonly string[]).includes(input.problemType ?? "")
    ? ((input.problemType ?? "") as ProblemType)
    : "";
  const referenceCode = (input.referenceCode ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (referenceCode && !REFERENCE.test(referenceCode)) {
    throw new Error("A program reference looks like UUG-2026-0142. Leave it blank if you do not have one.");
  }
  return {
    problemType,
    referenceCode,
    churchName,
    contactName,
    email,
    phone,
    vendorId,
    purchase,
    purchasedOn,
    problem,
    wanted,
  };
}

/** Program vendors a church can report: approved (including probation) or paused. Names only. */
export async function listReportVendors(sql: Sql): Promise<{ id: string; company: string }[]> {
  const rows = await sql<{ id: string; company: string }>`
    select id, company from source_vendors
    where status in ('approved', 'paused')
    order by lower(company)
  `;
  return rows.map((row) => ({ id: String(row.id), company: String(row.company) }));
}

/** Save a report as an open case, with the report as the first timeline entry. */
export async function createCase(
  sql: Sql,
  report: CleanReport,
  meta: { ip: string; now?: Date },
): Promise<{ id: string; vendorName: string }> {
  const vendors = await sql<{ company: string; status: string }>`
    select company, status from source_vendors where id = ${report.vendorId}
  `;
  const vendor = vendors[0];
  if (!vendor || (vendor.status !== "approved" && vendor.status !== "paused")) {
    throw new Error("Pick the vendor you bought from on the list.");
  }
  if (report.referenceCode) {
    const known = await sql`
      select id from source_buying_book where reference_code = ${report.referenceCode}
    `;
    if (!known[0]) {
      throw new Error(
        "We could not find that program reference. Check it against the catalog, or leave it blank.",
      );
    }
  }
  const id = crypto.randomUUID();
  const at = (meta.now ?? new Date()).toISOString();
  await sql`
    insert into source_cases (
      id, status, church_name, contact_name, email, phone, vendor_id, vendor_name,
      purchase, purchased_on, problem, wanted, report_ip, created_at, updated_at,
      problem_type, reference_code
    ) values (
      ${id}, ${"open"}, ${report.churchName}, ${report.contactName}, ${report.email},
      ${report.phone}, ${report.vendorId}, ${String(vendor.company)}, ${report.purchase},
      ${report.purchasedOn}, ${report.problem}, ${report.wanted}, ${meta.ip.slice(0, 80)},
      ${at}, ${at}, ${report.problemType}, ${report.referenceCode}
    )
  `;
  await addEvent(
    sql,
    id,
    "report",
    `Church: ${report.contactName}, ${report.churchName}`,
    reportBody(report),
    at,
  );
  return { id, vendorName: String(vendor.company) };
}

function reportBody(
  report: Pick<CleanReport, "purchase" | "purchasedOn" | "problem" | "wanted"> &
    Partial<Pick<CleanReport, "problemType" | "referenceCode">>,
) {
  return [
    report.problemType ? `Problem: ${PROBLEM_TYPE_LABELS[report.problemType]}` : "",
    report.referenceCode ? `Program reference: ${report.referenceCode}` : "",
    `What was bought: ${report.purchase}`,
    `When: ${report.purchasedOn}`,
    `What went wrong: ${report.problem}`,
    `What would make it right: ${report.wanted}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The owner's notice for a new report. */
export function reportNotice(
  report: CleanReport,
  meta: { id: string; vendorName: string; saved: boolean },
) {
  return {
    subject: `${meta.saved ? "" : "NOT SAVED: "}${report.problemType === "price_not_honored" ? "Program price not honored" : "Problem reported"} with ${meta.vendorName}: ${report.churchName}`,
    text: [
      meta.saved
        ? "A church reported a problem with a program vendor. It is a new open case on the desk: https://www.unitedundergod.org/buying/desk"
        : "A church reported a problem with a program vendor, but the case did not save. Everything they sent is below.",
      "",
      `Church: ${report.churchName}`,
      `Contact: ${report.contactName}`,
      `Email: ${report.email}`,
      `Phone: ${report.phone}`,
      `Vendor: ${meta.vendorName}`,
      "",
      reportBody(report),
      "",
      `Case id: ${meta.id}`,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Reading the desk
// ---------------------------------------------------------------------------

export type CaseEvent = {
  id: string;
  kind: CaseEventKind;
  author: string;
  body: string;
  createdAt: string;
};

export type CaseMediator = {
  id: string;
  personId: string;
  name: string;
  email: string;
  emailStatus: string;
  emailError: string;
  sentAt: string;
};

export type CommitteePerson = { id: string; name: string; email: string; active: boolean };

export type CaseRow = {
  id: string;
  status: CaseStatus;
  problemType: ProblemType;
  referenceCode: string;
  churchName: string;
  contactName: string;
  email: string;
  phone: string;
  vendorId: string;
  vendorName: string;
  purchase: string;
  purchasedOn: string;
  problem: string;
  wanted: string;
  vendorNotifiedAt: string;
  vendorResponseDue: string;
  vendorRespondedAt: string;
  finding: Finding | "";
  remedyKind: RemedyKind | "";
  remedyText: string;
  remedyDue: string;
  consequence: Consequence | "";
  decisionNote: string;
  decidedAt: string;
  remedyStatus: "" | "pending" | "done" | "not_done";
  remedyMarkedAt: string;
  churchToldAt: string;
  createdAt: string;
  events: CaseEvent[];
  mediators: CaseMediator[];
  /** Waiting on the vendor past the response date. */
  responseOverdue: boolean;
  /** The remedy was not done, or is still pending past its due date. */
  remedyOverdue: boolean;
};

function text(value: unknown) {
  return String(value ?? "");
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return value ? text(value) : "";
}

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  const raw = text(value);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : "";
}

export function isRemedyOverdue(
  row: Pick<CaseRow, "remedyStatus" | "remedyDue">,
  today: string,
): boolean {
  if (row.remedyStatus === "not_done") return true;
  return row.remedyStatus === "pending" && Boolean(row.remedyDue) && today > row.remedyDue;
}

export function isResponseOverdue(
  row: Pick<CaseRow, "status" | "vendorRespondedAt" | "vendorResponseDue">,
  today: string,
): boolean {
  return (
    row.status === "waiting_vendor" &&
    !row.vendorRespondedAt &&
    Boolean(row.vendorResponseDue) &&
    today > row.vendorResponseDue
  );
}

function mapCase(row: Record<string, unknown>, today: string): CaseRow {
  const base = {
    id: text(row.id),
    status: pick(row.status, CASE_STATUSES) || "open",
    problemType: pick(row.problem_type, PROBLEM_TYPES.filter(Boolean)) as ProblemType,
    referenceCode: text(row.reference_code),
    churchName: text(row.church_name),
    contactName: text(row.contact_name),
    email: text(row.email),
    phone: text(row.phone),
    vendorId: text(row.vendor_id),
    vendorName: text(row.vendor_name),
    purchase: text(row.purchase),
    purchasedOn: text(row.purchased_on),
    problem: text(row.problem),
    wanted: text(row.wanted),
    vendorNotifiedAt: iso(row.vendor_notified_at),
    vendorResponseDue: text(row.vendor_response_due),
    vendorRespondedAt: iso(row.vendor_responded_at),
    finding: pick(row.finding, FINDINGS),
    remedyKind: pick(row.remedy_kind, REMEDY_KINDS),
    remedyText: text(row.remedy_text),
    remedyDue: text(row.remedy_due),
    consequence: pick(row.consequence, CONSEQUENCES),
    decisionNote: text(row.decision_note),
    decidedAt: iso(row.decided_at),
    remedyStatus: pick(row.remedy_status, ["pending", "done", "not_done"] as const),
    remedyMarkedAt: iso(row.remedy_marked_at),
    churchToldAt: iso(row.church_told_at),
    createdAt: iso(row.created_at),
    events: [] as CaseEvent[],
    mediators: [] as CaseMediator[],
  };
  return {
    ...base,
    responseOverdue: isResponseOverdue(base, today),
    remedyOverdue: isRemedyOverdue(base, today),
  };
}

function mapEvent(row: Record<string, unknown>): CaseEvent {
  return {
    id: text(row.id),
    kind: text(row.kind) as CaseEventKind,
    author: text(row.author),
    body: text(row.body),
    createdAt: iso(row.created_at),
  };
}

export type CaseDesk = { cases: CaseRow[]; committee: CommitteePerson[] };

export async function readCases(sql: Sql, now = new Date()): Promise<CaseDesk> {
  const today = todayIso(now);
  const rows = await sql`select * from source_cases order by created_at desc`;
  const events = await sql`select * from source_case_events order by created_at, id`;
  const mediators = await sql`
    select m.*, c.name, c.email from source_case_mediators m
    join source_committee c on c.id = m.person_id
    order by m.assigned_at
  `;
  const committee = await sql`select * from source_committee order by lower(name)`;
  const cases = rows.map((row) => {
    const mapped = mapCase(row, today);
    mapped.events = events.filter((event) => text(event.case_id) === mapped.id).map(mapEvent);
    mapped.mediators = mediators
      .filter((m) => text(m.case_id) === mapped.id)
      .map((m) => ({
        id: text(m.id),
        personId: text(m.person_id),
        name: text(m.name),
        email: text(m.email),
        emailStatus: text(m.email_status),
        emailError: text(m.email_error),
        sentAt: iso(m.sent_at),
      }));
    return mapped;
  });
  return {
    cases,
    committee: committee.map((row) => ({
      id: text(row.id),
      name: text(row.name),
      email: text(row.email),
      active: row.active === true || row.active === "t" || row.active === "true",
    })),
  };
}

async function loadCase(sql: Sql, caseId: string, now = new Date()): Promise<CaseRow> {
  const rows = await sql`select * from source_cases where id = ${caseId}`;
  if (!rows[0]) throw new Error("That case is not on the desk.");
  return mapCase(rows[0], todayIso(now));
}

async function addEvent(
  sql: Sql,
  caseId: string,
  kind: CaseEventKind,
  author: string,
  body: string,
  at?: string,
) {
  const when = at ?? new Date().toISOString();
  await sql`
    insert into source_case_events (id, case_id, kind, author, body, created_at)
    values (${crypto.randomUUID()}, ${caseId}, ${kind}, ${author.slice(0, 200)}, ${body.slice(0, 8000)}, ${when})
  `;
  await sql`update source_cases set updated_at = now() where id = ${caseId}`;
}

// ---------------------------------------------------------------------------
// Status, notes, and messages
// ---------------------------------------------------------------------------

export async function setCaseStatus(sql: Sql, caseId: string, status: string, author: string) {
  const current = await loadCase(sql, caseId);
  if (!(CASE_STATUSES as readonly string[]).includes(status)) {
    throw new Error("A case is open, waiting on vendor, in mediation, decided, or closed.");
  }
  if (status === "decided" && !current.finding) {
    throw new Error("Record the decision to mark the case decided.");
  }
  if (status === current.status) return;
  await sql`update source_cases set status = ${status} where id = ${caseId}`;
  await addEvent(
    sql,
    caseId,
    "status",
    author,
    `Status: ${CASE_STATUS_LABELS[current.status]} → ${CASE_STATUS_LABELS[status as CaseStatus]}`,
  );
}

/** A note (internal to the desk) or a message (a record of what was said to someone). */
export async function addCaseEntry(
  sql: Sql,
  caseId: string,
  entry: { kind: "note" | "message"; body: string },
  author: string,
) {
  await loadCase(sql, caseId);
  const body = need(entry.body, "Write something first.", 8000);
  await addEvent(sql, caseId, entry.kind === "message" ? "message" : "note", author, body);
}

// ---------------------------------------------------------------------------
// Telling the vendor, and the vendor's response
// ---------------------------------------------------------------------------

export function caseLinkPath(caseId: string, token: string) {
  return `/buying/cases/${encodeURIComponent(caseId)}?t=${token}`;
}

export function mediatorLinkPath(caseId: string, token: string) {
  return `/buying/mediate/${encodeURIComponent(caseId)}?t=${token}`;
}

/** The email to the vendor. The desk shows this exact text before anything is sent. */
export function vendorNoticeEmail(args: {
  row: Pick<
    CaseRow,
    "churchName" | "contactName" | "purchase" | "purchasedOn" | "problem" | "wanted"
  > &
    Partial<Pick<CaseRow, "problemType" | "referenceCode">>;
  vendor: Pick<VendorRow, "company" | "contactName">;
  link: string;
  due: string;
  siteUrl: string;
  days?: number;
}) {
  const { row, vendor } = args;
  const days = args.days ?? COVENANT.responseBusinessDays;
  return {
    subject: `A church has raised a concern with ${vendor.company}`,
    text: [
      vendor.contactName ? `Hello ${vendor.contactName},` : "Hello,",
      "",
      `A church that bought from ${vendor.company} through the United Under God buying program has raised a concern. Under the Vendor Covenant, please respond within ${days} business ${days === 1 ? "day" : "days"}, by ${args.due}.`,
      "",
      `Church: ${row.churchName}`,
      `Contact: ${row.contactName}`,
      ...(row.problemType ? [`Problem: ${PROBLEM_TYPE_LABELS[row.problemType]}`] : []),
      ...(row.referenceCode ? [`Program reference: ${row.referenceCode}`] : []),
      `What was bought: ${row.purchase}`,
      `When: ${row.purchasedOn}`,
      "",
      "What went wrong, in the church's words:",
      row.problem,
      "",
      "What would make it right, in the church's words:",
      row.wanted,
      "",
      "Respond here (this link is only for you):",
      args.link,
      "",
      "Tell us what happened from your side and what you will do to make it right. If you and the church settle it directly, tell us that too.",
      "",
      "If you and the church cannot settle it, United Under God will hear both sides and decide, as the covenant sets out.",
      `Vendor Covenant: ${args.siteUrl}${VENDOR_TERMS_PATH}`,
      "",
      "United Under God, Inc.",
    ].join("\n"),
  };
}

async function loadVendor(sql: Sql, vendorId: string) {
  const rows = await sql`select * from source_vendors where id = ${vendorId}`;
  const row = rows[0];
  if (!row) throw new Error("That vendor is not on the list.");
  return {
    id: text(row.id),
    company: text(row.company),
    contactName: text(row.contact_name),
    email: text(row.email),
    status: text(row.status),
    consequence: cleanConsequence(text(row.consequence)),
  };
}

export async function previewVendorNotice(
  sql: Sql,
  caseId: string,
  siteUrl: string,
  now = new Date(),
) {
  const row = await loadCase(sql, caseId, now);
  const vendor = await loadVendor(sql, row.vendorId);
  const due = addBusinessDays(now, COVENANT.responseBusinessDays);
  return {
    to: vendor.email,
    email: vendorNoticeEmail({
      row,
      vendor,
      link: `${siteUrl}/buying/cases/${row.id}?t=(a private link for this vendor)`,
      due,
      siteUrl,
    }),
  };
}

async function deliver(send: SendMail, to: string, email: { subject: string; text: string }) {
  let outcome: { ok: boolean; error: string };
  try {
    outcome = await send({ to, subject: email.subject, text: email.text });
  } catch {
    outcome = { ok: false, error: "send failed" };
  }
  return outcome.ok
    ? { ok: true, error: "" }
    : {
        ok: false,
        error: (outcome.error || "mail is not set up (no RESEND_API_KEY)").slice(0, 500),
      };
}

/**
 * Email the vendor the church's concern with a fresh private link (only its
 * hash is stored) and the response date. The case waits on the vendor.
 */
export async function sendVendorNotice(
  sql: Sql,
  args: { caseId: string; author: string; siteUrl: string; send: SendMail; now?: Date },
): Promise<{ ok: boolean; error: string }> {
  const now = args.now ?? new Date();
  const row = await loadCase(sql, args.caseId, now);
  if (row.status === "closed") throw new Error("This case is closed.");
  const vendor = await loadVendor(sql, row.vendorId);
  const token = newInviteToken();
  const due = addBusinessDays(now, COVENANT.responseBusinessDays);
  const email = vendorNoticeEmail({
    row,
    vendor,
    link: `${args.siteUrl}${caseLinkPath(row.id, token)}`,
    due,
    siteUrl: args.siteUrl,
  });
  const outcome = await deliver(args.send, vendor.email, email);
  if (!outcome.ok) {
    await addEvent(
      sql,
      row.id,
      "vendor_notified",
      args.author,
      `Email to ${vendor.email} not sent: ${outcome.error}`,
    );
    return outcome;
  }
  await sql`
    update source_cases set
      vendor_token_hash = ${await hashInviteToken(token)},
      vendor_notified_at = ${now.toISOString()},
      vendor_response_due = ${due},
      status = ${row.status === "open" ? "waiting_vendor" : row.status}
    where id = ${row.id}
  `;
  await addEvent(
    sql,
    row.id,
    "vendor_notified",
    args.author,
    `Emailed ${vendor.company} (${vendor.email}) the church's concern. Response due by ${due}.`,
    now.toISOString(),
  );
  return outcome;
}

export type VendorCaseView =
  | { state: "denied" }
  | { state: "closed"; vendor: string }
  | {
      state: "open";
      vendor: string;
      due: string;
      report: Pick<
        CaseRow,
        | "churchName"
        | "contactName"
        | "purchase"
        | "purchasedOn"
        | "problem"
        | "wanted"
        | "createdAt"
      >;
      responses: { body: string; createdAt: string }[];
    };

async function caseByVendorToken(sql: Sql, caseId: string, token: string) {
  if (!caseId || !token || !TOKEN_SHAPE.test(token)) return null;
  const tokenHash = await hashInviteToken(token);
  const rows = await sql`
    select * from source_cases where id = ${caseId} and vendor_token_hash = ${tokenHash}
  `;
  return rows[0] ? mapCase(rows[0], todayIso()) : null;
}

/** What the vendor's link shows. A wrong or missing token sees nothing of the case. */
export async function readVendorCase(
  sql: Sql,
  caseId: string,
  token: string,
): Promise<VendorCaseView> {
  const row = await caseByVendorToken(sql, caseId, token);
  if (!row) return { state: "denied" };
  if (row.status === "closed") return { state: "closed", vendor: row.vendorName };
  const responses = await sql`
    select body, created_at from source_case_events
    where case_id = ${row.id} and kind = 'vendor_response' order by created_at
  `;
  return {
    state: "open",
    vendor: row.vendorName,
    due: row.vendorResponseDue,
    report: {
      churchName: row.churchName,
      contactName: row.contactName,
      purchase: row.purchase,
      purchasedOn: row.purchasedOn,
      problem: row.problem,
      wanted: row.wanted,
      createdAt: row.createdAt,
    },
    responses: responses.map((event) => ({
      body: text(event.body),
      createdAt: iso(event.created_at),
    })),
  };
}

export async function submitVendorResponse(
  sql: Sql,
  input: { caseId: string; token: string; body: string },
): Promise<{ vendor: string; churchName: string }> {
  const row = await caseByVendorToken(sql, input.caseId, input.token);
  if (!row) throw new Error("This link is not valid for this case.");
  if (row.status === "closed") throw new Error("This case is closed.");
  const body = need(input.body, "Write your response first.", 8000);
  const count = await sql<{ n: number }>`
    select count(*)::int as n from source_case_events
    where case_id = ${row.id} and kind = 'vendor_response'
  `;
  if (Number(count[0]?.n ?? 0) >= 20) throw new Error("Reply to the email to add more.");
  await addEvent(sql, row.id, "vendor_response", `Vendor: ${row.vendorName}`, body);
  if (!row.vendorRespondedAt) {
    await sql`update source_cases set vendor_responded_at = now() where id = ${row.id}`;
  }
  return { vendor: row.vendorName, churchName: row.churchName };
}

// ---------------------------------------------------------------------------
// Committee and mediators
// ---------------------------------------------------------------------------

export async function addCommitteePerson(sql: Sql, input: { name: string; email: string }) {
  const name = need(input.name, "Enter the mediator's name.", 120);
  const email = need(input.email, "Enter the mediator's email.", 200).toLowerCase();
  if (!EMAIL.test(email)) throw new Error("Enter a working email address.");
  const existing = await sql<{ id: string }>`
    select id from source_committee where lower(email) = ${email}
  `;
  if (existing[0]) {
    await sql`update source_committee set name = ${name}, active = true where id = ${existing[0].id}`;
    return existing[0].id;
  }
  const id = crypto.randomUUID();
  await sql`insert into source_committee (id, name, email) values (${id}, ${name}, ${email})`;
  return id;
}

export async function setCommitteeActive(sql: Sql, personId: string, active: boolean) {
  await sql`update source_committee set active = ${active} where id = ${personId}`;
}

/** Choose mediators for a case from the committee list. The case moves to mediation. */
export async function assignMediators(
  sql: Sql,
  caseId: string,
  personIds: string[],
  author: string,
) {
  const row = await loadCase(sql, caseId);
  if (row.status === "closed") throw new Error("This case is closed.");
  const people = await sql<{ id: string; name: string; active: unknown }>`
    select id, name, active from source_committee
  `;
  const added: string[] = [];
  for (const personId of [...new Set(personIds)]) {
    const person = people.find((p) => p.id === personId);
    if (!person || !(person.active === true || person.active === "t")) {
      throw new Error("Pick mediators from the committee list.");
    }
    const inserted = await sql<{ id: string }>`
      insert into source_case_mediators (id, case_id, person_id, assigned_by)
      values (${crypto.randomUUID()}, ${caseId}, ${personId}, ${author.slice(0, 200)})
      on conflict (case_id, person_id) do nothing
      returning id
    `;
    if (inserted[0]) added.push(person.name);
  }
  if (added.length === 0) return;
  if (row.status === "open" || row.status === "waiting_vendor") {
    await sql`update source_cases set status = 'mediation' where id = ${caseId}`;
  }
  await addEvent(sql, caseId, "mediators", author, `Mediators assigned: ${added.join(", ")}.`);
}

/** The email to a mediator. The desk shows this exact text before anything is sent. */
export function mediatorEmail(args: {
  row: Pick<CaseRow, "churchName" | "vendorName" | "purchase">;
  name: string;
  link: string;
}) {
  return {
    subject: `A case to mediate: ${args.row.churchName} and ${args.row.vendorName}`,
    text: [
      args.name ? `Hello ${args.name},` : "Hello,",
      "",
      `Thank you for helping United Under God hear a concern a church raised with a vendor in the buying program. ${args.row.churchName} bought ${args.row.purchase} from ${args.row.vendorName}, and the two have not settled it.`,
      "",
      "Read the church's report, the vendor's response, and the record so far, and add your recommendation here (this link is only for you):",
      args.link,
      "",
      "Please keep the details of the case private. United Under God records the final decision.",
      "",
      "United Under God, Inc.",
    ].join("\n"),
  };
}

export async function previewMediatorNotice(sql: Sql, caseId: string, siteUrl: string) {
  const row = await loadCase(sql, caseId);
  return mediatorEmail({
    row,
    name: "(each mediator's name)",
    link: `${siteUrl}/buying/mediate/${row.id}?t=(a private link for each mediator)`,
  });
}

export type MediatorSendResult = {
  sent: string[];
  failed: { personId: string; error: string }[];
};

/** Send each chosen mediator a fresh private link. Only the hash is stored. */
export async function sendMediatorLinks(
  sql: Sql,
  args: { caseId: string; personIds: string[]; author: string; siteUrl: string; send: SendMail },
): Promise<MediatorSendResult> {
  const row = await loadCase(sql, args.caseId);
  if (row.status === "closed") throw new Error("This case is closed.");
  const assigned = await sql<{ id: string; person_id: string; name: string; email: string }>`
    select m.id, m.person_id, c.name, c.email from source_case_mediators m
    join source_committee c on c.id = m.person_id
    where m.case_id = ${row.id}
  `;
  const result: MediatorSendResult = { sent: [], failed: [] };
  for (const personId of [...new Set(args.personIds)]) {
    const mediator = assigned.find((m) => m.person_id === personId);
    if (!mediator) {
      result.failed.push({ personId, error: "not assigned to this case" });
      continue;
    }
    const token = newInviteToken();
    const email = mediatorEmail({
      row,
      name: mediator.name,
      link: `${args.siteUrl}${mediatorLinkPath(row.id, token)}`,
    });
    const outcome = await deliver(args.send, mediator.email, email);
    if (outcome.ok) {
      await sql`
        update source_case_mediators set token_hash = ${await hashInviteToken(token)},
          email_status = 'sent', email_error = '', sent_at = now()
        where id = ${mediator.id}
      `;
      result.sent.push(personId);
      await addEvent(
        sql,
        row.id,
        "mediator_notified",
        args.author,
        `Sent ${mediator.name} (${mediator.email}) a private link to the case.`,
      );
    } else {
      await sql`
        update source_case_mediators set email_status = 'failed', email_error = ${outcome.error}
        where id = ${mediator.id}
      `;
      result.failed.push({ personId, error: outcome.error });
    }
  }
  return result;
}

export type MediatorCaseView =
  | { state: "denied" }
  | {
      state: "open";
      mediator: string;
      canRecommend: boolean;
      report: Pick<
        CaseRow,
        | "churchName"
        | "contactName"
        | "vendorName"
        | "purchase"
        | "purchasedOn"
        | "problem"
        | "wanted"
        | "createdAt"
        | "status"
      >;
      timeline: Omit<CaseEvent, "id">[];
    };

async function mediatorByToken(sql: Sql, caseId: string, token: string) {
  if (!caseId || !token || !TOKEN_SHAPE.test(token)) return null;
  const tokenHash = await hashInviteToken(token);
  const rows = await sql<{ name: string; case_id: string }>`
    select c.name, m.case_id from source_case_mediators m
    join source_committee c on c.id = m.person_id
    where m.token_hash = ${tokenHash} and m.case_id = ${caseId}
  `;
  return rows[0] ?? null;
}

/** What a mediator's link shows: the case without the desk's internal notes. */
export async function readMediatorCase(
  sql: Sql,
  caseId: string,
  token: string,
): Promise<MediatorCaseView> {
  const mediator = await mediatorByToken(sql, caseId, token);
  if (!mediator) return { state: "denied" };
  const row = await loadCase(sql, caseId);
  const events = await sql`
    select * from source_case_events where case_id = ${caseId} order by created_at, id
  `;
  return {
    state: "open",
    mediator: text(mediator.name),
    canRecommend: row.status !== "decided" && row.status !== "closed",
    report: {
      churchName: row.churchName,
      contactName: row.contactName,
      vendorName: row.vendorName,
      purchase: row.purchase,
      purchasedOn: row.purchasedOn,
      problem: row.problem,
      wanted: row.wanted,
      createdAt: row.createdAt,
      status: row.status,
    },
    timeline: events
      .map(mapEvent)
      .filter((event) => !INTERNAL_EVENT_KINDS.includes(event.kind))
      .map(({ kind, author, body, createdAt }) => ({ kind, author, body, createdAt })),
  };
}

export async function submitRecommendation(
  sql: Sql,
  input: { caseId: string; token: string; body: string },
): Promise<{ mediator: string; churchName: string; vendorName: string }> {
  const mediator = await mediatorByToken(sql, input.caseId, input.token);
  if (!mediator) throw new Error("This link is not valid for this case.");
  const row = await loadCase(sql, input.caseId);
  if (row.status === "decided" || row.status === "closed") {
    throw new Error("This case has been decided. Thank you for your help.");
  }
  const body = need(input.body, "Write your recommendation first.", 8000);
  await addEvent(sql, row.id, "recommendation", `Mediator: ${text(mediator.name)}`, body);
  return { mediator: text(mediator.name), churchName: row.churchName, vendorName: row.vendorName };
}

// ---------------------------------------------------------------------------
// The decision, its consequence, and follow-through
// ---------------------------------------------------------------------------

export type DecisionInput = {
  finding: string;
  remedyKind: string;
  remedyText?: string;
  remedyDue?: string;
  consequence: string;
  note?: string;
};

export type CleanDecision = {
  finding: Finding;
  remedyKind: RemedyKind;
  remedyText: string;
  remedyDue: string;
  consequence: Consequence;
  note: string;
};

export function cleanDecision(input: DecisionInput): CleanDecision {
  const finding = pick(input.finding, FINDINGS);
  if (!finding) throw new Error("Choose the finding: at fault, partly at fault, or not at fault.");
  const remedyKind = pick(input.remedyKind, REMEDY_KINDS);
  if (!remedyKind) throw new Error("Choose the remedy owed, or no remedy.");
  const remedyText = (input.remedyText ?? "").trim().slice(0, 2000);
  const remedyDue = (input.remedyDue ?? "").trim();
  if (remedyKind !== "none") {
    if (!DATE.test(remedyDue)) throw new Error("Set the date the remedy is due.");
    if (remedyKind === "other" && !remedyText) throw new Error("Describe the remedy owed.");
  }
  if (finding === "not_at_fault" && remedyKind !== "none") {
    throw new Error("A vendor found not at fault owes no remedy.");
  }
  const consequence = pick(input.consequence, CONSEQUENCES);
  if (!consequence) throw new Error("Choose the standing consequence, or none.");
  if (finding === "not_at_fault" && consequence !== "none") {
    throw new Error("A vendor found not at fault gets no consequence.");
  }
  return {
    finding,
    remedyKind,
    remedyText,
    remedyDue: remedyKind === "none" ? "" : remedyDue,
    consequence,
    note: (input.note ?? "").trim().slice(0, 4000),
  };
}

export function describeRemedy(
  row: Pick<CleanDecision, "remedyKind" | "remedyText" | "remedyDue">,
) {
  if (row.remedyKind === "none") return REMEDY_LABELS.none;
  const what = [REMEDY_LABELS[row.remedyKind], row.remedyText].filter(Boolean).join(": ");
  return row.remedyDue ? `${what} (due by ${row.remedyDue})` : what;
}

/**
 * Record a consequence on the vendor's standing. Suspension pauses the
 * vendor (no invitations, no catalog listing); revocation removes it. A
 * warning or probation leaves its status as it is.
 */
async function applyConsequence(
  sql: Sql,
  vendorId: string,
  consequence: Consequence,
  caseId: string,
) {
  if (consequence === "none") return;
  await sql`
    update source_vendors set
      consequence = ${consequence}, consequence_case_id = ${caseId}, consequence_at = now(),
      updated_at = now()
    where id = ${vendorId}
  `;
  if (consequence === "suspension") {
    await sql`update source_vendors set status = 'paused' where id = ${vendorId} and status <> 'removed'`;
  }
  if (consequence === "revocation") {
    await sql`update source_vendors set status = 'removed' where id = ${vendorId}`;
  }
}

export async function decideCase(
  sql: Sql,
  caseId: string,
  input: DecisionInput,
  args: { userId: string; author: string; now?: Date },
) {
  const row = await loadCase(sql, caseId);
  if (row.status === "closed") throw new Error("This case is closed.");
  const decision = cleanDecision(input);
  const at = (args.now ?? new Date()).toISOString();
  await sql`
    update source_cases set
      status = 'decided',
      finding = ${decision.finding},
      remedy_kind = ${decision.remedyKind},
      remedy_text = ${decision.remedyText},
      remedy_due = ${decision.remedyDue},
      consequence = ${decision.consequence},
      decision_note = ${decision.note},
      decided_by = ${args.userId},
      decided_at = ${at},
      remedy_status = ${decision.remedyKind === "none" ? "" : "pending"},
      remedy_marked_at = null
    where id = ${caseId}
  `;
  await applyConsequence(sql, row.vendorId, decision.consequence, caseId);
  await addEvent(
    sql,
    caseId,
    "decision",
    args.author,
    [
      `${row.finding ? "Decision changed. " : ""}Finding: ${FINDING_LABELS[decision.finding]}.`,
      `Remedy: ${describeRemedy(decision)}.`,
      `Standing: ${CONSEQUENCE_LABELS[decision.consequence]}.`,
      decision.note ? `Reasons: ${decision.note}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    at,
  );
}

/** Mark the remedy done or not done. */
export async function markRemedy(
  sql: Sql,
  caseId: string,
  done: boolean,
  author: string,
  now = new Date(),
) {
  const row = await loadCase(sql, caseId, now);
  if (!row.finding) throw new Error("Record the decision first.");
  if (!row.remedyKind || row.remedyKind === "none")
    throw new Error("No remedy is owed on this case.");
  await sql`
    update source_cases set
      remedy_status = ${done ? "done" : "not_done"}, remedy_marked_at = ${now.toISOString()}
    where id = ${caseId}
  `;
  const late = done && row.remedyDue && todayIso(now) > row.remedyDue;
  await addEvent(
    sql,
    caseId,
    "remedy",
    author,
    done
      ? `Remedy done${late ? ` (after the due date, ${row.remedyDue})` : ""}.`
      : "Remedy not done.",
    now.toISOString(),
  );
}

/** The next consequence up the ladder. */
export function nextConsequence(current: Consequence): Consequence | null {
  const index = CONSEQUENCES.indexOf(current);
  return index >= 0 && index < CONSEQUENCES.length - 1 ? CONSEQUENCES[index + 1]! : null;
}

/**
 * One click: step the vendor's standing up one level above the stronger of
 * this case's consequence and the vendor's current one, and record it.
 */
export async function escalateCase(sql: Sql, caseId: string, author: string) {
  const row = await loadCase(sql, caseId);
  if (!row.finding) throw new Error("Record the decision before escalating.");
  if (row.finding === "not_at_fault") throw new Error("The vendor was found not at fault.");
  const vendor = await loadVendor(sql, row.vendorId);
  const caseLevel = CONSEQUENCES.indexOf(row.consequence || "none");
  const vendorLevel = CONSEQUENCES.indexOf(vendor.consequence);
  const from = CONSEQUENCES[Math.max(caseLevel, vendorLevel)]!;
  const next = nextConsequence(from);
  if (!next) throw new Error("This vendor is already revoked from the program.");
  await sql`update source_cases set consequence = ${next}, status = 'decided' where id = ${caseId}`;
  await applyConsequence(sql, row.vendorId, next, caseId);
  await addEvent(
    sql,
    caseId,
    "escalation",
    author,
    `Escalated: ${CONSEQUENCE_LABELS[from]} → ${CONSEQUENCE_LABELS[next]}.${row.remedyOverdue ? " The remedy was not done by its due date." : ""}`,
  );
  return next;
}

// ---------------------------------------------------------------------------
// Telling the church the decision
// ---------------------------------------------------------------------------

function findingSentence(finding: Finding, vendor: string) {
  if (finding === "at_fault") return `We found that ${vendor} was at fault.`;
  if (finding === "partly") return `We found that ${vendor} was partly at fault.`;
  return `We found that ${vendor} was not at fault.`;
}

/** The decision email to the church. The desk shows this exact text before anything is sent. */
export function churchDecisionEmail(
  row: Pick<
    CaseRow,
    | "churchName"
    | "contactName"
    | "vendorName"
    | "purchase"
    | "finding"
    | "remedyKind"
    | "remedyText"
    | "remedyDue"
    | "decisionNote"
    | "mediators"
  >,
) {
  if (!row.finding) throw new Error("Record the decision first.");
  const remedyKind = row.remedyKind || "none";
  // "Co." at the end of a sentence must not become "Co.."
  const plain = row.vendorName.replace(/\.$/, "");
  const heard = row.mediators.length
    ? `We heard from you, from ${row.vendorName}, and from the mediators who reviewed the case.`
    : `We heard from you and from ${plain}.`;
  return {
    subject: `Our decision on your concern with ${row.vendorName}`,
    text: [
      row.contactName ? `Hello ${row.contactName},` : "Hello,",
      "",
      `Thank you for telling us about the problem with ${row.purchase} from ${plain}. ${heard}`,
      "",
      findingSentence(row.finding, row.vendorName),
      remedyKind === "none"
        ? "No remedy is owed."
        : `${row.vendorName} owes this remedy: ${describeRemedy({ remedyKind, remedyText: row.remedyText, remedyDue: row.remedyDue })}.`,
      row.decisionNote ? `\n${row.decisionNote}` : "",
      "",
      remedyKind === "none"
        ? "The outcome is recorded on the vendor's standing in the buying program."
        : `If it is not carried out by ${row.remedyDue}, reply to this email and we will follow it through. The outcome is recorded on the vendor's standing in the buying program.`,
      "",
      "This decision is about the vendor's place in the United Under God buying program. It is not legal advice.",
      "",
      "United Under God, Inc.",
    ]
      .filter((line, index, all) => line !== "" || all[index - 1] !== "")
      .join("\n"),
  };
}

export async function previewChurchDecision(sql: Sql, caseId: string) {
  const { cases } = await readCases(sql);
  const row = cases.find((c) => c.id === caseId);
  if (!row) throw new Error("That case is not on the desk.");
  return { to: row.email, email: churchDecisionEmail(row) };
}

export async function sendChurchDecision(
  sql: Sql,
  args: { caseId: string; author: string; send: SendMail; now?: Date },
): Promise<{ ok: boolean; error: string }> {
  const { cases } = await readCases(sql, args.now);
  const row = cases.find((c) => c.id === args.caseId);
  if (!row) throw new Error("That case is not on the desk.");
  const email = churchDecisionEmail(row);
  const outcome = await deliver(args.send, row.email, email);
  if (outcome.ok) {
    await sql`update source_cases set church_told_at = now() where id = ${row.id}`;
  }
  await addEvent(
    sql,
    row.id,
    "church_told",
    args.author,
    outcome.ok
      ? `Emailed the decision to ${row.contactName} (${row.email}).`
      : `Decision email to ${row.email} not sent: ${outcome.error}`,
  );
  return outcome;
}

// ---------------------------------------------------------------------------
// Vendor standing
// ---------------------------------------------------------------------------

export type VendorStanding = {
  covenantVersion: string;
  needsCovenant: boolean;
  openCases: number;
  decidedAgainst: number;
  remediesOnTime: number;
  remediesOwed: number;
  overdue: number;
  consequence: Consequence;
};

export function vendorStanding(
  vendor: Pick<VendorRow, "id" | "termsVersion" | "needsCovenant" | "consequence">,
  cases: CaseRow[],
): VendorStanding {
  const mine = cases.filter((row) => row.vendorId === vendor.id);
  const against = mine.filter((row) => row.finding === "at_fault" || row.finding === "partly");
  const owed = against.filter((row) => row.remedyKind && row.remedyKind !== "none");
  return {
    covenantVersion: vendor.termsVersion,
    needsCovenant: vendor.needsCovenant,
    openCases: mine.filter((row) => row.status !== "decided" && row.status !== "closed").length,
    decidedAgainst: against.length,
    remediesOwed: owed.length,
    remediesOnTime: owed.filter(
      (row) =>
        row.remedyStatus === "done" &&
        (!row.remedyDue || row.remedyMarkedAt.slice(0, 10) <= row.remedyDue),
    ).length,
    overdue: mine.filter((row) => row.remedyOverdue).length,
    consequence: vendor.consequence,
  };
}
