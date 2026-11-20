import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AvlShell } from "@/components/sanctuary-avl";

/** Sanctuary AVL: every /avl page, shown at the root of sanctuaryavl.unitedundergod.org. */
export const Route = createFileRoute("/avl")({
  component: () => (
    <AvlShell>
      <Outlet />
    </AvlShell>
  ),
});
