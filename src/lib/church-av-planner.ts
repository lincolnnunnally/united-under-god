import { AV_PROCESS } from "@/lib/church-av";
import { getHelpPage, PLANNER_PROBLEMS } from "@/lib/church-av-help";

/**
 * Church Room Planner (/church-av/planner). Entirely client-side: the answers
 * live in localStorage and in the summary link, and are sent to us only when
 * the church presses "Send this to us" (through the same av inquiry form).
 *
 * The recommendation is plain language by tier. It never contains a price,
 * a product model, or a promise of a result.
 */

export type Style = "traditional" | "blended" | "modern";
export type Choice<T extends string> = { value: T; label: string; hint?: string };

export const STYLES: Choice<Style>[] = [
  {
    value: "traditional",
    label: "Traditional",
    hint: "Hymns, organ or piano, choir, pulpit. No screen behind the pulpit.",
  },
  {
    value: "blended",
    label: "Blended",
    hint: "Hymns and newer songs, a piano and a small band, lyrics on screens.",
  },
  {
    value: "modern",
    label: "Modern",
    hint: "A worship band, stage lighting, lyrics and video on a large display.",
  },
];

export type Seats = "under-150" | "150-300" | "300-600" | "600-1000" | "1000-plus";
export const SEATS: Choice<Seats>[] = [
  { value: "under-150", label: "Under 150" },
  { value: "150-300", label: "150 to 300" },
  { value: "300-600", label: "300 to 600" },
  { value: "600-1000", label: "600 to 1,000" },
  { value: "1000-plus", label: "More than 1,000" },
];

export type Age = "before-1960" | "1960-1999" | "2000-plus" | "not-sure";
export const AGES: Choice<Age>[] = [
  { value: "before-1960", label: "Built before 1960" },
  { value: "1960-1999", label: "1960 to 1999" },
  { value: "2000-plus", label: "2000 or later" },
  { value: "not-sure", label: "Not sure" },
];

export type Ceiling = "low" | "medium" | "tall";
export const CEILINGS: Choice<Ceiling>[] = [
  { value: "low", label: "Low and flat", hint: "About the height of a house ceiling" },
  { value: "medium", label: "Medium", hint: "Noticeably taller than a house" },
  { value: "tall", label: "Tall or vaulted", hint: "Peaked, arched, or two stories and up" },
];

export type Surfaces = "hard" | "mixed" | "soft";
export const SURFACES: Choice<Surfaces>[] = [
  { value: "hard", label: "Mostly hard", hint: "Plaster, wood, brick, glass, tile, bare pews" },
  { value: "mixed", label: "A mix", hint: "Some carpet or padding, some hard walls" },
  { value: "soft", label: "Mostly soft", hint: "Carpet, padded pews or chairs, fabric walls" },
];

export type Building = "none" | "renovating" | "new-building";
export const BUILDINGS: Choice<Building>[] = [
  { value: "none", label: "No building plans", hint: "Improve the room we have" },
  { value: "renovating", label: "Renovating", hint: "Updating the current sanctuary" },
  { value: "new-building", label: "New building", hint: "Planning or building a new sanctuary" },
];

export type Decider = "pastor" | "committee" | "board";
export const DECIDERS: Choice<Decider>[] = [
  { value: "pastor", label: "The pastor" },
  { value: "committee", label: "A committee", hint: "Building, worship, or AV committee" },
  { value: "board", label: "A board", hint: "Elders, deacons, vestry, or trustees" },
];

export const PROBLEMS = PLANNER_PROBLEMS.map((p) => ({ value: p.slug, label: p.label }));

export type Answers = {
  style?: Style;
  seats?: Seats;
  age?: Age;
  ceiling?: Ceiling;
  surfaces?: Surfaces;
  problems: string[];
  livestream?: "yes" | "no";
  building?: Building;
  decider?: Decider;
};

/** Search params for the planner and its summary link. */
export type PlannerSearch = Partial<Record<keyof Answers, string>>;

export const EMPTY_ANSWERS: Answers = { problems: [] };

export const STORAGE_KEY = "uug:church-av-planner:v1";

/** Questions in the planner, one per screen (worship, seats, built, ceiling, surfaces, problems, stream, building, decider). */
export const PLANNER_STEP_COUNT = 9;

