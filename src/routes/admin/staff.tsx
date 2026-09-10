import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listStaff, saveStaff, type StaffRow } from "@/lib/desk-actions";
import { DESK_KINDS, STAFF_ROLES } from "@/lib/desk";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/staff")({
  component: StaffPage,
  head: () => ({
    meta: [{ title: "People — Desk" }],
  }),
});

function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<StaffRow | null>(null);

  async function load() {
    setError("");
    try {
      const result = await listStaff();
      setStaff(result.staff);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load people.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
        Crew
      </p>
      <h1 className="mt-2 text-3xl">People</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Who can open this desk, who manages a store, and who shows up with a
        truck. Pickup people get the email when you assign them — and the
        manager for that job gets it too.
      </p>
      {error ? (
        <p className="mt-4 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-3">
          {staff.map((person) => (
            <li
              key={person.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream px-4 py-4 shadow-[var(--shadow-border)]"
            >
              <div>
                <p className="font-medium text-ink">{person.name}</p>
                <p className="text-sm text-muted">
                  {person.email} · {person.role}
                  {person.pickup ? " · pickup" : ""}
                  {person.active ? "" : " · inactive"}
                </p>
                <p className="text-xs text-subtle">{person.kinds}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setEditing(person)}
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
        <StaffForm
          key={editing?.id ?? "new"}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      </div>
    </div>
  );
}

function StaffForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: StaffRow | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [kinds, setKinds] = useState<string[]>(
    initial?.kinds && initial.kinds !== "all"
      ? initial.kinds.split(",").map((s) => s.trim())
      : ["all"],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await saveStaff({
        data: {
          id: initial?.id,
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          role: String(data.get("role") ?? "hand"),
          kinds: kinds.join(","),
          pickup: Boolean(data.get("pickup")),
          active: !data.get("inactive"),
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]"
    >
      <h2 className="font-display text-xl">
        {initial ? "Edit person" : "Add a person"}
      </h2>
      <div className="mt-4 grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="staff-name">Name</Label>
          <Input id="staff-name" name="name" required defaultValue={initial?.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="staff-email">Email</Label>
          <Input
            id="staff-email"
            name="email"
            type="email"
            required
            defaultValue={initial?.email}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="staff-role">Role</Label>
          <select
            id="staff-role"
            name="role"
            defaultValue={initial?.role ?? "hand"}
            className="min-h-11 rounded-md bg-paper px-3 text-sm shadow-[var(--shadow-border)]"
          >
            {STAFF_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Jobs they cover</legend>
          <div className="flex flex-wrap gap-2">
            <KindToggle
              id="all"
              label="All"
              on={kinds.includes("all")}
              onClick={() => setKinds(["all"])}
            />
            {DESK_KINDS.map((item) => (
              <KindToggle
                key={item.id}
                id={item.id}
                label={item.label}
                on={kinds.includes(item.id)}
                onClick={() =>
                  setKinds((prev) => {
                    const next = prev.filter((k) => k !== "all");
                    return next.includes(item.id)
                      ? next.filter((k) => k !== item.id)
                      : [...next, item.id];
                  })
                }
              />
            ))}
          </div>
        </fieldset>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="pickup"
            defaultChecked={initial?.pickup}
            className="size-4 accent-forest"
          />
          Can be sent on pickups
        </label>
        {initial ? (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="inactive"
              defaultChecked={!initial.active}
              className="size-4 accent-forest"
            />
            Inactive
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-ink">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={busy}>
          Save
        </Button>
        {initial ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function KindToggle({
  label,
  on,
  onClick,
}: {
  id: string;
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
        on ? "bg-forest text-paper" : "bg-paper text-ink shadow-[var(--shadow-border)]",
      )}
    >
      {label}
    </button>
  );
}
