/**
 * Sanctuary AVL content (owner, 2026-11-20): church audio, video and lighting
 * under its own name. We bring churches to experienced installers and the
 * installer designs, quotes and installs; Sanctuary AVL is paid by the installer.
 *
 * Owner rules for this brand:
 * - Never name, link or picture a partner company. Speak to what they bring:
 *   church installers with nearly 30 years of church work, nationwide.
 * - Not only for big churches: a room of about 300 seats can carry a full
 *   modern system (the owner has seen it), so the guides start there and
 *   speak to the rooms below it too.
 * - Ballpark prices are wanted. Every amount is a typical range, never a
 *   quote, and every page that shows one says the walkthrough sets the real
 *   number (BALLPARK_NOTE). Ranges are pending the installer's review.
 * - The copy rules of the church AV pages hold here too, except for prices
 *   (checked by scripts/sanctuary-avl.test.mjs).
 *
 * Imported by node's test runner: no framework code, relative imports only.
 */

export const AVL_NAME = "Sanctuary AVL";
export const AVL_TAGLINE = "Sound, lighting and video for the room where your church worships.";

/** What the installers behind us bring, said without naming them. */
export const INSTALLER_PROMISES = [
  {
    title: "Nearly 30 years of church work",
    body: "The teams we bring in have spent close to three decades designing and installing systems in sanctuaries, not arenas or bars. They know a pulpit, a baptistry and a volunteer on a Sunday morning.",
  },
  {
    title: "Nationwide",
    body: "Wherever your church is, a church installation team can walk your room, design for it and install it.",
  },
  {
    title: "One plan, one team",
    body: "Sound, lighting, cameras, livestream and LED walls designed together, so every part works with the others and your volunteers learn one system.",
  },
  {
    title: "Trained volunteers",
    body: "A system is only as good as the person running it on Sunday. Training for your team is part of the work.",
  },
];

export const BALLPARK_NOTE =
  "Ballpark ranges for planning only, not a quote. The walkthrough of your room sets the real number.";

export type SystemKey = "sound" | "lighting" | "video" | "ledWall";

export const SYSTEMS: { key: SystemKey; label: string; covers: string }[] = [
  {
    key: "sound",
    label: "Sound",
    covers:
      "Speakers aimed at the seats, a digital mixer, microphones, monitors or in-ear mixes, and the cable, power and install.",
  },
  {
    key: "lighting",
    label: "Stage lighting",
    covers:
      "Front light for faces on camera, stage wash and color, house lights on a dimmer, and a simple console with saved looks.",
  },
  {
    key: "video",
    label: "Cameras & livestream",
    covers:
      "Cameras, a switcher, graphics and lyrics, the streaming setup, and a recording of every service.",
  },
  {
    key: "ledWall",
    label: "LED wall",
    covers: "The LED panels, mounting and structure, a video processor, power and install.",
  },
];

export type RoomSize = {
  slug: string;
  label: string;
  seats: string;
  title: string;
  description: string;
  lead: string;
  /** What a room this size usually looks like. */
  typical: string[];
  /** What it needs, in plain words. */
  needs: { title: string; body: string }[];
  /** What to do first when the budget will not do everything at once. */
  first: string[];
  /** Ballpark ranges for this size, low and high, in whole dollars. */
  ranges: Record<SystemKey, [number, number]>;
};