/** Reads saved answers; private windows and blocked storage just start fresh. */
export function loadSaved(): { answers: Answers; step: number } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { answers?: unknown; step?: unknown };
    const step = typeof parsed.step === "number" ? parsed.step : 0;
    return {
      answers: cleanAnswers(parsed.answers),
      step: Math.max(0, Math.min(step, PLANNER_STEP_COUNT)),
    };
  } catch {
    return null;
  }
}

export function saveAnswers(answers: Answers, step: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, step }));
  } catch {
    // Storage unavailable: the planner still works for this visit.
  }
}

export function clearSaved() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function pick<T extends string>(choices: Choice<T>[], value: unknown): T | undefined {
  return choices.find((c) => c.value === value)?.value;
}

/** Accepts anything (localStorage, URL search) and keeps only known values. */
export function cleanAnswers(raw: unknown): Answers {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const known = new Set(PROBLEMS.map((p) => p.value));
  const problems = (
    Array.isArray(r.problems)
      ? r.problems
      : typeof r.problems === "string"
        ? r.problems.split(",")
        : []
  ).filter((p): p is string => typeof p === "string" && known.has(p));
  return {
    style: pick(STYLES, r.style),
    seats: pick(SEATS, r.seats),
    age: pick(AGES, r.age),
    ceiling: pick(CEILINGS, r.ceiling),
    surfaces: pick(SURFACES, r.surfaces),
    problems: [...new Set(problems)],
    livestream: r.livestream === "yes" || r.livestream === "no" ? r.livestream : undefined,
    building: pick(BUILDINGS, r.building),
    decider: pick(DECIDERS, r.decider),
  };
}

/** Flat string record for the summary link (?style=…&problems=a,b). */
export function answersToSearch(a: Answers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) {
    if (Array.isArray(v)) {
      if (v.length) out[k] = v.join(",");
    } else if (v) out[k] = v;
  }
  return out;
}

export function isComplete(a: Answers) {
  return Boolean(
    a.style &&
    a.seats &&
    a.age &&
    a.ceiling &&
    a.surfaces &&
    a.livestream &&
    a.building &&
    a.decider,
  );
}

function labelOf<T extends string>(choices: Choice<T>[], value?: T) {
  return choices.find((c) => c.value === value)?.label ?? "Not answered";
}

/** The church's answers as label/value rows, for the summary and the email. */
export function answerRows(a: Answers): { label: string; value: string }[] {
  return [
    { label: "Worship style", value: labelOf(STYLES, a.style) },
    { label: "Seats", value: labelOf(SEATS, a.seats) },
    { label: "Sanctuary age", value: labelOf(AGES, a.age) },
    { label: "Ceiling", value: labelOf(CEILINGS, a.ceiling) },
    { label: "Surfaces", value: labelOf(SURFACES, a.surfaces) },
    {
      label: "What is not working",
      value: a.problems.length
        ? a.problems.map((p) => PROBLEMS.find((x) => x.value === p)?.label ?? p).join("; ")
        : "Nothing selected",
    },
    {
      label: "Livestream",
      value: a.livestream === "yes" ? "Yes" : a.livestream === "no" ? "No" : "Not answered",
    },
    { label: "Building plans", value: labelOf(BUILDINGS, a.building) },
    { label: "Who decides", value: labelOf(DECIDERS, a.decider) },
  ];
}

// ---------------------------------------------------------- recommendation

export type RecItem = { title: string; body: string; help?: string };
export type Tier = { name: string; lead: string; items: RecItem[] };

const has = (a: Answers, slug: string) => a.problems.includes(slug);

function isLarge(a: Answers) {
  return a.seats === "600-1000" || a.seats === "1000-plus";
}

function isEchoey(a: Answers) {
  return a.surfaces === "hard" || (a.ceiling === "tall" && a.surfaces !== "soft");
}

/**
 * Three tiers, in the order a church would do them. Every item says what it
 * is and why, in plain language. No prices, no models, no promises.
 */
