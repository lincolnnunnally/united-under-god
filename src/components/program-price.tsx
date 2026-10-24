import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MemberLockedLine } from "@/components/member-gate";
import { CovenantBadge } from "@/components/report-problem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ViewerBookEntry } from "@/lib/membership-actions";
import { recordMemberOrderFn } from "@/lib/price-actions";
import { orderDetailsText } from "@/lib/price-contact";
import { isoDay, longDate } from "@/lib/price-term";
import { cn } from "@/lib/utils";

/**
 * One awarded price, as the catalog pages show it. The entry comes from the
 * gated server read: a viewer who is not a member church gets the locked line
 * only, and an ended price arrives already blanked. This component only
 * decides what to draw.
 */
export function ProgramPrice({ entry, className }: { entry: ViewerBookEntry; className?: string }) {
  if (entry.priceStatus === "ended") return <EndedLine className={className} />;
  if (entry.locked) return <MemberLockedLine className={className} />;
  return <MemberPrice entry={entry} className={className} />;
}

/** "Price term ended, being refreshed" in place of a price. */
export function EndedLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted", className)} data-price-ended="">
      Price term ended, being refreshed.
    </p>
  );
}

/** The price line itself: "$12.50 / case", or the refreshed or locked label. */
export function PriceLabel({ entry }: { entry: ViewerBookEntry }) {
  if (entry.priceStatus === "ended") return <p className="text-sm text-muted">Being refreshed</p>;
  if (entry.locked) return <p className="text-sm text-forest">Group price</p>;
  return (
    <p className="text-sm font-medium text-forest">
      {entry.unitPrice ? `$${entry.unitPrice}` : "Price on request"}
      {entry.unit ? ` / ${entry.unit}` : ""}
    </p>
  );
}

function MemberPrice({ entry, className }: { entry: ViewerBookEntry; className?: string }) {
  const [copied, setCopied] = useState("");
  const contact = entry.priceContact;

  async function copy() {
    const text = orderDetailsText(entry);
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Copied. Paste it into your email or keep it by the phone.");
    } catch {
      setCopied(text);
    }
  }

  return (
    <div className={cn("grid gap-2 text-sm", className)} data-program-price="">
      <p className="text-muted">
        <span className="text-ink">{entry.vendorName}</span>
        {entry.vendorEmail ? (
          <>
            {" · "}
            <a href={`mailto:${entry.vendorEmail}`} className="text-forest underline-offset-4 hover:underline">
              {entry.vendorEmail}
            </a>
          </>
        ) : null}
        {entry.covenant ? <CovenantBadge className="ml-1" /> : null}
      </p>
      {entry.notes ? <p className="text-muted">{entry.notes}</p> : null}
      {entry.referenceCode ? (
        <p className="text-ink">
          Reference <span className="font-mono font-medium">{entry.referenceCode}</span>
          {entry.goodThrough ? <span className="text-muted"> · Good through {longDate(entry.goodThrough)}</span> : null}
        </p>
      ) : null}
      {contact?.name ? (
        <p className="text-muted">
          Price contact: <span className="text-ink">{contact.name}</span>
          {contact.title ? `, ${contact.title}` : ""}
          {contact.email ? (
            <>
              {" · "}
              <a href={`mailto:${contact.email}`} className="text-forest underline-offset-4 hover:underline">
                {contact.email}
              </a>
            </>
          ) : null}
          {contact.phone ? (
            <>
              {" · "}
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>
            </>
          ) : null}
        </p>
      ) : null}
      {entry.referenceCode ? (
        <details className="rounded-lg bg-paper px-4 py-2 shadow-[var(--shadow-border)]">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium text-forest">
            How to order at this price
          </summary>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
            <li>Contact the vendor.</li>
            <li>
              Say you are a United Under God member church and give reference{" "}
              <span className="font-mono text-ink">{entry.referenceCode}</span>.
            </li>
            <li>
              If they won’t honor the program price,{" "}
              <Link
                to="/buying/report"
                search={{ type: "price", ref: entry.referenceCode, vendor: entry.vendorId || undefined }}
                className="text-forest underline-offset-4 hover:underline"
              >
                report it
              </Link>
              .
            </li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2 pb-2">
            <Button type="button" variant="secondary" onClick={() => void copy()}>
              Copy order details
            </Button>
          </div>
          {copied ? (
            <p className="whitespace-pre-line pb-2 text-ink" role="status">
              {copied}
            </p>
          ) : null}
          <OrderedForm bookId={entry.id} />
        </details>
      ) : null}
    </div>
  );
}

/** "We ordered this": quantity, date, and an optional amount. Only the owner's desk reads it. */
function OrderedForm({ bookId }: { bookId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    setBusy(true);
    setNote("");
    try {
      const out = await recordMemberOrderFn({
        data: { bookId, quantity: value("quantity"), orderedOn: value("orderedOn"), amount: value("amount") },
      });
      if (out.ok) {
        setDone(true);
        setOpen(false);
      } else setNote(out.error);
    } catch {
      setNote("That did not save. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="pb-2 font-medium text-forest" role="status">
        Thank you. We have your order on record.
      </p>
    );
  }
  if (!open) {
    return (
      <div className="pb-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
          We ordered this
        </Button>
      </div>
    );
  }
  return (
    <form className="grid gap-3 pb-3" onSubmit={(event) => void onSubmit(event)}>
      <p className="text-muted">
        Tell us what you ordered so we can check it against the vendor’s reports. Only United Under
        God sees it.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`ordered-qty-${bookId}`}>Quantity</Label>
          <Input id={`ordered-qty-${bookId}`} name="quantity" required maxLength={40} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`ordered-on-${bookId}`}>Date ordered</Label>
          <Input id={`ordered-on-${bookId}`} name="orderedOn" type="date" defaultValue={isoDay()} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`ordered-amount-${bookId}`}>Amount (optional)</Label>
          <Input id={`ordered-amount-${bookId}`} name="amount" inputMode="decimal" placeholder="0.00" />
        </div>
      </div>
      {note ? (
        <p className="text-ink" role="alert">
          {note}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Send"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
