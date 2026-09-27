/**
 * Origins Better Auth will accept for a configured `BETTER_AUTH_URL`.
 *
 * Production traffic arrives on both the apex and `www`. Trusting only the
 * env value rejects the other host with "Invalid origin". When the configured
 * host is either public host, both are included. Other base URLs stay as given.
 */
const PUBLIC_HOSTS = new Set(["unitedundergod.org", "www.unitedundergod.org"]);

export function trustedOriginsForBaseURL(baseURL: string): string[] {
  const origins = new Set<string>();
  const trimmed = baseURL.trim();
  if (!trimmed) return [];
  origins.add(trimmed);
  try {
    const url = new URL(trimmed);
    origins.add(url.origin);
    if (PUBLIC_HOSTS.has(url.hostname)) {
      origins.add(`${url.protocol}//unitedundergod.org`);
      origins.add(`${url.protocol}//www.unitedundergod.org`);
    }
  } catch {
    // Keep the configured string when it is not a URL.
  }
  return [...origins];
}
