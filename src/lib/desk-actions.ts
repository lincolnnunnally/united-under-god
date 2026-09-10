import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSessionUser } from "@/lib/auth/verify.server";
import { sendDeskEmails } from "@/lib/desk-mail.server";
import {
  DASHBOARD_ORIGIN,
  PUBLIC_URL,
  forwardInquiryToDashboard,
  readOpsStats,
  reportingArmed,
  type OpsStats,
} from "@/lib/ops-report.server";
import {
  SUPER_EMAILS,
  coversKind,
  inquiryBody,
  inquirySubject,
  kindsFromSubmission,
  routeRecipients,
  type InquiryInput,
} from "@/lib/desk";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  kinds: string;
  pickup: boolean;
  active: boolean;
};

export type RouteRow = {
  id: string;
  email: string;
  kinds: string;
  role: string;
  label: string;
};

export type InquiryRow = {
  id: string;
  kind: string;
  kinds: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  city: string;
  address: string;
  message: string;
  details: string;
  status: string;
  assigned_to: string | null;
  scheduled_for: string;
  created_at: string;
  assigned_name: string | null;
  assigned_email: string | null;
};

export type DeskMe = {
  userId: string;
  email: string | null;
  staff: StaffRow | null;
  isSuper: boolean;
};

const inquiryInput = z.object({
  intent: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional().default(""),
  organization: z.string().optional().default(""),
  orgType: z.string().optional().default(""),
  city: z.string().optional().default(""),
  address: z.string().optional().default(""),
  message: z.string().optional().default(""),
  poundsPerWeek: z.string().optional().default(""),
  pickupDay: z.string().optional().default(""),
  pickupWindow: z.string().optional().default(""),
  destination: z.string().optional().default(""),
  categories: z.string().optional().default(""),
  vehicle: z.string().optional().default(""),
  helpers: z.string().optional().default(""),
  hp: z.string().optional().default(""),
});

function asBool(value: unknown) {
  return value === true || value === "t" || value === "true";
}

function mapStaff(row: Record<string, unknown>): StaffRow {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role),
    kinds: String(row.kinds),
    pickup: asBool(row.pickup),
    active: asBool(row.active),
  };
}

async function loadDesk() {
  const sql = await getSql();
  const staff = (await sql`select * from staff order by name`).map(mapStaff);
  const routes = (await sql`select * from notify_routes order by created_at`).map(
    (row): RouteRow => ({
      id: String(row.id),
      email: String(row.email),
      kinds: String(row.kinds),
      role: String(row.role),
      label: String(row.label ?? ""),
    }),
  );
  return { sql, staff, routes };
}

