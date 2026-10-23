import { createFileRoute, Link } from "@tanstack/react-router";
import { InvolvementForm } from "@/components/involvement-form";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { pageHead, serviceJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/assessment")({
  component: AssessmentPage,
  head: () =>
    pageHead({
      title: "Organizational health assessment for churches | United Under God",
      description: "One short conversation to find the money and time your church or charity is losing on toner, internet, and office hours, with a clear next step for each.",
      path: "/assessment", jsonLd: [serviceJsonLd({ name: "Organizational health assessment", description: "A short conversation that shows where a church, charity, or business is losing money and time, with a next step for each.", path: "/assessment", audience: "Churches, charities, and businesses" })],
    }),
});

const WINS = [
  {
    title: "Toner and print",
    body: "See what you pay for toner and paper today, and what you would pay buying with other churches.",
  },
  {
    title: "Internet and tools",
    body: "Overlapping software bills, a website that costs more than it should, and simpler tools that do the same job.",
  },
  {
    title: "Office time",
    body: "Bulletins, bills, weekly announcements — we show you where the hours go and how to get some back.",
  },
];

function AssessmentPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Organizational health
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">
            Find the money and time your organization is losing.
          </h1>
          <p className="mt-5 max-w-2xl text-muted">
            In one short conversation, we look at the basics — toner, internet,
            software, office time — and show you, in real dollars and hours,
            where you could save. Each finding comes with a simple next step.
            It’s free, and it’s not a grade.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {WINS.map((item) => (
            <article key={item.title} className="border-t border-rule pt-5">
              <h2 className="font-display text-xl">{item.title}</h2>
              <p className="mt-3 text-sm text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
          <div>
            <h2 className="text-3xl">Ask us to walk through it with you.</h2>
            <p className="mt-4 text-muted">
              Keep your denomination and your associations — we are not here
              to replace anyone. We are here to help you spend less on
              overhead and more on ministry.
            </p>
            <Button asChild className="mt-8" variant="secondary">
              <Link to="/buying">See group buying</Link>
            </Button>
          </div>
          <InvolvementForm intent="buying" />
        </div>
      </section>
    </SiteShell>
  );
}
