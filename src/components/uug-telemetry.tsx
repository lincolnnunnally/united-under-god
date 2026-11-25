import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { funnel, initTelemetry, track, trackPageView } from "@/lib/telemetry";

/**
 * The main site's slug in lpl_app_registry (allowed origins: unitedundergod.org and www).
 * Same shared tracker and ingest as Sanctuary AVL (avl-telemetry.tsx). Owner (2026-11-25):
 * know which door visitors take and where they stop, so changes follow what people do.
 * No name, email, phone or message is ever sent.
 */
export const UUG_TELEMETRY_APP = "uug";

/** Only the main site reports: bible., sanctuaryavl. and preview hosts are not its origins. */
function onMainSite() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "unitedundergod.org" || host === "www.unitedundergod.org";
}

/**
 * Path words whose next segment is a secret on this site, on top of the tracker's own list.
 * /buying/need/<token> is the church's only key to its need and its quotes. (The vendor bid,
 * case, mediation and review links keep their token in ?t=, and the tracker never sends the
 * query.)
 */
const SECRET_PATH_WORDS = ["need"];

function ready() {
  if (!onMainSite()) return false;
  initTelemetry({ app: UUG_TELEMETRY_APP, maskAfter: SECRET_PATH_WORDS });
  return true;
}

let lastPage = "";

/** One page_view per address. Mounted by SiteShell. Renders nothing. */
export function UugPageViews() {
  const href = useRouterState({ select: (s) => s.location.href });
  useEffect(() => {
    if (!ready()) return;
    const page = window.location.pathname + window.location.search;
    if (page === lastPage) return;
    lastPage = page;
    trackPageView();
  }, [href]);
  return null;
}

/** A visitor chose a door or an offer on the home page or /organizations. */
export function uugChoice(kind: "door" | "offer" | "path", id: string) {
  if (!ready()) return;
  // The tracker adds the (masked) path itself.
  track("cta_click", { kind, id });
}

/** A sign-up reached us: the seal, a member church, a posted need, a vendor, a raised hand. */
export function uugLead(kind: string) {
  if (!ready()) return;
  funnel.signupCompleted({ kind });
}
