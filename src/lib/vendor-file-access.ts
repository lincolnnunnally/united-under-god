/**
 * The one gate for reading vendor files: the file route and every list of
 * files on a catalog or vendor page ask this first.
 *
 * Open to everyone for now. Church membership will make it member-only by
 * changing this function alone; nothing else reads vendor files.
 */
export async function canViewVendorFiles(request: Request | null | undefined): Promise<boolean> {
  void request;
  return true;
}
