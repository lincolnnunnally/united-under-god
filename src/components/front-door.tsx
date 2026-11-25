import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { uugChoice } from "@/components/uug-telemetry";
import { DOORS, OFFERS, PATHS, WHAT_IT_COSTS, type Offer } from "@/lib/offer";
import { cn } from "@/lib/utils";

/**
 * The front door: who you are, what we do for you, what it costs, and which sign-up is
 * yours. Words live in src/lib/offer.ts. Used on the home page and /organizations.
 */

function Arrow() {
  return (
    <ArrowRight className="size-4 shrink-0 transition-transform duration-[var(--motion-quick)] group-hover:translate-x-0.5" />
  );
}

function CardLink({
  to,
  external,
  onClick,
  className,
  children,
}: {
  to: string;
  external?: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  if (external) {
    return (
      <a href={to} onClick={onClick} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to as "/"} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}

const CARD =
  "group flex h-full flex-col rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)] sm:p-6";

/** "Which of these are you?" Four doors, each to the one page that serves that visitor. */
export function Doors({ className }: { className?: string }) {
  return (
    <section className={cn("border-b border-rule", className)} aria-labelledby="doors-heading">
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Find your place</p>
        <h2 id="doors-heading" className="mt-3 text-3xl">
          Which of these are you?
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOORS.map((door) => (
            <li key={door.id}>
              <CardLink to={door.to} onClick={() => uugChoice("door", door.id)} className={CARD}>
                <span className="font-display text-xl text-heading">{door.who}</span>
                <span className="mt-2 flex-1 text-sm text-muted">{door.promise}</span>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-forest">
                  {door.cta}
                  <Arrow />
                </span>
              </CardLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  return (
    <CardLink
      to={offer.to}
      external={offer.external}
      onClick={() => uugChoice("offer", offer.id)}
      className={cn(CARD, "bg-paper")}
    >
      <span className="text-xs font-semibold tracking-[0.12em] text-subtle uppercase">{offer.forWho}</span>
      <span className="mt-2 font-display text-xl text-heading">{offer.title}</span>
      <span className="mt-2 flex-1 text-sm text-muted">{offer.body}</span>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-forest">
        {offer.cta}
        <Arrow />
      </span>
    </CardLink>
  );
}

/**
 * "What we do for you." `limit` shows the first few (the home page); the rest are one link
 * away on /organizations.
 */
export function OfferList({
  limit,
  id,
  className,
  intro = true,
}: {
  limit?: number;
  id?: string;
  className?: string;
  intro?: boolean;
}) {
  const offers = limit ? OFFERS.slice(0, limit) : OFFERS;
  return (
    <section id={id} className={cn("scroll-mt-24 border-b border-rule bg-cream", className)} aria-labelledby="offer-heading">
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          For churches, charities, and Christian businesses
        </p>
        <h2 id="offer-heading" className="mt-3 max-w-3xl text-3xl">
          What we do for you
        </h2>
        {intro ? (
          <p className="mt-4 max-w-2xl text-muted">
            Churches and ministries spend too much on supplies, too much time on admin, and too
            much effort doing alone what they could do together. We do that legwork for you,
            alongside other churches, so more of your money, time, and people go to ministry.
          </p>
        ) : null}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <li key={offer.id}>
              <OfferCard offer={offer} />
            </li>
          ))}
        </ul>
        {limit && limit < OFFERS.length ? (
          <p className="mt-6">
            <Link
              to="/organizations"
              hash="what-we-do"
              onClick={() => uugChoice("offer", "see-all")}
              className="group inline-flex items-center gap-2 text-sm font-medium text-forest underline-offset-4 hover:underline"
            >
              See everything we do, what it costs, and which sign-up is yours
              <Arrow />
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** What it costs, and who pays for the work. */
export function WhatItCosts({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-paper p-6 shadow-[var(--shadow-border)]", className)}>
      <h3 className="font-display text-xl text-heading">What it costs, and who pays for it</h3>
      <ul className="mt-4 space-y-3 text-sm text-muted">
        {WHAT_IT_COSTS.map((line) => (
          <li key={line} className="border-l-2 border-forest pl-4">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Every way to sign up, side by side. You can do more than one. */
export function WhichIsRight({ className }: { className?: string }) {
  return (
    <section id="which" className={cn("scroll-mt-24 border-b border-rule", className)} aria-labelledby="which-heading">
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Signing up</p>
        <h2 id="which-heading" className="mt-3 text-3xl">
          Which is right for me?
        </h2>
        <p className="mt-4 max-w-2xl text-muted">
          Each one is separate, and you can do more than one. A church can take the seal, become a
          member, and post a need.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PATHS.map((path) => (
            <li key={path.id}>
              <CardLink to={path.to} onClick={() => uugChoice("path", path.id)} className={CARD}>
                <span className="font-display text-xl text-heading">{path.title}</span>
                <span className="mt-1 text-xs font-semibold tracking-[0.12em] text-subtle uppercase">
                  {path.forWho}
                </span>
                <span className="mt-3 flex-1 text-sm text-muted">{path.body}</span>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-forest">
                  {path.cta}
                  <Arrow />
                </span>
              </CardLink>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">
          Not sure?{" "}
          <Link
            to="/"
            hash="raise-your-hand"
            onClick={() => uugChoice("path", "not-sure")}
            className="text-forest underline-offset-4 hover:underline"
          >
            Raise your hand
          </Link>{" "}
          and a real person will help you choose.
        </p>
      </div>
    </section>
  );
}