export function recommend(a: Answers): Tier[] {
  const start: RecItem[] = [];
  const next: RecItem[] = [];
  const later: RecItem[] = [];
  const style = a.style ?? "traditional";
  const building = a.building ?? "none";
  const hearing =
    has(a, "hearing-aids-squeal-or-echo") ||
    has(a, "older-members-staying-home") ||
    style === "traditional" ||
    a.age === "before-1960";
  const clarity = has(a, "cant-hear-in-the-back") || has(a, "feedback-during-the-sermon");

  if (building === "new-building") {
    start.push({
      title: "Design audio, video, and lighting with the architect",
      body: "Get speaker, camera, and display positions, rigging points, power, conduit, and cooling into the drawings now, while they can still change. Shape the room’s acoustics from the start.",
      help: "planning-a-new-building",
    });
  }

  // Speakers and microphones: the foundation for clarity.
  const speakers: RecItem = {
    title: "Speakers aimed at the seats, tuned for speech",
    body: isLarge(a)
      ? "A system designed so every section of a large room gets direct sound, with fill or delay speakers where the main speakers cannot reach, then aligned and tuned with measurements."
      : "Speakers chosen and aimed so the sound lands on the congregation and not the walls, with fill speakers for the back rows if needed, then tuned for clear speech.",
    help: "cant-hear-in-the-back",
  };
  const mics: RecItem = {
    title:
      style === "traditional"
        ? "Better pulpit, lectern, and choir microphones"
        : "The right microphone for each person on the platform",
    body: has(a, "feedback-during-the-sermon")
      ? "Microphones closer to the mouth need far less gain, which is the first defense against feedback. Placement and gain structure are set so each mic has room before it rings."
      : "Microphones chosen to capture voices clearly and to disappear into the room, placed and set so the system does not have to work hard.",
    help: "feedback-during-the-sermon",
  };
  (clarity || style === "traditional" ? start : next).push(speakers, mics);

  if (hearing) {
    // OWNER: confirm with installer before claiming install
    (has(a, "hearing-aids-squeal-or-echo") || has(a, "older-members-staying-home")
      ? start
      : next
    ).push({
      title: "Assistive listening for members with hearing loss",
      body: "Send the sermon straight to the ear: a hearing loop to the hearing aid’s “T” setting, Auracast for newer hearing aids and phones, or receivers with earbuds for members without compatible aids. We’ll help you choose the right option.",
      help: "hearing-aids-squeal-or-echo",
    });
  }

  if (isEchoey(a)) {
    (has(a, "hearing-aids-squeal-or-echo") || has(a, "cant-hear-in-the-back") ? start : next).push({
      title: "Targeted acoustic treatment",
      body: "Your room has the hard surfaces or height that keep sound bouncing. A few treatments placed from measurements reduce the echo for everyone, including hearing aid users, and let the system go louder before feedback.",
      help: "hearing-aids-squeal-or-echo",
    });
  }

  if (has(a, "volunteers-cant-run-the-board")) {
    start.push({
      title: "A simpler board with presets, labels, and training",
      body: "A digital console that recalls the Sunday setup with one button, every channel named for what it is, and on-site training for your volunteers the first Sunday.",
      help: "volunteers-cant-run-the-board",
    });
  }

  if (
    a.livestream === "yes" ||
    has(a, "livestream-keeps-dropping") ||
    has(a, "older-members-staying-home")
  ) {
    (has(a, "livestream-keeps-dropping") || has(a, "older-members-staying-home")
      ? start
      : next
    ).push({
      title: "A livestream that does not drop",
      body: "A wired connection, equipment that does nothing but stream, a separate audio mix for the people at home, and a local recording as a backup.",
      help: "livestream-keeps-dropping",
    });
    next.push({
      title: style === "traditional" ? "Discreet PTZ cameras" : "PTZ cameras run by one volunteer",
      body:
        style === "traditional"
          ? "Small pan-tilt-zoom cameras mounted out of sight lines, so homebound members can see the pulpit and choir without anything changing in the chancel."
          : "Pan-tilt-zoom cameras with saved shots, so one volunteer can run a multi-angle stream from the booth.",
      help: "older-members-staying-home",
    });
  }

  // Displays and lighting by style. Traditional never gets a rear-stage screen.
  if (style === "traditional") {
    later.push({
      title: "Side displays only if you want them, or none",
      body: "No screen behind the pulpit. If hymn numbers or announcements would help, small displays at the side of the room can do it without touching the chancel. Many traditional churches choose none.",
      help: "traditional-sanctuary-without-a-big-screen",
    });
    if (a.livestream === "yes") {
      later.push({
        title: "Gentle front light for the camera",
        body: "Soft, architectural light on the pulpit and choir so faces read clearly on the stream while the room keeps its character.",
      });
    }
  } else if (style === "blended") {
    next.push({
      title: "Side screens for lyrics and announcements",
      body: "Screens or projection at either side of the platform, readable from every seat, leaving the center of the platform and the cross clear.",
    });
    later.push({
      title: "Stage and house lighting on presets",
      body: "Lighting on a console with saved looks for each part of the service, so it looks right in person and on camera without a lighting expert.",
    });
  } else {
    later.push({
      title: "An LED wall sized for your sightlines",
      body: isLarge(a)
        ? "An LED wall specified, rigged, and calibrated so lyrics, teaching, and the speaker’s face on screen are readable from the back of a large room."
        : "An LED wall specified and calibrated for your room, bright enough to read with the lights up and sized for your sightlines.",
    });
    later.push({
      title: "Production lighting on a console",
      body: "Stage and house lighting with presets and cues, so volunteers can run a full service without programming it each week.",
    });
  }

  if (building === "renovating") {
    next.push({
      title: "Coordinate the AV work with the renovation",
      body: "Run cable, power, and mounting while walls and ceilings are open, so nothing has to be cut in later and the work happens around your services.",
      help: "planning-a-new-building",
    });
  }

  const tiers: Tier[] = [
    {
      name: "Start here",
      lead: "The changes that answer what is not working today.",
      items: start,
    },
    { name: "Next", lead: "What builds on the first step when the church is ready.", items: next },
    {
      name: "When you’re ready",
      lead: "The vision, phased so you never miss a service.",
      items: later,
    },
  ];
  // Keep three tiers in front of a committee, but never an empty one.
  return tiers.filter((t) => t.items.length);
}