export const ROOM_SIZES: RoomSize[] = [
  {
    slug: "up-to-300-seats",
    label: "Up to 300 seats",
    seats: "Up to about 300 seats",
    title: "Church Sound, Lighting & Video for Rooms Up to 300 Seats",
    description:
      "What a sanctuary of up to 300 seats needs from its sound, lighting, cameras and screens, what to fix first, and ballpark ranges for planning.",
    lead: "A smaller room does not need a smaller standard. It needs every word to land, faces lit for the people watching at home, and a system a volunteer can run without a phone call to the one person who knows how.",
    typical: [
      "One or two Sunday services, run by volunteers.",
      "Speakers on either side of the platform, often older than the people running them.",
      "A projector or a pair of TVs, a phone or one camera for the livestream.",
    ],
    needs: [
      {
        title: "Clear speech in every pew",
        body: "Speakers chosen and aimed for the room, so the back rows understand the sermon instead of just hearing it.",
      },
      {
        title: "A mixer with saved scenes",
        body: "A digital mixer with the Sunday setup saved, so a volunteer presses one button instead of rebuilding the mix each week.",
      },
      {
        title: "Light on faces",
        body: "Front light on the pulpit and platform. It makes the room feel warmer and the livestream look like church instead of a security camera.",
      },
      {
        title: "One or two cameras",
        body: "A remote-controlled camera or two and a simple switcher give people at home a real view of the service.",
      },
    ],
    first: [
      "Fix the speech first. If people cannot understand the sermon, nothing else matters.",
      "Then light the faces on the platform.",
      "Then the livestream: one good camera beats three poor ones.",
    ],
    ranges: {
      sound: [20000, 60000],
      lighting: [10000, 40000],
      video: [10000, 35000],
      ledWall: [35000, 90000],
    },
  },
  {
    slug: "300-to-800-seats",
    label: "300 to 800 seats",
    seats: "About 300 to 800 seats",
    title: "Church AV for 300 to 800 Seats: Sound, Lighting, Video & LED Walls",
    description:
      "How a 300 to 800 seat sanctuary uses modern sound, stage lighting, cameras and LED walls, what to plan first, and ballpark ranges.",
    lead: "This is the size where a church most often outgrows the system it has. More than one service, a worship team with a full band, a growing online audience, and a room that has to serve a funeral on Saturday and a youth night on Wednesday.",
    typical: [
      "Two or more Sunday services, a few paid staff and a volunteer production team.",
      "A full band on the platform and a livestream people actually watch.",
      "Projection that washes out when the sun comes in.",
    ],
    needs: [
      {
        title: "A system designed for the room",
        body: "A speaker design modeled for your room’s shape and ceiling, so the band is full and the sermon is clear from the first row to the balcony.",
      },
      {
        title: "Monitors the band can hear",
        body: "Personal in-ear mixes take the loud wedges off the stage, which makes the room quieter and clearer for everyone.",
      },
      {
        title: "Stage lighting with looks",
        body: "Saved looks for worship, the sermon, communion and a baptism, run from a simple console or a tablet.",
      },
      {
        title: "Screens you can read in daylight",
        body: "An LED wall, or LED side screens, stay bright with the lights up and the sun coming in. Lyrics and sermon notes stay readable.",
      },
      {
        title: "A real broadcast",
        body: "Two or three cameras, a switcher, lower thirds and a separate audio mix for the stream.",
      },
    ],
    first: [
      "Sound design first, especially if the band and the sermon fight each other.",
      "Then the screens, if they wash out in daylight.",
      "Then lighting and cameras together, because they are designed for each other.",
    ],
    ranges: {
      sound: [50000, 150000],
      lighting: [35000, 120000],
      video: [30000, 100000],
      ledWall: [70000, 200000],
    },
  },
  {
    slug: "800-to-2000-seats",
    label: "800 to 2,000 seats",
    seats: "About 800 to 2,000 seats",
    title: "Church AV for 800 to 2,000 Seats: Large Sanctuary Sound, Lighting & Video",
    description:
      "What a large sanctuary of 800 to 2,000 seats needs from its audio, lighting, broadcast video and LED walls, and ballpark ranges for planning.",
    lead: "A large room is a production every week. The system has to be designed as one: speakers, rigging, lighting, cameras and screens planned together, with a booth that a small staff and a trained volunteer team can run.",
    typical: [
      "Several services, sometimes more than one venue on the campus.",
      "A production staff and a large volunteer team.",
      "A broadcast that is a ministry of its own.",
    ],
    needs: [
      {
        title: "Line arrays and fills",
        body: "Speaker arrays flown and aimed for the room, with fills for the balcony and the edges, designed in software before anything is hung.",
      },
      {
        title: "Rigging and power",
        body: "Lighting and speakers on structure engineered for the load, and power planned for everything on it.",
      },
      {
        title: "Broadcast-grade video",
        body: "Several cameras, a production switcher, graphics and a separate broadcast mix, with recording for every service.",
      },
      {
        title: "A main LED wall",
        body: "A main wall behind the stage, often with side screens, sized for the back row to read lyrics with the house lights up.",
      },
    ],
    first: [
      "Start with a full design of the room, even if you build it in phases.",
      "Build the structure and power for the finished system the first time.",
      "Then phase sound, lighting and video as the budget allows.",
    ],
    ranges: {
      sound: [120000, 400000],
      lighting: [100000, 350000],
      video: [80000, 250000],
      ledWall: [150000, 450000],
    },
  },
  {
    slug: "multi-campus",
    label: "More than one campus",
    seats: "More than one campus or venue",
    title: "Church AV for Multi-Campus Churches: One Standard, Every Room",
    description:
      "How churches with more than one campus or venue plan sound, lighting, video and LED walls as one standard, and ballpark ranges per room.",
    lead: "More than one campus is more than one room. The win is one standard: the same mixer, the same lighting console, the same camera workflow, so a volunteer trained at one campus can serve at another and a message can go from one room to all of them.",
    typical: [
      "A main campus and one or more smaller campuses or venues.",
      "A message shared live or recorded across campuses.",
      "Different rooms built at different times with different gear.",
    ],
    needs: [
      {
        title: "One equipment standard",
        body: "The same families of mixers, consoles and cameras at every campus, sized for each room.",
      },
      {
        title: "Message distribution",
        body: "A reliable way to send the message from the main room to every campus, live or recorded.",
      },
      {
        title: "Each room designed on its own",
        body: "The standard is shared; the speaker design, lighting and screens are still designed for each room’s size and shape.",
      },
    ],
    first: [
      "Set the standard before buying the next campus’s gear.",
      "Bring the oldest room up to it first.",
      "Plan the message distribution with the broadcast at the main campus.",
    ],
    ranges: {
      sound: [50000, 400000],
      lighting: [35000, 350000],
      video: [30000, 250000],
      ledWall: [70000, 450000],
    },
  },
];

