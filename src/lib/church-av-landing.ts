import {
  AV_STATES,
  avServiceJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  stateAreaServed,
  type Faq,
} from "@/lib/church-av";
import type { PlannerSearch, Style } from "@/lib/church-av-planner";
import { pageHead } from "@/lib/seo";

/**
 * Church AV landing pages: one per worship style (traditional, blended,
 * modern) and one per outcome (livestream ministry, new building). Each page
 * has its own look, scoped to a wrapper class (`av-look-<look>` in
 * styles.css), and the same rules as the rest of /church-av: no installer
 * name, no prices, no ratings, testimonials verbatim from the data.
 */

export type LandingLook = "traditional" | "modern" | "blended" | "livestream" | "newbuild";
export type LandingSlug =
  "traditional" | "modern" | "blended" | "livestream-ministry" | "new-building";

export type Benefit = { title: string; body: string };

export type LandingPage = {
  slug: LandingSlug;
  look: LandingLook;
  label: string;
  title: string;
  description: string;
  serviceName: string;
  eyebrow: string;
  h1: string;
  lead: string;
  cardTitle: string;
  cardBody: string;
  benefitsTitle: string;
  benefits: Benefit[];
  stages: Style[];
  stageTitle: string;
  stageBody: string;
  caseStudies: string[];
  testimonial: string;
  planner: PlannerSearch;
  plannerLabel: string;
  faq: Faq[];
};

const WARRANTY_FAQ: Faq = {
  q: "What happens after the installation?",
  a: "Every installation includes training once everything is tested, on-site help the first Sunday, and a 1-year parts and labor warranty. Longer service plans are available.",
};

