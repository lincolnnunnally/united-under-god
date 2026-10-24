import data from "@/data/church-av.json";
import { absoluteUrl, ORG_ID } from "@/lib/seo";

/**
 * Church sound, video, and lighting pages (/church-av and its state and city
 * pages). Every project, case study, and quote comes from the installation
 * team's own public record (src/data/church-av.json). Copy never claims work
 * "in" a city unless a project is listed in that city; everything else is
 * computed as "nearby" with an approximate straight-line distance.
 */

export type Faq = { q: string; a: string };
export type ProcessStep = { step: string; lead: string; bullets: string[] };
export type Testimonial = {
  id: string;
  name: string;
  title: string;
  church: string;
  city: string;
  text: string;
};
export type CaseStudy = {
  name: string;
  city: string;
  summary: string;
  highlights: string[];
  tech: string[];
};
export type Service = {
  id: string;
  title: string;
  short: string;
  body: string;
  fits: string[];
  examples: string[];
};
export type Project = {
  church: string;
  city: string;
  state: string;
  group: string;
  lat: number;
  lng: number;
  caseStudy?: string;
};
export type AvState = {
  slug: string;
  name: string;
  abbr: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  groups: string[];
  caseStudies: string[];
  testimonial: string;
  faq: Faq[];
};
export type AvCity = {
  slug: string;
  state: string;
  name: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  intro: string;
  situations: { service: string; text: string }[];
  caseStudies: string[];
  testimonial: string;
  nearby: string[];
  faq: Faq[];
};

const av = data as {
  stats: { value: string; label: string }[];
  process: ProcessStep[];
  testimonials: Testimonial[];
  caseStudies: Record<string, CaseStudy>;
  gear: { category: string; brands: string[] }[];
  services: Service[];
  projects: Project[];
  states: AvState[];
  cities: AvCity[];
};

export const AV_STATS = av.stats;
export const AV_PROCESS = av.process;
export const AV_TESTIMONIALS = av.testimonials;
export const AV_CASE_STUDIES = av.caseStudies;
export const AV_GEAR = av.gear;
export const AV_SERVICES = av.services;
export const AV_PROJECTS = av.projects;
export const AV_STATES = av.states;
export const AV_CITIES = av.cities;

export const SERVICE_TYPE = "Church audio, video, and lighting installation";

/** How the site describes the people who do the work. Never by name. */
export const INSTALLER_LINE =
  "an experienced church audio, video, and lighting team that has served congregations across Georgia and the Southeast";

export function getAvState(slug: string) {
  return AV_STATES.find((s) => s.slug === slug);
}

export function getAvCity(stateSlug: string, citySlug: string) {
  return AV_CITIES.find((c) => c.state === stateSlug && c.slug === citySlug);
}

export function citiesInState(stateSlug: string) {
  return AV_CITIES.filter((c) => c.state === stateSlug);
}

export function projectsInState(abbr: string) {
  return AV_PROJECTS.filter((p) => p.state === abbr);
}

export function getService(id: string) {
  return AV_SERVICES.find((s) => s.id === id);
}

export function getTestimonial(id: string) {
  return AV_TESTIMONIALS.find((t) => t.id === id) ?? AV_TESTIMONIALS[0];
}

export function statePath(state: AvState) {
  return `/church-av/${state.slug}`;
}

export function cityPath(city: AvCity) {
  return `/church-av/${city.state}/${city.slug}`;
}

export function cityLabel(city: AvCity) {
  const state = getAvState(city.state);
  return `${city.name}, ${state?.abbr ?? ""}`;
}

/** Straight-line miles between two points (haversine). */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

/** "about 35 miles": rounded to the nearest 5, never more precise than that. */
export function approxMiles(miles: number) {
  const rounded = Math.max(5, Math.round(miles / 5) * 5);
  return `about ${rounded} miles`;
}

export type NearbyProject = Project & { miles: number; inCity: boolean };

