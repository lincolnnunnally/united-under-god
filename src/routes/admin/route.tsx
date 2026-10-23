import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => pageHead({ title: "Staff desk | United Under God", path: "/admin", noindex: true }),
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
