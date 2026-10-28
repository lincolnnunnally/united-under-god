import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { FeeDisclosure } from "@/components/fee-disclosure";
import { InvolvementForm } from "@/components/involvement-form";
import { MemberBenefits } from "@/components/member-gate";
import { MemberHome } from "@/components/member-home";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { MEMBER_PRICE_LABEL } from "@/lib/membership";
import {
  readMembership,
  saveMyChurch,
  startMemberCheckout,
  type MembershipView,
} from "@/lib/membership-actions";
import type { MemberChurch } from "@/lib/membership-store";
import { absoluteUrl, pageHead, serviceJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const TITLE = "Church Buying Program & Purchasing Group | United Under God";
const DESCRIPTION =
  "Become a member church for $20 a month: a nonprofit church buying program and purchasing group with vendor contacts, awarded prices, a church website, and pastor fellowship.";

const FAQ = [
  {
    q: "What is a member church?",
    a: "A church that belongs to the United Under God buying program and its member services for $20 a month, per church. Members see every vendor contact, awarded price, brochure, and review in the buying catalogs, get a church website on a unitedundergod.org address, are invited to pastor fellowship, and can use the problem resolution process.",
  },
  {
    q: "Is this a church discount program?",
    a: "It is a church purchasing group. We ask vendors to bid for the group, award the bid, and publish the awarded price to members. We do not promise a discount or an amount. You see the awarded price and decide for yourself.",
  },
  {
    q: "Who runs it, and where does the money go?",
    a: "United Under God, Inc., a 501(c)(3) nonprofit association of churches working together. Member dues and the rebates program vendors pay us fund the work: running bids, checking vendors, building church websites, and seeing problems through.",
  },
  {
    q: "Is the seal part of membership?",
    a: "No. The seal stays free and never requires membership. Membership is the paid program for the buying catalogs and member services.",
  },
  {
    q: "Can we cancel?",
    a: "Yes. Manage or cancel billing any time from this page once you are a member. Access continues to the end of the month you paid for.",
  },
];

export const Route = createFileRoute("/membership/")({
  component: MembershipPage,
  head: () =>
    pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/membership",
      jsonLd: [
        serviceJsonLd({
          name: "Member church: church buying program",
          description:
            "A nonprofit church purchasing group. Member churches see vendor contacts and awarded prices, and receive a church website, pastor fellowship, and problem resolution.",
          path: "/membership",
          serviceType: "Church group purchasing",
          audience: "Churches",
          offers: { price: "20", description: "$20 a month, per church" },
        }),
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          url: absoluteUrl("/membership"),
          mainEntity: FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        },
      ],
    }),
});

