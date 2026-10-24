import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MEMBER_BENEFITS } from "@/lib/membership";
import { cn } from "@/lib/utils";

/**
 * The visible half of the member gate. `member` must come from the server
 * (loader data from a `*ForViewer` server function, or `memberAccess` /
 * `isMemberChurch` in `@/lib/membership.server`), and the server must already
 * have withheld the gated fields from non-members. This component only
 * decides what to draw; it is never the thing keeping data private.
 *
 *   <MemberGate member={loaderData.member} what="this vendor’s contacts and brochure">
 *     <VendorContacts vendor={vendor} />
 *   </MemberGate>
 */
export function MemberGate({
  member,
  children,
  what,
  compact = false,
  className,
}: {
  member: boolean;
  children: ReactNode;
  /** What is behind the gate, in a few words. */
  what?: string;
  /** A one-line invitation instead of the card. */
  compact?: boolean;
  className?: string;
}) {
  if (member) return <>{children}</>;
  return compact ? (
    <MemberLockedLine what={what} className={className} />
  ) : (
    <BecomeMemberCta what={what} className={className} />
  );
}

/** One line where a price or contact would be. */
export function MemberLockedLine({ what, className }: { what?: string; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 text-sm text-muted", className)} data-member-gate="">
      <Lock className="size-3.5 text-forest" aria-hidden="true" />
      <span>Member churches see {what ?? "the price and vendor"}.</span>
      <Link to="/membership" className="font-medium text-forest underline-offset-4 hover:underline">
        Become a member church
      </Link>
    </p>
  );
}

/** The invitation card on catalog pages. */
export function BecomeMemberCta({ what, className }: { what?: string; className?: string }) {
  return (
    <aside
      className={cn("rounded-xl bg-forest p-6 text-paper shadow-[var(--shadow-border)] sm:p-8", className)}
      data-member-gate=""
    >
      <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">Member churches</p>
      <h2 className="mt-2 font-display text-2xl text-paper">
        {what ? `See ${what}` : "See the vendors and the awarded prices"}
      </h2>
      <p className="mt-3 max-w-prose text-sm text-paper/85">
        Member churches see every vendor contact, awarded price, brochure, and review, and can ask a
        vendor for a quote directly. Membership also includes a church website, pastor fellowship,
        and help when a vendor falls short.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="invert">
          <Link to="/membership">Become a member church</Link>
        </Button>
        <Link
          to="/membership"
          hash="benefits"
          className="inline-flex min-h-11 items-center text-sm text-paper/85 underline-offset-4 hover:underline"
        >
          What members receive
        </Link>
      </div>
    </aside>
  );
}

/** The benefits list, two to a row (four items: 2×2, never an orphan). */
export function MemberBenefits({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {MEMBER_BENEFITS.map((benefit) => (
        <li key={benefit.title} className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-lg">{benefit.title}</h3>
          <p className="mt-2 text-sm text-muted">{benefit.body}</p>
        </li>
      ))}
    </ul>
  );
}
