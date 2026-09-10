import { createFileRoute, Link } from "@tanstack/react-router";
import { InvolvementForm } from "@/components/involvement-form";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { MISSION_APP, SCRIPTURE, SPARK_URL } from "@/lib/content";

export const Route = createFileRoute("/mission")({
  component: MissionPage,
  head: () => ({
    meta: [{ title: "Live on Mission — United Under God" }],
  }),
});

const STEPS = [
  {
    title: "See the need",
    body: "Someone near you is hungry, lonely, ashamed, or stuck. Ask God to let you notice. Maybe He let you see it so you could help.",
  },
  {
    title: "Do the thing",
    body: "A meal. A ride. A porch conversation. A pantry shift. This is not extra credit. It is the thing you already needed to do — and the thing you will get the greatest joy from.",
  },
  {
    title: "Tell the story",
    body: "What God did becomes a testimony. Spark of Hope is where that story lives, so the next person does not have to start from zero.",
    href: SPARK_URL,
  },
];

const ACTS = [
  {
    title: "Feed",
    body: "Pack, pick up, deliver. The Vidalia pantry is the clearest local door right now.",
  },
  {
    title: "Reconcile",
    body: "Make the call you have been avoiding. Forgiveness is not a mood. It is obedience that heals a body.",
  },
  {
    title: "Show up",
    body: "Sit with the struggling. Understand their conditions. Love that will not get close is still a slogan.",
  },
  {
    title: "Build",
    body: "Offer the trade you already know — so a church, a family, or a shop can take the next step.",
  },
];

function MissionPage() {
  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        <img
          src="/images/mission.jpg"
          alt="Neighbors sharing groceries on a front porch"
          className="absolute inset-0 size-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/30" />
        <div className="relative mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            Live on Mission
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">
            See the need. Do the thing. Tell the story.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-paper/88">
            We are giving people a way to do the thing they needed to do anyway
            — and the thing they will get the greatest joy from. That walk ends
            in testimony, on Spark of Hope, so courage travels.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <p className="font-display text-2xl italic leading-snug">
          “{SCRIPTURE.galatians.text}”
        </p>
        <p className="mt-3 text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
          {SCRIPTURE.galatians.ref}
        </p>
        <div className="mt-8 space-y-4 text-muted">
          <p>
            Live on Mission is not a program you attend. It is the ordinary
            path: notice a need, meet it, and let the story travel. It is how a
            divided church becomes a people again — because you cannot stay at
            odds with a brother you are serving beside.
          </p>
          <p>
            When we stop saying “somebody should fix that” and start asking
            “maybe that’s ours to help with,” lives gain meaning. People get
            connected. Loneliness breaks. Hearts soften. This was never a
            system to improve society. It is obedience that happens to heal it.
          </p>
        </div>
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-3 md:px-8">
          {STEPS.map((step, i) => (
            <article key={step.title} className="rounded-xl bg-paper p-6 shadow-[var(--shadow-border)]">
              <p className="font-display text-sm text-subtle">0{i + 1}</p>
              <h2 className="mt-2 text-xl">{step.title}</h2>
              <p className="mt-3 text-sm text-muted">{step.body}</p>
              {"href" in step && step.href ? (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm font-medium text-forest"
                >
                  Open Spark of Hope
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="max-w-2xl text-3xl">Four ways to start this week</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {ACTS.map((act) => (
            <article key={act.title} className="border-t border-rule pt-5">
              <h3 className="font-display text-xl italic">{act.title}</h3>
              <p className="mt-2 text-muted">{act.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <a href={MISSION_APP} target="_blank" rel="noreferrer">
              Open the Live on Mission app
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href={SPARK_URL} target="_blank" rel="noreferrer">
              Tell the story on Spark of Hope
            </a>
          </Button>
        </div>
      </section>

      <section className="border-t border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8">
          <div>
            <h2 className="text-3xl">Take a first step. We will walk with you.</h2>
            <p className="mt-4 text-muted">
              Raise your hand if you are ready to live this, not only agree with
              it. We will help you find a concrete next act — pantry, neighbor,
              or a need in your own church. Then you tell what God did.
            </p>
            <p className="mt-4">
              <Link to="/happenings" className="text-forest underline-offset-4 hover:underline">
                See what’s on this week
              </Link>
            </p>
          </div>
          <InvolvementForm intent="mission" />
        </div>
      </section>
    </SiteShell>
  );
}
