import { useState, type FormEvent, type ReactNode } from "react";
import { InquiryDone } from "@/components/inquiry-done";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LED_WALL_PARTS, LED_WALL_TIMING, getCampaign, ledWallNeed, type LedWallPart } from "@/lib/campaigns";
import type { LandingPage } from "@/lib/church-av-landing";
import { INQUIRY_UNREACHABLE } from "@/lib/desk";
import { submitNeedFn } from "@/lib/need-actions";

/**
 * The campaign pages' "three bids" sections (/church-av/led-wall). The form
 * posts a church need tagged with the campaign, so the bids run through the
 * need flow that already exists: the desk bids it out to the approved church
 * AV companies, and the church compares the bids on its private page.
 */

const STEPS = [
  {
    title: "Tell us about your room, once.",
    body: "How many seats, how wide the stage is, how much daylight comes in, and what you want: the wall, the lights, the sound, or all three.",
  },
  {
    title: "We write one clear scope.",
    body: "United Under God turns what you sent into one written scope, so every company bids on the same work and nothing is left out.",
  },
  {
    title: "Companies compete for it.",
    body: "Church audio, video and lighting companies that serve your area bid on that same scope. They never see your church’s name or how to reach you.",
  },
  {
    title: "You choose, or choose none.",
    body: "You see the bids side by side on your private page. Choose one and we introduce you to that company. If none fit, say so. No obligation.",
  },
];

/**
 * Photos for the LED wall page and its email, from Unsplash (used under the Unsplash License;
 * credited anyway). None of them is a project of a company that bids here.
 */
const PICTURES = [
  {
    src: "/images/led-wall/lyrics",
    alt: "Song words on a big screen above the stage while the congregation sings with hands raised",
    title: "Words every seat can read",
  },
  {
    src: "/images/led-wall/sanctuary",
    alt: "A sanctuary with screens on both sides of the stage and colored stage lights",
    title: "Screens sized for your room",
  },
  {
    src: "/images/led-wall/hall",
    alt: "A worship band on a small stage in a church hall, with a screen behind them",
    title: "For a fellowship hall or a new worship center",
  },
  {
    src: "/images/led-wall/lights",
    alt: "Stage lights on a rig above a wall of song lyrics",
    title: "Light that lifts the room",
  },
];
export const PHOTO_CREDIT = "Photos: Keagan Henman, Brad, and Rod Long on Unsplash.";

function Picture({ src, alt, className, eager }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return (
    <picture>
      <source type="image/webp" srcSet={`${src}.webp`} />
      <img
        src={`${src}.jpg`}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={className}
      />
    </picture>
  );
}

/** The LED wall page's hero picture: a band in front of a wall of song words, hands raised. */
export function BidHeroPicture() {
  return (
    <figure className="min-w-0">
      <picture>
        <source
          type="image/webp"
          srcSet="/images/led-wall/hero-960.webp 960w, /images/led-wall/hero.webp 1800w"
          sizes="(min-width: 768px) 45vw, 100vw"
        />
        <img
          src="/images/led-wall/hero-960.jpg"
          srcSet="/images/led-wall/hero-960.jpg 960w, /images/led-wall/hero.jpg 1800w"
          sizes="(min-width: 768px) 45vw, 100vw"
          width={1800}
          height={1200}
          alt="A worship band in front of a wall of song words, the congregation singing with hands raised"
          className="aspect-[3/2] w-full rounded-xl object-cover shadow-[var(--shadow-border)]"
          fetchPriority="high"
        />
      </picture>
    </figure>
  );
}

