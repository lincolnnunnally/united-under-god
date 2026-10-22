import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { InvolvementForm } from "@/components/involvement-form";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/church-av")({
  component: ChurchAvPage,
  head: () => ({
    meta: [
      { title: "Church sound, livestream & lighting — United Under God" },
      {
        name: "description",
        content:
          "Clear sound, a steady livestream, and lighting that works — planned and installed for your sanctuary, with your volunteers trained before the first Sunday.",
      },
    ],
  }),
});

const PAINS = [
  "Feedback squeals during the prayer.",
  "Older members can’t hear the sermon.",
  "The livestream drops right at the invitation.",
  "One volunteer is the only person who knows how the board works.",
];

const CHANGES = [
  {
    title: "Everyone hears.",
    body: "From the front pew to the back row, and at home on the livestream.",
  },
  {
    title: "Your volunteers stop guessing.",
    body: "The system is simple and labeled, and your team is trained on-site before the first Sunday.",
  },
  {
    title: "Done once, done right.",
    body: "Planned for your room and installed in phases, so you never miss a service.",
  },
  {
    title: "Someone to call.",
    body: "Training, support, and service plans after the install — including the big weekends.",
  },
];

const SERVICES = [
  {
    title: "Sound",
    body: "Systems designed for clear speech and consistent music, tuned to your room.",
  },
  {
    title: "Livestream",
    body: "Reliable streaming to YouTube, Facebook, or your website — with a simple routine your volunteers can run.",
  },
  {
    title: "Lighting",
    body: "Stage and camera lighting that lifts the room without stealing the show.",
  },
  {
    title: "Video & screens",
    body: "Projection, LED walls, and cameras for lyrics, teaching, and the overflow room.",
  },
];

const STEPS = [
  {
    title: "Talk",
    body: "Tell us about your room, your services, and what is not working. Plain language — no jargon required.",
  },
  {
    title: "Plan",
    body: "A design and equipment list that fits your room and your budget, with options and phases.",
  },
  {
    title: "Install",
    body: "Built around your schedule, because Sunday is always coming.",
  },
  {
    title: "Train",
    body: "Hands-on training for your team, labeled presets, and support after the first Sunday.",
  },
];

function ChurchAvPage() {
  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        <img
          src="/images/sanctuary.jpg"
          alt="A congregation in worship, one hand raised toward the stage"
          className="absolute inset-0 size-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/35" />
        <div className="relative mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            For churches · Sound · Livestream · Lighting
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">Every word heard. Every Sunday.</h1>
          <p className="mt-5 max-w-2xl text-lg text-paper/88">
            Clear sound, a steady livestream, and lighting that works — planned and installed for
            your sanctuary, with your volunteers trained before the first Sunday.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="invert" size="lg">
              <a href="#talk">
                Talk with us about your sanctuary
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <h2 className="text-3xl">You shouldn’t have to be the sound guy too.</h2>
          <p className="mt-5 text-muted">
            You already carry the whole church. When the system fights you every week, the message
            is what suffers — in the room and for everyone watching from home. This is one thing
            you can hand off.
          </p>
        </div>
        <ul className="space-y-3">
          {PAINS.map((pain) => (
            <li key={pain} className="border-l-2 border-forest pl-4 text-ink">
              {pain}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            What changes
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl">A system your church can count on.</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {CHANGES.map((item) => (
              <article key={item.title} className="border-t border-rule pt-5">
                <h3 className="font-display text-xl italic">{item.title}</h3>
                <p className="mt-2 text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="max-w-2xl text-3xl">Small sanctuary or new building</h2>
        <p className="mt-4 max-w-2xl text-muted">
          Whether you need one microphone that finally works or a full system for a new building,
          the work is done by an experienced church audio, video, and lighting team that has served
          congregations across Georgia and the Southeast.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {SERVICES.map((item) => (
            <article
              key={item.title}
              className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]"
            >
              <h3 className="font-display text-xl">{item.title}</h3>
              <p className="mt-3 text-sm text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-rule bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/60 uppercase">
            How it works
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <article key={step.title} className="border-t border-paper/20 pt-5">
                <p className="font-display text-sm text-paper/60">0{i + 1}</p>
                <h3 className="mt-2 font-display text-xl italic text-paper">{step.title}</h3>
                <p className="mt-2 text-sm text-paper/80">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="talk" className="scroll-mt-24 bg-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
          <div>
            <h2 className="text-3xl">Tell us about your room.</h2>
            <p className="mt-4 text-muted">
              A few lines is enough. We will call you back to talk through what you are hearing,
              what you would like to change, and what a sensible next step looks like. Nothing here
              is a price or a quote.
            </p>
            <p className="mt-6 text-sm text-muted">
              Running the rest of the church too?{" "}
              <Link to="/apps" className="text-forest underline-offset-4 hover:underline">
                See our tools for churches
              </Link>{" "}
              — church management, websites, and outreach help.
            </p>
          </div>
          <InvolvementForm intent="av" />
        </div>
      </section>
    </SiteShell>
  );
}
