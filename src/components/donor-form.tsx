import { useState, type FormEvent, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DONOR_PATHS, PLENTY_DONATE } from "@/lib/content";
import { saveInvolvement, type InvolvementIntent } from "@/lib/involvement";
import { cn } from "@/lib/utils";

type DonorKind = (typeof DONOR_PATHS)[number]["id"];

const FOOD_KINDS = [
  "Grocery store",
  "Restaurant / kitchen",
  "Farm / producer",
  "Distributor / wholesaler",
  "Other food business",
];

const PICKUP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  initialKind?: DonorKind;
  lockKind?: boolean;
  className?: string;
};

export function DonorForm({ initialKind, lockKind = false, className }: Props) {
  const [kind, setKind] = useState<DonorKind>(initialKind ?? "food");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const path = DONOR_PATHS.find((item) => item.id === kind) ?? DONOR_PATHS[0];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (!name || !email) {
      setError("A name and email let us actually follow up.");
      return;
    }
    const days = PICKUP_DAYS.filter((day) => data.get(`day-${day}`)).join(", ");
    const intent: InvolvementIntent =
      kind === "food" ? "food" : kind === "org" ? "org" : "goods";
    saveInvolvement({
      intent,
      name,
      email,
      phone: String(data.get("phone") ?? "").trim(),
      organization: String(data.get("organization") ?? "").trim(),
      orgType: String(data.get("orgType") ?? "").trim(),
      city: String(data.get("city") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      poundsPerWeek: String(data.get("poundsPerWeek") ?? "").trim(),
      pickupDay: days,
      pickupWindow: String(data.get("pickupWindow") ?? "").trim(),
      destination: path.desk,
      message: String(data.get("message") ?? "").trim(),
    });
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
        <h3 className="mt-5 font-display text-2xl">You’re on the list.</h3>
        <p className="mt-3 max-w-prose text-muted">
          This gift is going to <span className="font-medium text-ink">{path.desk}</span>
          {kind === "food"
            ? " — the pantry. We will add your business, confirm a pickup window, and come get the food."
            : " — the goods desk. We will confirm pickup or receiving and put what you gave into someone’s hands."}
        </p>
        {kind === "food" ? (
          <p className="mt-3 text-sm">
            <a
              href={PLENTY_DONATE}
              target="_blank"
              rel="noreferrer"
              className="text-forest underline-offset-4 hover:underline"
            >
              You can also give directly on Plenty
            </a>
            .
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:p-7",
        className,
      )}
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
        {kind === "food" ? "Sign up and schedule pickup" : "Schedule a goods pickup"}
      </p>
      <p className="mt-2 text-sm text-muted">
        {lockKind ? path.deskNote : "One form. We put you in the right desk."}
      </p>

      {lockKind ? null : (
        <fieldset className="mt-5 grid gap-2">
          <legend className="sr-only">What are you giving</legend>
          {DONOR_PATHS.map((item) => (
            <label
              key={item.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md px-3 py-3 shadow-[var(--shadow-border)]",
                kind === item.id ? "bg-forest text-paper" : "bg-paper text-ink",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={item.id}
                checked={kind === item.id}
                onChange={() => setKind(item.id)}
                className="mt-1 size-4 accent-forest"
              />
              <span>
                <span className="block font-medium">{item.title}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-sm",
                    kind === item.id ? "text-paper/75" : "text-muted",
                  )}
                >
                  {item.who}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <p className="mt-4 text-sm text-muted">
        Goes to <span className="font-medium text-ink">{path.desk}</span>. {path.deskNote}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="donor-name">
          <Input id="donor-name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="donor-email">
          <Input
            id="donor-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Phone" htmlFor="donor-phone">
          <Input id="donor-phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="City" htmlFor="donor-city">
          <Input
            id="donor-city"
            name="city"
            autoComplete="address-level2"
            placeholder="Vidalia"
          />
        </Field>
        <Field
          label={kind === "food" ? "Store, farm, or kitchen" : "Organization (optional)"}
          htmlFor="donor-org"
          className="sm:col-span-2"
        >
          <Input id="donor-org" name="organization" />
        </Field>
        {kind === "food" ? (
          <Field label="Kind of business" htmlFor="donor-orgType">
            <select
              id="donor-orgType"
              name="orgType"
              className="flex min-h-11 w-full rounded-md bg-paper px-3.5 text-sm text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)]"
              defaultValue="Grocery store"
            >
              {FOOD_KINDS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Giving or receiving" htmlFor="donor-orgType">
            <select
              id="donor-orgType"
              name="orgType"
              className="flex min-h-11 w-full rounded-md bg-paper px-3.5 text-sm text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)]"
              defaultValue="Giving"
            >
              <option>Giving</option>
              <option>Receiving</option>
              <option>Both</option>
            </select>
          </Field>
        )}
        <Field
          label="Pickup or drop-off address"
          htmlFor="donor-address"
          className="sm:col-span-2"
        >
          <Input
            id="donor-address"
            name="address"
            autoComplete="street-address"
            placeholder="Street, dock door, farm gate…"
          />
        </Field>
        {kind === "food" ? (
          <Field
            label="Unsold food you could share each week (lbs, estimate)"
            htmlFor="donor-lbs"
            className="sm:col-span-2"
          >
            <Input
              id="donor-lbs"
              name="poundsPerWeek"
              type="number"
              min={0}
              placeholder="50"
            />
          </Field>
        ) : null}
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-ink">Preferred pickup days</p>
          <div className="flex flex-wrap gap-2">
            {PICKUP_DAYS.map((day) => (
              <label
                key={day}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-paper px-3 text-sm shadow-[var(--shadow-border)]"
              >
                <input
                  type="checkbox"
                  name={`day-${day}`}
                  className="size-4 accent-forest"
                />
                {day}
              </label>
            ))}
          </div>
        </div>
        <Field
          label="Pickup window"
          htmlFor="donor-window"
          className="sm:col-span-2"
        >
          <Input
            id="donor-window"
            name="pickupWindow"
            placeholder="After 7pm close, Saturday morning, call first…"
          />
        </Field>
        <Field
          label={kind === "food" ? "What you usually have" : "What you have, or what you receive"}
          htmlFor="donor-message"
          className="sm:col-span-2"
        >
          <Textarea
            id="donor-message"
            name="message"
            placeholder={
              kind === "food"
                ? "Bakery, produce, dairy close-dated, canned overstock. Cold storage on site?"
                : "Couches, children’s clothes, kitchenware, a truckload of hangers…"
            }
          />
        </Field>
      </div>

      {error ? <p className="mt-4 text-sm text-ink">{error}</p> : null}

      <Button type="submit" className="mt-6 w-full sm:w-auto">
        {kind === "food" ? "Schedule food pickup" : "Offer this gift"}
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
