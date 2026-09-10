import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SealMark } from "@/components/seal-mark";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { NAV } from "@/lib/content";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-rule/80 bg-paper/92 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-5 md:h-[4.75rem] md:px-8">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 text-forest"
          aria-label="United Under God home"
        >
          <SealMark className="size-11 md:size-12" title="United Under God" />
          <span className="font-display text-[1.05rem] font-medium tracking-tight text-ink">
            United Under God
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted transition-colors duration-[var(--motion-quick)] hover:text-ink",
                pathname === item.to && "text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
          <SignedOut>
            <Link
              to="/login"
              className="ml-2 rounded-md px-3 py-2 text-sm text-muted hover:text-ink"
            >
              Sign in
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/account"
              className={cn(
                "ml-2 rounded-md px-3 py-2 text-sm text-muted hover:text-ink",
                pathname === "/account" && "text-ink",
              )}
            >
              My account
            </Link>
          </SignedIn>
          <Button asChild className="ml-3">
            <Link to="/join">Take the seal</Link>
          </Button>
        </nav>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-md text-ink lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-rule bg-paper px-5 py-4 lg:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-11 items-center rounded-md px-3 text-base text-ink"
              >
                {item.label}
              </Link>
            ))}
            <SignedOut>
              <Link
                to="/login"
                className="flex min-h-11 items-center rounded-md px-3 text-base text-ink"
              >
                Sign in
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/account"
                className="flex min-h-11 items-center rounded-md px-3 text-base text-ink"
              >
                My account
              </Link>
            </SignedIn>
            <Button asChild className="mt-2 w-full">
              <Link to="/join">Take the seal</Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
