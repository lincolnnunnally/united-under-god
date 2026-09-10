import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import {
  SUPER_EMAILS,
  inquiryBody,
  inquirySubject,
  kindsFromSubmission,
  routeRecipients,
} from "@/lib/desk";
import { forwardInquiryToDashboard } from "@/lib/ops-report.server";
import { sendDeskEmails } from "@/lib/desk-mail.server";

export type MemberPlace = {
  userId: string;
  email: string;
  name: string;
  organization: string;
  orgType: string;
  city: string;
  phone: string;
  wantsSeal: boolean;
  wantsBuying: boolean;
  wantsMission: boolean;
  wantsVolunteer: boolean;
  isStaff: boolean;
  isSuper: boolean;
};

export type MemberListRow = {
  userId: string;
  name: string;
  email: string;
  organization: string;
  orgType: string;
  city: string;
  wantsSeal: boolean;
  wantsBuying: boolean;
  wantsMission: boolean;
  wantsVolunteer: boolean;
  createdAt: string;
};

function asBool(value: unknown) {
  return value === true || value === "t" || value === "true";
}

function mapPlace(
  userId: string,
  email: string,
  row: Record<string, unknown> | undefined,
  staff: { isStaff: boolean; isSuper: boolean },
): MemberPlace {
  return {
    userId,
    email: String(row?.email || email),
    name: String(row?.name || ""),
    organization: String(row?.organization || ""),
    orgType: String(row?.org_type || ""),
    city: String(row?.city || ""),
    phone: String(row?.phone || ""),
    wantsSeal: asBool(row?.wants_seal),
    wantsBuying: asBool(row?.wants_buying),
    wantsMission: asBool(row?.wants_mission),
    wantsVolunteer: asBool(row?.wants_volunteer),
    isStaff: staff.isStaff,
    isSuper: staff.isSuper,
  };
}

async function loadStaffFlags(userId: string) {
  const sql = await getSql();
  const users = await sql<{ email: string }>`select email from "user" where id = ${userId}`;
  const session = await getSessionUser();
  const email = (
    users[0]?.email ||
    session?.email ||
    ""
  )
    .trim()
    .toLowerCase();
  const byEmail = email
    ? await sql`select * from staff where lower(email) = ${email} and active = true`
    : [];
  const byUser =
    byEmail[0]
      ? []
      : await sql`select * from staff where user_id = ${userId} and active = true`;
  const staffed = Boolean(byEmail[0] || byUser[0]);
  const isSuper =
    String(byEmail[0]?.role || byUser[0]?.role || "") === "super" ||
    SUPER_EMAILS.includes(email);
  return { isStaff: staffed || isSuper, isSuper, email };
}

async function requireStaff(userId: string) {
  const flags = await loadStaffFlags(userId);
  if (!flags.isStaff) {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return flags;
}

export const readMyPlace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MemberPlace> => {
    const sql = await getSql();
    const session = await getSessionUser();
    const users = await sql<{ email: string; name: string }>`
      select email, name from "user" where id = ${context.userId}
    `;
    const email = (
      users[0]?.email ||
      session?.email ||
      ""
    )
      .trim()
      .toLowerCase();
    const rows = await sql`select * from members where user_id = ${context.userId}`;
    const flags = await loadStaffFlags(context.userId);
    const place = mapPlace(context.userId, email, rows[0], flags);
    if (!place.name && users[0]?.name) place.name = String(users[0].name);
    if (!place.email) place.email = email;
    return place;
  });

const placeInput = z.object({
  name: z.string(),
  organization: z.string().optional().default(""),
  orgType: z.string().optional().default(""),
  city: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  wantsSeal: z.boolean(),
  wantsBuying: z.boolean(),
  wantsMission: z.boolean(),
  wantsVolunteer: z.boolean(),
});

