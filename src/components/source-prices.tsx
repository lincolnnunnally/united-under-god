import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  decidePriceConfirmationFn,
  extendPriceTermFn,
  publishUpdatedPricesFn,
  readPriceDeskFn,
  reopenPriceBidFn,
  sendPriceRequestFn,
  type PriceDesk,
  type PriceReviewItem,
  type VendorOrderComparison,
} from "@/lib/price-actions";
import { describePriceContact } from "@/lib/price-contact";
import { longDate } from "@/lib/price-term";

/**
 * The desk's program prices: what is up for review (45 days before a term
 * ends), the one-click actions on each, every price with its term, and the
 * member orders log beside what each vendor reported. Staff only.
 */
export function PriceSection() {
  const [desk, setDesk] = useState<PriceDesk | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    readPriceDeskFn()
      .then(setDesk)
      .catch((err) => setError(err instanceof Error ? err.message : "Program prices did not load."));
  }, []);

  async function run(work: () => Promise<PriceDesk>, done = "") {
    setError("");
    setNote("");
    setBusy(true);
    try {
      setDesk(await work());
      setNote(done);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function ask(item: PriceReviewItem) {
    setError("");
    setNote("");
    setBusy(true);
    try {
      const out = await sendPriceRequestFn({ data: { bookId: item.bookId } });
      setDesk(out.desk);
      const sent = out.result.sent.length ? `Sent to ${out.result.sent.join(" and ")}.` : "";
      const failed = out.result.failed.map((row) => `${row.to}: ${row.error}`).join("; ");
      setNote([sent, failed ? `Not sent: ${failed}` : ""].filter(Boolean).join(" "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="price-review"
      className="mt-8 scroll-mt-24 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]"
      data-price-desk=""
    >
      <h2 className="font-display text-xl">Prices up for review</h2>
      {error ? (
        <p className="mt-2 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="mt-2 text-sm text-ink" role="status">
          {note}
        </p>
      ) : null}
      {!desk ? (
        <p className="mt-2 text-sm text-muted">Loading…</p>
      ) : !desk.ready ? (
        <p className="mt-2 text-sm text-muted">
          The price term tables are not in the database yet. Apply
          migrations/0012_program_price_honor.sql, then reload.
        </p>
      ) : (
        <div className="mt-2 grid gap-8">
          <p className="max-w-2xl text-sm text-muted">
            Awarded prices whose term ends within {desk.reviews.reviewDays} days, or has ended, and
            anything a vendor sent back. You get one email digest a day at most when a price comes
            up for review.
          </p>
          {desk.reviews.dueSoon.length === 0 ? (
            <p className="text-sm text-muted">Nothing is up for review.</p>
          ) : (
            <ul className="grid gap-3">
              {desk.reviews.dueSoon.map((item) => (
                <ReviewCard
                  key={item.bookId}
                  item={item}
                  busy={busy}
                  onAsk={() => void ask(item)}
                  onRun={run}
                />
              ))}
            </ul>
          )}
          <AllPrices items={desk.reviews.current} />
          <MemberOrders orders={desk.orders} />
        </div>
      )}
    </section>
  );
}

function termLine(item: PriceReviewItem) {
  if (!item.expiresOn) return "No term yet";
  if (item.ended) return `Ended ${longDate(item.expiresOn)}: shown to churches as being refreshed`;
  return `Good through ${longDate(item.expiresOn)} (${item.daysLeft} ${item.daysLeft === 1 ? "day" : "days"} left)`;
}

function ReviewCard({
  item,
  busy,
  onAsk,
  onRun,
}: {
  item: PriceReviewItem;
  busy: boolean;
  onAsk: () => void;
  onRun: (work: () => Promise<PriceDesk>, done?: string) => Promise<boolean>;
}) {
  const pending = item.pendingConfirmation;
  return (
    <li className="rounded-lg bg-paper px-4 py-3 shadow-[var(--shadow-border)]" data-price-review="">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {item.vendorName} · {item.title}
        </p>
        <p className="text-sm text-forest">
          ${item.unitPrice}
          {item.unit ? ` / ${item.unit}` : ""}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted">
        <span className="font-mono">{item.referenceCode}</span> · {termLine(item)} · next term{" "}
        {item.bidTermMonths} months
      </p>
      <p className="mt-1 text-sm text-muted">
        Price contact: {describePriceContact(item.priceContact) || "none"}
        {item.vendorEmail ? ` · vendor email ${item.vendorEmail}` : ""}
      </p>
      <p className="mt-1 text-sm text-muted">
        Bid: {item.bidTitle} ({item.bidStatus})
        {item.lastRequest
          ? ` · asked to confirm ${item.lastRequest.createdAt.slice(0, 10)} (${item.lastRequest.status})`
          : " · not asked yet"}
      </p>

      {pending ? (
        <div className="mt-3 rounded-lg bg-cream px-3 py-2 text-sm">
          <p className="font-medium text-ink">
            The vendor confirmed these prices unchanged for a new term on {pending.createdAt.slice(0, 10)}.
          </p>
          <p className="text-muted">Confirmed by {describePriceContact(pending.priceContact)}.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void onRun(
                  () => decidePriceConfirmationFn({ data: { reviewId: pending.id, approve: true } }),
                  "Approved. The term is extended.",
                )
              }
            >
              Approve and extend the term
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void onRun(() => decidePriceConfirmationFn({ data: { reviewId: pending.id, approve: false } }))
              }
            >
              Decline
            </Button>
          </div>
        </div>
      ) : null}

      {item.updatedPricesWaiting ? (
        <div className="mt-3 rounded-lg bg-cream px-3 py-2 text-sm">
          <p className="font-medium text-ink">
            The vendor sent updated prices: ${item.updatedPrice || "?"}
            {item.unit ? ` / ${item.unit}` : ""} (now ${item.unitPrice}).
          </p>
          <p className="text-muted">
            Publishing gives each price a new reference and a new {item.bidTermMonths}-month term from
            today. The current price is kept in history.
          </p>
          <Button
            type="button"
            className="mt-2"
            disabled={busy}
            onClick={() =>
              void onRun(
                () => publishUpdatedPricesFn({ data: { quoteId: item.quoteId } }),
                "Published the updated prices.",
              )
            }
          >
            Publish the updated prices
          </Button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={onAsk}>
          Ask the vendor to confirm or update
        </Button>
        {item.bidStatus !== "open" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void onRun(() => reopenPriceBidFn({ data: { bidId: item.bidId } }), "The bid is open again.")
            }
          >
            Reopen the bid
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Extend this price for a new term? Do this only after the vendor confirmed it.")) return;
            void onRun(() => extendPriceTermFn({ data: { bookId: item.bookId } }), "The term is extended.");
          }}
        >
          Extend the term (vendor confirmed)
        </Button>
      </div>
      <History item={item} />
    </li>
  );
}

function History({ item }: { item: PriceReviewItem }) {
  if (!item.history.length) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center text-muted">
        Earlier terms ({item.history.length})
      </summary>
      <ul className="grid gap-1 text-muted">
        {item.history.map((row) => (
          <li key={row.id}>
            {row.referenceCode} · ${row.unitPrice} · {row.effectiveOn} to {row.expiresOn} · {row.reason}
          </li>
        ))}
      </ul>
    </details>
  );
}

function AllPrices({ items }: { items: PriceReviewItem[] }) {
  return (
    <details>
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">
        Every other awarded price ({items.length})
      </summary>
      {items.length === 0 ? (
        <p className="text-sm text-muted">None.</p>
      ) : (
        <ul className="grid gap-1 text-sm text-muted">
          {items.map((item) => (
            <li key={item.bookId}>
              <span className="font-mono">{item.referenceCode}</span> · {item.vendorName} · {item.title} · $
              {item.unitPrice} · {termLine(item)}
              {item.history.length ? ` · ${item.history.length} earlier ${item.history.length === 1 ? "term" : "terms"}` : ""}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function dollars(value: number) {
  return `$${value.toFixed(2)}`;
}

function MemberOrders({ orders }: { orders: VendorOrderComparison[] }) {
  return (
    <div data-member-orders="">
      <h3 className="font-display text-lg">Member orders</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        What member churches told us they ordered at a program price, per vendor, beside what the
        vendor reported each month. A month is marked when members report more than the vendor
        did. Only this desk sees these; no church sees another church’s orders.
      </p>
      {orders.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No member orders yet.</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {orders.map((group) => (
            <li key={group.vendorId || group.vendorName} className="rounded-lg bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
              <p className="font-medium">
                {group.vendorName}
                {group.vendorId ? "" : " (typed in at the desk; no portal reports)"}
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.14em] text-subtle">
                      <th className="py-1 pr-3 font-medium">Month</th>
                      <th className="py-1 pr-3 font-medium">Member orders</th>
                      <th className="py-1 pr-3 font-medium">Member amount</th>
                      <th className="py-1 font-medium">Vendor reported</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {group.months.map((month) => (
                      <tr key={month.month} className={month.check ? "text-ink" : "text-muted"}>
                        <td className="py-1 pr-3">
                          {month.month}
                          {month.check ? " · check" : ""}
                        </td>
                        <td className="py-1 pr-3">{month.memberOrders}</td>
                        <td className="py-1 pr-3">{month.memberOrders ? dollars(month.memberAmount) : "-"}</td>
                        <td className="py-1">
                          {month.vendorReported !== null
                            ? dollars(month.vendorReported)
                            : month.vendorReportedNone
                              ? "none"
                              : "not reported"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details className="mt-2 text-sm">
                <summary className="flex min-h-11 cursor-pointer items-center text-muted">
                  Orders ({group.orders.length})
                </summary>
                <ul className="grid gap-1 text-muted">
                  {group.orders.map((order) => (
                    <li key={order.id}>
                      {order.orderedOn} · {order.churchName || "a member church"} · {order.title} · qty{" "}
                      {order.quantity}
                      {order.amount ? ` · $${order.amount}` : ""} · {order.referenceCode}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
