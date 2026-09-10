import { createServerFn } from "@tanstack/react-start";

export function hostIsBibleSite(host: string) {
  return host.split(":")[0].toLowerCase().startsWith("bible.");
}

export const getBibleHost = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const host =
      req?.headers.get("x-forwarded-host") || req?.headers.get("host") || "";
    return hostIsBibleSite(host);
  } catch {
    return false;
  }
});
