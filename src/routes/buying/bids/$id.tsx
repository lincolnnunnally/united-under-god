import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { FeeDisclosure } from "@/components/fee-disclosure";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PriceContactFields } from "@/components/price-contact-fields";
import { attestationText, type PriceContact } from "@/lib/price-contact";
import { pageHead } from "@/lib/seo";
import { readVendorBid, submitVendorQuote } from "@/lib/vendor-actions";
import type { InvitedBidView } from "@/lib/vendor-store";

export const Route = createFileRoute("/buying/bids/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : "",
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: ({ params, deps }) => readVendorBid({ data: { bidId: params.id, token: deps.t } }),
  component: VendorBidPage,
  head: () => {
    const head = pageHead({
      title: "Bid invitation | United Under God",
      path: "/buying/bids",
      noindex: true,
    });
    // The link carries the vendor's private token; do not leak it in a Referer.
    return { ...head, meta: [...head.meta, { name: "referrer", content: "no-referrer" }] };
  },
});

function VendorBidPage() {
  const view = Route.useLoaderData();
  const { t } = Route.useSearch();
  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-5 py-16 md:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          Bid invitation
        </p>
        <BidBody view={view} token={t} />
        <div className="mt-12 border-t border-rule pt-6">
          <FeeDisclosure />
          <p className="mt-2 text-sm text-muted">
            Quotes are given under the{" "}
            <Link
              to="/buying/vendor-terms"
              className="text-forest underline-offset-4 hover:underline"
            >
              Vendor Terms
            </Link>
            . Churches buy directly from you and choose freely.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}

function BidBody({
  view,
  token,
}: {
  view: InvitedBidView | { state: "unavailable" };
  token: string;
}) {
  if (view.state === "unavailable") {
    return (
      <p className="mt-4 text-muted">
        This bid could not be loaded just now. Please try again shortly.
      </p>
    );
  }
  if (view.state === "denied") {
    return (
      <>
        <h1 className="mt-3 text-3xl">This link is not valid</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Bid pages open only from the private link in your invitation email. Check that the whole
          link was copied, or reply to the invitation and we will send it again.
        </p>
      </>
    );
  }
  if (view.state === "inactive") {
    return (
      <>
        <h1 className="mt-3 text-3xl">This invitation is not active</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Reply to the invitation email if you think this is a mistake.
        </p>
      </>
    );
  }
  if (view.state === "closed") {
    return (
      <>
        <h1 className="mt-3 text-3xl">{view.title}</h1>
        <p className="mt-4 text-lg font-medium text-ink">This bid is closed.</p>
        <p className="mt-2 max-w-2xl text-muted">
          It no longer takes quotes. Thank you for your interest.
        </p>
      </>
    );
  }
  return <OpenBid view={view} token={token} />;
}

function OpenBid({
  view,
  token,
}: {
  view: Extract<InvitedBidView, { state: "open" }>;
  token: string;
}) {
  const { bid, vendor, quote } = view;
  const prior = new Map((quote?.lines ?? []).map((line) => [line.itemId, line]));
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(bid.items.map((item) => [item.id, prior.get(item.id)?.unitPrice ?? ""])),
  );
  const [lineNotes, setLineNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(bid.items.map((item) => [item.id, prior.get(item.id)?.notes ?? ""])),
  );
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [contact, setContact] = useState<PriceContact>(() =>
    quote?.priceContact.name ? quote.priceContact : vendor.priceContact,
  );
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<"" | "new" | "revised">(quote ? "revised" : "");
  const [justSaved, setJustSaved] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setJustSaved(false);
    try {
      const result = await submitVendorQuote({
        data: {
          bidId: bid.id,
          token,
          notes,
          lines: bid.items.map((item) => ({
            itemId: item.id,
            unitPrice: prices[item.id] ?? "",
            notes: lineNotes[item.id] ?? "",
          })),
          priceContact: contact,
          attested,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(result.revised ? "revised" : "new");
      setJustSaved(true);
    } catch {
      setError("Your quote did not save. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mt-3 text-3xl">{bid.title}</h1>
      <p className="mt-2 text-sm text-muted">Invited: {vendor.company}</p>
      {bid.neededBy ? <p className="mt-2 text-sm text-ink">Needed by {bid.neededBy}</p> : null}
      {bid.summary ? (
        <p className="mt-4 max-w-2xl whitespace-pre-line text-muted">{bid.summary}</p>
      ) : null}

      <form className="mt-10 grid gap-6" onSubmit={(event) => void onSubmit(event)}>
        <h2 className="text-2xl">Your quote</h2>
        <p className="max-w-2xl text-sm text-muted">
          Enter a unit price for each line you can supply, and leave the rest blank. You can change
          your quote until the bid closes.
        </p>
        <ul className="grid gap-4">
          {bid.items.map((item, index) => (
            <li key={item.id} className="rounded-xl bg-cream p-4 shadow-[var(--shadow-border)]">
              <p className="font-medium">
                {index + 1}. {item.description}
              </p>
              <p className="mt-1 text-sm text-muted">
                Quantity {item.quantity || "1"}
                {item.unit ? ` · unit: ${item.unit}` : ""}
              </p>
              {item.specs.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                  {item.specs.map((spec) => (
                    <li key={spec}>{spec}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <div className="grid gap-1.5">
                  <Label htmlFor={`price-${item.id}`}>Unit price (USD)</Label>
                  <Input
                    id={`price-${item.id}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={prices[item.id] ?? ""}
                    onChange={(event) =>
                      setPrices((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    disabled={busy}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`note-${item.id}`}>Note (brand, pack size, lead time)</Label>
                  <Input
                    id={`note-${item.id}`}
                    value={lineNotes[item.id] ?? ""}
                    onChange={(event) =>
                      setLineNotes((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    disabled={busy}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="grid gap-1.5">
          <Label htmlFor="quote-notes">
            Overall notes (delivery, minimums, how long prices hold)
          </Label>
          <Textarea
            id="quote-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={busy}
          />
        </div>
        <PriceContactFields
          idPrefix="bid"
          contact={contact}
          onChange={setContact}
          disabled={busy}
          attestation={attestationText(vendor.company)}
          attested={attested}
          onAttest={setAttested}
        />
        {error ? (
          <p className="text-sm text-ink" role="alert">
            {error}
          </p>
        ) : null}
        {justSaved ? (
          <p className="text-sm font-medium text-forest" role="status">
            {saved === "revised"
              ? "Your quote was updated."
              : "Your quote was received. Thank you."}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : saved ? "Update my quote" : "Submit my quote"}
          </Button>
        </div>
      </form>
    </>
  );
}
