import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { InquiryDone } from "@/components/inquiry-done";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORG_KINDS, needCategories } from "@/lib/church-needs";
import { INQUIRY_UNREACHABLE } from "@/lib/desk";
import { submitNeedFn } from "@/lib/need-actions";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/buying/need/")({
  component: NeedPage,
  head: () =>
    pageHead({
      title: "Post a need: we’ll get it quoted | United Under God",
      description:
        "Tell United Under God what your church, ministry, or Christian-owned business needs. We ask suppliers to quote, keep your contact private, and show you the quotes side by side. You choose, or choose none.",
      path: "/buying/need",
    }),
});

const SELECT_CLASS =
  "min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)] disabled:opacity-50 md:text-sm";

const PROMISES = [
  {
    title: "Your contact stays private",
    body: "Suppliers never see your name, your organization’s name, or how to reach you. Nobody calls you to sell.",
  },
  {
    title: "Quotes side by side",
    body: "We ask suppliers to compete for the work, collect the quotes, and show them to you on one page.",
  },
  {
    title: "You choose, or choose none",
    body: "Pick the quote that fits and we introduce you to that supplier. If none fit, say so. No obligation.",
  },
  {
    title: "Stronger together",
    body: "When several members need something similar, we put those needs in the same bid, so suppliers quote on the larger order.",
  },
];

function NeedPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link to="/buying" className="underline-offset-4 hover:text-ink hover:underline">
              Group buying
            </Link>
            {" / "}
            <span aria-current="page">Post a need</span>
          </nav>
          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            For churches, ministries, and Christian-owned businesses
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">Post a need. We’ll get it quoted.</h1>
          <p className="mt-5 max-w-2xl text-muted">
            Tell us what you need. United Under God asks suppliers to quote on it, so they compete for
            the work and you don’t have to field the calls. This is at no charge to you.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {PROMISES.map((item) => (
              <div key={item.title} className="rounded-xl bg-paper p-5 shadow-[var(--shadow-border)]">
                <h2 className="font-display text-lg">{item.title}</h2>
                <p className="mt-2 text-sm text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <NeedForm />
      </section>
    </SiteShell>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function NeedForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ saved: boolean; emailed: boolean } | null>(null);
  const [kind, setKind] = useState<keyof typeof ORG_KINDS>("church");
  const noun = ORG_KINDS[kind].noun;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    setBusy(true);
    try {
      const result = await submitNeedFn({
        data: {
          orgKind: value("orgKind"),
          churchName: value("church"),
          contactName: value("contactName"),
          email: value("email"),
          phone: value("phone"),
          city: value("city"),
          state: value("state"),
          zip: value("zip"),
          category: value("category"),
          title: value("title"),
          details: value("details"),
          quantity: value("quantity"),
          neededBy: value("neededBy"),
          hp: value("fax"),
        },
      });
      if (!result.ok) {
        setError(result.error || INQUIRY_UNREACHABLE);
        return;
      }
      setDone({ saved: result.saved, emailed: result.emailed });
    } catch {
      setError(INQUIRY_UNREACHABLE);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-cream px-6 py-8 shadow-[var(--shadow-border)]" role="status">
        <h2 className="font-display text-2xl">Thank you. We have your need.</h2>
        {done.saved ? (
          <>
            <p className="mt-3 max-w-prose text-muted">
              {done.emailed
                ? "We emailed you a private link to your need. Keep it; it is how you will see your quotes."
                : "Your need is saved. We will email you a private link to it."}
            </p>
            <h3 className="mt-6 font-display text-lg">What happens next</h3>
            <ol className="mt-2 grid list-decimal gap-2 pl-5 text-muted">
              <li>We ask suppliers to quote. They never see who you are.</li>
              <li>If others need something similar, we may put the needs in one bid.</li>
              <li>When the quotes are in, we email you and show them side by side.</li>
              <li>You choose one and we introduce you to the supplier, or you choose none.</li>
            </ol>
          </>
        ) : (
          <InquiryDone saved={false} emailed className="mt-4 bg-paper" />
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="relative grid gap-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:p-7"
    >
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="need-fax">Fax</label>
        <input id="need-fax" name="fax" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="grid gap-4">
        <legend className="mb-2 font-display text-xl">What you need</legend>
        <Field label="Category" htmlFor="need-category">
          <select id="need-category" name="category" className={SELECT_CLASS} defaultValue="">
            <option value="">Something else</option>
            {needCategories().map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="What do you need?" htmlFor="need-title">
          <Input id="need-title" name="title" placeholder="Stackable chairs" maxLength={160} required />
        </Field>
        <Field label="Details" htmlFor="need-details">
          <Textarea
            id="need-details"
            name="details"
            rows={5}
            placeholder="Size, color, brand you like, anything a supplier should know."
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How many" htmlFor="need-quantity">
            <Input id="need-quantity" name="quantity" placeholder="120 chairs" maxLength={120} />
          </Field>
          <Field label="Needed by (optional)" htmlFor="need-by">
            <Input id="need-by" name="neededBy" type="date" />
          </Field>
        </div>
        <p className="text-sm text-muted">
          Please leave your {noun}’s name out of the details. We share what you need with suppliers,
          never who you are.
        </p>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-xl">Who it’s for</legend>
        <div className="grid gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium" id="need-kind-label">
            We are a
          </span>
          <div role="radiogroup" aria-labelledby="need-kind-label" className="flex flex-wrap gap-2">
            {(Object.keys(ORG_KINDS) as (keyof typeof ORG_KINDS)[]).map((key) => (
              <label
                key={key}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-paper px-3.5 text-sm shadow-[var(--shadow-border)] has-[:checked]:shadow-[0_0_0_2px_var(--color-forest)]"
              >
                <input
                  type="radio"
                  name="orgKind"
                  value={key}
                  checked={kind === key}
                  onChange={() => setKind(key)}
                />
                {ORG_KINDS[key].label}
              </label>
            ))}
          </div>
        </div>
        <Field label={kind === "church" ? "Church name" : "Organization name"} htmlFor="need-church">
          <Input id="need-church" name="church" autoComplete="organization" required />
        </Field>
        <Field label="Your name" htmlFor="need-contact">
          <Input id="need-contact" name="contactName" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="need-email">
          <Input id="need-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Phone (optional)" htmlFor="need-phone">
          <Input id="need-phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="City" htmlFor="need-city">
          <Input id="need-city" name="city" autoComplete="address-level2" required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State" htmlFor="need-state">
            <Input
              id="need-state"
              name="state"
              autoComplete="address-level1"
              placeholder="GA"
              maxLength={2}
              autoCapitalize="characters"
              required
            />
          </Field>
          <Field label="ZIP (optional)" htmlFor="need-zip">
            <Input id="need-zip" name="zip" autoComplete="postal-code" inputMode="numeric" maxLength={10} />
          </Field>
        </div>
      </fieldset>

      <p className="text-sm text-muted">
        Only United Under God sees your name and contact. We use them to send you your quotes and,
        if you choose one, to introduce you to that supplier.
      </p>

      {error ? (
        <p className="text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Post my need"}
        </Button>
      </div>
    </form>
  );
}
