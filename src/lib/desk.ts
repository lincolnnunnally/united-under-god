export const DESK_KINDS = [
  { id: "seal", label: "Seal" },
  { id: "time", label: "Volunteers" },
  { id: "food", label: "Food / grocery" },
  { id: "goods-furniture", label: "Furniture" },
  { id: "goods-clothes", label: "Clothes" },
  { id: "goods-household", label: "Household goods" },
  { id: "buying", label: "United buying" },
  { id: "org", label: "Goods ministry" },
  { id: "mission", label: "Live on Mission" },
] as const;

export type DeskKind = (typeof DESK_KINDS)[number]["id"];

export const STAFF_ROLES = [
  { id: "super", label: "Super admin" },
  { id: "manager", label: "Manager" },
  { id: "hand", label: "Volunteer / hand" },
] as const;

export const NOTIFY_ROLES = [
  { id: "always", label: "Every inquiry" },
  { id: "manager", label: "Manager for this kind" },
  { id: "pickup", label: "Pickup crew for this kind" },
] as const;

export const INQUIRY_STATUSES = [
  { id: "new", label: "New" },
  { id: "assigned", label: "Assigned" },
  { id: "scheduled", label: "Scheduled" },
  { id: "done", label: "Done — showed up" },
  { id: "no_show", label: "Did not show" },
] as const;

export const SUPER_EMAILS = [
  "lincoln@unitedundergod.org",
  "lincoln.nunnally@gmail.com",
];

export type InquiryInput = {
  intent: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  orgType: string;
  city: string;
  address: string;
  message: string;
  poundsPerWeek: string;
  pickupDay: string;
  pickupWindow: string;
  destination: string;
  categories: string;
  vehicle: string;
  helpers: string;
  hp: string;
};

const PICKUP_KINDS = new Set([
  "food",
  "goods-furniture",
  "goods-clothes",
  "goods-household",
]);

export function isPickupKind(kind: string) {
  return PICKUP_KINDS.has(kind);
}

export function kindLabel(id: string) {
  return DESK_KINDS.find((k) => k.id === id)?.label ?? id;
}

export function kindsFromSubmission(intent: string, categories: string): DeskKind[] {
  if (intent === "food" || intent === "grocery") return ["food"];
  if (intent === "goods" || intent === "need") {
    const cats = categories
      .toLowerCase()
      .split(/[,/]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const out: DeskKind[] = [];
    if (cats.some((c) => c.includes("cloth"))) out.push("goods-clothes");
    if (cats.some((c) => c.includes("furn"))) out.push("goods-furniture");
    if (cats.some((c) => c.includes("house"))) out.push("goods-household");
    return out.length ? out : ["goods-household"];
  }
  if (intent === "time" || intent === "hand") return ["time"];
  if (intent === "seal") return ["seal"];
  if (intent === "buying") return ["buying"];
  if (intent === "org") return ["org"];
  if (intent === "mission") return ["mission"];
  return ["time"];
}

export function coversKind(stored: string, kind: string) {
  const list = stored
    .toLowerCase()
    .split(/[,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes("all") || list.includes(kind.toLowerCase());
}

export function routeRecipients(args: {
  kinds: string[];
  routes: { email: string; kinds: string; role: string }[];
  staff: { email: string; kinds: string; role: string; pickup: boolean; active: boolean }[];
  assignedEmail?: string;
}): string[] {
  const emails = new Set<string>();
  for (const route of args.routes) {
    const matches = args.kinds.some((k) => coversKind(route.kinds, k));
    if (route.role === "always" && (coversKind(route.kinds, "all") || matches)) {
      emails.add(route.email.toLowerCase());
    }
    if (route.role === "manager" && matches) {
      emails.add(route.email.toLowerCase());
    }
    if (route.role === "pickup" && matches && args.kinds.some(isPickupKind)) {
      emails.add(route.email.toLowerCase());
    }
  }
  for (const person of args.staff) {
    if (!person.active) continue;
    const matches = args.kinds.some((k) => coversKind(person.kinds, k));
    if (person.role === "super") emails.add(person.email.toLowerCase());
    if (person.role === "manager" && matches) emails.add(person.email.toLowerCase());
    if (person.pickup && matches && args.kinds.some(isPickupKind)) {
      emails.add(person.email.toLowerCase());
    }
  }
  if (args.assignedEmail) emails.add(args.assignedEmail.toLowerCase());
  return [...emails].filter(Boolean);
}

export function inquirySubject(kind: string, name: string) {
  return `United Under God — ${kindLabel(kind)} from ${name}`;
}

export function inquiryBody(row: {
  kind: string;
  kinds: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  city: string;
  address: string;
  message: string;
  details: string;
  scheduled_for?: string;
  assigned_name?: string;
}) {
  let details: Record<string, string> = {};
  try {
    details = JSON.parse(row.details || "{}") as Record<string, string>;
  } catch {
    details = {};
  }
  const lines = [
    `Kind: ${kindLabel(row.kind)}`,
    row.kinds && row.kinds !== row.kind ? `Also: ${row.kinds}` : "",
    `Name: ${row.name}`,
    row.organization ? `Organization: ${row.organization}` : "",
    row.email ? `Email: ${row.email}` : "",
    row.phone ? `Phone: ${row.phone}` : "",
    row.city ? `City: ${row.city}` : "",
    row.address ? `Address: ${row.address}` : "",
    details.vehicle ? `Vehicle: ${details.vehicle}` : "",
    details.helpers ? `People to lift: ${details.helpers}` : "",
    details.pickupDay ? `Days: ${details.pickupDay}` : "",
    details.pickupWindow ? `Window: ${details.pickupWindow}` : "",
    details.categories ? `What it is: ${details.categories}` : "",
    details.poundsPerWeek ? `Pounds / week: ${details.poundsPerWeek}` : "",
    row.scheduled_for ? `Scheduled: ${row.scheduled_for}` : "",
    row.assigned_name ? `Assigned to: ${row.assigned_name}` : "",
    row.message ? `Notes: ${row.message}` : "",
    "",
    "Open the desk: https://unitedundergod.org/admin",
  ];
  return lines.filter((line, i) => line !== "" || i === lines.length - 2).join("\n");
}
