import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { FEES } from "@/lib/vendor-terms";

/**
 * "Before you sign up": the section that leads into the vendor sign-up (owner, 2026-11-18). It says plainly
 * what the program asks of a vendor and what it gives back, so a company signs up knowing the deal: a real
 * program price for churches, a small fee only when paid, and standing behind the work. Shown above the form
 * on /buying/vendors and above the closing sign-up on /buying/sell-to-churches. Rates come from FEES.
 */
export function VendorPromise({ className = "" }: { className?: string }) {
  const rebate = `${FEES.rebate.percent}%`;
  const referral = `${FEES.referral.percent}%`;
  return (
    <section className={`border-b border-rule ${className}`} aria-labelledby="vendor-promise-title">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">Before you sign up</p>
        <h2 id="vendor-promise-title" className="mt-3 max-w-2xl text-3xl">
          A fair deal for churches, and real work for you
        </h2>
        <p className="mt-4 max-w-2xl text-muted">
          Most churches buy on their own, one small order at a time, and pay full price. United Under God
          brings churches together so they buy as one, and brings them to vendors who will serve them well.
          Here is what we ask of you, and what you receive.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] sm:p-8">
            <h3 className="font-display text-xl">What we ask of you</h3>
            <ul className="mt-5 space-y-4 text-muted">
              <Point title="A real program price.">
                Quote churches a group price below what one church would pay you on its own. When a quote is
                awarded, that price is the most a church in the program pays you for the term.
              </Point>
              <Point title="A small fee, only when you are paid.">
                {rebate} on catalog items and recurring service contracts, {referral} on referred projects, due{" "}
                {FEES.dueDays} days after the church pays you. No sign-up fee and no monthly fee.
              </Point>
              <Point title="Stand behind your work.">
                If something isn’t right for a church, you make it right. That promise is the{" "}
                <Link to="/buying/vendor-terms" hash="covenant" className="text-forest underline-offset-4 hover:underline">
                  Vendor Covenant
                </Link>
                .
              </Point>
            </ul>
          </div>
          <div className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] sm:p-8">
            <h3 className="font-display text-xl">What you receive</h3>
            <ul className="mt-5 space-y-4 text-muted">
              <Point title="Churches come to you.">
                When churches in your categories and area need something, the bid invitation comes to you. No
                cold calls, no lists to buy.
              </Point>
              <Point title="One quote, many churches.">
                A group bid can carry the needs of several churches at once, so one good price can win several
                customers.
              </Point>
              <Point title="Your customer, your invoice.">
                Churches buy directly from you and pay you directly. We never stand between you and your
                payment, and every church chooses freely.
              </Point>
              <Point title="Work that keeps helping.">
                United Under God is a 501(c)(3) nonprofit. The fees fund the work of helping churches work
                together, so your sale keeps serving after it closes.
              </Point>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Point({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <Check className="mt-1 size-4 shrink-0 text-forest" aria-hidden="true" />
      <span>
        <strong className="text-ink">{title}</strong> {children}
      </span>
    </li>
  );
}
