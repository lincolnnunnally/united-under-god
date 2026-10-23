import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  AvHero,
  CaseStudyCard,
  FaqSection,
  HelpLinks,
  ProcessSection,
  ProjectList,
  RequestSection,
  SectionIntro,
  TestimonialQuote,
} from "@/components/church-av";
import { SiteShell } from "@/components/site-shell";
import {
  AV_SERVICES,
  AV_STATES,
  INSTALLER_LINE,
  avServiceJsonLd,
  breadcrumbJsonLd,
  citiesInState,
  faqJsonLd,
  getAvState,
  projectsInState,
  stateAreaServed,
  statePath,
} from "@/lib/church-av";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/church-av/$state/")({
  component: StatePage,
  loader: ({ params }) => {
    const state = getAvState(params.state);
    if (!state) throw notFound();
    return state;
  },
  head: ({ loaderData: state }) =>
    state
      ? pageHead({
          title: state.title,
          description: state.description,
          path: statePath(state),
          jsonLd: [
            avServiceJsonLd({
              name: `Church sound, video, and lighting in ${state.name}`,
              description: state.description,
              path: statePath(state),
              areaServed: stateAreaServed(state),
            }),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Church sound, video & lighting", path: "/church-av" },
              { name: state.name, path: statePath(state) },
            ]),
            faqJsonLd(state.faq),
          ],
        })
      : { meta: [{ title: "Church sound, video & lighting" }] },
});

function StatePage() {
  const state = Route.useLoaderData();
  const projects = projectsInState(state.abbr);
  const cities = citiesInState(state.slug);
  const others = AV_STATES.filter((s) => s.slug !== state.slug);

  return (
    <SiteShell>
      <AvHero
        eyebrow={`${state.name} · Sound · Livestream · Lighting`}
        title={state.h1}
        crumbs={[
          { name: "Church sound, video & lighting", to: "/church-av" },
          { name: state.name },
        ]}
      >
        <p>{state.lead}</p>
      </AvHero>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <SectionIntro
          eyebrow="Past work"
          title={`Churches the installation team has served in ${state.name}`}
        >
          <p>
            {projects.length} {state.name} churches from the installation team’s own project list.
            The work is done by {INSTALLER_LINE}; United Under God takes your request and follows up
            with you.
          </p>
        </SectionIntro>
        <div className="space-y-8">
          {state.groups.map((group) => {
            const inGroup = projects.filter((p) => p.group === group);
            if (!inGroup.length) return null;
            return (
              <div key={group}>
                <h3 className="font-display text-lg">{group}</h3>
                <div className="mt-3">
                  <ProjectList projects={inGroup} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionIntro
            eyebrow="Cities"
            title={`Church sound, video & lighting by city in ${state.name}`}
          >
            <p>
              Each city page names the real projects in or near that city, with approximate
              distances, and what tends to fit the rooms there.
            </p>
          </SectionIntro>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {cities.map((city) => (
              <li key={city.slug} className="border-t border-rule pt-3">
                <Link
                  to="/church-av/$state/$city"
                  params={{ state: state.slug, city: city.slug }}
                  className="font-display text-lg text-forest underline-offset-4 hover:underline"
                >
                  {city.name}, {state.abbr}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <SectionIntro eyebrow="Case studies" title="Projects the installation team has completed" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {state.caseStudies.map((id) => (
            <CaseStudyCard key={id} id={id} />
          ))}
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionIntro eyebrow="Services" title="What churches ask for" />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {AV_SERVICES.map((service) => (
              <li key={service.id} className="border-t border-rule pt-3">
                <Link
                  to="/church-av"
                  hash={service.id}
                  className="text-forest underline-offset-4 hover:underline"
                >
                  {service.title}
                </Link>
                <p className="mt-1 text-sm text-muted">{service.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HelpLinks title={`Know the problem? Start there.`} />

      <ProcessSection compact />

      <section className="mx-auto max-w-3xl px-5 pt-16 md:px-8 md:pt-20">
        <TestimonialQuote id={state.testimonial} />
      </section>

      <FaqSection faq={state.faq} />

      <RequestSection
        source={{ path: statePath(state), label: `Church AV — ${state.name}` }}
      >
        <p className="mt-6 text-sm text-muted">
          Also see{" "}
          {others.map((s, i) => (
            <span key={s.slug}>
              {i > 0 ? " and " : ""}
              <Link
                to="/church-av/$state"
                params={{ state: s.slug }}
                className="text-forest underline-offset-4 hover:underline"
              >
                {s.name}
              </Link>
            </span>
          ))}
          .
        </p>
      </RequestSection>
    </SiteShell>
  );
}
