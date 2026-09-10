import { useState, type FormEvent, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  INTENT_COPY,
  type InvolvementIntent,
} from "@/lib/involvement";
import { submitInquiry } from "@/lib/desk-actions";
import { cn } from "@/lib/utils";

const ORG_TYPES = [
  "Church",
  "Business",
  "Charity",
  "Government / civic",
  "Household",
  "Other",
];

type Props = {
  intent: InvolvementIntent;
  className?: string;
};

export function InvolvementForm({ intent, className }: Props) {
  const copy = INTENT_COPY[intent];
  const needsOrg = intent === "seal" || intent === "grocery" || intent === "buying";
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (!name || !email) {
      setError("A name and email let us actually follow up.");
      return;
    }
    const result = await submitInquiry({
      data: {
        intent,
        name,
        email,
        phone: String(data.get("phone") ?? "").trim(),
        organization: String(data.get("organization") ?? "").trim(),
        orgType: String(data.get("orgType") ?? "").trim(),
        city: String(data.get("city") ?? "").trim(),
        message: String(data.get("message") ?? "").trim(),
        poundsPerWeek: String(data.get("poundsPerWeek") ?? "").trim(),
        address: String(data.get("address") ?? "").trim(),
        pickupDay: String(data.get("pickupDay") ?? "").trim(),
        pickupWindow: String(data.get("pickupWindow") ?? "").trim(),
        destination: "",
        categories: "",
        vehicle: "",
        helpers: "",
        hp: String(data.get("website") ?? ""),
      },
    });
    if (!result.ok) {
      setError(result.error || "We could not receive that. Try again.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div
        className={cn(
          "rounded-xl bg-cream px-6 py-8 shadow-[var(--shadow-border)]",
          className,
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-md bg-forest text-paper">
          <Check className="size-5" />
        </div>
        <h3 className="mt-5 font-display text-2xl">Received. Thank you.</h3>
        <p className="mt-3 max-w-prose text-muted">
          Someone from United Under God will be in touch. In the meantime, do
          not wait on us to start — a neighbor, a pantry shift, a first gift of
          food is already a step on mission.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "relative rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:p-7",
        className,
      )}
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
        {copy.title}
      </p>
      <p className="mt-2 max-w-prose text-sm text-muted">{copy.lead}</p>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-px w-px opacity-0"
        aria-hidden="true"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor={`${intent}-name`}>
          <Input id={`${intent}-name`} name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor={`${intent}-email`}>
          <Input
            id={`${intent}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Phone" htmlFor={`${intent}-phone`}>
          <Input
            id={`${intent}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label="City" htmlFor={`${intent}-city`}>
          <Input
            id={`${intent}-city`}
            name="city"
            autoComplete="address-level2"
            placeholder="Vidalia, Toombs County…"
          />
        </Field>
        {needsOrg ? (
          <>
            <Field
              label={intent === "grocery" ? "Store or business" : "Organization"}
              htmlFor={`${intent}-org`}
            >
              <Input id={`${intent}-org`} name="organization" />
            </Field>
            <Field label="Type" htmlFor={`${intent}-orgType`}>
              <select
                id={`${intent}-orgType`}
                name="orgType"
                className="flex min-h-11 w-full rounded-md bg-paper px-3.5 text-sm text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)]"
                defaultValue={intent === "grocery" ? "Business" : "Church"}
              >
                {ORG_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : (
          <Field label="Organization (optional)" htmlFor={`${intent}-org`} className="sm:col-span-2">
            <Input id={`${intent}-org`} name="organization" />
          </Field>
        )}
        {intent === "grocery" ? (
          <Field
            label="Unsold food you could share each week (lbs, estimate)"
            htmlFor={`${intent}-lbs`}
            className="sm:col-span-2"
          >
            <Input
              id={`${intent}-lbs`}
              name="poundsPerWeek"
              type="number"
              min={0}
              placeholder="50"
            />
          </Field>
        ) : null}
        <Field
          label={
            intent === "seal"
              ? "Anything we should know"
              : "What you can offer"
          }
          htmlFor={`${intent}-message`}
          className="sm:col-span-2"
        >
          <Textarea
            id={`${intent}-message`}
            name="message"
            placeholder={
              intent === "grocery"
                ? "Produce, bakery, dairy close-dated, canned overstock…"
                : intent === "time"
                  ? "Evenings, a truck, bookkeeping, packing…"
                  : undefined
            }
          />
        </Field>
      </div>

      {intent === "seal" ? (
        <label className="mt-5 flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            name="agree"
            required
            className="mt-1 size-4 shrink-0 accent-forest"
          />
          <span>
            Our organization chooses to be united under God, to operate by His
            principles, and to work love out in action the world can see.
          </span>
        </label>
      ) : null}

      {error ? <p className="mt-4 text-sm text-ink">{error}</p> : null}

      <Button type="submit" className="mt-6 w-full sm:w-auto">
        {copy.submit}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