function MembershipPage() {
  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden tone-night bg-ink text-paper">
        <img
          src="/images/fellowship.jpg"
          alt="Pastors and church leaders gathered around a table"
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            Member churches
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper md:text-5xl">
            Churches buying, building, and leading together.
          </h1>
          <p className="mt-5 max-w-2xl text-paper/88">
            United Under God is a nonprofit association of churches working together. A member
            church sees the vendors and awarded prices in the buying catalogs, gets a church website,
            and has pastors and a problem resolution process standing with it.
          </p>
          <p className="mt-6 font-display text-2xl text-paper">{MEMBER_PRICE_LABEL}.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="invert">
              <a href="#become">Become a member church</a>
            </Button>
            <a
              href="#benefits"
              className="inline-flex min-h-11 items-center text-sm text-paper/85 underline-offset-4 hover:underline"
            >
              What members receive
            </a>
          </div>
        </div>
      </section>

      <section id="benefits" className="scroll-mt-24 border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <h2 className="max-w-2xl text-3xl">What a member church receives</h2>
          <MemberBenefits className="mt-10" />
          <p className="mt-8 max-w-2xl text-sm text-muted">
            Anyone can browse the{" "}
            <Link to="/buying" className="text-forest underline-offset-4 hover:underline">
              buying catalogs
            </Link>{" "}
            to see what is bid and how it works. Vendor contacts, prices, brochures, reviews, and
            quote requests are for member churches.
          </p>
        </div>
      </section>

      <section className="border-b border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8">
          <div>
            <h2 className="text-2xl">Plain and honest</h2>
            <ul className="mt-5 space-y-3 text-muted">
              <Fact>{MEMBER_PRICE_LABEL}. One church, one membership.</Fact>
              <Fact>
                United Under God, Inc. is a 501(c)(3) nonprofit. Member dues and the rebates program
                vendors pay us fund the service.
              </Fact>
              <Fact>
                We ask vendors to bid for the group and show members what was awarded. We do not
                promise a discount or an amount.
              </Fact>
              <Fact>Cancel any time from this page.</Fact>
            </ul>
            <FeeDisclosure className="mt-6" />
          </div>
          <div>
            <h2 className="text-2xl">The seal stays free</h2>
            <p className="mt-5 text-muted">
              The seal is a statement of intent any church, business, charity, or household can
              make. It costs nothing and never requires membership.
            </p>
            <p className="mt-4">
              <Link to="/join" className="text-forest underline-offset-4 hover:underline">
                Take the seal
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section id="become" className="scroll-mt-24 border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <JoinFlow />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <h2 className="text-3xl">Questions</h2>
        <dl className="mt-8 grid gap-8">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-display text-lg text-ink">{item.q}</dt>
              <dd className="mt-2 text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </SiteShell>
  );
}

function Fact({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <Check className="mt-1 size-4 shrink-0 text-forest" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

const STEPS = ["Sign in or create an account", "Your church’s details", "Pay"] as const;

function Steps({ at }: { at: 0 | 1 | 2 }) {
  return (
    <ol className="mt-6 grid gap-2 sm:grid-cols-3" aria-label="Steps">
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={cn(
            "rounded-lg px-4 py-3 text-sm shadow-[var(--shadow-border)]",
            i === at ? "bg-forest text-paper" : i < at ? "bg-cream text-forest" : "bg-paper text-muted",
          )}
          aria-current={i === at ? "step" : undefined}
        >
          <span className="font-semibold">{i + 1}.</span> {label}
        </li>
      ))}
    </ol>
  );
}

/** Sign in or create an account, enter the church's details, then pay. */
function JoinFlow() {
  const { user, isPending } = useCurrentUserState();
  const [view, setView] = useState<MembershipView | null>(null);
  const [failed, setFailed] = useState(false);
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    if (isPending) return;
    setCanceled(new URLSearchParams(window.location.search).get("checkout") === "canceled");
    void readMembership()
      .then(setView)
      .catch(() => setFailed(true));
  }, [isPending, user]);

  if (failed) {
    return (
      <p className="text-muted">
        This could not load just now. Please refresh, or email lincoln@unitedundergod.org.
      </p>
    );
  }
  if (isPending || !view) return <div className="h-64 animate-pulse rounded-xl bg-cream" />;

  if (view.member && view.church) return <MemberHome church={view.church} open={view.open} />;

  if (!view.open) {
    return (
      <div>
        <h2 className="text-3xl">Membership opens soon</h2>
        <p className="mt-3 text-muted">
          We are getting billing ready. Tell us you’re interested and we will write the day your
          church can sign up.
        </p>
        <InvolvementForm
          intent="member"
          className="mt-8"
          source={{ path: "/membership", label: "Member churches (interest)" }}
          messageLabel="Anything you want us to know? (optional)"
        />
      </div>
    );
  }

  if (!view.signedIn) {
    return (
      <div>
        <h2 className="text-3xl">Become a member church</h2>
        <Steps at={0} />
        <p className="mt-6 text-muted">
          Start with an account for the person who will manage the membership. You can sign in with
          Google or with an email and password.
        </p>
        <Button asChild className="mt-6">
          <a href="/login?next=/membership%23become">Sign in or create an account</a>
        </Button>
      </div>
    );
  }

  return (
    <ChurchStep
      church={view.church}
      canceled={canceled}
      email={user?.primaryEmail ?? ""}
      name={user?.displayName ?? ""}
      onSaved={(church) => setView({ ...view, church })}
    />
  );
}

