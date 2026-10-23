/**
 * Cross-links from the church AV pages to ChurchConnect's /church-av pages
 * (owner decision, 2026-10-23). United Under God leads the general church
 * sound, livestream, and hearing searches; ChurchConnect's pages cover what
 * ChurchConnect itself does for a church's tech team:
 *
 * - livestream: the watch-live link on the church's ChurchConnect page
 * - booth: the sound booth volunteer schedule and Live Service booth code
 *
 * ChurchConnect has town pages only for these Georgia towns.
 */

export const CHURCHCONNECT_ORIGIN = "https://www.churchconnect.cloud";

export type ChurchConnectTopic = "livestream" | "booth";

const TOPIC_PATH: Record<ChurchConnectTopic, string> = {
  livestream: "church-livestreaming",
  booth: "sanctuary-sound-lighting",
};

const TOPIC_LABEL: Record<ChurchConnectTopic, string> = {
  livestream: "Show your livestream on your ChurchConnect church page",
  booth: "Schedule your sound booth volunteers in ChurchConnect",
};

/** United Under God city slug (Georgia) → ChurchConnect town slug. */
export const CHURCHCONNECT_TOWNS: Record<string, string> = {
  vidalia: "vidalia-ga",
  tifton: "tifton-ga",
  macon: "macon-ga",
  statesboro: "statesboro-ga",
  albany: "albany-ga",
  valdosta: "valdosta-ga",
  savannah: "savannah-ga",
};

export const LANDING_CHURCHCONNECT: Record<string, ChurchConnectTopic[]> = {
  "livestream-ministry": ["livestream"],
};

export const HELP_CHURCHCONNECT: Record<string, ChurchConnectTopic[]> = {
  "livestream-keeps-dropping": ["livestream"],
  "older-members-staying-home": ["livestream"],
  "volunteers-cant-run-the-board": ["booth"],
};

export type ChurchConnectLink = { label: string; href: string };

/** Town pages when ChurchConnect has one for this city, otherwise its /church-av hub. */
export function churchConnectLinks(
  topics: ChurchConnectTopic[],
  city?: { state: string; slug: string; name: string },
): ChurchConnectLink[] {
  const town = city && city.state === "georgia" ? CHURCHCONNECT_TOWNS[city.slug] : undefined;
  return topics.map((topic) => ({
    label: town ? `${TOPIC_LABEL[topic]} (${city!.name})` : TOPIC_LABEL[topic],
    href: town
      ? `${CHURCHCONNECT_ORIGIN}/church-av/${TOPIC_PATH[topic]}/${town}`
      : `${CHURCHCONNECT_ORIGIN}/church-av`,
  }));
}

export function hasChurchConnectTown(city: { state: string; slug: string }) {
  return city.state === "georgia" && Boolean(CHURCHCONNECT_TOWNS[city.slug]);
}
