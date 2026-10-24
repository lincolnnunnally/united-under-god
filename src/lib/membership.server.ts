/**
 * The server-side member check (server-only).
 *
 *   import { isMemberChurch } from "@/lib/membership.server";
 *   if (!(await isMemberChurch(request))) return lockedView;
 *
 * Fails closed: no session, no database, or migrations/0011 not applied yet
 * all read as "not a member", so vendor contacts and prices stay withheld.
 * Staff are not members; use `memberAccess` when staff should also see member
 * content (the owner checking a catalog page).
 */
import { getSql } from "./db";
import { isMemberUser, isMissingTable } from "./membership-store";
import { SUPER_EMAILS } from "./desk";

/** Expected while 0011 is unapplied or the database is down: no log noise. */
function quiet(err: unknown) {
  return isMissingTable(err) || (err instanceof Error && err.name === "DbUnavailableError");
}

async function sessionUser(
  request: Request | null | undefined,
  bearerToken?: string,
): Promise<{ id: string; email: string | null } | null> {
  if (!request) return null;
  try {
    const { auth, authConfigured } = await import("./auth/server");
    const { gateIdentityEnabled } = await import("./auth/gate-identity.server");
    if (!authConfigured && !gateIdentityEnabled()) return null;
    let headers = request.headers;
    if (bearerToken) {
      headers = new Headers(request.headers);
      headers.set("Authorization", `Bearer ${bearerToken}`);
    }
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return null;
    return { id: session.user.id, email: session.user.email ?? null };
  } catch {
    return null;
  }
}

async function isStaffUser(userId: string, email: string | null): Promise<boolean> {
  const sql = await getSql();
  const lower = (email ?? "").trim().toLowerCase();
  if (lower && SUPER_EMAILS.includes(lower)) return true;
  const rows = lower
    ? await sql`select id from staff where (lower(email) = ${lower} or user_id = ${userId}) and active = true`
    : await sql`select id from staff where user_id = ${userId} and active = true`;
  return rows.length > 0;
}

export type MemberAccess = {
  userId: string | null;
  member: boolean;
  staff: boolean;
  /** Member content may be sent to this viewer. */
  canView: boolean;
};

export async function memberAccess(
  request: Request | null | undefined,
  bearerToken?: string,
): Promise<MemberAccess> {
  const user = await sessionUser(request, bearerToken);
  if (!user) return { userId: null, member: false, staff: false, canView: false };
  let member = false;
  let staff = false;
  try {
    const sql = await getSql();
    member = await isMemberUser(sql, user.id);
  } catch (err) {
    if (!quiet(err)) console.error("[membership] member check failed:", err);
  }
  try {
    staff = await isStaffUser(user.id, user.email);
  } catch (err) {
    if (!quiet(err)) console.error("[membership] staff check failed:", err);
  }
  return { userId: user.id, member, staff, canView: member || staff };
}

/** True only for a signed-in account whose church membership is active (or past due, retrying). */
export async function isMemberChurch(
  request: Request | null | undefined,
  bearerToken?: string,
): Promise<boolean> {
  return (await memberAccess(request, bearerToken)).member;
}