async function requireDeskStaff(userId: string): Promise<DeskMe> {
  const sql = await getSql();
  const users = await sql<{ email: string }>`select email from "user" where id = ${userId}`;
  const session = await getSessionUser();
  const email = (
    users[0]?.email ||
    session?.email ||
    ""
  )
    .trim()
    .toLowerCase() || null;
  let staffRow: StaffRow | null = null;
  if (email) {
    const rows = await sql`select * from staff where lower(email) = ${email} and active = true`;
    if (rows[0]) {
      staffRow = mapStaff(rows[0]);
      if (!rows[0].user_id) {
        await sql`update staff set user_id = ${userId} where id = ${staffRow.id}`;
      }
    }
  }
  if (!staffRow) {
    const rows = await sql`select * from staff where user_id = ${userId} and active = true`;
    if (rows[0]) staffRow = mapStaff(rows[0]);
  }
  const isSuper =
    staffRow?.role === "super" ||
    (!!email && SUPER_EMAILS.includes(email));
  const isStaff = Boolean(staffRow) || isSuper;
  if (!isStaff) {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return {
    userId,
    email,
    staff: staffRow,
    isSuper,
  };
}

async function notifyInquiry(inquiry: InquiryRow, extra?: string[]) {
  const { staff, routes } = await loadDesk();
  const kinds = inquiry.kinds.split(",").map((s) => s.trim()).filter(Boolean);
  const to = routeRecipients({
    kinds,
    routes,
    staff,
    assignedEmail: extra?.[0] ? extra[0] : inquiry.assigned_email || undefined,
  });
  for (const email of extra ?? []) to.push(email);
  return sendDeskEmails({
    inquiryId: inquiry.id,
    to,
    subject: inquirySubject(inquiry.kind, inquiry.name),
    text: inquiryBody({
      ...inquiry,
      assigned_name: inquiry.assigned_name ?? undefined,
    }),
  });
}

export const submitInquiry = createServerFn({ method: "POST" })
  .validator(inquiryInput)
  .handler(async ({ data, context }) => {
    if (data.hp) return { ok: true as const, id: "ignored" };
    const name = data.name.trim();
    const email = data.email.trim();
    if (!name) return { ok: false as const, error: "A name lets us follow up." };
    if (!email && !data.phone.trim()) {
      return { ok: false as const, error: "A name and a way to reach you." };
    }
    const kinds = kindsFromSubmission(data.intent, data.categories ?? "");
    const kind = kinds[0];
    const id = crypto.randomUUID();
    const details = JSON.stringify({
      orgType: data.orgType ?? "",
      poundsPerWeek: data.poundsPerWeek ?? "",
      pickupDay: data.pickupDay ?? "",
      pickupWindow: data.pickupWindow ?? "",
      destination: data.destination ?? "",
      categories: data.categories ?? "",
      vehicle: data.vehicle ?? "",
      helpers: data.helpers ?? "",
    });
    const sql = await getSql();
    await sql`
      insert into inquiries (
        id, kind, kinds, name, email, phone, organization, city, address, message, details
      ) values (
        ${id},
        ${kind},
        ${kinds.join(", ")},
        ${name},
        ${email},
        ${(data.phone ?? "").trim()},
        ${(data.organization ?? "").trim()},
        ${(data.city ?? "").trim()},
        ${(data.address ?? "").trim()},
        ${(data.message ?? "").trim()},
        ${details}
      )
    `;
    const inquiry: InquiryRow = {
      id,
      kind,
      kinds: kinds.join(", "),
      name,
      email,
      phone: (data.phone ?? "").trim(),
      organization: (data.organization ?? "").trim(),
      city: (data.city ?? "").trim(),
      address: (data.address ?? "").trim(),
      message: (data.message ?? "").trim(),
      details,
      status: "new",
      assigned_to: null,
      scheduled_for: "",
      created_at: new Date().toISOString(),
      assigned_name: null,
      assigned_email: null,
    };
    const mail = await notifyInquiry(inquiry);
    await forwardInquiryToDashboard(inquiry).catch(() => undefined);
    return { ok: true as const, id, emailed: mail.sent };
  });

export const getDeskMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => requireDeskStaff(context.userId));

export const readDeskGlance = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireDeskStaff(context.userId);
    const stats = await readOpsStats();
    return {
      stats,
      reportingArmed: reportingArmed(),
      dashboardUrl: DASHBOARD_ORIGIN,
      publicUrl: PUBLIC_URL,
    } satisfies {
      stats: OpsStats;
      reportingArmed: boolean;
      dashboardUrl: string;
      publicUrl: string;
    };
  });

export const listInquiries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ kind: z.string().optional(), status: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const me = await requireDeskStaff(context.userId);
    const sql = await getSql();
    const rows = await sql`
      select
        i.*,
        s.name as assigned_name,
        s.email as assigned_email
      from inquiries i
      left join staff s on s.id = i.assigned_to
      order by i.created_at desc
      limit 200
    `;
    const mapped: InquiryRow[] = rows.map((row) => ({
      id: String(row.id),
      kind: String(row.kind),
      kinds: String(row.kinds ?? ""),
      name: String(row.name),
      email: String(row.email ?? ""),
      phone: String(row.phone ?? ""),
      organization: String(row.organization ?? ""),
      city: String(row.city ?? ""),
      address: String(row.address ?? ""),
      message: String(row.message ?? ""),
      details: String(row.details ?? "{}"),
      status: String(row.status),
      assigned_to: row.assigned_to ? String(row.assigned_to) : null,
      scheduled_for: String(row.scheduled_for ?? ""),
      created_at: String(row.created_at),
      assigned_name: row.assigned_name ? String(row.assigned_name) : null,
      assigned_email: row.assigned_email ? String(row.assigned_email) : null,
    }));
    return {
      me,
      inquiries: mapped.filter((row) => {
        if (data.kind && data.kind !== "all" && !coversKind(row.kinds || row.kind, data.kind) && row.kind !== data.kind) {
          return false;
        }
        if (data.status && data.status !== "all" && row.status !== data.status) return false;
        if (me.isSuper || me.staff?.role === "super" || me.staff?.role === "manager") return true;
        if (me.staff?.pickup && row.assigned_to === me.staff.id) return true;
        if (me.staff && coversKind(me.staff.kinds, row.kind)) return true;
        return false;
      }),
    };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await requireDeskStaff(context.userId);
    const { staff } = await loadDesk();
    return { me, staff };
  });