async function raiseHand(args: {
  intent: string;
  name: string;
  email: string;
  organization: string;
  orgType: string;
  city: string;
  phone: string;
}) {
  const kinds = kindsFromSubmission(args.intent, "");
  const kind = kinds[0];
  const id = crypto.randomUUID();
  const details = JSON.stringify({ orgType: args.orgType, source: "account" });
  const sql = await getSql();
  await sql`
    insert into inquiries (
      id, kind, kinds, name, email, phone, organization, city, address, message, details
    ) values (
      ${id},
      ${kind},
      ${kinds.join(", ")},
      ${args.name},
      ${args.email},
      ${args.phone},
      ${args.organization},
      ${args.city},
      ${""},
      ${"Joined from their account."},
      ${details}
    )
  `;
  const inquiry = {
    id,
    kind,
    kinds: kinds.join(", "),
    name: args.name,
    email: args.email,
    phone: args.phone,
    organization: args.organization,
    city: args.city,
    address: "",
    message: "Joined from their account.",
    details,
    status: "new",
    assigned_to: null as string | null,
    scheduled_for: "",
    created_at: new Date().toISOString(),
    assigned_name: null as string | null,
    assigned_email: null as string | null,
  };
  const staff = (await sql`select * from staff`).map((row) => ({
    email: String(row.email),
    kinds: String(row.kinds),
    role: String(row.role),
    pickup: asBool(row.pickup),
    active: asBool(row.active),
  }));
  const routes = (
    await sql`select email, kinds, role from notify_routes`
  ).map((row) => ({
    email: String(row.email),
    kinds: String(row.kinds),
    role: String(row.role),
  }));
  const to = routeRecipients({ kinds, routes, staff });
  await sendDeskEmails({
    inquiryId: id,
    to,
    subject: inquirySubject(kind, args.name),
    text: inquiryBody({
      ...inquiry,
      assigned_name: inquiry.assigned_name ?? undefined,
    }),
  }).catch(() => undefined);
  await forwardInquiryToDashboard(inquiry).catch(() => undefined);
}

export const saveMyPlace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(placeInput)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const session = await getSessionUser();
    const users = await sql<{ email: string }>`
      select email from "user" where id = ${context.userId}
    `;
    const email = (
      users[0]?.email ||
      session?.email ||
      ""
    )
      .trim()
      .toLowerCase();
    const existing = await sql`select * from members where user_id = ${context.userId}`;
    const prev = existing[0];
    const name = data.name.trim() || "Friend";
    const organization = (data.organization ?? "").trim();
    const orgType = (data.orgType ?? "").trim();
    const city = (data.city ?? "").trim();
    const phone = (data.phone ?? "").trim();
    await sql`
      insert into members (
        user_id, name, email, organization, org_type, city, phone,
        wants_seal, wants_buying, wants_mission, wants_volunteer, updated_at
      ) values (
        ${context.userId},
        ${name},
        ${email},
        ${organization},
        ${orgType},
        ${city},
        ${phone},
        ${data.wantsSeal},
        ${data.wantsBuying},
        ${data.wantsMission},
        ${data.wantsVolunteer},
        now()
      )
      on conflict (user_id) do update set
        name = excluded.name,
        email = excluded.email,
        organization = excluded.organization,
        org_type = excluded.org_type,
        city = excluded.city,
        phone = excluded.phone,
        wants_seal = excluded.wants_seal,
        wants_buying = excluded.wants_buying,
        wants_mission = excluded.wants_mission,
        wants_volunteer = excluded.wants_volunteer,
        updated_at = now()
    `;

    const raised: Array<{ intent: string; on: boolean; was: boolean }> = [
      { intent: "seal", on: data.wantsSeal, was: asBool(prev?.wants_seal) },
      { intent: "buying", on: data.wantsBuying, was: asBool(prev?.wants_buying) },
      { intent: "mission", on: data.wantsMission, was: asBool(prev?.wants_mission) },
      { intent: "time", on: data.wantsVolunteer, was: asBool(prev?.wants_volunteer) },
    ];
    for (const item of raised) {
      if (item.on && !item.was) {
        await raiseHand({
          intent: item.intent,
          name,
          email,
          organization,
          orgType,
          city,
          phone,
        });
      }
    }

    const flags = await loadStaffFlags(context.userId);
    const rows = await sql`select * from members where user_id = ${context.userId}`;
    return mapPlace(context.userId, email, rows[0], flags);
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql`select * from members order by created_at desc`;
    return rows.map(
      (row): MemberListRow => ({
        userId: String(row.user_id),
        name: String(row.name),
        email: String(row.email),
        organization: String(row.organization),
        orgType: String(row.org_type),
        city: String(row.city),
        wantsSeal: asBool(row.wants_seal),
        wantsBuying: asBool(row.wants_buying),
        wantsMission: asBool(row.wants_mission),
        wantsVolunteer: asBool(row.wants_volunteer),
        createdAt: String(row.created_at ?? ""),
      }),
    );
  });