function ChurchStep({
  church,
  canceled,
  email,
  name,
  onSaved,
}: {
  church: MemberChurch | null;
  canceled: boolean;
  email: string;
  name: string;
  onSaved: (church: MemberChurch) => void;
}) {
  const [editing, setEditing] = useState(!church);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "");
    setBusy(true);
    setError("");
    try {
      const result = await saveMyChurch({
        data: {
          churchName: value("churchName"),
          contactName: value("contactName"),
          email: value("email"),
          phone: value("phone"),
          address: value("address"),
          city: value("city"),
          state: value("state"),
          zip: value("zip"),
          website: value("website"),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.church);
      setEditing(false);
    } catch {
      setError("That did not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const result = await startMemberCheckout();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Payment could not start just now. Please try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing && church) {
    return (
      <div>
        <h2 className="text-3xl">Become a member church</h2>
        <Steps at={2} />
        {canceled ? (
          <p className="mt-6 text-sm text-muted" role="status">
            Payment was not finished, and nothing was charged. You can continue whenever you are
            ready.
          </p>
        ) : null}
        <div className="mt-6 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
          <p className="font-display text-lg">{church.churchName}</p>
          <p className="mt-1 text-sm text-muted">
            {church.contactName} · {church.email}
            {church.phone ? ` · ${church.phone}` : ""}
          </p>
          <p className="text-sm text-muted">
            {[church.address, church.city, church.state, church.zip].filter(Boolean).join(", ")}
          </p>
          <button
            type="button"
            className="mt-3 text-sm text-forest underline-offset-4 hover:underline"
            onClick={() => setEditing(true)}
          >
            Change these details
          </button>
        </div>
        {church.status === "canceled" ? (
          <p className="mt-6 text-sm text-muted">
            Your church’s membership ended. You are welcome back any time.
          </p>
        ) : null}
        <p className="mt-6 text-muted">
          {MEMBER_PRICE_LABEL}. Payment is handled by Stripe; we never see your card.
        </p>
        {error ? (
          <p className="mt-4 text-sm text-ink" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="mt-6" disabled={busy} onClick={() => void pay()}>
          {busy ? "Opening payment…" : "Continue to payment"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl">Become a member church</h2>
      <Steps at={1} />
      <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
        <Field id="church-name" label="Church name" className="sm:col-span-2">
          <Input id="church-name" name="churchName" defaultValue={church?.churchName} required />
        </Field>
        <Field id="church-contact" label="Your name">
          <Input
            id="church-contact"
            name="contactName"
            autoComplete="name"
            defaultValue={church?.contactName || name}
            required
          />
        </Field>
        <Field id="church-email" label="Email">
          <Input
            id="church-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={church?.email || email}
            required
          />
        </Field>
        <Field id="church-phone" label="Phone">
          <Input id="church-phone" name="phone" type="tel" autoComplete="tel" defaultValue={church?.phone} />
        </Field>
        <Field id="church-website" label="Current website (if any)">
          <Input id="church-website" name="website" defaultValue={church?.website} />
        </Field>
        <Field id="church-address" label="Street address" className="sm:col-span-2">
          <Input id="church-address" name="address" autoComplete="street-address" defaultValue={church?.address} />
        </Field>
        <Field id="church-city" label="City">
          <Input id="church-city" name="city" autoComplete="address-level2" defaultValue={church?.city} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="church-state" label="State">
            <Input
              id="church-state"
              name="state"
              autoComplete="address-level1"
              defaultValue={church?.state}
              required
            />
          </Field>
          <Field id="church-zip" label="ZIP">
            <Input id="church-zip" name="zip" autoComplete="postal-code" inputMode="numeric" defaultValue={church?.zip} />
          </Field>
        </div>
        {error ? (
          <p className="text-sm text-ink sm:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save and continue"}
          </Button>
        </div>
      </form>
    </div>
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
