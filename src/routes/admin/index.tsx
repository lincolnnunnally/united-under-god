import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EcosystemDeskCard } from "@/components/ecosystem-desk-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listInquiries,
  listStaff,
  readDeskGlance,
  updateInquiry,
  type InquiryRow,
  type StaffRow,
} from "@/lib/desk-actions";
import {
  DESK_KINDS,
  INQUIRY_STATUSES,
  kindLabel,
} from "@/lib/desk";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: InboxPage,
  head: () => ({
    meta: [{ title: "Inbox — Desk" }],
  }),
});

function InboxPage() {
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [glance, setGlance] = useState<Awaited<
    ReturnType<typeof readDeskGlance>
  > | null>(null);

  async function load() {
    setError("");
    try {
      const [inbox, people, desk] = await Promise.all([
        listInquiries({ data: { kind, status } }),
        listStaff(),
        readDeskGlance(),
      ]);
      setRows(inbox.inquiries);
      setStaff(people.staff.filter((p) => p.active));
      setGlance(desk);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load the desk.";
      setError(message === "Forbidden" ? "This sign-in is not on the staff list yet." : message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, status]);

  async function patch(
    id: string,
    data: {
      status?: string;
      assignedTo?: string | null;
      scheduledFor?: string;
      notify?: boolean;
    },
  ) {
    setBusy(id);
    try {
      await updateInquiry({ data: { ...data, id } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
    setBusy(null);
  }

  return (
    <div>
      <EcosystemDeskCard
        stats={glance?.stats ?? null}
        reportingArmed={glance?.reportingArmed ?? false}
      />

      <p className="mt-10 text-xs font-semibold tracking-[0.18em] text-forest uppercase">
        Super admin
      </p>
      <h1 className="mt-2 text-3xl">Inbox</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Every public form lands here and emails the people routed for that job.
        Assign a pickup so the crew and the manager both know when to show up.
        Counts also report to the owner dashboard — money, activity, and who is
        waiting across every app.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterChip label="All" on={kind === "all"} onClick={() => setKind("all")} />
        {DESK_KINDS.map((item) => (
          <FilterChip
            key={item.id}
            label={item.label}
            on={kind === item.id}
            onClick={() => setKind(item.id)}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <FilterChip label="Any status" on={status === "all"} onClick={() => setStatus("all")} />
        {INQUIRY_STATUSES.map((item) => (
          <FilterChip
            key={item.id}
            label={item.label}
            on={status === item.id}
            onClick={() => setStatus(item.id)}
          />
        ))}
      </div>

      {error ? (
        <p className="mt-6 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-8 space-y-4">
        {rows.length === 0 && !error ? (
          <li className="rounded-xl bg-cream px-5 py-8 text-muted shadow-[var(--shadow-border)]">
            Nothing in this filter yet. When someone schedules a pickup or takes
            the seal, it will show here.
          </li>
        ) : null}
        {rows.map((row) => (
          <InquiryCard
            key={row.id}
            row={row}
            staff={staff}
            busy={busy === row.id}
            onPatch={(data) => void patch(row.id, data)}
          />
        ))}
      </ul>
    </div>
  );
}

function FilterChip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-md px-3 text-sm font-medium",
        on ? "bg-forest text-paper" : "bg-cream text-ink shadow-[var(--shadow-border)]",
      )}
    >
      {label}
    </button>
  );
}

function InquiryCard({
  row,
  staff,
  busy,
  onPatch,
}: {
  row: InquiryRow;
  staff: StaffRow[];
  busy: boolean;
  onPatch: (data: { status?: string; assignedTo?: string | null; scheduledFor?: string; notify?: boolean }) => void;
}) {
  let details: Record<string, string> = {};
  try {
    details = JSON.parse(row.details || "{}") as Record<string, string>;
  } catch {
    details = {};
  }
  const when = new Date(row.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <li className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
            {kindLabel(row.kind)} · {row.status.replace("_", " ")}
          </p>
          <h2 className="mt-1 font-display text-2xl">{row.name}</h2>
          <p className="mt-1 text-sm text-muted">{when}</p>
        </div>
        <p className="text-sm text-muted">
          {row.email}
          {row.phone ? ` · ${row.phone}` : ""}
        </p>
      </div>
      <dl className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
        {row.address ? (
          <div>
            <dt className="font-medium text-ink">Address</dt>
            <dd>{row.address}{row.city ? ` · ${row.city}` : ""}</dd>
          </div>
        ) : null}
        {details.vehicle ? (
          <div>
            <dt className="font-medium text-ink">Vehicle / people</dt>
            <dd>
              {details.vehicle}
              {details.helpers ? ` · ${details.helpers}` : ""}
            </dd>
          </div>
        ) : null}
        {details.pickupDay || details.pickupWindow ? (
          <div>
            <dt className="font-medium text-ink">They asked for</dt>
            <dd>
              {details.pickupDay}
              {details.pickupWindow ? ` · ${details.pickupWindow}` : ""}
            </dd>
          </div>
        ) : null}
        {details.categories ? (
          <div>
            <dt className="font-medium text-ink">What</dt>
            <dd>{details.categories}</dd>
          </div>
        ) : null}
        {row.message ? (
          <div className="sm:col-span-2">
            <dt className="font-medium text-ink">Notes</dt>
            <dd>{row.message}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-ink">Assign pickup</span>
          <select
            className="min-h-11 rounded-md bg-paper px-3 text-sm shadow-[var(--shadow-border)]"
            value={row.assigned_to ?? ""}
            disabled={busy}
            onChange={(e) =>
              onPatch({
                assignedTo: e.target.value || null,
                status: e.target.value ? "assigned" : "new",
                notify: true,
              })
            }
          >
            <option value="">Not assigned</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} ({person.email})
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-ink">When to show up</span>
          <Input
            defaultValue={row.scheduled_for}
            placeholder="Saturday 10am, dock door…"
            disabled={busy}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value !== row.scheduled_for) {
                onPatch({
                  scheduledFor: value,
                  status: value ? "scheduled" : row.status,
                  notify: true,
                });
              }
            }}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onPatch({ status: "done", notify: false })}
        >
          Showed up / done
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => onPatch({ status: "no_show", notify: false })}
        >
          Did not show
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => onPatch({ notify: true })}
        >
          Email again
        </Button>
      </div>
    </li>
  );
}
