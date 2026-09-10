import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PLENTY_URL } from "@/lib/content";
import {
  readMyPlace,
  saveMyPlace,
  type MemberPlace,
} from "@/lib/member-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [{ title: "Your place — United Under God" }],
  }),
});

const ORG_TYPES = [
  "Church",
  "Business",
  "Charity",
  "Government / civic",
  "Household",
  "Other",
];

const STANDS = [
  {
    key: "wantsSeal" as const,
    title: "The seal",
    body: "A public statement of intent — to be united under God and to fulfill the biblical mandate.",
  },
  {
    key: "wantsBuying" as const,
    title: "United buying",
    body: "Shared catalogs so a little church is not paying retail for toner, supplies, and tools.",
  },
  {
    key: "wantsMission" as const,
    title: "Live on Mission",
    body: "Your life is purposeful when you use it for a purpose. See the need. Do the thing. Tell the story.",
  },
  {
    key: "wantsVolunteer" as const,
    title: "Time and hands",
    body: "Pack, drive, sit with someone, offer the skill you already have.",
  },
];

function AccountPage() {
  const { user, isPending } = useCurrentUserState();
  const [place, setPlace] = useState<MemberPlace | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (isPending || !user) return;
    void readMyPlace()
      .then((row) => {
        if (!row.name && user.displayName) row.name = user.displayName;
        if (!row.email && user.primaryEmail) row.email = user.primaryEmail;
        setPlace(row);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Could not load your place.");
      });
  }, [isPending, user]);

  if (isPending) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-5 py-16">
          <div className="h-10 w-48 animate-pulse rounded-md bg-cream" />
        </div>
      </SiteShell>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;
  if (loadError) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-5 py-16">
          <p className="text-muted">{loadError}</p>
        </div>
      </SiteShell>
    );
  }
  if (!place) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-5 py-16">
          <div className="h-10 w-48 animate-pulse rounded-md bg-cream" />
        </div>
      </SiteShell>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const next = await saveMyPlace({
        data: {
          name: String(form.get("name") ?? ""),
          organization: String(form.get("organization") ?? ""),
          orgType: String(form.get("orgType") ?? ""),
          city: String(form.get("city") ?? ""),
          phone: String(form.get("phone") ?? ""),
          wantsSeal: form.get("wantsSeal") === "on",
          wantsBuying: form.get("wantsBuying") === "on",
          wantsMission: form.get("wantsMission") === "on",
          wantsVolunteer: form.get("wantsVolunteer") === "on",
        },
      });
      setPlace(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto flex max-w-3xl flex-wrap items-end justify-between gap-4 px-5 py-16 md:px-8 md:py-20">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
              Your place
            </p>
            <h1 className="mt-3 text-4xl">Stand with the movement.</h1>
            <p className="mt-4 max-w-prose text-muted">
              This account is for churches, businesses, charities, and
              households. Keep the seal, the buying fellowship, and Live on
              Mission in one place.
            </p>
          </div>
          <UserButton />
        </div>
      </section>

      {place.isStaff ? (
        <section className="border-b border-rule">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <p className="text-sm text-muted">You also run the staff desk.</p>
            <Button asChild>
              <Link to="/admin">Open the desk</Link>
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <form className="grid gap-8" onSubmit={(event) => void onSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="place-name">Your name</Label>
              <Input
                id="place-name"
                name="name"
                value={place.name}
                onChange={(event) =>
                  setPlace({ ...place, name: event.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="place-org">Organization</Label>
              <Input
                id="place-org"
                name="organization"
                value={place.organization}
                onChange={(event) =>
                  setPlace({ ...place, organization: event.target.value })
                }
                placeholder="Church, business, charity, or household"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="place-type">Kind</Label>
              <select
                id="place-type"
                name="orgType"
                className="flex min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none md:text-sm"
                value={place.orgType}
                onChange={(event) =>
                  setPlace({ ...place, orgType: event.target.value })
                }
              >
                <option value="">Choose one</option>
                {ORG_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="place-city">City</Label>
              <Input
                id="place-city"
                name="city"
                value={place.city}
                onChange={(event) =>
                  setPlace({ ...place, city: event.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="place-phone">Phone</Label>
              <Input
                id="place-phone"
                name="phone"
                type="tel"
                value={place.phone}
                onChange={(event) =>
                  setPlace({ ...place, phone: event.target.value })
                }
              />
            </div>
            <p className="text-sm text-muted sm:col-span-2">
              Signed in as {place.email || user.primaryEmail}.
            </p>
          </div>

          <div>
            <h2 className="text-2xl">What you are standing in</h2>
            <p className="mt-2 text-sm text-muted">
              Check what you want. We will follow up. You can change this later.
            </p>
            <ul className="mt-6 grid gap-3">
              {STANDS.map((stand) => {
                const on = place[stand.key];
                return (
                  <li key={stand.key}>
                    <label
                      className={cn(
                        "flex cursor-pointer gap-4 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]",
                        on && "shadow-[var(--shadow-border-hover)]",
                      )}
                    >
                      <input
                        type="checkbox"
                        name={stand.key}
                        className="mt-1 size-5 accent-[var(--color-forest)]"
                        checked={on}
                        onChange={(event) =>
                          setPlace({ ...place, [stand.key]: event.target.checked })
                        }
                      />
                      <span>
                        <span className="font-display text-lg text-ink">
                          {stand.title}
                        </span>
                        <span className="mt-1 block text-sm text-muted">
                          {stand.body}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {error ? (
            <p className="text-sm text-ink" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm text-forest" role="status">
              Saved. If you newly raised a hand, the desk has it.
            </p>
          ) : null}

          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save my place"}
          </Button>
        </form>

        <aside className="mt-12 rounded-xl border border-rule bg-cream p-6">
          <h2 className="font-display text-xl">Food pantry neighbors</h2>
          <p className="mt-2 text-sm text-muted">
            If you need groceries, donate food, or volunteer at the Vidalia
            pantry, that account lives on Plenty — not on this site.
          </p>
          <p className="mt-4">
            <a
              href={PLENTY_URL}
              className="text-sm font-medium text-forest underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Sign in on Plenty
            </a>
          </p>
        </aside>
      </section>
    </SiteShell>
  );
}