/** What it looks like: four pictures, two by two, each with the benefit it shows. */
export function BidPictures() {
  return (
    <section className="av-l-section">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="av-l-eyebrow">What it looks like</p>
          <h2 className="av-l-h2">The room, on a Sunday</h2>
        </div>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {PICTURES.map((p) => (
            <li key={p.src}>
              <figure>
                <Picture
                  src={p.src}
                  alt={p.alt}
                  className="aspect-[3/2] w-full rounded-xl object-cover shadow-[var(--shadow-border)]"
                />
                <figcaption className="mt-3 font-display text-lg">{p.title}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">{PHOTO_CREDIT}</p>
      </div>
    </section>
  );
}

/** The problems it ends, as a strip under the hero. */
export function BidPains({ page }: { page: LandingPage }) {
  if (!page.pains?.length) return null;
  return (
    <div className="mx-auto max-w-6xl px-5 pb-12 md:px-8">
      <p className="av-l-eyebrow">Problems this ends</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {page.pains.map((pain) => (
          <li key={pain} className="rounded-full bg-cream px-4 py-2 text-sm shadow-[var(--shadow-border)]">
            {pain}
          </li>
        ))}
      </ul>
    </div>
  );
}

const SELECT_CLASS =
  "min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)] disabled:opacity-50 md:text-sm";

export function BidSteps() {
  return (
    <section className="av-l-section av-l-process">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="av-l-eyebrow">We are United Under God</p>
          <h2 className="av-l-h2">A better deal on one of your biggest purchases</h2>
          <p className="av-l-body mt-4">
            An LED wall, lights and sound are a major investment. Churches stand stronger together:
            we write your project up once, three companies ready to bid compete for it, and you see
            fair, comparable bids without calling around or learning the jargon.
          </p>
        </div>
        <ol className="av-l-process-grid">
          {STEPS.map((step, i) => (
            <li key={step.title} className="av-l-step">
              <p className="av-l-step-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="av-l-h3">{step.title}</h3>
              <p className="av-l-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
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

export function BidRequest({ page }: { page: LandingPage }) {
  const campaign = getCampaign(page.campaign ?? "");
  return (
    <div className="av-l-request">
      <section id="talk" className="scroll-mt-24 bg-cream print:hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
          <div>
            <h2 className="text-3xl">Ask for three bids.</h2>
            <p className="mt-4 text-muted">
              A few answers about your room is enough to start. We will email you a private link
              where your bids will appear side by side. Nothing here is a price, and asking puts
              you under no obligation.
            </p>
            <ul className="mt-6 grid gap-3 text-muted">
              <li>Only United Under God sees your name and contact.</li>
              <li>The companies see the room and the work, never your church.</li>
              <li>You choose one bid, or none.</li>
            </ul>
          </div>
          <BidForm campaign={campaign?.slug ?? ""} />
        </div>
      </section>
    </div>
  );
}

function BidForm({ campaign }: { campaign: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ saved: boolean; emailed: boolean } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    let need;
    try {
      need = ledWallNeed({
        parts: data.getAll("parts").map(String),
        seats: value("seats"),
        stageWidth: value("stageWidth"),
        daylight: value("daylight"),
        timing: value("timing"),
        room: value("room"),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check the form and try again.");
      return;
    }
    setBusy(true);
    try {
      const result = await submitNeedFn({
        data: {
          orgKind: "church",
          churchName: value("church"),
          contactName: value("contactName"),
          email: value("email"),
          phone: value("phone"),
          city: value("city"),
          state: value("state"),
          zip: value("zip"),
          category: "audio-visual",
          title: need.title,
          details: need.details,
          quantity: value("seats") ? `${value("seats")} seats` : "",
          neededBy: "",
          campaign,
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
      <div className="rounded-xl bg-paper px-6 py-8 shadow-[var(--shadow-border)]" role="status">
        <h3 className="font-display text-2xl">Thank you. We have your room.</h3>
        {done.saved ? (
          <>
            <p className="mt-3 max-w-prose text-muted">
              {done.emailed
                ? "We emailed you a private link. Keep it; it is where your bids will appear."
                : "Your request is saved. We will email you a private link for your bids."}
            </p>
            <ol className="mt-4 grid list-decimal gap-2 pl-5 text-muted">
              <li>We write one scope from what you sent, and may call to ask about the room.</li>
              <li>Three church AV companies bid on it, without seeing who you are.</li>
              <li>We email you when the bids are in, side by side on your page.</li>
              <li>You choose one and we introduce you, or you choose none.</li>
            </ol>
          </>
        ) : (
          <InquiryDone saved={false} emailed className="mt-4 bg-cream" />
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="relative grid gap-6 rounded-xl bg-paper p-5 shadow-[var(--shadow-border)] sm:p-7"
    >
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="bid-fax">Fax</label>
        <input id="bid-fax" name="fax" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 font-display text-xl">What should they bid?</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LED_WALL_PARTS) as LedWallPart[]).map((part) => (
            <label
              key={part}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-cream px-3.5 text-sm shadow-[var(--shadow-border)] has-[:checked]:shadow-[0_0_0_2px_var(--color-forest)]"
            >
              <input type="checkbox" name="parts" value={part} defaultChecked />
              {LED_WALL_PARTS[part]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-xl">Your room</legend>
        <Field label="Seats in the room" htmlFor="bid-seats">
          <Input id="bid-seats" name="seats" inputMode="numeric" placeholder="350" maxLength={40} />
        </Field>
        <Field label="Stage width (about)" htmlFor="bid-stage">
          <Input id="bid-stage" name="stageWidth" placeholder="40 feet" maxLength={60} />
        </Field>
        <Field label="Daylight in the room" htmlFor="bid-daylight">
          <select id="bid-daylight" name="daylight" className={SELECT_CLASS} defaultValue="">
            <option value="">Not sure</option>
            <option>Very little, the room is dim</option>
            <option>Some windows</option>
            <option>Lots of daylight</option>
          </select>
        </Field>
        <Field label="When" htmlFor="bid-timing">
          <select id="bid-timing" name="timing" className={SELECT_CLASS} defaultValue="">
            <option value="">Not sure yet</option>
            {LED_WALL_TIMING.map((when) => (
              <option key={when}>{when}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Anything else about the room (optional)" htmlFor="bid-room">
            <Textarea
              id="bid-room"
              name="room"
              rows={4}
              placeholder="Where the cross is, what you use now, what isn't working."
            />
          </Field>
        </div>
        <p className="text-sm text-muted sm:col-span-2">
          Please leave your church’s name out of the room notes. The companies see these, never who
          you are.
        </p>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-xl">Your church</legend>
        <Field label="Church name" htmlFor="bid-church">
          <Input id="bid-church" name="church" autoComplete="organization" required />
        </Field>
        <Field label="Your name" htmlFor="bid-contact">
          <Input id="bid-contact" name="contactName" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="bid-email">
          <Input id="bid-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Phone (optional)" htmlFor="bid-phone">
          <Input id="bid-phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="City" htmlFor="bid-city">
          <Input id="bid-city" name="city" autoComplete="address-level2" required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State" htmlFor="bid-state">
            <Input
              id="bid-state"
              name="state"
              autoComplete="address-level1"
              placeholder="GA"
              maxLength={2}
              autoCapitalize="characters"
              required
            />
          </Field>
          <Field label="ZIP (optional)" htmlFor="bid-zip">
            <Input id="bid-zip" name="zip" autoComplete="postal-code" inputMode="numeric" maxLength={10} />
          </Field>
        </div>
      </fieldset>

      {error ? (
        <p className="text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={busy} size="lg">
          {busy ? "Sending…" : "Ask for three bids"}
        </Button>
      </div>
    </form>
  );
}
