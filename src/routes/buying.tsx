import { createFileRoute, Link } from "@tanstack/react-router";
import { InvolvementForm } from "@/components/involvement-form";
import { SignInNudge } from "@/components/sign-in-nudge";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/buying")({
  component: BuyingPage,
  head: () => ({
    meta: [{ title: "United buying — United Under God" }],
  }),
});

const CATALOGS = [
  {
    title: "Toner and printers",
    body: "Toner Connect watches the printer so a little church is not surprised by an empty cartridge — and buys with the group, not at retail.",
    href: "https://tonerconnect.unitedundergod.org",
    cta: "Open Toner Connect",
  },
  {
    title: "Shared tools, not duplicate bills",
    body: "ChurchConnect, Operate, Plenty, EasyPeazy. One body should not pay twelve times for twelve half-used systems.",
    href: "/apps",
    cta: "See the tools",
    internal: true,
  },
  {
    title: "Surplus that becomes supply",
    body: "What one shop cannot sell, another ministry can use. Donate through the movement. Receive through Operate or the pantry.",
    href: "/donate",
    cta: "Give surplus",
    internal: true,
  },
];

function BuyingPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            United buying
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">
            One little church buying one toner at retail is a habit, not a plan.
          </h1>
          <p className="mt-5 max-w-2xl text-muted">
            Georgia’s offices do not each call a salesman. They compile a bid.
            Kingdom organizations can do the same: shared catalogs, each body
            buying what it needs, everyone paying less — so more of the money
            reaches the work.
          </p>
          <SignInNudge about="united buying" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {CATALOGS.map((item) =>
            item.internal ? (
              <Link
                key={item.title}
                to={item.href as "/apps" | "/donate"}
                className="flex flex-col rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <h2 className="font-display text-xl">{item.title}</h2>
                <p className="mt-3 flex-1 text-sm text-muted">{item.body}</p>
                <span className="mt-5 text-sm font-medium text-forest">{item.cta}</span>
              </Link>
            ) : (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <h2 className="font-display text-xl">{item.title}</h2>
                <p className="mt-3 flex-1 text-sm text-muted">{item.body}</p>
                <span className="mt-5 text-sm font-medium text-forest">{item.cta}</span>
              </a>
            ),
          )}
        </div>
      </section>

      <section className="border-t border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <h2 className="max-w-2xl text-3xl">Church office, without a full-time staff</h2>
          <p className="mt-4 max-w-2xl text-muted">
            Most churches do the same work every week: bulletins, bills, phones,
            the same announcements. ChurchConnect already carries a large part
            of that. Centralized office help can carry the rest — and the future
            we are working toward includes meaningful part-time remote work
            doing it, maybe for the very people who came asking for help.
          </p>
          <p className="mt-6">
            <Link to="/assessment" className="text-forest underline-offset-4 hover:underline">
              Take the organizational health assessment
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
          <div>
            <h2 className="text-3xl">Who this is for</h2>
            <ul className="mt-6 space-y-4 text-muted">
              <li>
                <span className="font-medium text-ink">Churches</span> that
                should not be paying office-supply retail for the privilege of
                printing a bulletin.
              </li>
              <li>
                <span className="font-medium text-ink">Charities</span> that
                need the same paper, the same toner, the same hosting — and
                should stand in the same bid.
              </li>
              <li>
                <span className="font-medium text-ink">Christian-led shops</span>{" "}
                that want to sell into the body, fairly, and to buy from it too.
              </li>
            </ul>
            <Button asChild className="mt-8" variant="secondary">
              <Link to="/join">Take the seal first</Link>
            </Button>
          </div>
          <InvolvementForm intent="buying" />
        </div>
      </section>
    </SiteShell>
  );
}
