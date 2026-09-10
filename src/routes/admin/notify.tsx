import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteNotifyRoute,
  listNotifyRoutes,
  saveNotifyRoute,
  type RouteRow,
} from "@/lib/desk-actions";
import { DESK_KINDS, NOTIFY_ROLES } from "@/lib/desk";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notify")({
  component: NotifyPage,
  head: () => ({
    meta: [{ title: "Email routes — Desk" }],
  }),
});

function NotifyPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const result = await listNotifyRoutes();
      setRoutes(result.routes);
    } catch (err) {
      setError(
        err instanceof Error && err.message === "Forbidden"
          ? "Only a super admin can change who gets emailed."
          : err instanceof Error
            ? err.message
            : "Could not load routes.",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
        Notifications
      </p>
      <h1 className="mt-2 text-3xl">Who gets the email</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Lincoln and the backup inbox get everything. Add a clothing-store
        manager for clothes, a furniture crew for furniture, a volunteer
        manager for time. A pickup assignment emails the person who is going
        and the manager who needs to know what to expect.
      </p>
      {error ? (
        <p className="mt-4 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-8 space-y-3">
        {routes.map((route) => (
          <li
            key={route.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream px-4 py-4 shadow-[var(--shadow-border)]"
          >
            <div>
              <p className="font-medium text-ink">
                {route.label || route.email}
              </p>
              <p className="text-sm text-muted">
                {route.email} · {route.role} · {route.kinds}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                await deleteNotifyRoute({ data: { id: route.id } });
                await load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      <RouteForm onSaved={load} />
    </div>
  );
}

function RouteForm({ onSaved }: { onSaved: () => void }) {
  const [kinds, setKinds] = useState<string[]>(["all"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await saveNotifyRoute({
        data: {
          email: String(data.get("email") ?? ""),
          label: String(data.get("label") ?? ""),
          role: String(data.get("role") ?? "always"),
          kinds: kinds.join(","),
        },
      });
      event.currentTarget.reset();
      setKinds(["all"]);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]"
    >
      <h2 className="font-display text-xl">Add an address</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="route-email">Email</Label>
          <Input id="route-email" name="email" type="email" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="route-label">Label</Label>
          <Input
            id="route-label"
            name="label"
            placeholder="Vidalia clothing store"
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="route-role">When to email them</Label>
          <select
            id="route-role"
            name="role"
            className="min-h-11 rounded-md bg-paper px-3 text-sm shadow-[var(--shadow-border)]"
            defaultValue="always"
          >
            {NOTIFY_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-ink">For which jobs</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setKinds(["all"])}
            className={cn(
              "min-h-11 rounded-md px-3 text-sm font-medium",
              kinds.includes("all")
                ? "bg-forest text-paper"
                : "bg-paper text-ink shadow-[var(--shadow-border)]",
            )}
          >
            All
          </button>
          {DESK_KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setKinds((prev) => {
                  const next = prev.filter((k) => k !== "all");
                  return next.includes(item.id)
                    ? next.filter((k) => k !== item.id)
                    : [...next, item.id];
                })
              }
              className={cn(
                "min-h-11 rounded-md px-3 text-sm font-medium",
                kinds.includes(item.id)
                  ? "bg-forest text-paper"
                  : "bg-paper text-ink shadow-[var(--shadow-border)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>
      {error ? <p className="mt-3 text-sm text-ink">{error}</p> : null}
      <Button type="submit" className="mt-5" disabled={busy}>
        Add address
      </Button>
    </form>
  );
}