export function getRoomSize(slug: string) {
  return ROOM_SIZES.find((size) => size.slug === slug);
}

/** "$20,000" style, whole dollars. */
export function dollars(amount: number) {
  return `$${amount.toLocaleString("en-US")}`;
}

/** "$20,000 – $60,000" */
export function rangeText([low, high]: [number, number]) {
  return `${dollars(low)} – ${dollars(high)}`;
}

/** Signs a church has outgrown its system. `help` links to a matching help page. */
export const UPGRADE_SIGNS: { title: string; body: string; help?: string }[] = [
  {
    title: "People can hear but can’t understand",
    body: "Loud enough, not clear enough. The back rows lean forward and the hearing aids whistle.",
    help: "cant-hear-in-the-back",
  },
  {
    title: "Feedback during the sermon",
    body: "A squeal when the pastor walks the platform means the system is fighting the room.",
    help: "feedback-during-the-sermon",
  },
  {
    title: "Screens wash out when the sun comes in",
    body: "If the lyrics disappear at the 11 o’clock service, the projector has met its match.",
  },
  {
    title: "The livestream drops or sounds thin",
    body: "People at home are part of the church. A stream that cuts out tells them they are an afterthought.",
    help: "livestream-keeps-dropping",
  },
  {
    title: "Only one person can run the board",
    body: "When Sunday depends on one volunteer showing up, the system is too hard to run.",
    help: "volunteers-cant-run-the-board",
  },
  {
    title: "Faces are dark on camera",
    body: "Room light that is fine in person turns the pastor into a silhouette on the stream.",
  },
  {
    title: "Parts are older than the youth group",
    body: "When repairs mean hunting for discontinued parts, every Sunday is a gamble.",
  },
  {
    title: "You are building or renovating",
    body: "The best time to plan sound, lighting and video is before the walls close. Conduit and power are cheap in the plans and expensive later.",
    help: "planning-a-new-building",
  },
];

export const BENEFITS: { title: string; body: string }[] = [
  {
    title: "Every word heard",
    body: "Clear speech is the whole point: the sermon, the prayer, the announcement that someone is in the hospital.",
  },
  {
    title: "Worship people join",
    body: "A full, clear sound and a room that looks alive invite people to sing instead of watch.",
  },
  {
    title: "Younger families stay",
    body: "Families who grew up with good sound and screens notice when a room has neither.",
  },
  {
    title: "The church at home",
    body: "Shut-ins, travelers and people deciding whether to visit see a real service, not a shaky phone.",
  },
  {
    title: "Volunteers who can serve",
    body: "A system built to be run on a Sunday morning by a volunteer, with saved scenes and training.",
  },
  {
    title: "One room, many uses",
    body: "Funerals, weddings, youth nights and concerts each get a look and a sound without rewiring.",
  },
];

