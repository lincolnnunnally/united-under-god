import { LEGAL } from "@/lib/content";

/**
 * Search and share metadata. One production host: the apex 308s to www, so
 * canonicals, sitemap entries, and JSON-LD ids all use www.
 */
export const SITE_URL = "https://www.unitedundergod.org";
export const SITE_NAME = "United Under God";
export const OG_IMAGE = `${SITE_URL}/og.jpg`;
export const ORG_ID = `${SITE_URL}/#organization`;

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path === "/" ? "/" : path.replace(/\/+$/, "")}`;
}

type JsonLd = Record<string, unknown>;

/**
 * A JSON-LD block as a head meta entry. TanStack Router renders
 * `script:ld+json` metas as escaped `<script type="application/ld+json">`,
 * but the React meta typing does not list that key, hence the cast.
 */
export function ldJsonMeta(data: JsonLd) {
  return { "script:ld+json": data } as unknown as { name: string; content: string };
}

/**
 * Who we are, stated only with facts this site already publishes: legal name,
 * 501(c)(3) status, EIN, and Vidalia, Georgia as the home town. No street
 * address, phone, ratings, or awards.
 */
export const ORGANIZATION_JSON_LD: JsonLd = {
  "@context": "https://schema.org",
  "@type": "NGO",
  "@id": ORG_ID,
  name: SITE_NAME,
  legalName: LEGAL.name,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/images/seal.svg`,
  image: OG_IMAGE,
  description:
    "United Under God, Inc. is a 501(c)(3) nonprofit: a movement of Christians, churches, businesses, and charities working together. Based in Vidalia, Georgia.",
  nonprofitStatus: "Nonprofit501c3",
  taxID: LEGAL.ein,
  location: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Vidalia",
      addressRegion: "GA",
      addressCountry: "US",
    },
  },
};

export const WEBSITE_JSON_LD: JsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  publisher: { "@id": ORG_ID },
};

/** A service this organization itself provides (no price unless the code states one). */
export function serviceJsonLd({
  name,
  description,
  path,
  serviceType,
  audience,
  areaServed,
  offers,
}: {
  name: string;
  description: string;
  path: string;
  serviceType?: string;
  audience?: string;
  areaServed?: string;
  offers?: { price: string; description?: string };
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: absoluteUrl(path),
    provider: { "@id": ORG_ID },
    ...(serviceType ? { serviceType } : {}),
    ...(audience ? { audience: { "@type": "Audience", audienceType: audience } } : {}),
    ...(areaServed ? { areaServed: { "@type": "City", name: areaServed } } : {}),
    ...(offers
      ? {
          offers: {
            "@type": "Offer",
            price: offers.price,
            priceCurrency: "USD",
            ...(offers.description ? { description: offers.description } : {}),
          },
        }
      : {}),
  };
}

/**
 * Per-page head: unique title + description, canonical on www, and the share
 * metas (src/lib/og/site.json sets `pageMeta` so the platform keeps them and
 * only adds the card image). Pass `noindex` for private or utility pages.
 */
export function pageHead({
  title,
  description,
  path,
  jsonLd = [],
  noindex = false,
  type = "website",
}: {
  title: string;
  description?: string;
  path: string;
  jsonLd?: JsonLd[];
  noindex?: boolean;
  type?: "website" | "article";
}) {
  const url = absoluteUrl(path);
  return {
    meta: [
      { title },
      ...(description ? [{ name: "description", content: description }] : []),
      ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      { property: "og:title", content: title },
      ...(description ? [{ property: "og:description", content: description }] : []),
      { property: "og:url", content: url },
      { property: "og:type", content: type },
      { property: "og:site_name", content: SITE_NAME },
      { name: "twitter:title", content: title },
      ...(description ? [{ name: "twitter:description", content: description }] : []),
      ...jsonLd.map(ldJsonMeta),
    ],
    links: noindex ? [] : [{ rel: "canonical", href: url }],
  };
}
