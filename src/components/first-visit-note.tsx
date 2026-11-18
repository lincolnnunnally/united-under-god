import { useEffect } from "react";
import { noteFirstVisit } from "@/lib/first-visit";

/** Keeps where this visitor first came from (src/lib/first-visit.ts). Renders nothing. */
export function FirstVisitNote() {
  useEffect(() => {
    noteFirstVisit();
  }, []);
  return null;
}
