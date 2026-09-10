import { useState, type FormEvent, type ReactNode } from "react";
import { Camera, Check, Shirt, Sofa, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  goodsNeeds,
  goodsOffers,
  matchingNeeds,
  matchingOffers,
  saveInvolvement,
} from "@/lib/involvement";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "Clothes", Icon: Shirt },
  { id: "Furniture", Icon: Sofa },
  { id: "Household", Icon: Package },
] as const;

const VEHICLES = ["Car", "SUV", "Pickup truck", "Box truck", "Not sure"];
const CREW = ["One person", "Two people", "Three or more", "Not sure"];
const PICKUP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_PHOTOS = 4;

export function GoodsExchange() {
  const [tick, setTick] = useState(0);
  const [path, setPath] = useState<"give" | "need">("give");
  const bump = () => setTick((n) => n + 1);

  return (
    <div>
      <div
        className="mb-6 grid grid-cols-2 gap-2 lg:hidden"
        role="tablist"
        aria-label="Give or receive goods"
      >
        <button
          type="button"
          role="tab"
          aria-selected={path === "give"}
          onClick={() => setPath("give")}
          className={cn(
            "min-h-11 rounded-md px-3 text-sm font-medium",
            path === "give"
              ? "bg-forest text-paper"
              : "bg-paper text-ink shadow-[var(--shadow-border)]",
          )}
        >
          I am giving
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={path === "need"}
          onClick={() => setPath("need")}
          className={cn(
            "min-h-11 rounded-md px-3 text-sm font-medium",
            path === "need"
              ? "bg-forest text-paper"
              : "bg-paper text-ink shadow-[var(--shadow-border)]",
          )}
        >
          I need to receive
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className={cn(path !== "give" && "hidden lg:block")}>
          <GiveGoodsForm tick={tick} onSaved={bump} />
        </div>
        <div className={cn(path !== "need" && "hidden lg:block")}>
          <NeedGoodsForm tick={tick} onSaved={bump} />
        </div>
      </div>
    </div>
  );
}

