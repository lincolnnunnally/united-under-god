import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { InquiryDone } from "@/components/inquiry-done";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listReportVendorsFn, submitReport } from "@/lib/case-actions";
import { INQUIRY_UNREACHABLE } from "@/lib/desk";
import { pageHead } from "@/lib/seo";
import { COVENANT } from "@/lib/vendor-terms";

export const Route = createFileRoute("/buying/report")({
  loader: () => listReportVendorsFn(),
  component: ReportPage,
  head: () =>
    pageHead({
      title: "Report a problem with a program vendor | United Under God",
      description:
        "If a vendor in the United Under God church buying program doesn’t make it right, tell us. We will hear both sides and hold the vendor to the Vendor Covenant.",
      path: "/buying/report",
    }),
});

const SELECT_CLASS =
  "min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)] disabled:opacity-50 md:text-sm";

function ReportPage() {
  const { vendors, unavailable } = Route.useLoaderData();
  const days = COVENANT.responseBusinessDays;
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link to="/buying" className="underline-offset-4 hover:text-ink hover:underline">
              Group buying
            </Link>
            {" / "}
            <span aria-current="page">Report a problem</span>
          </nav>
          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            For churches
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">Report a problem with a program vendor</h1>
          <p className="mt-5 max-w-2xl text-muted">
            If a program vendor doesn’t make it right, tell us. We will hear it and see it through.
          </p>
          <p className="mt-4 max-w-2xl text-muted">
            Every vendor in the buying program agrees to the{" "}
            <Link
              to="/buying/vendor-terms"
              hash="covenant"
              className="text-forest underline-offset-4 hover:underline"
            >
              Vendor Covenant
            </Link>
            : to make it right when it isn’t right for the church, to stand behind its work, and to
            answer a concern within {days} business {days === 1 ? "day" : "days"}.
          </p>
          <p className="mt-4 max-w-2xl text-muted">
            We share your concern with the vendor and ask for its side. If the two of you can’t
            settle it, United Under God hears both sides and decides, and we may ask a small
            committee to help mediate. We hold the vendor to the covenant and tell you what we
            decide.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        {unavailable ? (
          <p className="mb-6 text-sm text-ink" role="status">
            The vendor list could not be loaded just now. Please try again shortly.
          </p>
        ) : null}
        <ReportForm vendors={vendors} />
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

function ReportForm({ vendors }: { vendors: { id: string; company: string }[] }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ saved: boolean; emailed: boolean } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    setBusy(true);
    try {
      const result = await submitReport({
        data: {
          churchName: value("church"),
          contactName: value("contactName"),
          email: value("email"),
          phone: value("phone"),
          vendorId: value("vendor"),
          purchase: value("purchase"),
          purchasedOn: value("purchasedOn"),
          problem: value("problem"),
          wanted: value("wanted"),
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
        <h2 className="mt-5 font-display text-2xl">Thank you. We have your report.</h2>
        <p className="mt-3 max-w-prose text-muted">
          We will read it, ask the vendor for its side, and follow up with you by email. If the two
          of you can’t settle it, we will hear both sides and tell you what we decide.
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
        <label htmlFor="report-fax">Fax</label>
        <input id="report-fax" name="fax" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-xl">Your church</legend>
        <Field label="Church name" htmlFor="report-church">
          <Input id="report-church" name="church" autoComplete="organization" required />
        </Field>
        <Field label="Your name" htmlFor="report-contact">
          <Input id="report-contact" name="contactName" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="report-email">
          <Input id="report-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Phone" htmlFor="report-phone">
          <Input id="report-phone" name="phone" type="tel" autoComplete="tel" required />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 font-display text-xl">What happened</legend>
        <Field label="The vendor" htmlFor="report-vendor">
          <select
            id="report-vendor"
            name="vendor"
            className={SELECT_CLASS}
            required
            defaultValue=""
          >
            <option value="" disabled>
              {vendors.length
                ? "Pick the vendor you bought from"
                : "No program vendors are listed yet"}
            </option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.company}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What you bought" htmlFor="report-purchase">
            <Input id="report-purchase" name="purchase" required />
          </Field>
          <Field label="When (a date or month)" htmlFor="report-when">
            <Input id="report-when" name="purchasedOn" placeholder="October 2026" required />
          </Field>
        </div>
        <Field label="What went wrong" htmlFor="report-problem">
          <Textarea id="report-problem" name="problem" rows={5} required />
        </Field>
        <Field label="What would make it right" htmlFor="report-wanted">
          <Textarea id="report-wanted" name="wanted" rows={3} required />
        </Field>
      </fieldset>

      <p className="text-sm text-muted">
        We share your report with the vendor so it can answer. We never publish it.
      </p>

      {error ? (
        <p className="text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={busy || vendors.length === 0}>
          {busy ? "Sending…" : "Send the report"}
        </Button>
      </div>
    </form>
  );
}