const PRICE_FAQ: Faq = {
  q: "Is there a price on this page?",
  a: "No. Nothing here is a price or a quote. The Dream phase includes initial budgets once the room and the goals are clear, and the work can be phased so it fits how your church gives.",
};

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "traditional",
    look: "traditional",
    label: "Traditional sanctuaries",
    title: "Sound for Traditional Sanctuaries: Hear Every Word | United Under God",
    description:
      "Clear sound, discreet microphones and cameras, and help with hearing aids for traditional churches, without changing how the sanctuary looks.",
    serviceName: "Sound, hearing help, and discreet cameras for traditional sanctuaries",
    eyebrow: "For traditional churches · Hymns, choir, pulpit",
    h1: "Hear every word, keep your sanctuary.",
    lead: "Clear sound for the sermon and the choir, help for members with hearing aids, and quiet cameras for those who worship from home. The pews, the windows, and the front of the church stay exactly as they are.",
    cardTitle: "Hear every word, keep your sanctuary",
    cardBody:
      "Hymns, choir, and pulpit. Clearer sound and hearing help with nothing new to look at.",
    benefitsTitle: "Everyone in the pews, hearing the Word again",
    benefits: [
      {
        title: "Older members hear the sermon again.",
        body: "Speakers chosen and aimed for speech, so the words land on the pews and not on the plaster. The members who have sat in the same pew for forty years stop missing the Scripture reading.",
      },
      {
        title: "Hearing aids without the squeal.",
        body: "Much of the squeal and echo comes from the room, not the hearing aid. There are listening helps that send the sermon straight to a hearing aid or a small receiver, and we’ll help you choose the right option for your sanctuary.",
      },
      {
        title: "Homebound members, back in the service.",
        body: "Small cameras placed where nobody looks, and a steady stream, so shut-ins and family far away can join the hymns and hear the sermon on Sunday morning.",
      },
      {
        title: "Nothing changes about how the room looks.",
        body: "No screen behind the pulpit. Speakers kept discreet and finished to suit the room. And a simple, labeled board your volunteers can run with confidence.",
      },
    ],
    stages: ["traditional"],
    stageTitle: "Your platform, as it is",
    stageBody:
      "Pulpit, lectern, and choir, with the cross and the window left alone. The speakers sit quietly at the sides, and the help for hearing aids reaches the front pews without anything new to see.",
    caseStudies: ["immaculate-heart-of-mary", "st-jude-the-apostle", "madison-methodist"],
    testimonial: "jerry-allen",
    planner: { style: "traditional" },
    plannerLabel: "Plan your room",
    faq: [
      {
        q: "Will we have to put up a screen?",
        a: "No. Many traditional churches never add one. The work is about sound, hearing help, and discreet cameras, and the front of the sanctuary stays as it is.",
      },
      {
        q: "Can you help members whose hearing aids squeal or echo?",
        a: "Yes. The first step is often the room and the speakers. Beyond that there are listening helps, such as a hearing loop, Auracast (a newer kind of Bluetooth), or receivers handed out at the door, and we’ll help you choose the right option for your congregation.",
      },
      {
        q: "Are churches required to provide hearing help?",
        a: "Religious organizations are generally exempt from the ADA’s rules on hearing help. Many churches provide it anyway, because the members who need it most are often the ones who have been faithful the longest.",
      },
      {
        q: "Will our volunteers be able to run it?",
        a: "That is the goal. The system is set up with saved settings and clear labels, and your team is trained on-site, including the first Sunday.",
      },
      WARRANTY_FAQ,
      PRICE_FAQ,
    ],
  },
  {
    slug: "modern",
    look: "modern",
    label: "Modern worship",
    title: "LED Walls, Lighting & Broadcast for Modern Worship | United Under God",
    description:
      "LED walls, stage lighting, a band mix that works, and cameras and livestreaming for churches building a modern worship experience in the Southeast.",
    serviceName: "LED walls, stage lighting, band sound, and livestream for modern worship",
    eyebrow: "For modern worship · Band, lights, LED walls, livestream",
    h1: "Create an atmosphere for worship.",
    lead: "An LED wall that carries the lyrics and the message, lighting that helps people lift their eyes, a band mix the room can sing with, and a livestream that feels like being there.",
    cardTitle: "Create an atmosphere for worship",
    cardBody: "A band, an LED wall, stage lighting, and a livestream that feels like being there.",
    benefitsTitle: "Remove the distractions. Make room for worship.",
    benefits: [
      {
        title: "An LED wall that serves the moment.",
        body: "Lyrics everyone can read, Scripture on the screen as it is preached, and a backdrop that sets the tone of the service, placed so every seat can see it.",
      },
      {
        title: "Lighting that draws eyes upward.",
        body: "Stage lighting with saved looks, so a volunteer can move from a quiet prayer to a full chorus with one button.",
      },
      {
        title: "A band mix the room can sing with.",
        body: "Clear vocals over the band, in-ear and wedge monitoring the band can trust, and a stage that is ready for visiting artists.",
      },
      {
        title: "Cameras for the big screen and the livestream.",
        body: "Several cameras, so the person in the back row and the person at home both see the face of the one leading worship.",
      },
    ],
    stages: ["modern"],
    stageTitle: "A stage built for atmosphere",
    stageBody:
      "A large video wall across the back of the stage, lights hung on a frame above the band, and the cross still at the center.",
    caseStudies: ["word-of-faith", "rock-springs", "church-unlimited", "mountain-view-baptist"],
    testimonial: "tony-yang",
    planner: { style: "modern" },
    plannerLabel: "Plan your room",
    faq: [
      {
        q: "Can a volunteer team run lighting and an LED wall?",
        a: "Yes, when the system is set up for them. Saved settings and labeled controls mean volunteers run the service, and the team is trained on-site before the first Sunday.",
      },
      {
        q: "Do we need a TV-studio setup to stream well?",
        a: "Not always. Some churches start with a few cameras and a simple, reliable streaming setup and grow from there. The Dream phase sorts out what fits your church now and later.",
      },
      {
        q: "Can the work happen without missing a service?",
        a: "Yes. Systems are pre-built and pre-programmed off site, and installation is phased around your services, because Sunday is always coming.",
      },
      WARRANTY_FAQ,
      PRICE_FAQ,
    ],
  },
  {
    slug: "blended",
    look: "blended",
    label: "Blended worship",
    title: "Blended Worship Sound & Side Screens for Churches | United Under God",
    description:
      "Side screens, a choir and a band in one clear mix, and a system volunteers can run, for churches that sing the hymns and the newer songs together.",
    serviceName: "Sound, side screens, and choir and band mixing for blended worship",
    eyebrow: "For blended worship · Hymns and newer songs",
    h1: "Room for the hymns and the band.",
    lead: "Lyrics on side screens that leave the cross in view, the choir and the band heard together in one mix, and a sound board your volunteers understand.",
    cardTitle: "Room for the hymns and the band",
    cardBody: "Side screens, a choir and a band in one mix, and the cross kept in view.",
    benefitsTitle: "One service, every generation singing",
    benefits: [
      {
        title: "Side screens that keep the cross in view.",
        body: "Lyrics and Scripture where everyone can read them, placed at the sides so the center of the platform stays clear.",
      },
      {
        title: "The choir and the band, heard together.",
        body: "Choir microphones that pick up voices, not the drums, and a mix where the organ, piano, and guitars each have their place.",
      },
      {
        title: "Clear for the older members, full for the younger ones.",
        body: "Speech that is easy to follow from every pew, and music with enough body that the whole room wants to sing.",
      },
      {
        title: "A board volunteers can run.",
        body: "Presets for the hymn, the band set, and the sermon, labeled in plain words, with your team trained on-site the first Sunday.",
      },
    ],
    stages: ["blended"],
    stageTitle: "Side screens, choir, and a small band",
    stageBody:
      "Screens at the sides for the lyrics, the piano and a small band on one side of the platform, and the pulpit and the cross at the center.",
    caseStudies: ["unity-baptist", "mount-vernon", "level-grove"],
    testimonial: "jerry-allen",
    planner: { style: "blended" },
    plannerLabel: "Plan your room",
    faq: [
      {
        q: "Where should the screens go in a blended service?",
        a: "Usually at the sides, so the lyrics are easy to read and the cross and the pulpit stay at the center. Sightlines are checked from the pews before anything is hung.",
      },
      {
        q: "Can the choir and the band share one sound system?",
        a: "Yes. It takes the right choir microphones, careful placement, and a mix that is set up for both, with saved settings so volunteers can switch between them.",
      },
      {
        q: "We are not sure if we are traditional or blended. Does it matter?",
        a: "Not much. The Church Room Planner asks how you worship and suggests a starting point, and the Dream phase shapes the plan around your own services.",
      },
      WARRANTY_FAQ,
      PRICE_FAQ,
    ],
  },
  {
    slug: "livestream-ministry",
    look: "livestream",
    label: "Livestream ministry",
    title: "Church Livestream for Homebound Members & Family | United Under God",
    description:
      "A steady livestream with clear sound and discreet cameras, so homebound members and family far away can worship with your church every Sunday.",
    serviceName: "Church livestream and broadcast setup",
    eyebrow: "Livestream ministry · For the people who cannot be in the room",
    h1: "Bring the service to everyone who can’t be there.",
    lead: "Homebound members, a son overseas, a nurse on the Sunday shift. A livestream that stays up, sounds like the room, and is simple enough for a volunteer to start on time.",
    cardTitle: "Reach the homebound and family far away",
    cardBody: "A steady stream with clear sound, so nobody misses Sunday.",
    benefitsTitle: "A ministry, not just a camera",
    benefits: [
      {
        title: "A stream that stays up through the invitation.",
        body: "A dedicated, tested network path and a streaming chain built for reliability, so the stream does not drop at the moment that matters most.",
      },
      {
        title: "Sound that sounds like the room.",
        body: "A separate mix for the stream, so the sermon is clear and the singing is full for someone listening on a tablet at home.",
      },
      {
        title: "Cameras nobody in the pews notices.",
        body: "Small remote-controlled cameras placed to show the pulpit, the choir, and the table without changing how the sanctuary looks.",
      },
      {
        title: "One button for the volunteer.",
        body: "Start, stop, and camera positions saved in advance and labeled, with your team trained on-site.",
      },
    ],
    stages: ["traditional", "blended", "modern"],
    stageTitle: "Every style of worship can be shared",
    stageBody:
      "Whether your platform has a choir loft, side screens, or an LED wall, the cameras and the stream mix are planned around it.",
    caseStudies: [
      "word-of-faith",
      "turning-point-at-calvary",
      "st-jude-the-apostle",
      "unity-baptist",
    ],
    testimonial: "jerry-allen",
    planner: { livestream: "yes" },
    plannerLabel: "Plan your livestream",
    faq: [
      {
        q: "Why does our livestream keep dropping?",
        a: "Usually it is the internet connection, the streaming box, or the computer doing too much at once. A dedicated, tested connection for the stream and a simpler streaming setup fix most of it.",
      },
      {
        q: "Will cameras change how our sanctuary looks?",
        a: "They do not have to. Small remote-controlled cameras can be mounted where nobody looks, and a volunteer controls them from the booth.",
      },
      {
        q: "Why does the stream sound worse than the room?",
        a: "The room mix is made for the room. A stream needs its own mix, so the sermon and the singing come through clearly on a phone or a tablet.",
      },
      WARRANTY_FAQ,
      PRICE_FAQ,
    ],
  },
  {
    slug: "new-building",
    look: "newbuild",
    label: "New buildings",
    title: "Church AV Design for New Buildings & Renovations | United Under God",
    description:
      "Building or remodeling a church? Plan the sound system, screens, cameras, and lighting with your architect while the building is still on paper, so nothing has to be cut into a finished wall.",
    serviceName: "Audio, video, and lighting design for new church buildings",
    eyebrow: "New building or remodel",
    h1: "Building or remodeling? Plan the sound now.",
    lead: "Where the speakers hang, where the screens and cameras go, and how the wires reach them all need to be in the building plans. Once the walls and ceilings are finished, adding them means cutting into new walls. We sit down with your architect now, while changes are still easy.",
    cardTitle: "Planning a new building",
    cardBody: "Plan the sound, screens, and lighting with your architect before anything is built.",
    benefitsTitle: "A building that serves the ministry from the first Sunday",
    benefits: [
      {
        title: "In the plans, not added later.",
        body: "Speakers, screens, cameras, and the wiring for them are drawn into the plans with your architect and builder, so nothing has to be cut into a finished wall.",
      },
      {
        title: "A room shaped for speech and song.",
        body: "The shape of the room and what its walls are made of decide how it sounds. We plan them with you, so the sermon is clear and the singing still feels full.",
      },
      {
        title: "Every room connected.",
        body: "The service can be heard and seen in the lobby, the classrooms, and the nursery, not only in the sanctuary.",
      },
      {
        title: "Ready for opening day.",
        body: "Everything is tested before the doors open, and your volunteers know how to run it on the first Sunday.",
      },
    ],
    stages: ["traditional", "blended", "modern"],
    stageTitle: "Whatever the platform will be",
    stageBody:
      "A pulpit and a choir, screens at the sides, or a large video wall behind the stage: each needs its own mounting, power, and clear view from the seats, and each is far easier to plan on paper than to add later.",
    caseStudies: [
      "lake-point-community-church",
      "lakeside-church",
      "central-church",
      "freedom-church",
    ],
    testimonial: "tony-yang",
    planner: { building: "new-building" },
    plannerLabel: "Plan your new room",
    faq: [
      {
        q: "When should we bring in sound, video, and lighting?",
        a: "As early as you can, while the architect is still drawing. Where the speakers, cameras, and screens go, and how power and wires reach them, is easy to plan now and hard to add once the walls are finished.",
      },
      {
        q: "Can you work with our architect and builder?",
        a: "Yes. We give your architect and builder what they need: drawings of what hangs from the ceiling and the power it needs, how much heat the equipment gives off for the air conditioning, and a complete equipment list. Then we work alongside the other trades.",
      },
      {
        q: "Can we reuse equipment we already own?",
        a: "Often, yes. Central Church in Covington, Georgia moved its own sound and lighting equipment into the new sanctuary and added a new mixing board and new room lights.",
      },
      WARRANTY_FAQ,
      PRICE_FAQ,
    ],
  },
];

