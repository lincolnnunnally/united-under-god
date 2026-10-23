import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  AvHero,
  CaseStudyCard,
  ChurchConnectLinks,
  FaqSection,
  HelpLinks,
  ProcessSection,
  ProjectList,
  RequestSection,
  SectionIntro,
  SituationList,
  TestimonialQuote,
} from "@/components/church-av";
import { SiteShell } from "@/components/site-shell";
import {
  AV_CASE_STUDIES,
  AV_CITIES,
  AV_PROJECTS,
  INSTALLER_LINE,
  approxMiles,
  avServiceJsonLd,
  breadcrumbJsonLd,
  cityAreaServed,
  cityFaq,
  cityLabel,
  cityPath,
  faqJsonLd,
  getAvCity,
  getAvState,
  milesBetween,
  nearestProjects,
  projectsInCity,
  statePath,
} from "@/lib/church-av";
import { churchConnectLinks, hasChurchConnectTown } from "@/lib/church-av-churchconnect";
import { helpForServices } from "@/lib/church-av-help";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/church-av/$state/$city")({
  component: CityPage,
  loader: ({ params }) => {
    const city = getAvCity(params.state, params.city);
    const state = getAvState(params.state);
    if (!city || !state) throw notFound();
    return { city, state };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Church sound, video & lighting" }] };
    const { city, state } = loaderData;
    return pageHead({
      title: city.title,
      description: city.description,
      path: cityPath(city),
      jsonLd: [
        avServiceJsonLd({
          name: `Church sound, video, and lighting in ${cityLabel(city)}`,
          description: city.description,
          path: cityPath(city),
          areaServed: cityAreaServed(city),
        }),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Church sound, video & lighting", path: "/church-av" },
          { name: state.name, path: statePath(state) },
          { name: city.name, path: cityPath(city) },
        ]),
        faqJsonLd(cityFaq(city)),
      ],
    });
  },
});

function CityPage() {
  const { city, state } = Route.useLoaderData();
  const label = cityLabel(city);
  const local = projectsInCity(city);
  const nearby = nearestProjects(city, 5);
  const faq = cityFaq(city);
  const neighbors = city.nearby
    .map((slug) => AV_CITIES.find((c) => c.slug === slug))
    .filter((c): c is (typeof AV_CITIES)[number] => Boolean(c));

  return (
    <SiteShell>
      <AvHero
        eyebrow={`${label} · Sound · Livestream · Lighting`}
        title={`Church sound, video & lighting for ${label}`}
        crumbs={[
          { name: "Church sound, video & lighting", to: "/church-av" },
          { name: state.name, to: "/church-av/$state", params: { state: state.slug } },
          { name: city.name },
        ]}
      >
        <p>{city.intro}</p>
      </AvHero>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <SectionIntro
          eyebrow="Past work nearby"
          title={
            local.length
              ? `The installation team has completed work in ${city.name}`
              : `Nearest projects to ${city.name}`
          }
        >
          <p>
            {local.length
              ? `${local.map((p) => p.church).join(" and ")} ${local.length > 1 ? "are" : "is"} on its project list, along with the nearby churches shown here.`
              : `No ${city.name} church is on the installation team’s project list yet. These are the closest it has served.`}{" "}
            Distances are approximate, in a straight line. The work is done by {INSTALLER_LINE}.
          </p>
        </SectionIntro>
        <ProjectList projects={nearby} />
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <SectionIntro
            eyebrow={`Common in ${city.name}`}
            title="Which service fits your situation"
          />
          <div className="mt-10">
            <SituationList items={city.situations} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <SectionIntro eyebrow="Case studies" title="Projects the installation team has completed">
          <p>Chosen for the situations above. Each one names where it is.</p>
        </SectionIntro>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {city.caseStudies.map((id) => {
            const project = AV_PROJECTS.find((p) => p.caseStudy === id);
            // In-city and far-away projects show only their city; nearby ones an approximate distance.
            const miles = project ? milesBetween(city, project) : Infinity;
            const distance =
              !project || local.includes(project) || miles > 150
                ? undefined
                : `${approxMiles(miles)} away`;
            return AV_CASE_STUDIES[id] ? (
              <CaseStudyCard key={id} id={id} distance={distance} />
            ) : null;
          })}
        </div>
      </section>

      <HelpLinks
        pages={helpForServices(city.situations.map((s) => s.service))}
        title="Know the problem? Start there."
        eyebrow={`Help for churches in and around ${city.name}`}
      />

      {hasChurchConnectTown(city) ? (
        <ChurchConnectLinks
          title={`Already on ChurchConnect in ${city.name}?`}
          links={churchConnectLinks(["livestream", "booth"], city)}
        />
      ) : null}

      <ProcessSection compact />

      <section className="mx-auto max-w-3xl px-5 pt-16 md:px-8 md:pt-20">
        <TestimonialQuote id={city.testimonial} />
      </section>

      <FaqSection faq={faq} title={`Questions from churches in ${city.name}`} />

      <RequestSection
        heading={`Tell us about your room in ${city.name}.`}
        defaultCity={label}
        source={{ path: cityPath(city), label: `Church AV — ${label}` }}
      >
        <p className="mt-6 text-sm text-muted">
          More in{" "}
          <Link
            to="/church-av/$state"
            params={{ state: state.slug }}
            className="text-forest underline-offset-4 hover:underline"
          >
            {state.name}
          </Link>
          {neighbors.length ? " · Nearby: " : ""}
          {neighbors.map((n, i) => (
            <span key={n.slug}>
              {i > 0 ? ", " : ""}
              <Link
                to="/church-av/$state/$city"
                params={{ state: n.state, city: n.slug }}
                className="text-forest underline-offset-4 hover:underline"
              >
                {cityLabel(n)}
              </Link>
            </span>
          ))}
        </p>
      </RequestSection>
    </SiteShell>
  );
}
