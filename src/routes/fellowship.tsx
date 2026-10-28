import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { InquiryDone } from "@/components/inquiry-done";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FELLOWSHIP_DAYS, FELLOWSHIP_LEAD, FELLOWSHIP_TIMES } from "@/lib/fellowship";
import { submitFellowshipInterest } from "@/lib/fellowship-actions";
import { readMembership } from "@/lib/membership-actions";
import { pageHead, serviceJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "Pastors often lead alone. Tell us where you serve, and when enough pastors near you are in, we start a weekly coffee meetup for pastors.";

export const Route = createFileRoute("/fellowship")({
  component: FellowshipPage,
  head: () =>
    pageHead({
      title: "Pastor fellowship: a weekly coffee for pastors | United Under God",
      description: DESCRIPTION,
      path: "/fellowship",
      jsonLd: [
        serviceJsonLd({
          name: "Pastor fellowship",
          description: DESCRIPTION,
          path: "/fellowship",
          serviceType: "Pastor fellowship",
          audience: "Pastors",
        }),
      ],
    }),
});

const SELECT =
  "flex min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none md:text-sm";

function FellowshipPage() {
  const [member, setMember] = useState<boolean | null>(null);
  useEffect(() => {
    void readMembership()
      .then((view) => setMember(view.member))
      .catch(() => setMember(false));
  }, []);

  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden tone-night bg-ink text-paper">
        <img
          src="/images/fellowship.jpg"
          alt="Pastors talking together around a table"
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            Pastor fellowship
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper md:text-5xl">Pastors often lead alone.</h1>
          <p className="mt-5 max-w-2xl text-lg text-paper/88">
            When enough pastors near you are in, we start a weekly coffee meetup.
          </p>
          <Button asChild variant="invert" className="mt-8">
            <a href="#in">Count me in</a>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div className="space-y-8">
          <article>
            <h2 className="text-2xl">How it works</h2>
            <ol className="mt-4 space-y-3 text-muted">
              <li>
                <span className="font-medium text-ink">1. Tell us where you serve.</span> Your ZIP, or
                your city and state, and the day and time that usually work.
              </li>
              <li>
                <span className="font-medium text-ink">2. We gather the pastors near you.</span> When
                enough are in, we pick a coffee shop and a time.
              </li>
              <li>
                <span className="font-medium text-ink">3. You get an email with the place and time.</span>{" "}
                Come as you are. No agenda to prepare, no program to sit through.
              </li>
            </ol>
          </article>
          <article>
            <h2 className="text-2xl">Who it is for</h2>
            <p className="mt-3 text-muted">
              Senior pastors, associate and youth pastors, church planters, and bivocational pastors
              of any denomination. Your church does not have to be part of anything to come.
            </p>
          </article>
          {member ? (
            <p className="rounded-xl bg-cream p-5 text-sm text-forest shadow-[var(--shadow-border)]">
              Included with your church’s membership.
            </p>
          ) : member === false ? (
            <aside className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]">
              <h2 className="font-display text-xl">Pastor fellowship is a member church benefit</h2>
              <p className="mt-2 text-sm text-muted">
                Any pastor is welcome to say they’re in. Member churches also get the full buying
                catalogs, a church website, and help when a vendor falls short.
              </p>
              <p className="mt-4">
                <Link to="/membership" className="text-sm font-medium text-forest underline-offset-4 hover:underline">
                  Become a member church
                </Link>
              </p>
            </aside>
          ) : null}
        </div>
        <div id="in" className="scroll-mt-24">
          <FellowshipForm />
        </div>
      </section>
    </SiteShell>
  );
}

function FellowshipForm() {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    setBusy(true);
    setError("");
    try {
      const result = await submitFellowshipInterest({
        data: {
          name: value("name"),
          church: value("church"),
          email: value("email"),
          phone: value("phone"),
          city: value("city"),
          state: value("state"),
          zip: value("zip"),
          preferredDay: value("preferredDay"),
          preferredTime: value("preferredTime"),
          hp: value("website"),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(result.areaLabel);
    } catch {
      setError("We could not take that in. Email lincoln@unitedundergod.org and we will add you.");
    } finally {
      setBusy(false);
    }
  }

  if (done !== null) {
    return (
      <InquiryDone saved emailed={false}>
        <h3 className="mt-5 font-display text-2xl">You’re in. Thank you.</h3>
        <p className="mt-3 max-w-prose text-muted">
          {done ? `We have you near ${done}. ` : ""}When enough pastors near you are in, we will email you
          the place and time.
        </p>
      </InquiryDone>
    );
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="relative rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:p-7"
    >
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-forest uppercase">
        <Coffee className="size-4" aria-hidden="true" /> Count me in
      </p>
      <p className="mt-2 max-w-prose text-sm text-muted">{FELLOWSHIP_LEAD}</p>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-px w-px opacity-0"
        aria-hidden="true"
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field id="fellowship-name" label="Your name">
          <Input id="fellowship-name" name="name" autoComplete="name" required />
        </Field>
        <Field id="fellowship-church" label="Church">
          <Input id="fellowship-church" name="church" autoComplete="organization" />
        </Field>
        <Field id="fellowship-email" label="Email">
          <Input id="fellowship-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field id="fellowship-phone" label="Phone">
          <Input id="fellowship-phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field id="fellowship-city" label="City">
          <Input id="fellowship-city" name="city" autoComplete="address-level2" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="fellowship-state" label="State">
            <Input id="fellowship-state" name="state" autoComplete="address-level1" />
          </Field>
          <Field id="fellowship-zip" label="ZIP">
            <Input id="fellowship-zip" name="zip" autoComplete="postal-code" inputMode="numeric" />
          </Field>
        </div>
        <Field id="fellowship-day" label="Day that usually works">
          <select id="fellowship-day" name="preferredDay" className={SELECT} defaultValue="">
            <option value="">Choose one</option>
            {FELLOWSHIP_DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </Field>
        <Field id="fellowship-time" label="Time that usually works">
          <select id="fellowship-time" name="preferredTime" className={SELECT} defaultValue="">
            <option value="">Choose one</option>
            {FELLOWSHIP_TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="mt-4 text-xs text-subtle">A ZIP code, or a city and state, is enough to find pastors near you.</p>
      {error ? (
        <p className="mt-4 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-6" disabled={busy}>
        {busy ? "Sending…" : "Count me in"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
