export type InvolvementIntent =
  | "seal"
  | "time"
  | "money"
  | "goods"
  | "need"
  | "grocery"
  | "mission"
  | "hand"
  | "food"
  | "org"
  | "buying";

export type InvolvementRecord = {
  id: string;
  intent: InvolvementIntent;
  name: string;
  email: string;
  phone: string;
  organization: string;
  orgType: string;
  city: string;
  message: string;
  poundsPerWeek: string;
  address: string;
  pickupDay: string;
  pickupWindow: string;
  destination: string;
  createdAt: string;
  categories?: string;
  vehicle?: string;
  helpers?: string;
  photos?: string[];
  needItem?: string;
};

const STORAGE_KEY = "uug-involvement";

export function readInvolvement(): InvolvementRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InvolvementRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInvolvement(
  record: Omit<InvolvementRecord, "id" | "createdAt">,
) {
  const next: InvolvementRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const all = [...readInvolvement(), next];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    const slim = { ...next, photos: [] as string[] };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...readInvolvement(), slim]),
    );
    return slim;
  }
  return next;
}

export function goodsOffers() {
  return readInvolvement().filter((item) => item.intent === "goods");
}

export function goodsNeeds() {
  return readInvolvement().filter((item) => item.intent === "need");
}

function haystack(record: InvolvementRecord) {
  return [
    record.needItem,
    record.categories,
    record.message,
    record.orgType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchingOffers(need: string, categories: string) {
  const tokens = `${need} ${categories}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  if (!tokens.length) return [] as InvolvementRecord[];
  return goodsOffers().filter((offer) => {
    const hay = haystack(offer);
    return tokens.some((t) => hay.includes(t));
  });
}

export function matchingNeeds(offer: string, categories: string) {
  const tokens = `${offer} ${categories}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  if (!tokens.length) return [] as InvolvementRecord[];
  return goodsNeeds().filter((need) => {
    const hay = haystack(need);
    return tokens.some((t) => hay.includes(t));
  });
}

export const INTENT_COPY: Record<
  InvolvementIntent,
  { title: string; lead: string; submit: string }
> = {
  seal: {
    title: "Make the statement of intent",
    lead: "Tell us about your church, business, charity, or civic body. Every application is reviewed personally — the seal means something because someone stands at the door.",
    submit: "Request the seal",
  },
  time: {
    title: "Give your time",
    lead: "Tell us what you can offer, and when. We will put you to work on something real — pantry, neighbors, or a skill the body actually needs.",
    submit: "Offer my time",
  },
  money: {
    title: "Give financially",
    lead: "Share how you’d like to help, and we will follow up with a way to give. Your gift funds food, tools, and the work of keeping this movement in motion.",
    submit: "I want to give",
  },
  goods: {
    title: "Give goods",
    lead: "Furniture, clothing, household — if a neighbor can use it, tell us what you have. We will come get it.",
    submit: "Schedule a pickup",
  },
  need: {
    title: "Ask for what you need",
    lead: "Need a couch, coats, a crib? Tell us. We will look at what has been offered, and if we do not have it, we will ask the body.",
    submit: "Ask for this",
  },
  grocery: {
    title: "Donate unsold food",
    lead: "For grocers, restaurants, and producers in Vidalia and Toombs County. Tell us what you can share. Pickup can be arranged.",
    submit: "Set up food donation",
  },
  food: {
    title: "Donate unsold food",
    lead: "We will add your store, farm, or kitchen to Plenty and schedule a pickup.",
    submit: "Schedule food pickup",
  },
  org: {
    title: "Join as a goods ministry",
    lead: "Thrift, clothing, furniture — Operate is the desk. Tell us whether you give, receive, or both.",
    submit: "Open the desk",
  },
  buying: {
    title: "Join united buying",
    lead: "Tell us what you buy and how often. We will put you in the catalog with the rest of the body.",
    submit: "I want in",
  },
  mission: {
    title: "Live on mission",
    lead: "Raise your hand. We will help you take a first step this week — not a program to sit through, a neighbor to serve.",
    submit: "Count me in",
  },
  hand: {
    title: "Raise your hand",
    lead: "If God let you see this, it may be so you could help. Tell us who you are.",
    submit: "Raise my hand",
  },
};
