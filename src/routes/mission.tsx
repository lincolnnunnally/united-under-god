import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { InvolvementForm } from "@/components/involvement-form";
import { LiveOnMissionMark } from "@/components/live-on-mission-mark";
import { SignInNudge } from "@/components/sign-in-nudge";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { MISSION_APP, SCRIPTURE, SPARK_URL } from "@/lib/content";

export const Route = createFileRoute("/mission")({
  component: MissionPage,
  head: () => ({
    meta: [{ title: "Live on Mission — United Under God" }],
  }),
});

const FRUIT = [
  {
    title: "God is praised",
    body: "Good work that can be seen. Neighbors fed, wounds tended, a porch light on. That is how people give glory to the Father.",
  },
  {
    title: "You come alive",
    body: "The Christian was not designed to sit still and make life comfortable. Purpose is not a feeling you wait for. It is what happens when you use your life for a purpose.",
  },
  {
    title: "You are united",
    body: "You cannot stay at odds with the person you are serving beside. Mission is how a divided church becomes a people again.",
  },
  {
    title: "You feel His love",
    body: "You feel the love of Jesus because you are sharing the love of Jesus. That is how that works.",
  },
];

const STEPS = [
  {
    title: "See the need",
    body: "Someone near you is hungry, lonely, ashamed, or stuck. Ask God to let you notice. Maybe He let you see it so you could help.",
  },
  {
    title: "Do the thing",
    body: "A meal. A ride. A porch conversation. A pantry shift. This is not extra credit. It is the ordinary obedience you already needed — and the thing you will get the greatest joy from.",
  },
  {
    title: "Tell the story",
    body: "What God did becomes a testimony. Spark of Hope is where that story lives, so the next person does not have to start from zero.",
    href: SPARK_URL,
  },
];

const ACTS = [
  {
    title: "Pay it forward",
    body: "Cover a coffee, a meal, a bag of groceries. A small surprise that tells someone they are seen.",
  },
  {
    title: "Encourage someone",
    body: "Send the text. Write the note. Say the word. Courage is transferable.",
  },
  {
    title: "Give unexpectedly",
    body: "Meet a real need nobody asked you to meet — time, a truck, a skill, given freely.",
  },
  {
    title: "Connect deeply",
    body: "Have a real conversation. Ask, listen, stay. Belonging starts with one honest connection.",
  },
];

const DOORS = [
  {
    kicker: "The call",
    title: "This page",
    body: "Why we live this way. Raise a hand. Keep your place on your account. United Under God is the movement. Live on Mission is the walk.",
    href: "#raise-hand",
    label: "Raise your hand",
    external: false,
  },
  {
    kicker: "The work this week",
    title: "The Live on Mission app",
    body: "Browse a real need. RSVP. Show up. live-on-mission.com and liveonmission.unitedundergod.org are the same door — the tool, not a second movement.",
    href: MISSION_APP,
    label: "Find a need this week",
    external: true,
  },
  {
    kicker: "The story",
    title: "Spark of Hope",
    body: "After you do the thing, tell what God did. That is not branding. It is how courage travels.",
    href: SPARK_URL,
    label: "Tell the story",
    external: true,
  },
];

function MissionPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[auto_1fr] md:px-8 md:py-24">
          <LiveOnMissionMark size="lg" className="mx-auto md:mx-0" />
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-mission uppercase">
              Live on Mission
            </p>
            <h1 className="mt-3 max-w-xl text-3xl text-balance">
              Your life is purposeful when you use it for a purpose.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted">
              People are lonely and miserable because they made life
              comfortable. The soul is crying out for something more. Live on
              Mission is the cure: unite around work that God can be praised
              for — and come alive in it.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="mission" size="lg">
                <a href={MISSION_APP} target="_blank" rel="noreferrer">
                  Find a need this week
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="#raise-hand">Raise your hand</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <p className="font-display text-2xl italic leading-snug">
          “{SCRIPTURE.matthew.text}”
        </p>
        <p className="mt-3 text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
          {SCRIPTURE.matthew.ref}
        </p>
        <div className="mt-8 space-y-4 text-pretty text-muted">
          <p>
            We are calling people around activity — doing good work so God
            gets the praise. In that work the Christian comes to life and
            starts experiencing what God had planned all along. You become
            united with the neighbor you are working with. You feel the love
            of Jesus because you are sharing the love of Jesus. That is how
            that works.
          </p>
          <p>
            This is not a program you attend. It is not a trip you save up
            for. It is the ordinary path: notice a need, meet it, and let the
            story travel. Comfortable sitting around is what made us lonely.
            Mission is how we get our lives back.
          </p>
        </div>
      </section>

      <section className="border-y border-rule bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-mission uppercase">
            What mission does
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl text-balance">
            In the work, four things happen at once.
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {FRUIT.map((item) => (
              <article key={item.title} className="border-t border-rule pt-5">
                <h3 className="font-display text-xl italic">{item.title}</h3>
                <p className="mt-2 text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream">
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
                  className="mt-4 inline-block text-sm font-medium text-mission"
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
        <p className="mt-4 max-w-2xl text-muted">
          You do not need a committee. You need one neighbor and one act.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {ACTS.map((act) => (
            <article key={act.title} className="border-t border-rule pt-5">
              <h3 className="font-display text-xl italic">{act.title}</h3>
              <p className="mt-2 text-muted">{act.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-rule bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/60 uppercase">
            One mission. Three doors.
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl text-paper">
            One walk. Three doors — the call, the work this week, and the story
            after.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {DOORS.map((door) => (
              <article key={door.title}>
                <p className="text-xs font-semibold tracking-[0.16em] text-paper/55 uppercase">
                  {door.kicker}
                </p>
                <h3 className="mt-2 font-display text-xl italic text-paper">{door.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-paper/75">{door.body}</p>
                {door.external ? (
                  <a
                    href={door.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-paper underline-offset-4 hover:underline"
                  >
                    {door.label}
                  </a>
                ) : (
                  <a
                    href={door.href}
                    className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-paper underline-offset-4 hover:underline"
                  >
                    {door.label}
                  </a>
                )}
              </article>
            ))}
          </div>
          <p className="mt-12 max-w-2xl text-sm text-paper/65">
            If your church already runs a trip or a serving team, that desk
            stays in ChurchConnect. It is the church’s operations — not where
            a person goes to start living on mission.
          </p>
        </div>
      </section>

      <section id="raise-hand" className="bg-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8">
          <div>
            <LiveOnMissionMark size="sm" />
            <h2 className="mt-8 text-3xl">Take a first step. We will walk with you.</h2>
            <p className="mt-4 text-pretty text-muted">
              Raise your hand if you are ready to live this, not only agree
              with it. We will help you find a concrete next act — pantry,
              neighbor, or a need in your own church. Then you tell what God
              did.
            </p>
            <SignInNudge about="Live on Mission" />
            <p className="mt-4">
              <Link to="/happenings" className="text-mission underline-offset-4 hover:underline">
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