export const listNotifyRoutes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await requireDeskStaff(context.userId);
    if (!me.isSuper) {
      const err = new Error("Forbidden");
      (err as Error & { status?: number }).status = 403;
      throw err;
    }
    const { routes } = await loadDesk();
    return { me, routes };
  });

export const saveStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      kinds: z.string(),
      pickup: z.boolean(),
      active: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const me = await requireDeskStaff(context.userId);
    if (!me.isSuper) {
      const err = new Error("Forbidden");
      (err as Error & { status?: number }).status = 403;
      throw err;
    }
    const sql = await getSql();
    const id = data.id?.trim() || crypto.randomUUID();
    const email = data.email.trim().toLowerCase();
    await sql`
      insert into staff (id, name, email, role, kinds, pickup, active)
      values (
        ${id},
        ${data.name.trim()},
        ${email},
        ${data.role},
        ${data.kinds},
        ${data.pickup},
        ${data.active}
      )
      on conflict (id) do update set
        name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        kinds = excluded.kinds,
        pickup = excluded.pickup,
        active = excluded.active
    `;
    return { ok: true, id };
  });

export const saveNotifyRoute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().optional(),
      email: z.string(),
      kinds: z.string(),
      role: z.string(),
      label: z.string().optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const me = await requireDeskStaff(context.userId);
    if (!me.isSuper) {
      const err = new Error("Forbidden");
      (err as Error & { status?: number }).status = 403;
      throw err;
    }
    const sql = await getSql();
    const id = data.id?.trim() || crypto.randomUUID();
    await sql`
      insert into notify_routes (id, email, kinds, role, label)
      values (
        ${id},
        ${data.email.trim().toLowerCase()},
        ${data.kinds},
        ${data.role},
        ${data.label.trim()}
      )
      on conflict (id) do update set
        email = excluded.email,
        kinds = excluded.kinds,
        role = excluded.role,
        label = excluded.label
    `;
    return { ok: true, id };
  });

export const deleteNotifyRoute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const me = await requireDeskStaff(context.userId);
    if (!me.isSuper) {
      const err = new Error("Forbidden");
      (err as Error & { status?: number }).status = 403;
      throw err;
    }
    const sql = await getSql();
    await sql`delete from notify_routes where id = ${data.id}`;
    return { ok: true };
  });

export const updateInquiry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      status: z.string().optional(),
      assignedTo: z.string().nullable().optional(),
      scheduledFor: z.string().optional(),
      notify: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireDeskStaff(context.userId);
    const sql = await getSql();
    const existing = await sql`
      select
        i.*,
        s.name as assigned_name,
        s.email as assigned_email
      from inquiries i
      left join staff s on s.id = i.assigned_to
      where i.id = ${data.id}
    `;
    if (!existing[0]) return { ok: false, error: "Not found" };
    const assignedTo =
      data.assignedTo === undefined
        ? existing[0].assigned_to
        : data.assignedTo;
    const status =
      data.status ??
      (assignedTo && String(existing[0].status) === "new"
        ? "assigned"
        : String(existing[0].status));
    const scheduledFor =
      data.scheduledFor === undefined
        ? String(existing[0].scheduled_for ?? "")
        : data.scheduledFor;
    await sql`
      update inquiries
      set
        status = ${status},
        assigned_to = ${assignedTo},
        scheduled_for = ${scheduledFor},
        updated_at = now()
      where id = ${data.id}
    `;
    const next = await sql`
      select
        i.*,
        s.name as assigned_name,
        s.email as assigned_email
      from inquiries i
      left join staff s on s.id = i.assigned_to
      where i.id = ${data.id}
    `;
    const row = next[0];
    const inquiry: InquiryRow = {
      id: String(row.id),
      kind: String(row.kind),
      kinds: String(row.kinds ?? ""),
      name: String(row.name),
      email: String(row.email ?? ""),
      phone: String(row.phone ?? ""),
      organization: String(row.organization ?? ""),
      city: String(row.city ?? ""),
      address: String(row.address ?? ""),
      message: String(row.message ?? ""),
      details: String(row.details ?? "{}"),
      status: String(row.status),
      assigned_to: row.assigned_to ? String(row.assigned_to) : null,
      scheduled_for: String(row.scheduled_for ?? ""),
      created_at: String(row.created_at),
      assigned_name: row.assigned_name ? String(row.assigned_name) : null,
      assigned_email: row.assigned_email ? String(row.assigned_email) : null,
    };
    let emailed = 0;
    if (data.notify !== false) {
      const extra = inquiry.assigned_email ? [inquiry.assigned_email] : [];
      const mail = await notifyInquiry(inquiry, extra);
      emailed = mail.sent;
    }
    return { ok: true, emailed };
  });

export type { InquiryInput };