/** How the recommendation serves the mission, from the church's own answers. */
export function missionBenefits(a: Answers): string[] {
  const out = ["Every word of the sermon reaches every pew, from the front row to the back."];
  if (
    has(a, "hearing-aids-squeal-or-echo") ||
    has(a, "older-members-staying-home") ||
    a.style === "traditional"
  ) {
    out.push(
      "Members with hearing loss hear the word clearly again, without squeal or echo, and stay in the room.",
    );
  }
  if (
    a.livestream === "yes" ||
    has(a, "livestream-keeps-dropping") ||
    has(a, "older-members-staying-home")
  ) {
    out.push(
      "Homebound members, people in the hospital, and family far away worship with you every Sunday.",
    );
  }
  if (has(a, "volunteers-cant-run-the-board")) {
    out.push(
      "Volunteers serve with confidence, and the ministry of running sound opens to more people.",
    );
  }
  if (has(a, "feedback-during-the-sermon")) {
    out.push("Prayer and the invitation are no longer interrupted by the sound system.");
  }
  if (a.building === "new-building" || a.building === "renovating") {
    out.push("Building gifts go further when nothing has to be torn out and done twice.");
  }
  if (a.style === "traditional") {
    out.push("The sanctuary keeps its character; no screen behind the pulpit.");
  }
  return out;
}

export function nextSteps(a: Answers): string[] {
  const steps = [
    "Send this summary to us. We read every one and will call to talk through your room and what you are hearing.",
  ];
  if (a.decider === "committee") {
    steps.push(
      "Share this summary with your committee before the next meeting. We are glad to walk the committee through it.",
    );
  } else if (a.decider === "board") {
    steps.push(
      "Bring this summary to your board. The Dream phase produces a program report in non-technical language for the people who approve it.",
    );
  } else {
    steps.push(
      "Share this summary with the people who will help you decide, even if the decision is yours.",
    );
  }
  steps.push(
    "In the Dream phase, the installation team clarifies the vision for your room and prepares initial budgets. Nothing on this page is a price or a quote.",
  );
  return steps;
}

export const PLANNER_PROCESS = AV_PROCESS;
export const WARRANTY_LINE =
  "1-year parts and labor warranty, with extended service plans available.";

/** Plain-text version for the owner's email, appended to the inquiry message. */
export function plannerMessage(a: Answers, summaryUrl: string) {
  const lines = ["Church Room Planner answers:"];
  for (const row of answerRows(a)) lines.push(`- ${row.label}: ${row.value}`);
  lines.push("", "Recommendation:");
  for (const tier of recommend(a)) {
    lines.push(`${tier.name}:`);
    for (const item of tier.items) lines.push(`- ${item.title}`);
  }
  lines.push("", `Committee summary: ${summaryUrl}`);
  return lines.join("\n");
}

export function helpLabel(slug?: string) {
  return slug ? getHelpPage(slug)?.label : undefined;
}
