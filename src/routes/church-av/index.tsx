import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AvHero,
  CaseStudyCard,
  FaqSection,
  GearList,
  HelpLinks,
  ProcessSection,
  RequestSection,
  SectionIntro,
  StatsRow,
  TestimonialQuote,
} from "@/components/church-av";
import { SiteShell } from "@/components/site-shell";
import {
  AV_CASE_STUDIES,
  AV_SERVICES,
  AV_STATES,
  AV_TESTIMONIALS,
  HUB_FAQ,
  INSTALLER_LINE,
  avServiceJsonLd,
  breadcrumbJsonLd,
  citiesInState,
  faqJsonLd,
  projectsInState,
  stateAreaServed,
} from "@/lib/church-av";
import { pageHead } from "@/lib/seo";

const PATH = "/church-av";
const DESCRIPTION =
  "Church sound systems, livestream setup, stage lighting, LED walls, projection, and acoustic treatment for churches in Georgia, Florida, and South Carolina.";

export const Route = createFileRoute("/church-av/")({
  component: ChurchAvPage,
  head: () =>
    pageHead({
      title: "Church Sound, Livestream & Lighting | United Under God",
      description: DESCRIPTION,
      path: PATH,
      jsonLd: [
        avServiceJsonLd({
          name: "Church sound, livestream, and lighting",
          description:
            "Sound, livestream, lighting, LED, projection, broadcast, and acoustic treatment planned and installed for church sanctuaries, with volunteers trained on-site.",
          path: PATH,
          areaServed: AV_STATES.map(stateAreaServed),
        }),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Church sound, video & lighting", path: PATH },
        ]),
        faqJsonLd(HUB_FAQ),
      ],
    }),
});

const PAINS = [
  { text: "Feedback squeals during the prayer.", slug: "feedback-during-the-sermon" },
  { text: "Older members can’t hear the sermon.", slug: "hearing-aids-squeal-or-echo" },
  { text: "The livestream drops right at the invitation.", slug: "livestream-keeps-dropping" },
  {
    text: "One volunteer is the only person who knows how the board works.",
    slug: "volunteers-cant-run-the-board",
  },
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

const FEATURED = ["word-of-faith", "rock-springs", "level-grove", "unity-baptist"];

function ChurchAvPage() {
  return (
    <SiteShell>
      <AvHero
        eyebrow="For churches · Sound · Livestream · Lighting"
        title="Every word heard. Every Sunday."
      >
        <p>
          Clear sound, a steady livestream, and lighting that works — planned and installed for your
          sanctuary, with your volunteers trained before the first Sunday. For churches in Georgia,
          Florida, and South Carolina.
        </p>
      </AvHero>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <h2 className="text-3xl">You shouldn’t have to be the sound guy too.</h2>
          <p className="mt-5 text-muted">
            You already carry the whole church. When the system fights you every week, the message
            is what suffers — in the room and for everyone watching from home. This is one thing you
            can hand off.
          </p>
        </div>
        <ul className="space-y-3">
          {PAINS.map((pain) => (
            <li key={pain.slug} className="border-l-2 border-forest pl-4 text-ink">
              <Link
                to="/church-av/help/$slug"
                params={{ slug: pain.slug }}
                className="underline-offset-4 hover:text-forest hover:underline"
              >
                {pain.text}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <HelpLinks />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionIntro eyebrow="What changes" title="A system your church can count on." />
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

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <SectionIntro title="Small sanctuary or new building">
          <p>
            Whether you need one microphone that finally works or a full system for a new building,
            the work is done by {INSTALLER_LINE}. United Under God takes your request and follows up
            with you personally.
          </p>
        </SectionIntro>
        <div>
          <StatsRow />
          <p className="mt-3 text-xs text-muted">As reported by the installation team.</p>
        </div>
      </section>

      <section id="services" className="scroll-mt-24 border-t border-rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionIntro eyebrow="Services" title="What the installation team builds">
            <p>Jump to: </p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {AV_SERVICES.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-forest underline-offset-4 hover:underline"
                >
                  {s.short}
                </a>
              ))}
            </p>
          </SectionIntro>
          <div className="mt-10 space-y-10">
            {AV_SERVICES.map((service) => (
              <article
                key={service.id}
                id={service.id}
                className="grid scroll-mt-24 gap-6 border-t border-rule pt-8 md:grid-cols-2"
              >
                <div>
                  <h3 className="font-display text-2xl">{service.title}</h3>
                  <p className="mt-3 text-muted">{service.body}</p>
                  <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-forest uppercase">
                    It fits when
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-ink">
                    {service.fits.map((fit) => (
                      <li key={fit}>· {fit}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-forest uppercase">
                    Past work by the installation team
                  </p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {service.examples.map((id) => {
                      const study = AV_CASE_STUDIES[id];
                      return study ? (
                        <li key={id} className="border-l-2 border-forest pl-3">
                          <span className="text-ink">
                            {study.name}, {study.city}
                          </span>
                          <span className="block text-muted">{study.summary}</span>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ProcessSection />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <SectionIntro eyebrow="Case studies" title="Projects the installation team has completed">
          <p>
            A few of the churches it has served, in its own project record. More are listed on the
            state pages below.
          </p>
        </SectionIntro>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {FEATURED.map((id) => (
            <CaseStudyCard key={id} id={id} />
          ))}
        </div>
      </section>

      <section className="border-y border-rule bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionIntro
            eyebrow="In their words"
            title="What church staff say about the installation team"
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {AV_TESTIMONIALS.map((t) => (
              <TestimonialQuote key={t.id} id={t.id} />
            ))}
          </div>
        </div>
      </section>

      <section id="states" className="scroll-mt-24 mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <SectionIntro eyebrow="Where" title="Georgia, Florida, and South Carolina">
          <p>
            Each state page lists the real churches the installation team has served there, with
            city pages.
          </p>
        </SectionIntro>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {AV_STATES.map((state) => (
            <article
              key={state.slug}
              className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]"
            >
              <h3 className="font-display text-xl">
                <Link
                  to="/church-av/$state"
                  params={{ state: state.slug }}
                  className="text-forest underline-offset-4 hover:underline"
                >
                  Church sound, video & lighting in {state.name}
                </Link>
              </h3>
              <p className="mt-2 text-sm text-muted">
                {projectsInState(state.abbr).length} churches served in {state.name} ·{" "}
                {citiesInState(state.slug).length} city pages
              </p>
              <p className="mt-3 text-sm">
                {citiesInState(state.slug).map((city, i) => (
                  <span key={city.slug}>
                    {i > 0 ? " · " : ""}
                    <Link
                      to="/church-av/$state/$city"
                      params={{ state: state.slug, city: city.slug }}
                      className="text-ink underline-offset-4 hover:underline"
                    >
                      {city.name}
                    </Link>
                  </span>
                ))}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionIntro eyebrow="Equipment" title="Brands the installation team works with" />
          <div className="mt-8">
            <GearList />
          </div>
        </div>
      </section>

      <FaqSection faq={HUB_FAQ} />

      <RequestSection source={{ path: PATH, label: "Church sound, video & lighting" }} />
    </SiteShell>
  );
}
