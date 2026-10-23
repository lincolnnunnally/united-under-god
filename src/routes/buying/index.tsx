import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { InvolvementForm } from "@/components/involvement-form";
import { SignInNudge } from "@/components/sign-in-nudge";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { readMyPlace } from "@/lib/member-actions";
import { listPublishedBook, type PublicBookEntry } from "@/lib/source-actions";
import { pageHead, serviceJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/buying/")({
  loader: () => listPublishedBook(),
  component: BuyingPage,
  head: () =>
    pageHead({
      title: "Group buying for churches and charities | United Under God",
      description: "Churches, charities, and Christian-owned businesses pool their orders for toner, paper, and supplies so everyone pays less and more money goes to ministry.",
      path: "/buying", jsonLd: [serviceJsonLd({ name: "Group buying for churches and charities", description: "Churches, charities, and Christian-owned businesses pool orders for toner, paper, and supplies to get group prices.", path: "/buying", serviceType: "Group purchasing", audience: "Churches, charities, and Christian-owned businesses", offers: { price: "0", description: "Joining is free, with no minimum order." } })],
    }),
});

const CATALOGS = [
  {
    title: "Toner and printers",
    body: "Printer monitoring tells you before toner runs out, then orders it at the group price — no more emergency trips to the office store.",
    href: "https://tonerconnect.unitedundergod.org",
    cta: "Open Toner Connect",
  },
  {
    title: "Software you don’t pay for twice",
    body: "Church management, websites, and outreach tools built to work together, so you aren’t paying for five systems that each do a piece of the job.",
    href: "/apps",
    cta: "See the tools",
    internal: true,
  },
  {
    title: "Surplus that becomes supply",
    body: "Furniture, food, or inventory you can’t use can meet a real need for another ministry — and may qualify as a tax-deductible gift.",
    href: "/donate",
    cta: "Give surplus",
    internal: true,
  },
  {
    title: "Sound, livestream & lighting",
    body: "Clear sound, a steady livestream, and lighting that works — planned and installed for your sanctuary, with your volunteers trained.",
    href: "/church-av",
    cta: "Talk with us",
    internal: true,
  },
];

function BuyingPage() {
  const { entries, unavailable } = Route.useLoaderData();

  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Group buying
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">
            Pay less for what your church already buys.
          </h1>
          <p className="mt-5 max-w-2xl text-muted">
            A small church ordering one toner cartridge at a time pays full retail. Large
            organizations don’t — they pool their orders and get better prices. We help churches,
            charities, and Christian-owned businesses do the same, so more of every dollar goes to
            ministry instead of overhead.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <a href="#join">Join group buying</a>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/assessment">Find your savings</Link>
            </Button>
          </div>
          <SignInNudge about="group buying" />
          <SourceDeskCta />
        </div>
      </section>

      <BuyingBook entries={entries} unavailable={unavailable} />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="max-w-2xl text-3xl">Where churches save first</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {CATALOGS.map((item) =>
            item.internal ? (
              <Link
                key={item.title}
                to={item.href as "/apps" | "/donate"}
                className="flex flex-col rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <h2 className="font-display text-xl">{item.title}</h2>
                <p className="mt-3 flex-1 text-sm text-muted">{item.body}</p>
                <span className="mt-5 text-sm font-medium text-forest">{item.cta}</span>
              </Link>
            ) : (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <h2 className="font-display text-xl">{item.title}</h2>
                <p className="mt-3 flex-1 text-sm text-muted">{item.body}</p>
                <span className="mt-5 text-sm font-medium text-forest">{item.cta}</span>
              </a>
            ),
          )}
        </div>
      </section>

      <section className="border-t border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <h2 className="max-w-2xl text-3xl">Church office help, without hiring full-time staff</h2>
          <p className="mt-4 max-w-2xl text-muted">
            Bulletins, bills, phone calls, the same weekly announcements — every church does this
            work, and it usually lands on the pastor. ChurchConnect handles much of it for you, and
            shared office help can cover the rest, so your week goes to people instead of
            paperwork.
          </p>
          <p className="mt-6">
            <Link to="/assessment" className="text-forest underline-offset-4 hover:underline">
              See where your church could save time and money
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
          <div>
            <h2 className="text-3xl">Who this is for</h2>
            <ul className="mt-6 space-y-4 text-muted">
              <li>
                <span className="font-medium text-ink">Churches</span> tired of paying retail
                prices for toner, paper, and supplies.
              </li>
              <li>
                <span className="font-medium text-ink">Charities and ministries</span> that buy
                the same things and can get a better price ordering together.
              </li>
              <li>
                <span className="font-medium text-ink">Christian-owned businesses</span> that want
                to save on supplies — or offer fair prices to churches and ministries.
              </li>
            </ul>
            <p className="mt-6 text-sm text-muted">
              Joining is free, and there is no minimum order. Tell us what you buy and we will show
              you where you can save.
            </p>
          </div>
          <div id="join" className="scroll-mt-24">
            <InvolvementForm intent="buying" />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function BuyingBook({
  entries,
  unavailable,
}: {
  entries: PublicBookEntry[];
  unavailable: boolean;
}) {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <h2 className="text-2xl">Group prices</h2>
        {unavailable ? (
          <p className="mt-3 max-w-2xl text-muted">
            Group prices could not be loaded just now. Please check back shortly.
          </p>
        ) : entries.length === 0 ? (
          <p className="mt-3 max-w-2xl text-muted">
            We are gathering our first group orders now. As prices are secured, they will be listed
            here for members. Join below and we will let you know as soon as savings are available
            for the things you buy.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-rule rounded-xl bg-cream shadow-[var(--shadow-border)]">
            {entries.map((entry) => (
              <li key={entry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg">{entry.title}</h3>
                  <p className="text-sm font-medium text-forest">
                    {entry.unitPrice ? `$${entry.unitPrice}` : "Price on request"}
                    {entry.unit ? ` / ${entry.unit}` : ""}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {entry.vendorName}
                  {entry.quantity ? ` · ${entry.quantity}` : ""}
                  {entry.unit && entry.quantity ? ` ${entry.unit}` : ""}
                </p>
                {entry.notes ? <p className="mt-2 text-sm text-muted">{entry.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SourceDeskCta() {
  const { user, isPending } = useCurrentUserState();
  const [staff, setStaff] = useState(false);

  useEffect(() => {
    if (isPending || !user) return;
    void readMyPlace()
      .then((place) => setStaff(place.isStaff))
      .catch(() => setStaff(false));
  }, [isPending, user]);

  if (!user || !staff) return null;

  return (
    <div className="mt-6">
      <Button asChild>
        <Link to="/buying/desk">Open the SOURCE desk</Link>
      </Button>
      <p className="mt-2 text-sm text-muted">
        Staff only: record bids, quotes, and awarded prices.
      </p>
    </div>
  );
}
