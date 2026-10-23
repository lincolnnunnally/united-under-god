import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ChurchAvPageFooter } from "@/components/church-av-footer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const churchAv = path === "/church-av" || path.startsWith("/church-av/");

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {churchAv ? <ChurchAvPageFooter /> : null}
      <SiteFooter />
    </div>
  );
}
