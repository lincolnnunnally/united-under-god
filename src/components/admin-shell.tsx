import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SealMark } from "@/components/seal-mark";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { to: "/admin", label: "Inbox" },
  { to: "/admin/staff", label: "People" },
  { to: "/admin/notify", label: "Email routes" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isPending) {
    return (
      <div className="min-h-dvh bg-paper">
        <div className="h-16 border-b border-rule bg-cream" />
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="h-8 w-48 animate-pulse rounded-md bg-cream" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-rule bg-cream">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
          <Link to="/admin" className="flex items-center gap-2.5 text-forest">
            <SealMark className="size-10" />
            <span className="font-display text-lg font-medium text-ink">
              Desk
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Desk">
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "min-h-11 rounded-md px-3 py-2 text-sm",
                  pathname === item.to ? "bg-forest text-paper" : "text-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/"
              className="min-h-11 rounded-md px-3 py-2 text-sm text-muted hover:text-ink"
            >
              Public site
            </Link>
          </nav>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">{children}</main>
    </div>
  );
}
