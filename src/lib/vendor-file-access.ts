/**
 * The one gate for reading vendor files: the file route and every list of
 * files on a catalog or vendor page ask this first.
 *
 * A member church or staff may read them. The vendor that owns a file can
 * always read its own, signed in to its portal. Everyone else is refused.
 * Server-only: it reads the session and the portal cookie.
 */
export async function canViewVendorFiles(
  request: Request | null | undefined,
  options: { ownerVendorId?: string } = {},
): Promise<boolean> {
  if (!request) return false;
  const { memberAccess } = await import("@/lib/membership.server");
  if ((await memberAccess(request)).canView) return true;
  if (!options.ownerVendorId) return false;
  return (await portalVendorId(request)) === options.ownerVendorId;
}

/** The vendor signed in to the portal on this request, or null. */
export async function portalVendorId(request: Request): Promise<string | null> {
  try {
    const [{ portalCookieFrom }, { getSql }, { sessionVendorId }] = await Promise.all([
      import("@/lib/vendor-session.server"),
      import("@/lib/db"),
      import("@/lib/vendor-portal-store"),
    ]);
    const token = portalCookieFrom(request);
    if (!token) return null;
    return await sessionVendorId(await getSql(), token);
  } catch {
    return null;
  }
}
