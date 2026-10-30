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
 * has its own picture and reading needs, scoped to a wrapper class
 * (`av-look-<look>` in styles.css), in the site's battle-standard colors and
 * type, and the same rules as the rest of /church-av: no installer name, no
 * prices, no ratings, testimonials verbatim from the data.
 */

export type LandingLook = "traditional" | "modern" | "blended" | "livestream" | "newbuild";
export type LandingSlug =
  | "traditional"
  | "modern"
  | "blended"
  | "livestream-ministry"
  | "new-building"
  | "sound"
  | "video"
  | "lighting"
  | "hearing-help"
  | "led-wall";

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
  /** Component pages (sound, video, lighting, hearing help): the problems it ends, shown in the hero. */
  pains?: string[];
  /**
   * Campaign pages (src/lib/campaigns.ts): the church asks for bids instead of
   * a call. The page's form posts a need tagged with this campaign, and the
   * process section shows how the bidding works instead of one team's process.
   */
  campaign?: string;
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
    title: "LED Walls, Lighting & Livestream for Modern Worship | United Under God",
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
        body: "Clear vocals over the band, speakers and earpieces so the band can hear themselves, and a stage that is ready for visiting artists.",
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
        a: "Yes. Equipment is built and set up ahead of time, and the work is done in stages around your services, because Sunday is always coming.",
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
      "Building or remodeling a church: plan the sound, screens, cameras, and lighting with your architect while it is on paper, so no finished wall gets cut.",
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
  // Owner (2026-10-28): a page for each part of the work (sound, video, lighting) and for hearing
  // help, each leading with the problems it ends. The installation team installs hearing loops.
  {
    slug: "sound",
    look: "blended",
    label: "Church sound",
    title: "Church Sound System Installation: Every Word Heard | United Under God",
    description:
      "Church sound system design and installation: clear speech to the back row, no feedback during prayer, and a board volunteers can run, in GA, FL, and SC.",
    serviceName: "Church sound system design, installation, and acoustics",
    eyebrow: "Church sound · Speakers, microphones, mixing, acoustics",
    h1: "Every word heard, from the front pew to the back row.",
    lead: "Clear speech for the sermon, a mix the congregation can sing with, no feedback during prayer, and a board your volunteers can run. Designed for your room and tuned in it.",
    cardTitle: "Sound: every word heard",
    cardBody:
      "Speakers, microphones, a simple board, and room treatment that end feedback and echo.",
    benefitsTitle: "What changes on Sunday",
    benefits: [
      {
        title: "The back row hears the sermon.",
        body: "Speakers chosen and aimed for speech, so the words reach every seat clearly instead of bouncing off the walls and ceiling.",
      },
      {
        title: "No more feedback during prayer.",
        body: "Microphones and speakers placed and tuned so a quiet moment stays quiet, and the system can be turned up without a squeal.",
      },
      {
        title: "Hearing aids without the squeal.",
        body: "Our installation team installs hearing loops that carry the sermon straight to hearing aids, with no room echo in between.",
      },
      {
        title: "Volunteers stop guessing.",
        body: "Saved settings, clear labels, and on-site training, including the first Sunday, so whoever is at the board that week can run it.",
      },
      {
        title: "Echoing rooms, calmed.",
        body: "Sound panels where the room echoes most, so gyms, domes, and hard sanctuaries stop blurring the words.",
      },
    ],
    pains: [
      "Feedback during prayer or the sermon",
      "Members who hear the words but cannot understand them",
      "A sanctuary that echoes",
      "Hearing aids that squeal",
      "Volunteers afraid to touch the board",
    ],
    stages: ["traditional", "blended", "modern"],
    stageTitle: "Built around your platform",
    stageBody:
      "A pulpit and choir, a band, or both: the speakers, microphones, and board are chosen for how your church actually worships.",
    caseStudies: ["mount-vernon", "unity-baptist", "st-jude-the-apostle", "legacy-church"],
    testimonial: "jerry-allen",
    planner: {},
    plannerLabel: "Plan your room",
    faq: [
      {
        q: "Can you fix our sound without replacing everything?",
        a: "Often, yes. Sometimes better-aimed speakers, sound panels, and a properly tuned system solve most of it. We look at the room and what you already own before recommending anything new.",
      },
      {
        q: "Do you install hearing loops?",
        a: "Yes. Our installation team installs hearing loops that send the sermon straight to hearing aids and cochlear implants set to the telecoil, and we help you choose receivers for members without one.",
      },
      {
        q: "Will our volunteers be able to run it?",
        a: "That is the goal. The board is set up with saved settings and clear labels, and your team is trained on-site, including the first Sunday.",
      },
      WARRANTY_FAQ,
      PRICE_FAQ,
    ],
  },
  {
    slug: "video",
    look: "livestream",
    label: "Church video",
    title: "Church Screens, LED Walls, Cameras & Livestream | United Under God",
    description:
      "Church screens, projection, LED walls, cameras, and livestream: lyrics every seat can read and a stream that feels like being there, in GA, FL, and SC.",
    serviceName: "Church projection, LED walls, cameras, and livestream installation",
    eyebrow: "Church video · Screens, projection, LED walls, cameras, livestream",
    h1: "Everyone sees the words. Everyone at home sees the service.",
    lead: "Lyrics and Scripture every seat can read, faces large enough to see in a big room, and a livestream that stays up and sounds like being there.",
    cardTitle: "Video: screens, cameras, livestream",
    cardBody:
      "Projection or an LED wall every seat can read, cameras, and a livestream that stays up.",
    benefitsTitle: "What changes on Sunday",
    benefits: [
      {
        title: "Lyrics every seat can read.",
        body: "Screens sized and placed for your room, and bright enough for it, so nobody squints at washed-out words.",
      },
      {
        title: "An LED wall when projection isn't enough.",
        body: "For bright rooms and wide rooms where projection fades or the back rows cannot see the stage.",
      },
      {
        title: "Faces you can see in a big room.",
        body: "Cameras that put the preacher and the worship team on the big screen, in true color.",
      },
      {
        title: "A livestream that stays up.",
        body: "A stream that doesn't drop or go silent, with sound mixed for home, so homebound members and family far away are truly in the service.",
      },
    ],
    pains: [
      "Lyrics that are hard to read",
      "Projection that washes out in a bright room",
      "Back rows that cannot see the stage",
      "A livestream that drops or goes silent",
      "Cameras that look flat or off-color",
    ],
    stages: ["blended", "modern"],
    stageTitle: "Screens that suit your platform",
    stageBody:
      "Screens at the sides, a large wall behind the stage, or a fellowship hall that needs its own: each is placed for clear sight lines from every seat.",
    caseStudies: ["rock-springs", "word-of-faith", "turning-point-at-calvary", "church-unlimited"],
    testimonial: "tony-yang",
    planner: { livestream: "yes" },
    plannerLabel: "Plan your screens",
    faq: [
      {
        q: "Projection or an LED wall?",
        a: "It depends on the room. Projection suits many sanctuaries and fellowship halls; an LED wall suits bright rooms and wide rooms where projection fades. We'll help you choose for your room and your budget.",
      },
      {
        q: "Can you fix a livestream that keeps dropping?",
        a: "Usually. Drops come from the connection, the encoder, or the settings, and thin sound comes from using the room mix for the stream. Both are fixable.",
      },
      WARRANTY_FAQ,
      PRICE_FAQ,
    ],
  },
  {
    slug: "lighting",
    look: "modern",
    label: "Church lighting",
    title: "Church Stage Lighting: Light That Serves Worship | United Under God",
    description:
      "Church stage lighting that keeps faces out of shadow on the livestream, replaces old hot fixtures, and helps people lift their eyes, in GA, FL, and SC.",
    serviceName: "Church stage and worship lighting installation",
    eyebrow: "Church lighting · Stage, worship, and room lighting",
    h1: "Light that helps people lift their eyes.",
    lead: "Faces lit clearly for the room and the livestream, worship lighting that sets the tone without becoming a concert, and cool, efficient fixtures in place of old hot ones.",
    cardTitle: "Lighting that serves worship",
    cardBody: "Faces out of shadow on the livestream, and lighting that sets the tone for worship.",
    benefitsTitle: "What changes on Sunday",
    benefits: [
      {
        title: "Faces out of shadow.",
        body: "The preacher and the worship team lit evenly, so they look right in the room and on the livestream.",
      },
      {
        title: "Lighting that suits worship.",
        body: "Looks for a quiet hymn and a full-band song, saved so a volunteer recalls them with one button.",
      },
      {
        title: "Old, hot lights replaced.",
        body: "Efficient fixtures that run cooler, last longer, and draw less power.",
      },
      {
        title: "A second room with its own look.",
        body: "A youth room or second venue lit for the way it is used.",
      },
    ],
    pains: [
      "Faces in shadow on the livestream",
      "Old, hot stage lights",
      "A stage that looks flat or dark",
      "A youth room or second venue that needs its own look",
    ],
    stages: ["blended", "modern"],
    stageTitle: "Lighting for your stage",
    stageBody:
      "A simple wash for the pulpit, or color and movement for a band: the lights are chosen for what your services need.",
    caseStudies: ["central-church", "mountain-view-baptist", "mount-vernon"],
    testimonial: "tony-yang",
    planner: {},
    plannerLabel: "Plan your stage",
    faq: [
      {
        q: "We're a traditional church. Is lighting for us?",
        a: "Often, yes. Even a traditional sanctuary benefits from even, warm light on the pulpit and choir, especially if you livestream.",
      },
      {
        q: "Can volunteers run it?",
        a: "Yes. Lighting looks are saved and recalled with a button, and your team is trained on-site.",
      },
      WARRANTY_FAQ,
      PRICE_FAQ,
    ],
  },
  {
    slug: "hearing-help",
    look: "traditional",
    label: "Hearing help",
    title: "Church Hearing Loops: The Sermon Straight to Hearing Aids | United Under God",
    description:
      "Church hearing loops send the sermon straight to hearing aids: no echo, no squeal. We install loops and help you choose receivers, in GA, FL, and SC.",
    serviceName: "Church hearing loop installation and hearing help",
    eyebrow: "Hearing help · Hearing loops, receivers, Auracast",
    h1: "The sermon, straight to their hearing aids.",
    lead: "No echo, no squeal. Our installation team installs hearing loops that carry the sound from your board straight to hearing aids and cochlear implants, so the members who have been faithful the longest hear every word again.",
    cardTitle: "Hearing help: the sermon to their hearing aids",
    cardBody:
      "Hearing loops we install, and receivers for members without a compatible hearing aid.",
    benefitsTitle: "What changes on Sunday",
    benefits: [
      {
        title: "No more squeal or echo.",
        body: "A hearing loop sends the sermon as a magnetic signal straight to hearing aids switched to the telecoil (T) setting, so the room's echo never reaches them.",
      },
      {
        title: "Installed by our team.",
        body: "We plan the loop around your seating and the building, install it, and test it from the pews.",
      },
      {
        title: "Help for everyone else too.",
        body: "Receivers with earbuds at the welcome desk for members whose hearing aids have no telecoil, and Auracast, a newer kind of Bluetooth, as an option we'll help you weigh.",
      },
      {
        title: "Members who stopped coming, back in the pew.",
        body: "Helping them hear again is not a technical upgrade. It is honoring the people who built the church.",
      },
    ],
    pains: [
      "Hearing aids that squeal when the music starts",
      "A sermon that sounds like a blur of echo",
      "Members who stopped wearing their hearing aids in church",
      "Members who stopped coming",
    ],
    stages: ["traditional"],
    stageTitle: "Nothing new to look at",
    stageBody:
      "The loop runs out of sight around the seating, and the sanctuary looks exactly as it did. Only the sound reaching the hearing aids changes.",
    caseStudies: ["st-jude-the-apostle", "mountain-view-baptist", "legacy-church"],
    testimonial: "jerry-allen",
    planner: { style: "traditional" },
    plannerLabel: "Plan your room",
    faq: [
      {
        q: "Will it work with our members' hearing aids?",
        a: "Many hearing aids and cochlear implants have a telecoil (T setting); some need an audiologist to turn it on. For members without one, receivers with earbuds work the same way.",
      },
      {
        q: "Do you install hearing loops?",
        a: "Yes. Our installation team plans, installs, and tests the loop in your sanctuary.",
      },
      {
        q: "Are churches required to provide hearing help?",
        a: "Religious organizations are generally exempt from the ADA's rules on hearing help. Churches add it because they love their members and want every one of them hearing the word.",
      },
      WARRANTY_FAQ,
      PRICE_FAQ,
    ],
  },
  {
    slug: "led-wall",
    look: "modern",
    label: "LED walls, lighting & sound",
    title: "LED Walls, Stage Lighting & Sound for Churches, at a Better Price | United Under God",
    description:
      "An LED wall, stage lighting and sound for your church at a better price. Describe your room once; companies compete for the work; you choose one, or none.",
    serviceName: "LED walls, stage lighting, and sound for churches, competitively bid",
    eyebrow: "LED walls · Stage lighting · Sound",
    h1: "An LED wall, lights and sound for your church, at a better price.",
    lead: "We are United Under God. An LED wall is one of the biggest purchases a church makes, so we help you make it well: tell us about your room once, three companies ready to bid compete for the same work, and you choose the bid that fits, or none.",
    cardTitle: "LED walls, lighting & sound, at a better price",
    cardBody: "Describe your room once. Companies compete for the work, and you choose.",
    benefitsTitle: "What a wall, the right light, and clear sound change on Sunday",
    benefits: [
      {
        title: "Words every seat can read.",
        body: "An LED wall stays bright in a sunlit room, so the lyrics and the Scripture are clear from the back row, not washed out the way projection fades.",
      },
      {
        title: "A backdrop that serves the worship.",
        body: "Song words, sermon points, and a still or moving backdrop that sets the tone of the service, placed so the cross stays at the center.",
      },
      {
        title: "Light that helps people lift their eyes.",
        body: "Warm light on faces, so the preacher and the worship team are seen in the room and on the livestream, without turning Sunday into a concert.",
      },
      {
        title: "Sound the room can sing with.",
        body: "The band and the voices in one clear mix, and a board with saved settings your volunteers can run with confidence.",
      },
    ],
    pains: [
      "Projection that washes out in daylight",
      "Lyrics the back rows cannot read",
      "A dark stage and faces lost on the livestream",
      "A mix that buries the singers",
      "No way to tell whether a price is fair",
    ],
    stages: ["modern"],
    stageTitle: "A wall behind the stage, the cross still at the center",
    stageBody:
      "A video wall across the back of the platform, lights on a frame above the band, and speakers aimed at the seats. Each bid sizes the wall from your room: how far back the last row sits, how wide the stage is, and how much daylight comes in.",
    caseStudies: ["rock-springs", "word-of-faith", "mountain-view-baptist", "level-grove"],
    testimonial: "tony-yang",
    planner: { style: "modern" },
    plannerLabel: "Plan your room first",
    campaign: "led-wall",
    faq: [
      {
        q: "How does this get our church a better price?",
        a: "Competition and one clear scope. We write down your room and what you want once, and the companies compete for the same work, so the bids are easy to compare and nobody can pad a price you cannot check. Churches standing together also make the work worth bidding sharply.",
      },
      {
        q: "Who bids on the work?",
        a: "Church audio, video and lighting companies that serve churches in your area and have agreed to United Under God’s Vendor Terms. Each bid shows the company that wrote it. Until you choose, none of them sees your church’s name or how to reach you.",
      },
      {
        q: "What does it cost to ask for bids?",
        a: "Nothing, and there is no obligation. You see the bids side by side on your own private page and choose one, or tell us none of them fit.",
      },
      {
        q: "Why one scope for all three?",
        a: "So you compare like with like. We write down your room and what you asked for once, and every company bids on that same work. A bid that leaves something out is easy to spot.",
      },
      {
        q: "Projection or an LED wall?",
        a: "Projection suits many sanctuaries and fellowship halls. An LED wall suits bright rooms, wide rooms, and stages where the words have to read from far back. If projection fits your room better, the companies will say so.",
      },
      {
        q: "Will the wall cover the cross?",
        a: "Not unless you want it to. Many churches frame the cross with the wall, keep it in front of the wall, or place the wall to one side. Tell us what matters in your room and it goes into the scope.",
      },
      {
        q: "Can a volunteer team run an LED wall and lights?",
        a: "Yes, when the system is set up for them. Ask for saved settings, labeled controls, and on-site training in the scope, and every bid includes them.",
      },
      {
        q: "Is there a price on this page?",
        a: "No. The bids are the prices, written for your room, and you see all three at once.",
      },
    ],
  },
];

export const LANDING_STYLES: LandingSlug[] = ["traditional", "blended", "modern"];
export const LANDING_OUTCOMES: LandingSlug[] = ["livestream-ministry", "new-building"];
/** One page per part of the work, and hearing help (owner, 2026-10-28). */
export const LANDING_COMPONENTS: LandingSlug[] = ["sound", "video", "lighting", "hearing-help"];
/** Campaign pages: ask three companies to bid (src/lib/campaigns.ts). */
export const LANDING_CAMPAIGNS: LandingSlug[] = ["led-wall"];

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
  "hearing-aids-squeal-or-echo": "hearing-help",
  "livestream-keeps-dropping": "livestream-ministry",
  "older-members-staying-home": "livestream-ministry",
  "planning-a-new-building": "new-building",
};

/** The landing pages use the site's own type (Oswald, Source Sans), so they load no fonts of their own. */
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