export type GuideSection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type Guide = {
  slug: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  sections: GuideSection[];
  /** Show the ballpark price table on this guide. */
  priceTable?: boolean;
  faq: { q: string; a: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "church-av-cost",
    label: "What church sound, lighting and video cost",
    title: "How Much Does Church Sound, Lighting & Video Cost? Ballpark Ranges by Room Size",
    description:
      "Ballpark ranges for church sound systems, stage lighting, cameras and livestream, and LED walls by sanctuary size, and what moves the number up or down.",
    h1: "What church sound, lighting and video cost",
    lead: "Every room is different, but a committee needs a starting point before it can plan a campaign or a budget. These are the ranges we see for typical church rooms, and the things that move a project to the low or the high end.",
    priceTable: true,
    sections: [
      {
        heading: "What moves the number",
        paragraphs: [
          "Two rooms with the same number of seats can land far apart. These are the things that decide where yours falls.",
        ],
        bullets: [
          "The room: ceiling height, hard walls and glass make sound harder and cost more to get right.",
          "Rigging: hanging speakers and lights from the ceiling needs structure that can carry them.",
          "Power and cable: an older building may need new circuits and cable paths.",
          "New building or retrofit: planned before the walls close, the same system costs less to install.",
          "The LED wall’s size and pixel pitch: a finer pitch looks sharper up close and costs more per square foot.",
          "Phasing: building in phases spreads the cost, but plan the whole system first.",
        ],
      },
      {
        heading: "Why the walkthrough matters",
        paragraphs: [
          "A ballpark tells you whether a project is a line in this year’s budget or a capital campaign. The real number comes from someone standing in your room: measuring it, listening to it, and seeing where the power and cable can run.",
          "After the walkthrough you get a design for your room and a written proposal. Nothing is ordered until your church says yes.",
        ],
      },
    ],
    faq: [
      {
        q: "Are these prices a quote?",
        a: "No. They are typical ranges for planning. Your price comes from a walkthrough and a design for your room.",
      },
      {
        q: "Can we do it in phases?",
        a: "Yes, and many churches do. Design the whole system first so each phase fits the next one.",
      },
      {
        q: "Does it cost anything to talk?",
        a: "No. Telling us about your room and the walkthrough cost your church nothing.",
      },
    ],
  },
  {
    slug: "signs-your-church-needs-an-av-upgrade",
    label: "Signs it is time to upgrade",
    title: "8 Signs Your Church Has Outgrown Its Sound, Lighting & Video",
    description:
      "The signs that a church sound system, stage lighting, projection or livestream has been outgrown, and what to fix first.",
    h1: "Signs your church has outgrown its system",
    lead: "Most churches do not decide to upgrade. They notice, one Sunday at a time, that something is in the way of worship. Here are the signs we hear most, and what each one usually means.",
    sections: [
      {
        heading: "What to do with the list",
        paragraphs: [
          "If two or three of these sound familiar, write down when they happen: which service, which part of it, where people sit. That record is the most useful thing you can bring to a walkthrough.",
          "Then fix in this order: understanding the spoken word, then what people see, then the people at home. That order serves the most people first.",
        ],
      },
    ],
    faq: [
      {
        q: "Is it the equipment or the people running it?",
        a: "Often both. A system that is hard to run makes good volunteers look bad. A good design with saved scenes and training fixes both.",
      },
      {
        q: "Our system is not that old. Can it still be the problem?",
        a: "Yes. A system that was never designed for the room can be new and still wrong for it.",
      },
    ],
  },
  {
    slug: "led-wall-for-church",
    label: "LED walls for churches",
    title: "LED Walls for Churches: Sizes, Pixel Pitch, Cost & What to Ask",
    description:
      "A plain guide to church LED walls: how big, what pixel pitch means, when an LED wall beats a projector, ballpark cost, and what to ask before you buy.",
    h1: "LED walls for churches",
    lead: "An LED wall behind the stage is one of the biggest changes a church can make to its room. It stays bright with the lights up and the sun coming in, it makes lyrics and Scripture readable from the back row, and it gives the room a sense of place. It is also a large purchase, so here is what matters.",
    sections: [
      {
        heading: "When an LED wall beats a projector",
        paragraphs: [
          "A projector needs a dark room. If your services happen in daylight, with windows, or with the house lights up so people can see each other, an LED wall stays bright where a projector washes out. LED walls also last far longer than projector lamps and do not need to be refocused.",
        ],
      },
      {
        heading: "How big",
        paragraphs: [
          "Size the wall so the back row can read a line of lyrics. A common starting point is a wall about one sixth to one fourth as tall as the distance to the back row. The stage, the ceiling and what sits behind the platform (a cross, a baptistry, windows) shape the final size.",
        ],
      },
      {
        heading: "Pixel pitch in plain words",
        paragraphs: [
          "Pixel pitch is the distance between the tiny lights, in millimeters. A smaller number means a sharper picture up close and a higher price. For most sanctuaries, where the first row sits several yards from the wall, a pitch in the 2.5 to 3.9 millimeter range looks sharp and keeps the cost sensible.",
        ],
      },
      {
        heading: "What to ask before you buy",
        paragraphs: [],
        bullets: [
          "Who designs the structure that holds it, and is it engineered for the load?",
          "What processor runs it, and how does it connect to what you already use for lyrics and video?",
          "How are spare panels and service handled?",
          "Who trains the volunteers, and what happens when something goes wrong on a Sunday?",
        ],
      },
    ],
    faq: [
      {
        q: "Will an LED wall make our church feel like a concert?",
        a: "Only if you want it to. Many churches use the wall for lyrics, Scripture and a calm background, and leave the cross or the baptistry as the center of the room.",
      },
      {
        q: "Does a small church need an LED wall?",
        a: "Not always. In a room with a daylight problem, a modest wall can be the single biggest improvement. In a dark room, a good projector may be enough.",
      },
    ],
  },
  {
    slug: "choosing-a-church-av-installer",
    label: "Choosing a church installer",
    title: "How to Choose a Church Sound, Lighting & Video Installer",
    description:
      "What to look for in a church audio, video and lighting installer: church experience, a real design, training for volunteers, and support after the install.",
    h1: "How to choose a church installer",
    lead: "The equipment matters less than the people who design and install it. Here is what separates a church installer from someone who sells boxes.",
    sections: [
      {
        heading: "What to look for",
        paragraphs: [],
        bullets: [
          "Church experience: rooms like yours, with services like yours, and references from churches.",
          "A real design: a drawing of where speakers and lights go and what the room will sound like, before anything is ordered.",
          "One plan for everything: sound, lighting and video designed together so they work together.",
          "Training: time with your volunteers, written steps, and saved scenes.",
          "Support: who answers on a Saturday night when something is wrong.",
        ],
      },
      {
        heading: "How Sanctuary AVL helps",
        paragraphs: [
          "We do the first part of the search for you. Tell us about your room, and we bring in a church installation team with nearly 30 years of church work behind it. They walk your room, design for it and give you a written proposal. You decide.",
          "Sanctuary AVL is paid by the installer when a church goes ahead, not by your church.",
        ],
      },
    ],
    faq: [
      {
        q: "Should we get more than one proposal?",
        a: "You can. A good installer will welcome the comparison, as long as every proposal is for the same scope.",
      },
      {
        q: "Should our own volunteers install it?",
        a: "Volunteers are a gift for running a system. Designing and hanging it is work for people who do it every week.",
      },
    ],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}

/** Every public /avl path, for the sitemap. */
export function avlPaths(helpSlugs: string[]) {
  return [
    "/avl",
    "/avl/how-it-works",
    "/avl/request",
    "/avl/guides",
    ...GUIDES.map((g) => `/avl/guides/${g.slug}`),
    ...ROOM_SIZES.map((s) => `/avl/sizes/${s.slug}`),
    ...helpSlugs.map((slug) => `/avl/help/${slug}`),
  ];
}
