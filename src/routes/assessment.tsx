import { createFileRoute, Link } from "@tanstack/react-router";
import { InvolvementForm } from "@/components/involvement-form";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/assessment")({
  component: AssessmentPage,
  head: () => ({
    meta: [{ title: "Organizational health assessment — United Under God" }],
  }),
});

const WINS = [
  {
    title: "Toner and print",
    body: "One little church buying one cartridge at retail is a habit. We show you what the group price would have been.",
  },
  {
    title: "Internet and tools",
    body: "Duplicate software bills. A website that costs more than it should. Tools the body already shares.",
  },
  {
    title: "Office time",
    body: "Bulletins, bills, the same weekly announcements. Hours you cannot see from the inside, with a next step for each.",
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
            A lot of organizations don’t know what they don’t know.
          </h1>
          <p className="mt-5 max-w-2xl text-muted">
            Whether you are really operating efficiently, or where the easy wins
            are hiding. In a short sitting it shows you, in real dollars and
            hours, what’s hard to see from the inside — toner, internet, office
            time, the basics — each with an encouraging next step. Not a grade.
            A way forward.
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
              Keep your denomination. Keep your associations. We are not
              competing with you. We are here to help you operate at your best
              on God’s principles — and to put the easy wins in front of you.
            </p>
            <Button asChild className="mt-8" variant="secondary">
              <Link to="/buying">See united buying</Link>
            </Button>
          </div>
          <InvolvementForm intent="buying" />
        </div>
      </section>
    </SiteShell>
  );
}
