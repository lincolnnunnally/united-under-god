import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { FeeDisclosure } from "@/components/fee-disclosure";
import { InquiryDone } from "@/components/inquiry-done";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INQUIRY_UNREACHABLE } from "@/lib/desk";
import { pageHead } from "@/lib/seo";
import { submitVendorSignup } from "@/lib/vendor-actions";
import { LICENSED_VENDOR_NOTE, US_STATES, vendorCategoryOptions } from "@/lib/vendor-store";
import { VENDOR_TERMS_VERSION } from "@/lib/vendor-terms";

export const Route = createFileRoute("/buying/vendors")({
  component: VendorSignupPage,
  head: () =>
    pageHead({
      title: "Serve churches as a vendor | United Under God",
      description:
        "Businesses that supply churches can sign up for the United Under God buying program, get invited to group bids in their categories and area, and quote online.",
      path: "/buying/vendors",
    }),
});

function VendorSignupPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link to="/buying" className="underline-offset-4 hover:text-ink hover:underline">
              Group buying
            </Link>
            {" / "}
            <span aria-current="page">Vendors</span>
          </nav>
          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            For vendors
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">Serve churches through group bids</h1>
          <p className="mt-5 max-w-2xl text-muted">
            Churches in the buying program pool what they buy. When a bid opens in a category and
            area you serve, we email you a private link to see the line items and quote online.
            Churches buy directly from you and choose freely.
          </p>
          <p className="mt-4 max-w-2xl text-muted">
            Vendors pay a rebate or a referral fee on program sales, as set out in the{" "}
            <Link
              to="/buying/vendor-terms"
              className="text-forest underline-offset-4 hover:underline"
            >
              Vendor Terms
            </Link>
            . We review each sign-up before inviting you to a bid.
          </p>
          <FeeDisclosure className="mt-4" />
        </div>
      </section>
      <section className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div>
            <h2 className="font-display text-xl">Sell to churches</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              See how many churches our church directory lists in the states you serve, how bids
              work, and what the program costs before you sign up.
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link to="/buying/sell-to-churches">See the vendor program</Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <VendorSignupForm />
      </section>
    </SiteShell>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function VendorSignupForm() {
  const options = vendorCategoryOptions();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [states, setStates] = useState<Set<string>>(new Set());
  const [nationwide, setNationwide] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ saved: boolean; emailed: boolean } | null>(null);

  function toggle(set: Set<string>, keys: string[], on: boolean) {
    const next = new Set(set);
    for (const key of keys) {
      if (on) next.add(key);
      else next.delete(key);
    }
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    if (!data.get("agreed")) {
      setError("Tick “I agree to the Vendor Terms” to sign up.");
      return;
    }
    setBusy(true);
    try {
      const result = await submitVendorSignup({
        data: {
          company: value("company"),
          contactName: value("contactName"),
          email: value("email"),
          phone: value("phone"),
          website: value("site"),
          categories: [...picked],
          states: nationwide ? [] : [...states],
          places: nationwide ? "" : value("places"),
          nationwide,
          insured: value("insured"),
          notes: value("notes"),
          agreed: Boolean(data.get("agreed")),
          termsVersion: VENDOR_TERMS_VERSION,
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
      <InquiryDone saved={done.saved} emailed={done.emailed}>
        <h2 className="mt-5 font-display text-2xl">Thank you. Your sign-up is in.</h2>
        <p className="mt-3 max-w-prose text-muted">
          We review each vendor before the first invitation. When a bid opens in a category and area
          you serve, you will get an email with a private link to quote.
        </p>
      </InquiryDone>
    );
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="relative grid gap-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:p-7"
    >
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="vendor-fax">Fax</label>
        <input id="vendor-fax" name="fax" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-xl">Your company</legend>
        <Field label="Company" htmlFor="vendor-company">
          <Input id="vendor-company" name="company" autoComplete="organization" required />
        </Field>
        <Field label="Contact name" htmlFor="vendor-contact">
          <Input id="vendor-contact" name="contactName" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="vendor-email">
          <Input id="vendor-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Phone" htmlFor="vendor-phone">
          <Input id="vendor-phone" name="phone" type="tel" autoComplete="tel" required />
        </Field>
        <Field label="Website (optional)" htmlFor="vendor-site">
          <Input id="vendor-site" name="site" autoComplete="url" placeholder="example.com" />
        </Field>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-2 font-display text-xl">What you supply</legend>
        <p className="text-sm text-muted">
          Pick every category or subcategory you serve. You will only be invited to bids that match.
        </p>
        <p className="rounded-lg bg-paper px-4 py-3 text-sm text-ink shadow-[var(--shadow-border)]">
          {LICENSED_VENDOR_NOTE}
        </p>
        <div className="grid gap-2">
          {options.map(({ category, subcategories }) => {
            const keys = subcategories.map((row) => row.key);
            const count = keys.filter((key) => picked.has(key)).length;
            const all = count === keys.length;
            return (
              <details
                key={category.id}
                className="rounded-lg bg-paper px-4 py-2 shadow-[var(--shadow-border)]"
              >
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2">
                  <span className="font-medium">{category.name}</span>
                  <span className="text-sm text-muted">{count ? `${count} picked` : ""}</span>
                </summary>
                <div className="grid gap-1 pb-2">
                  <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-forest)]"
                      checked={all}
                      onChange={(event) =>
                        setPicked((set) => toggle(set, keys, event.target.checked))
                      }
                    />
                    All of {category.name}
                  </label>
                  {subcategories.map(({ key, sub }) => (
                    <label key={key} className="flex min-h-11 items-center gap-2 pl-6 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--color-forest)]"
                        checked={picked.has(key)}
                        onChange={(event) =>
                          setPicked((set) => toggle(set, [key], event.target.checked))
                        }
                      />
                      {sub.name}
                    </label>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-2 font-display text-xl">Where you serve</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-forest)]"
            checked={nationwide}
            onChange={(event) => setNationwide(event.target.checked)}
          />
          Nationwide / ships anywhere
        </label>
        {nationwide ? null : (
          <>
            <p className="text-sm text-muted">States you serve:</p>
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
              {US_STATES.map((state) => (
                <label
                  key={state.code}
                  className="flex min-h-11 items-center gap-2 text-sm"
                  title={state.name}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-forest)]"
                    checked={states.has(state.code)}
                    aria-label={state.name}
                    onChange={(event) =>
                      setStates((set) => toggle(set, [state.code], event.target.checked))
                    }
                  />
                  {state.code}
                </label>
              ))}
            </div>
            <Field label="Cities or ZIP codes (optional, comma separated)" htmlFor="vendor-places">
              <Textarea
                id="vendor-places"
                name="places"
                rows={2}
                placeholder="Savannah, 31401, Pooler"
              />
            </Field>
          </>
        )}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 font-display text-xl">Insurance</legend>
        <p className="text-sm text-ink">Do you carry general liability insurance?</p>
        <div className="flex gap-6">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="insured"
              value="yes"
              required
              className="size-4 accent-[var(--color-forest)]"
            />
            Yes
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="insured"
              value="no"
              className="size-4 accent-[var(--color-forest)]"
            />
            No
          </label>
        </div>
      </fieldset>

      <Field label="Notes (optional)" htmlFor="vendor-notes">
        <Textarea id="vendor-notes" name="notes" rows={4} />
      </Field>

      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          name="agreed"
          required
          className="mt-0.5 size-4 accent-[var(--color-forest)]"
        />
        <span>
          I agree to the{" "}
          <Link
            to="/buying/vendor-terms"
            target="_blank"
            className="text-forest underline-offset-4 hover:underline"
          >
            Vendor Terms
          </Link>{" "}
          (version {VENDOR_TERMS_VERSION}).
        </span>
      </label>

      {error ? (
        <p className="text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Sign up as a vendor"}
        </Button>
      </div>
    </form>
  );
}
