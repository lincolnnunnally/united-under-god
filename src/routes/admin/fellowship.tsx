import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { meetupEmail, type FellowshipArea } from "@/lib/fellowship";
import {
  emailFellowshipGroup,
  readFellowshipDesk,
  startFellowshipGroup,
  type FellowshipDesk,
} from "@/lib/fellowship-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/fellowship")({
  component: FellowshipDeskPage,
  head: () => ({
    meta: [{ title: "Pastor fellowship — Desk" }],
  }),
});

function FellowshipDeskPage() {
  const [desk, setDesk] = useState<FellowshipDesk | null>(null);
  const [error, setError] = useState("");

  function load() {
    void readFellowshipDesk()
      .then(setDesk)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load fellowship."));
  }
  useEffect(load, []);

  return (
    <div>
      <h1 className="font-display text-3xl">Pastor fellowship</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Pastors who want a weekly coffee, grouped by area (ZIP3, or city and state). When an area
        reaches {desk?.threshold ?? 5} pastors you get one email. Pick a place and a time, mark the
        group started, then email them.
      </p>
      {error ? (
        <p className="mt-6 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      {desk && !desk.ready ? (
        <p className="mt-6 text-sm text-muted">The fellowship tables are not set up yet.</p>
      ) : null}
      {desk === null && !error ? <div className="mt-8 h-24 animate-pulse rounded-xl bg-cream" /> : null}
      {desk && desk.ready && desk.areas.length === 0 ? (
        <p className="mt-8 text-muted">No pastors have signed up yet.</p>
      ) : null}
      <div className="mt-8 grid gap-4">
        {desk?.areas.map((area) => (
          <AreaCard key={area.key} area={area} threshold={desk.threshold} onChange={load} />
        ))}
      </div>
    </div>
  );
}

function AreaCard({
  area,
  threshold,
  onChange,
}: {
  area: FellowshipArea;
  threshold: number;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const result = await startFellowshipGroup({
        data: {
          areaKey: area.key,
          place: String(form.get("place") ?? ""),
          time: String(form.get("time") ?? ""),
        },
      });
      setMessage(result.ok ? "Marked started." : result.error);
      if (result.ok) onChange();
    } catch {
      setMessage("That did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function onEmail() {
    setBusy(true);
    setMessage("");
    try {
      const result = await emailFellowshipGroup({ data: { areaKey: area.key, note } });
      setMessage(result.ok ? `Sent ${result.sent} of ${result.attempted}.` : result.error);
      if (result.ok) onChange();
    } catch {
      setMessage("The emails did not send.");
    } finally {
      setBusy(false);
    }
  }

  const preview = area.status === "started" ? meetupEmail(area, note) : null;

  return (
    <article className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
      <button
        type="button"
        className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-display text-xl">{area.label}</span>
        <span className="text-sm text-muted">
          <span className={cn("font-medium", area.ready ? "text-forest" : "text-ink")}>
            {area.count} of {threshold}
          </span>
          {area.members ? ` · ${area.members} from member churches` : ""}
          {" · "}
          {area.status === "started" ? "Started" : area.ready ? "Ready to start" : "Gathering"}
          {area.emailedAt ? " · Emailed" : ""}
        </span>
      </button>
      {area.status === "started" ? (
        <p className="mt-1 text-sm text-muted">
          {area.meetingPlace} · {area.meetingTime}
        </p>
      ) : null}
      {open ? (
        <div className="mt-5 grid gap-6">
          <ul className="divide-y divide-rule rounded-lg bg-paper shadow-[var(--shadow-border)]">
            {area.pastors.map((p) => (
              <li key={p.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{p.name}</span>
                {p.church ? <span className="text-muted"> · {p.church}</span> : null}
                {p.isMember ? <span className="text-forest"> · member church</span> : null}
                <div className="text-muted">
                  {[p.email, p.phone].filter(Boolean).join(" · ")} · prefers{" "}
                  {p.preferredDay || "any day"}, {p.preferredTime || "any time"}
                </div>
              </li>
            ))}
          </ul>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onStart(event)}>
            <div className="grid gap-1.5">
              <Label htmlFor={`place-${area.key}`}>Meeting place</Label>
              <Input id={`place-${area.key}`} name="place" defaultValue={area.meetingPlace} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`time-${area.key}`}>Day and time</Label>
              <Input
                id={`time-${area.key}`}
                name="time"
                defaultValue={area.meetingTime}
                placeholder="Tuesdays at 7:30 a.m."
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" disabled={busy}>
                {area.status === "started" ? "Update place and time" : "Mark started"}
              </Button>
            </div>
          </form>
          {preview ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`note-${area.key}`}>A note to add (optional)</Label>
                <Textarea id={`note-${area.key}`} value={note} onChange={(event) => setNote(event.target.value)} />
              </div>
              <pre className="overflow-x-auto rounded-lg bg-paper p-4 text-xs whitespace-pre-wrap text-muted shadow-[var(--shadow-border)]">
                {`Subject: ${preview.subject}\n\n${preview.text}`}
              </pre>
              <div>
                <Button disabled={busy} onClick={() => void onEmail()}>
                  Email these pastors
                </Button>
                <p className="mt-2 text-xs text-subtle">Each pastor gets their own email; no one sees the others’ addresses.</p>
              </div>
            </div>
          ) : null}
          {message ? (
            <p className="text-sm text-ink" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
