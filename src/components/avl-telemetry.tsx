import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { funnel, initTelemetry, trackPageView } from "@/lib/telemetry";

/**
 * Sanctuary AVL's slug in lpl_app_registry. Events go to the shared ecosystem-telemetry
 * ingest (src/lib/telemetry.ts, the canonical tracker copied from AppEngine
 * shared-client/lpl-telemetry), which only accepts registered apps.
 */
export const AVL_TELEMETRY_APP = "sanctuary-avl";

let lastPage = "";

/**
 * One page_view per Sanctuary AVL address. Mounted by AvlShell, so only /avl pages report.
 * The tracker reads window.location, so the path is the address the visitor sees
 * (/guides/<slug> on sanctuaryavl.unitedundergod.org), not the internal /avl route.
 * Renders nothing.
 */
export function AvlPageViews() {
  const href = useRouterState({ select: (s) => s.location.href });
  useEffect(() => {
    initTelemetry({ app: AVL_TELEMETRY_APP });
    const page = window.location.pathname + window.location.search;
    if (page === lastPage) return;
    lastPage = page;
    trackPageView();
  }, [href]);
  return null;
}

/** A room request reached the desk: a lead. No name, email, phone or message is sent. */
export function avlRequestSent() {
  initTelemetry({ app: AVL_TELEMETRY_APP });
  funnel.signupCompleted({ kind: "avl_request" });
}
