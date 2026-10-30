/**
 * Campaigns: one offer, told to the churches most likely to want it, with a
 * page to land on and a desk to run it from (/admin/campaigns). The first is
 * LED walls, stage lighting and sound (owner, 2026-10-29): "we are United
 * Under God, and we have three companies ready to bid for your work."
 *
 * A campaign does not invent a new pipeline. Its page posts a church need
 * (src/lib/church-needs.ts) tagged with the campaign's slug, so everything
 * after the form is the need flow that already works: the desk bids it out
 * to the approved suppliers in the campaign's category, the church compares
 * the quotes on its private page, and chooses one or none. The cold email is
 * sent by ChurchConnect's outreach (it holds the church directory and the
 * one-email-a-month rule); this file only names it, so the desk can say what
 * is going out.
 *
 * Imported by node's test runner: relative imports, no framework code.
 */

export type CampaignEmail = {
  /** Who sends it and when, in the desk's words. */
  when: string;
  sentBy: string;
  subject: string;
  /** The challenger subject in the A/B test, when there is one. */
  subjectB?: string;
  purpose: string;
};

export type Campaign = {
  slug: string;
  name: string;
  short: string;
  landingPath: string;
  startedOn: string;
  /** Where the email goes, in words, and the states the bidders must serve ([] = anywhere). */
  region: string;
  states: string[];
  /** The church-spend category and subcategory the suppliers must serve. */
  bid: { category: string; subcategory: string };
  /** How many approved suppliers the page promises will bid. */
  biddersWanted: number;
  /** ChurchConnect outreach email kind, and how many a weekday it starts at. */
  outreach: { kind: string; key: string; startDaily: number };
  emails: CampaignEmail[];
  /** The church's confirmation: its subject, and the lines after the greeting, before its private link. */
  confirmationSubject: string;
  confirmation: string[];
};

export const LED_WALL: Campaign = {
  slug: "led-wall",
  name: "LED walls, stage lighting and sound",
  short: "A better deal on a big purchase: churches describe their room once, and companies compete for the work.",
  landingPath: "/church-av/led-wall",
  startedOn: "2026-10-29",
  // Owner (2026-10-30): "the AVL companies cover the entire country".
  region: "Every state in the church directory (GA, FL, SC, NC, TN and AL today)",
  states: [],
  bid: { category: "audio-visual", subcategory: "av-systems" },
  biddersWanted: 3,
  outreach: { kind: "led_wall_outreach", key: "led_wall", startDaily: 10 },
  emails: [
    {
      when: "Weekdays, 10 a.m. to 4 p.m. Eastern, at most one email a church a month",
      sentBy: "ChurchConnect outreach (led_wall), from Lincoln Nunnally, United Under God",
      subject: "An LED wall, lights and sound for your church, and a better deal on them",
      subjectB: "Three companies are ready to bid on your church’s LED wall",
      purpose:
        "First touch to churches most likely to want an LED wall: growing, building or renovating, praise music. Leads with what the wall, lights and sound do and the better deal; opens with “We are United Under God”.",
    },
    {
      when: "The moment a church sends the form",
      sentBy: "This site, to the church",
      subject: "We have your room: LED wall, lighting and sound",
      purpose:
        "Confirms the request, says what happens next, and gives the church its private page for the bids.",
    },
    {
      when: "When the desk starts the bid",
      sentBy: "SOURCE desk, to each approved church AV company",
      subject: "Bid invitation (the existing SOURCE invitation)",
      purpose:
        "Invites the companies to bid on one written scope. They see the room and the work, never the church.",
    },
    {
      when: "When the priced bids are in",
      sentBy: "SOURCE desk, to the church",
      subject: "Your quotes are in (the existing need email)",
      purpose: "Sends the church back to its private page to compare the bids side by side.",
    },
    {
      when: "When the church chooses",
      sentBy: "This site, to the church and the chosen company",
      subject: "Introductions (the existing need emails)",
      purpose: "Introduces the church and the company it chose to each other, both ways.",
    },
  ],
  confirmationSubject: "We have your room: LED wall, lighting and sound",
  confirmation: [
    "We are United Under God. From what you sent, we will write one clear scope for your room and ask three church audio, video and lighting companies to bid on it. They see your room and the work, never your church’s name or how to reach you.",
    "We may call or email to ask for a measurement or a photo of the stage, so every company bids on the same thing.",
    "When the bids are in, we will email you, and you will see them side by side on your private page:",
  ],
};

export const CAMPAIGNS: Campaign[] = [LED_WALL];

export function getCampaign(slug: string): Campaign | undefined {
  return CAMPAIGNS.find((campaign) => campaign.slug === slug);
}

/** A known campaign's slug, or "" for anything else (never an error on a public form). */
export function campaignOf(value: unknown): string {
  const slug = String(value ?? "").trim();
  return getCampaign(slug) ? slug : "";
}

// ---------------------------------------------------------------------------
// The LED wall form: a few plain questions, turned into one need
// ---------------------------------------------------------------------------

export const LED_WALL_PARTS = {
  "led-wall": "An LED wall behind the stage",
  lighting: "Stage lighting",
  sound: "Sound",
} as const;
export type LedWallPart = keyof typeof LED_WALL_PARTS;

export const LED_WALL_TIMING = [
  "In the next 3 months",
  "In 3 to 6 months",
  "In 6 to 12 months",
  "Building or remodeling, plans not final",
  "Just learning",
] as const;

export type LedWallAnswers = {
  parts: string[];
  seats?: string;
  stageWidth?: string;
  daylight?: string;
  timing?: string;
  room?: string;
};

const SHORT: Record<LedWallPart, string> = {
  "led-wall": "LED wall",
  lighting: "stage lighting",
  sound: "sound",
};

function listWords(words: string[]) {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/**
 * The need a church posts from the LED wall page: what to bid, as a title,
 * and the room, as details. Throws a sentence the church can act on.
 */
export function ledWallNeed(answers: LedWallAnswers) {
  const parts = (Object.keys(LED_WALL_PARTS) as LedWallPart[]).filter((part) =>
    answers.parts.includes(part),
  );
  if (!parts.length) throw new Error("Choose what you would like bid: the LED wall, lighting, or sound.");
  const words = parts.map((part) => SHORT[part]);
  const title = listWords(words);
  const clip = (value: string | undefined) => (value ?? "").trim().slice(0, 600);
  const details = [
    `Bid: ${parts.map((part) => LED_WALL_PARTS[part]).join("; ")}`,
    clip(answers.seats) ? `Seats in the room: ${clip(answers.seats)}` : "",
    clip(answers.stageWidth) ? `Stage width: ${clip(answers.stageWidth)}` : "",
    clip(answers.daylight) ? `Daylight in the room: ${clip(answers.daylight)}` : "",
    clip(answers.timing) ? `When: ${clip(answers.timing)}` : "",
    clip(answers.room) ? `About the room: ${clip(answers.room)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    details,
  };
}
