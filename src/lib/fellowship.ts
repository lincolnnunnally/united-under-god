/**
 * Pastor fellowship: weekly coffee meetups that start when enough pastors in
 * one area are in. Pure helpers plus the store (migrations/0011).
 */
import type { Sql } from "./db.ts";

export const FELLOWSHIP_LEAD =
  "Pastors often lead alone. When enough pastors near you are in, we start a weekly coffee meetup.";

export const DEFAULT_FELLOWSHIP_THRESHOLD = 5;

export const FELLOWSHIP_DAYS = [
  "Any day",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const FELLOWSHIP_TIMES = [
  "Any time",
  "Early morning (before 8)",
  "Morning (8–11)",
  "Lunch (11–1)",
  "Afternoon (1–4)",
  "Evening (after 4)",
] as const;

/** FELLOWSHIP_THRESHOLD in the environment, else 5. Never below 2. */
export function fellowshipThreshold(env: { FELLOWSHIP_THRESHOLD?: string } = process.env): number {
  const n = Number.parseInt(env.FELLOWSHIP_THRESHOLD ?? "", 10);
  return Number.isFinite(n) && n >= 2 ? n : DEFAULT_FELLOWSHIP_THRESHOLD;
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

/**
 * The area a pastor is grouped in. A ZIP groups by its first three digits
 * (a ZIP3 covers a town and its neighbors); without one, by city and state.
 */
export function areaFor(input: { city: string; state: string; zip: string }):
  | { key: string; label: string }
  | null {
  const zip = (input.zip ?? "").replace(/\D/g, "");
  if (zip.length >= 5) {
    const zip3 = zip.slice(0, 3);
    return { key: `zip3:${zip3}`, label: `ZIP ${zip3}xx` };
  }
  const city = (input.city ?? "").trim();
  const state = (input.state ?? "").trim().toUpperCase();
  if (!city || !state) return null;
  const cityLabel = city.replace(/\b\w/g, (c) => c.toUpperCase());
  return { key: `city:${slug(city)}-${slug(state)}`, label: `${cityLabel}, ${state}` };
}

export type FellowshipInput = {
  name: string;
  church: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  preferredDay: string;
  preferredTime: string;
};

export type FellowshipPastor = FellowshipInput & {
  id: string;
  areaKey: string;
  areaLabel: string;
  isMember: boolean;
  createdAt: string;
};

export type FellowshipArea = {
  key: string;
  label: string;
  count: number;
  members: number;
  status: "gathering" | "started";
  meetingPlace: string;
  meetingTime: string;
  notifiedAt: string;
  startedAt: string;
  emailedAt: string;
  ready: boolean;
  pastors: FellowshipPastor[];
};

export function cleanFellowshipInput(input: FellowshipInput):
  | (FellowshipInput & { area: { key: string; label: string } })
  | { error: string } {
  const clip = (value: string, max = 200) => (value ?? "").trim().slice(0, max);
  const out = {
    name: clip(input.name),
    church: clip(input.church),
    email: clip(input.email).toLowerCase(),
    phone: clip(input.phone, 40),
    city: clip(input.city, 100),
    state: clip(input.state, 40).toUpperCase(),
    zip: clip(input.zip, 10),
    preferredDay: clip(input.preferredDay, 40),
    preferredTime: clip(input.preferredTime, 40),
  };
  if (!out.name) return { error: "Please give your name." };
  if (!out.email.includes("@") && !out.phone) return { error: "An email or phone lets us reach you." };
  const area = areaFor(out);
  if (!area) return { error: "Please give a ZIP code, or your city and state." };
  return { ...out, area };
}

const text = (value: unknown) => (value == null ? "" : String(value));
const iso = (value: unknown) =>
  value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
const bool = (value: unknown) => value === true || value === "t" || value === "true";

function mapPastor(row: Record<string, unknown>): FellowshipPastor {
  return {
    id: text(row.id),
    name: text(row.name),
    church: text(row.church),
    email: text(row.email),
    phone: text(row.phone),
    city: text(row.city),
    state: text(row.state),
    zip: text(row.zip),
    preferredDay: text(row.preferred_day),
    preferredTime: text(row.preferred_time),
    areaKey: text(row.area_key),
    areaLabel: text(row.area_label),
    isMember: bool(row.is_member),
    createdAt: iso(row.created_at),
  };
}

/** One person counts once per area, by email (or phone when there is no email). */
async function areaCount(sql: Sql, areaKey: string): Promise<number> {
  const rows = await sql<{ n: number }>`
    select count(distinct coalesce(nullif(email, ''), phone))::int as n
    from uug_fellowship_interest where area_key = ${areaKey}
  `;
  return Number(rows[0]?.n ?? 0);
}

export type ThresholdNotice = { subject: string; text: string };
export type NotifyOwner = (notice: ThresholdNotice) => Promise<unknown>;

/** One entry per person (by email, else phone); a later sign-up replaces an earlier one. */
export function uniquePastors(pastors: FellowshipPastor[]): FellowshipPastor[] {
  const byPerson = new Map<string, FellowshipPastor>();
  for (const p of pastors) byPerson.set(p.email || p.phone || p.id, p);
  return [...byPerson.values()];
}

export function thresholdNotice(area: { label: string }, all: FellowshipPastor[]): ThresholdNotice {
  const pastors = uniquePastors(all);
  const lines = pastors.map(
    (p) =>
      `- ${p.name}${p.church ? `, ${p.church}` : ""} · ${[p.email, p.phone].filter(Boolean).join(" · ")}` +
      ` · prefers ${p.preferredDay || "any day"}, ${p.preferredTime || "any time"}`,
  );
  return {
    subject: `Pastor fellowship: ${pastors.length} pastors near ${area.label} are in`,
    text: [
      `${pastors.length} pastors near ${area.label} want a weekly coffee meetup.`,
      "",
      ...lines,
      "",
      "Pick a place and a time, mark the group started on the desk, and email them:",
      "https://www.unitedundergod.org/admin/fellowship",
    ].join("\n"),
  };
}

/**
 * Save a pastor's interest. When the area first reaches the threshold, the
 * owner is emailed once: notified_at is claimed with a single conditional
 * update, so two sign-ups at the same moment still send one email.
 */
export async function addFellowshipInterest(
  sql: Sql,
  input: FellowshipInput & { area: { key: string; label: string } },
  opts: { userId: string | null; isMember: boolean; threshold: number; notifyOwner: NotifyOwner },
): Promise<{ id: string; areaKey: string; count: number; notified: boolean }> {
  const id = crypto.randomUUID();
  await sql`
    insert into uug_fellowship_interest (
      id, user_id, name, church, email, phone, city, state, zip,
      area_key, area_label, preferred_day, preferred_time, is_member
    ) values (
      ${id}, ${opts.userId}, ${input.name}, ${input.church}, ${input.email}, ${input.phone},
      ${input.city}, ${input.state}, ${input.zip}, ${input.area.key}, ${input.area.label},
      ${input.preferredDay}, ${input.preferredTime}, ${opts.isMember}
    )
  `;
  await sql`
    insert into uug_fellowship_areas (area_key, label) values (${input.area.key}, ${input.area.label})
    on conflict (area_key) do nothing
  `;
  const count = await areaCount(sql, input.area.key);
  let notified = false;
  if (count >= opts.threshold) {
    const claimed = await sql`
      update uug_fellowship_areas set notified_at = now(), updated_at = now()
      where area_key = ${input.area.key} and notified_at is null
      returning area_key
    `;
    if (claimed.length) {
      const pastors = await listAreaPastors(sql, input.area.key);
      try {
        await opts.notifyOwner(thresholdNotice({ label: input.area.label }, pastors));
        notified = true;
      } catch {
        // The claim stays: the desk shows the area as ready either way.
        console.error(`[fellowship] threshold email failed area=${input.area.key}`);
      }
    }
  }
  return { id, areaKey: input.area.key, count, notified };
}

export async function listAreaPastors(sql: Sql, areaKey: string): Promise<FellowshipPastor[]> {
  const rows = await sql`
    select * from uug_fellowship_interest where area_key = ${areaKey} order by created_at asc
  `;
  return rows.map(mapPastor);
}

/** The desk view: every area with its pastors, the readiest first. */
export async function listFellowshipAreas(sql: Sql, threshold: number): Promise<FellowshipArea[]> {
  const areas = await sql`select * from uug_fellowship_areas`;
  const pastors = (await sql`select * from uug_fellowship_interest order by created_at asc`).map(mapPastor);
  const out = areas.map((row): FellowshipArea => {
    const key = text(row.area_key);
    const mine = pastors.filter((p) => p.areaKey === key);
    const people = new Set(mine.map((p) => p.email || p.phone));
    return {
      key,
      label: text(row.label),
      count: people.size,
      members: uniquePastors(mine).filter((p) => p.isMember).length,
      status: text(row.status) === "started" ? "started" : "gathering",
      meetingPlace: text(row.meeting_place),
      meetingTime: text(row.meeting_time),
      notifiedAt: iso(row.notified_at),
      startedAt: iso(row.started_at),
      emailedAt: iso(row.emailed_at),
      ready: people.size >= threshold,
      pastors: uniquePastors(mine),
    };
  });
  return out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function markAreaStarted(
  sql: Sql,
  areaKey: string,
  meeting: { place: string; time: string },
): Promise<boolean> {
  const place = meeting.place.trim().slice(0, 300);
  const time = meeting.time.trim().slice(0, 200);
  if (!place || !time) return false;
  const rows = await sql`
    update uug_fellowship_areas set
      status = 'started', meeting_place = ${place}, meeting_time = ${time},
      started_at = coalesce(started_at, now()), updated_at = now()
    where area_key = ${areaKey}
    returning area_key
  `;
  return rows.length > 0;
}

export function meetupEmail(area: { label: string; meetingPlace: string; meetingTime: string }, note: string) {
  return {
    subject: `Pastor coffee near ${area.label}: ${area.meetingTime}`,
    text: [
      "Pastor,",
      "",
      `Enough pastors near ${area.label} said yes, so the weekly coffee is starting.`,
      "",
      `Where: ${area.meetingPlace}`,
      `When: ${area.meetingTime}`,
      ...(note.trim() ? ["", note.trim()] : []),
      "",
      "No agenda to prepare. Come as you are, and bring a pastor friend if you like.",
      "Reply to this email if the time does not work and we will hear it.",
      "",
      "United Under God",
      "https://www.unitedundergod.org/fellowship",
    ].join("\n"),
  };
}

export async function markAreaEmailed(sql: Sql, areaKey: string) {
  await sql`update uug_fellowship_areas set emailed_at = now(), updated_at = now() where area_key = ${areaKey}`;
}