export const LANDING_STYLES: LandingSlug[] = ["traditional", "blended", "modern"];
export const LANDING_OUTCOMES: LandingSlug[] = ["livestream-ministry", "new-building"];

export function getLanding(slug: LandingSlug) {
  return LANDING_PAGES.find((p) => p.slug === slug)!;
}

export function landingPath(page: { slug: string }) {
  return `/church-av/${page.slug}`;
}

/** The style page for a planner answer. */
export function landingForStyle(style: Style) {
  return getLanding(style);
}

/** Help pages that point to a landing page. */
export const HELP_LANDING: Record<string, LandingSlug> = {
  "traditional-sanctuary-without-a-big-screen": "traditional",
  "hearing-aids-squeal-or-echo": "traditional",
  "livestream-keeps-dropping": "livestream-ministry",
  "older-members-staying-home": "livestream-ministry",
  "planning-a-new-building": "new-building",
};

export function landingHead(page: LandingPage) {
  const path = landingPath(page);
  return pageHead({
    title: page.title,
    description: page.description,
    path,
    jsonLd: [
      avServiceJsonLd({
        name: page.serviceName,
        description: page.description,
        path,
        areaServed: AV_STATES.map(stateAreaServed),
      }),
      faqJsonLd(page.faq),
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Church sound, video & lighting", path: "/church-av" },
        { name: page.label, path },
      ]),
    ],
  });
}