function GiveGoodsForm({
  tick,
  onSaved,
}: {
  tick: number;
  onSaved: () => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState("");
  const [helpers, setHelpers] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [matched, setMatched] = useState(0);
  const openNeeds = goodsNeeds().slice(-4).reverse();
  void tick;

  async function onPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoError("");
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, room);
    try {
      const next = await Promise.all(picked.map(compressPhoto));
      setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
    } catch {
      setPhotoError("We could not read that picture. Try another.");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || !email) {
      setError("A name and email let us actually follow up.");
      return;
    }
    if (!categories.length) {
      setError("Tell us whether this is clothes, furniture, or household.");
      return;
    }
    const days = PICKUP_DAYS.filter((day) => data.get(`day-${day}`)).join(", ");
    const hits = matchingNeeds(message, categories.join(" "));
    saveInvolvement({
      intent: "goods",
      name,
      email,
      phone: String(data.get("phone") ?? "").trim(),
      organization: "",
      orgType: "Giving",
      city: String(data.get("city") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      poundsPerWeek: "",
      pickupDay: days,
      pickupWindow: String(data.get("pickupWindow") ?? "").trim(),
      destination: "Operate",
      message,
      categories: categories.join(", "),
      vehicle,
      helpers,
      photos,
      needItem: "",
    });
    setMatched(hits.length);
    setDone(true);
    onSaved();
  }

  if (done) {
    return (
      <DoneCard
        title="Pickup is on our list."
        body={
          matched
            ? "Someone already asked for something like this. We will try to take it straight to them — no warehouse in between."
            : "We will look at the pictures, bring the right vehicle and the right number of hands, and put this in a neighbor’s hands."
        }
      />
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl bg-paper p-5 shadow-[var(--shadow-border)] sm:p-7"
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
        This is what I am giving
      </p>
      <h3 className="mt-2 font-display text-2xl">Schedule a pickup</h3>
      <p className="mt-2 text-sm text-muted">
        Clothes or furniture. What vehicle we should bring. How many people to
        lift it. Pictures help us come prepared.
      </p>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-ink">What is it?</legend>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((item) => {
            const on = categories.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setCategories((prev) =>
                    on ? prev.filter((c) => c !== item.id) : [...prev, item.id],
                  )
                }
                className={cn(
                  "flex min-h-20 flex-col items-center justify-center gap-1 rounded-md px-2 py-3 text-center text-sm font-medium",
                  on
                    ? "bg-forest text-paper"
                    : "bg-cream text-ink shadow-[var(--shadow-border)]",
                )}
              >
                <item.Icon className="size-5" />
                {item.id}
              </button>
            );
          })}
        </div>
      </fieldset>

      <PhotoPicker
        id="give-photos"
        photos={photos}
        error={photoError}
        onFiles={onPhotos}
        onRemove={(i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
      />

      <ChoiceRow
        legend="What vehicle should we bring?"
        options={VEHICLES}
        value={vehicle}
        onChange={setVehicle}
      />
      <ChoiceRow
        legend="How many people to lift it?"
        options={CREW}
        value={helpers}
        onChange={setHelpers}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="give-name">
          <Input id="give-name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="give-email">
          <Input
            id="give-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Phone" htmlFor="give-phone">
          <Input id="give-phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="City" htmlFor="give-city">
          <Input
            id="give-city"
            name="city"
            autoComplete="address-level2"
            placeholder="Vidalia"
          />
        </Field>
        <Field
          label="Pickup address"
          htmlFor="give-address"
          className="sm:col-span-2"
        >
          <Input
            id="give-address"
            name="address"
            autoComplete="street-address"
            placeholder="Street, porch, side door…"
          />
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-ink">Preferred pickup days</p>
          <div className="flex flex-wrap gap-2">
            {PICKUP_DAYS.map((day) => (
              <label
                key={day}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-cream px-3 text-sm shadow-[var(--shadow-border)]"
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
          htmlFor="give-window"
          className="sm:col-span-2"
        >
          <Input
            id="give-window"
            name="pickupWindow"
            placeholder="After 5pm, Saturday morning, call first…"
          />
        </Field>
        <Field
          label="Anything we should know"
          htmlFor="give-message"
          className="sm:col-span-2"
        >
          <Textarea
            id="give-message"
            name="message"
            placeholder="Brown couch, stairs to a second floor, kids’ coats size 6–8…"
          />
        </Field>
      </div>

      {openNeeds.length ? (
        <aside className="mt-5 rounded-md bg-cream px-4 py-3 text-sm text-muted">
          <p className="font-medium text-ink">Neighbors already asked</p>
          <ul className="mt-2 space-y-1">
            {openNeeds.map((need) => (
              <li key={need.id}>
                {need.needItem || need.message || "A household item"}
                {need.city ? ` — ${need.city}` : ""}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-6 w-full">
        Schedule a pickup
      </Button>
    </form>
  );
}

function NeedGoodsForm({
  tick,
  onSaved,
}: {
  tick: number;
  onSaved: () => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [matched, setMatched] = useState(0);
  const openOffers = goodsOffers().slice(-4).reverse();
  void tick;

  async function onPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoError("");
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, room);
    try {
      const next = await Promise.all(picked.map(compressPhoto));
      setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
    } catch {
      setPhotoError("We could not read that picture. Try another.");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const needItem = String(data.get("needItem") ?? "").trim();
    if (!name || !email) {
      setError("A name and email let us actually follow up.");
      return;
    }
    if (!needItem) {
      setError("Tell us what you need — a couch, coats, a crib.");
      return;
    }
    const hits = matchingOffers(needItem, categories.join(" "));
    saveInvolvement({
      intent: "need",
      name,
      email,
      phone: String(data.get("phone") ?? "").trim(),
      organization: "",
      orgType: "Receiving",
      city: String(data.get("city") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      poundsPerWeek: "",
      pickupDay: "",
      pickupWindow: "",
      destination: "Operate",
      message: String(data.get("message") ?? "").trim(),
      categories: categories.join(", "),
      vehicle: "",
      helpers: "",
      photos,
      needItem,
    });
    setMatched(hits.length);
    setDone(true);
    onSaved();
  }

  if (done) {
    return (
      <DoneCard
        title="The body will hear this."
        body={
          matched
            ? "Someone has already offered something like this. We will connect you and skip the warehouse if we can."
            : "We will look at what has been offered. If we do not have it, we will ask — “Does anybody have a couch? A family needs one.”"
        }
      />
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl bg-paper p-5 shadow-[var(--shadow-border)] sm:p-7"
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
        I need to receive some things
      </p>
      <h3 className="mt-2 font-display text-2xl">Ask for what you need</h3>
      <p className="mt-2 text-sm text-muted">
        A couch. Winter coats. A crib. Tell us. We look at what people have
        offered. If it is not here, we ask the body — and skip storage when we
        can.
      </p>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium text-ink">What kind of thing?</legend>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((item) => {
            const on = categories.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setCategories((prev) =>
                    on ? prev.filter((c) => c !== item.id) : [...prev, item.id],
                  )
                }
                className={cn(
                  "flex min-h-20 flex-col items-center justify-center gap-1 rounded-md px-2 py-3 text-center text-sm font-medium",
                  on
                    ? "bg-forest text-paper"
                    : "bg-cream text-ink shadow-[var(--shadow-border)]",
                )}
              >
                <item.Icon className="size-5" />
                {item.id}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4">
        <Field label="What do you need?" htmlFor="need-item">
          <Input
            id="need-item"
            name="needItem"
            required
            placeholder="A couch, a twin bed, coats for a 6-year-old…"
          />
        </Field>
        <PhotoPicker
          id="need-photos"
          label="A picture of the space or size, if it helps"
          photos={photos}
          error={photoError}
          onFiles={onPhotos}
          onRemove={(i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="need-name">
            <Input id="need-name" name="name" autoComplete="name" required />
          </Field>
          <Field label="Email" htmlFor="need-email">
            <Input
              id="need-email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Phone" htmlFor="need-phone">
            <Input id="need-phone" name="phone" type="tel" autoComplete="tel" />
          </Field>
          <Field label="City" htmlFor="need-city">
            <Input
              id="need-city"
              name="city"
              autoComplete="address-level2"
              placeholder="Vidalia"
            />
          </Field>
        </div>
        <Field label="Where should it go? (optional)" htmlFor="need-address">
          <Input
            id="need-address"
            name="address"
            autoComplete="street-address"
          />
        </Field>
        <Field label="Anything we should know" htmlFor="need-message">
          <Textarea
            id="need-message"
            name="message"
            placeholder="Stairs, a small apartment, needed before Friday…"
          />
        </Field>
      </div>

      {openOffers.length ? (
        <aside className="mt-5 rounded-md bg-cream px-4 py-3 text-sm text-muted">
          <p className="font-medium text-ink">Recently offered</p>
          <ul className="mt-2 space-y-1">
            {openOffers.map((offer) => (
              <li key={offer.id}>
                {offer.categories || "Household goods"}
                {offer.city ? ` — ${offer.city}` : ""}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-6 w-full">
        Ask for this
      </Button>
    </form>
  );
}

function PhotoPicker({
  id,
  label = "Pictures of what it is",
  photos,
  error,
  onFiles,
  onRemove,
}: {
  id: string;
  label?: string;
  photos: string[];
  error: string;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="mt-5">
      <Label htmlFor={id}>{label}</Label>
      <p className="mt-1 text-xs text-subtle">
        Up to {MAX_PHOTOS}. On a phone you can take the picture right here.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {photos.map((src, index) => (
          <div
            key={src.slice(0, 24) + index}
            className="relative size-20 overflow-hidden rounded-md"
          >
            <img src={src} alt="" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Remove picture"
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-ink/80 text-paper"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-cream text-xs font-medium text-ink shadow-[var(--shadow-border)]">
            <Camera className="size-5 text-forest" />
            Add
            <input
              id={id}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-ink">{error}</p> : null}
    </div>
  );
}

function ChoiceRow({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? "" : option)}
              className={cn(
                "min-h-11 rounded-md px-3 text-sm font-medium",
                on
                  ? "bg-forest text-paper"
                  : "bg-cream text-ink shadow-[var(--shadow-border)]",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function DoneCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-paper px-6 py-8 shadow-[var(--shadow-border)]">
      <div className="flex size-11 items-center justify-center rounded-md bg-forest text-paper">
        <Check className="size-5" />
      </div>
      <h3 className="mt-5 font-display text-2xl">{title}</h3>
      <p className="mt-3 max-w-prose text-muted">{body}</p>
    </div>
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

async function compressPhoto(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 960;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.62);
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
  }
}