/** Projects listed in this exact city. The only basis for saying "in". */
export function projectsInCity(city: AvCity) {
  const abbr = getAvState(city.state)?.abbr;
  return AV_PROJECTS.filter((p) => p.city === city.name && p.state === abbr);
}

export function nearestProjects(city: AvCity, limit = 5, maxMiles = 125): NearbyProject[] {
  const inCity = new Set(projectsInCity(city));
  return AV_PROJECTS.map((p) => ({ ...p, miles: milesBetween(city, p), inCity: inCity.has(p) }))
    .filter((p) => p.inCity || p.miles <= maxMiles)
    .sort((a, b) => (a.inCity === b.inCity ? a.miles - b.miles : a.inCity ? -1 : 1))
    .slice(0, limit);
}

function listChurches(items: { church: string }[]) {
  const names = items.map((p) => p.church);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Visible FAQ for a city page: two answers computed from the data, then the page's own. */
export function cityFaq(city: AvCity): Faq[] {
  const local = projectsInCity(city);
  const near = nearestProjects(city, 3).filter((p) => !p.inCity);
  const worked: Faq = local.length
    ? {
        q: `Has the installation team worked in ${city.name}?`,
        a: `Yes. ${listChurches(local)} in ${city.name} ${local.length > 1 ? "are" : "is"} on its project list.${
          near.length
            ? ` Nearby, it has also served ${near
                .slice(0, 2)
                .map((p) => `${p.church} in ${p.city} (${approxMiles(p.miles)})`)
                .join(" and ")}.`
            : ""
        }`,
      }
    : {
        q: `Has the installation team worked in ${city.name}?`,
        a: `Not in ${city.name} itself, as far as its project list shows. The nearest completed projects are ${near
          .slice(0, 3)
          .map((p) => `${p.church} in ${p.city}, ${p.state} (${approxMiles(p.miles)})`)
          .join("; ")}. Distances are approximate, in a straight line.`,
      };
  return [
    worked,
    ...city.faq,
    {
      q: "What comes with an installation?",
      a: "Every installation includes training once everything is tested, on-site help the first Sunday, and a 1-year parts and labor warranty. Longer service plans are available.",
    },
    {
      q: "What happens after I send a request?",
      a: "United Under God reads every request and follows up with you personally to talk through your room, what you are hearing, and a sensible next step. Nothing on this page is a price or a quote.",
    },
  ];
}

export const HUB_FAQ: Faq[] = [
  {
    q: "Who does the installation work?",
    a: `The work is done by ${INSTALLER_LINE}. United Under God takes your request and follows up with you personally.`,
  },
  {
    q: "Which areas do you cover?",
    a: "This section focuses on Georgia (starting with South Georgia), Florida, and South Carolina. Churches elsewhere in the Southeast can send a request too.",
  },
  {
    q: "What comes with an installation?",
    a: "Every installation includes training once everything is tested, on-site help the first Sunday, and a 1-year parts and labor warranty. Longer service plans are available.",
  },
  {
    q: "Is there a price on this page?",
    a: "No. Nothing here is a price or a quote. The Dream phase includes initial budgets once the room and the goals are clear.",
  },
];

// ---------------------------------------------------------------- JSON-LD

type JsonLd = Record<string, unknown>;

function statePlace(state: AvState) {
  return { "@type": "State", name: state.name };
}

export function avServiceJsonLd({
  name,
  description,
  path,
  areaServed,
}: {
  name: string;
  description: string;
  path: string;
  areaServed: JsonLd | JsonLd[];
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: absoluteUrl(path),
    serviceType: SERVICE_TYPE,
    provider: { "@id": ORG_ID },
    audience: { "@type": "Audience", audienceType: "Churches" },
    areaServed,
  };
}

export function cityAreaServed(city: AvCity): JsonLd {
  const state = getAvState(city.state)!;
  return { "@type": "City", name: city.name, containedInPlace: statePlace(state) };
}

export function stateAreaServed(state: AvState): JsonLd {
  return statePlace(state);
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Mirrors the visible FAQ exactly; never add a question that is not on the page. */
export function faqJsonLd(faq: Faq[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
