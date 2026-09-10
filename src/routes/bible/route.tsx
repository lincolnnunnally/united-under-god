import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BibleShell } from "@/components/bible-shell";
import { SiteShell } from "@/components/site-shell";
import { getBibleHost } from "@/lib/bible-theme";

export const Route = createFileRoute("/bible")({
  loader: () => getBibleHost(),
  component: BibleLayout,
});

function BibleLayout() {
  const bibleHost = Route.useLoaderData();
  if (bibleHost) {
    return (
      <BibleShell>
        <Outlet />
      </BibleShell>
    );
  }
  return (
    <SiteShell>
      <Outlet />
    </SiteShell>
  );
}
