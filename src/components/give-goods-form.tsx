import { useState, type FormEvent, type ReactNode } from "react";
import { Camera, Check, Shirt, Sofa, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitInquiry } from "@/lib/desk-actions";
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

export function GiveGoodsForm({ className }: { className?: string }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState("");
  const [helpers, setHelpers] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || (!email && !phone)) {
      setError("A name and a way to reach you — email or phone.");
      return;
    }
    if (!categories.length) {
      setError("Tell us whether this is clothes, furniture, or household.");
      return;
    }
    const days = PICKUP_DAYS.filter((day) => data.get(`day-${day}`)).join(", ");
    const result = await submitInquiry({
      data: {
        intent: "goods",
        name,
        email,
        phone,
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
        <h3 className="mt-5 font-display text-2xl">Pickup is on our list.</h3>
        <p className="mt-3 max-w-prose text-muted">
          We will look at what you told us — the pictures, the vehicle, the
          number of hands — and come get it. Then it goes to a neighbor.
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
        Schedule a pickup
      </p>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-px w-px opacity-0"
        aria-hidden="true"
      />
      <p className="mt-2 text-sm text-muted">
        Tell us what it is and what we should bring. Stairs, weight, a second
        floor — that is how we come prepared.
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
                    : "bg-paper text-ink shadow-[var(--shadow-border)]",
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

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-ink">
          What days work for pickup?
        </p>
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

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="What time of day?"
          htmlFor="goods-window"
          className="sm:col-span-2"
        >
          <Input
            id="goods-window"
            name="pickupWindow"
            placeholder="After 5pm, Saturday morning, call first…"
          />
        </Field>
        <Field label="Your name" htmlFor="goods-name">
          <Input id="goods-name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Pickup address" htmlFor="goods-address">
          <Input
            id="goods-address"
            name="address"
            autoComplete="street-address"
            placeholder="Street, porch, side door…"
          />
        </Field>
        <Field label="Phone" htmlFor="goods-phone">
          <Input
            id="goods-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label="Email" htmlFor="goods-email">
          <Input
            id="goods-email"
            name="email"
            type="email"
            autoComplete="email"
          />
        </Field>
        <Field label="City" htmlFor="goods-city" className="sm:col-span-2">
          <Input
            id="goods-city"
            name="city"
            autoComplete="address-level2"
            placeholder="Vidalia"
          />
        </Field>
        <Field
          label="Anything else we should know?"
          htmlFor="goods-message"
          className="sm:col-span-2"
        >
          <Textarea
            id="goods-message"
            name="message"
            placeholder="Stairs, a second floor, how heavy it is, kids’ coats size 6–8…"
          />
        </Field>
      </div>

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

function PhotoPicker({
  photos,
  error,
  onFiles,
  onRemove,
}: {
  photos: string[];
  error: string;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="mt-5">
      <Label htmlFor="goods-photos">Pictures of what it is</Label>
      <p className="mt-1 text-xs text-subtle">
        Optional. Up to {MAX_PHOTOS}. On a phone you can take the picture here.
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
          <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-paper text-xs font-medium text-ink shadow-[var(--shadow-border)]">
            <Camera className="size-5 text-forest" />
            Add
            <input
              id="goods-photos"
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
                  : "bg-paper text-ink shadow-[var(--shadow-border)]",
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
