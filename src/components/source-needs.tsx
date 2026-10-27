import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NEED_STATUS_LABELS, needCategoryName } from "@/lib/church-needs";
import {
  addNeedToBidFn,
  closeNeedFn,
  readNeedsDeskFn,
  sendNeedQuotesFn,
  startNeedBidFn,
  type NeedRow,
  type NeedsDeskView,
} from "@/lib/need-actions";

const SELECT_CLASS =
  "min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)] disabled:opacity-50 md:text-sm";

/**
 * Church needs posted on /buying/need: start a bid from one, or add it as a
 * line on an open bid in the same category (the grouping), send the church
 * its quotes, close it. Staff only. The church's name and contact stay here;
 * they never go onto a bid.
 */
export function NeedsSection({
  bids,
  onBidsChanged,
}: {
  /** The desk's bids: when they change (a quote recorded, a bid closed), the needs are read again. */
  bids: unknown;
  onBidsChanged: () => Promise<unknown>;
}) {
  const [desk, setDesk] = useState<NeedsDeskView | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    readNeedsDeskFn()
      .then(setDesk)
      .catch((err) => setError(err instanceof Error ? err.message : "Church needs did not load."));
  }, [bids]);

  async function run(work: () => Promise<NeedsDeskView>, done = "", bidsChanged = false) {
    setError("");
    setNote("");
    setBusy(true);
    try {
      setDesk(await work());
      setNote(done);
      if (bidsChanged) await onBidsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function sendQuotes(need: NeedRow) {
    setError("");
    setNote("");
    setBusy(true);
    try {
      const out = await sendNeedQuotesFn({ data: { needId: need.id } });
      setDesk(out.desk);
      setNote(
        out.result.ok
          ? `Sent ${need.churchName} its private link to the quotes.`
          : `Not sent: ${out.result.error || "the email did not go out."}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not send.");
    } finally {
      setBusy(false);
    }
  }

  const open = desk?.needs.filter((need) => need.status !== "closed" && need.status !== "chosen") ?? [];
  const done = desk?.needs.filter((need) => need.status === "closed" || need.status === "chosen") ?? [];

  return (
    <section
      id="church-needs"
      className="mt-8 scroll-mt-24 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]"
      data-church-needs=""
    >
      <h2 className="font-display text-xl">Church needs</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Posted on /buying/need. Start a bid from a need, or add it to an open bid in the same
        category so several churches share one bid. A bid carries what the church needs and its
        details, never its name. Check the details before you invite vendors.
      </p>
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
          The church needs table is not in the database yet. Apply
          migrations/0013_source_church_needs.sql, then reload.
        </p>
      ) : desk.needs.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No church has posted a need yet.</p>
      ) : (
        <div className="mt-4 grid gap-6">
          {open.length ? (
            <ul className="grid gap-3">
              {open.map((need) => (
                <NeedCard
                  key={need.id}
                  need={need}
                  desk={desk}
                  busy={busy}
                  onStart={() =>
                    void run(() => startNeedBidFn({ data: { needId: need.id } }), "Bid opened.", true)
                  }
                  onAdd={(bidId) =>
                    void run(
                      () => addNeedToBidFn({ data: { needId: need.id, bidId } }),
                      "Added to the bid.",
                      true,
                    )
                  }
                  onSend={() => void sendQuotes(need)}
                  onClose={() => void run(() => closeNeedFn({ data: { needId: need.id } }), "Closed.")}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No open needs.</p>
          )}
          {done.length ? (
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Chosen and closed ({done.length})
              </summary>
              <ul className="mt-3 grid gap-2">
                {done.map((need) => (
                  <li key={need.id} className="rounded-lg bg-paper p-3 text-sm shadow-[var(--shadow-border)]">
                    <span className="font-medium">{need.title}</span>
                    <span className="text-muted">
                      {" "}
                      · {need.churchName}, {need.city} {need.state} · {NEED_STATUS_LABELS[need.status]}
                      {need.chosenVendor ? ` · chose ${need.chosenVendor}` : ""}
                    </span>
                    {need.churchNote ? <p className="mt-1 text-muted">Their note: {need.churchNote}</p> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}
    </section>
  );
}

function NeedCard({
  need,
  desk,
  busy,
  onStart,
  onAdd,
  onSend,
  onClose,
}: {
  need: NeedRow;
  desk: NeedsDeskView;
  busy: boolean;
  onStart: () => void;
  onAdd: (bidId: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  const [bidId, setBidId] = useState("");
  const sameCategory = desk.openBids.filter((bid) => bid.category === need.category);
  const unlinked = need.status === "new" && !need.bidId;
  return (
    <li className="rounded-lg bg-paper p-4 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{need.title}</p>
          <p className="text-sm text-muted">
            {needCategoryName(need.category)}
            {need.quantity ? ` · ${need.quantity}` : ""}
            {need.neededBy ? ` · needed by ${need.neededBy}` : ""}
          </p>
        </div>
        <span className="text-xs tracking-[0.14em] text-subtle uppercase">
          {NEED_STATUS_LABELS[need.status]}
        </span>
      </div>
      {need.details ? <p className="mt-2 text-sm whitespace-pre-line text-muted">{need.details}</p> : null}
      <p className="mt-2 text-sm text-muted">
        {need.churchName} · {need.contactName} · {need.email}
        {need.phone ? ` · ${need.phone}` : ""} · {need.city}, {need.state} {need.zip} · posted{" "}
        {need.createdAt.slice(0, 10)}
      </p>
      {need.similar > 0 ? (
        <p className="mt-1 text-sm text-forest">
          {need.similar} similar {need.similar === 1 ? "need" : "needs"} open in this category in{" "}
          {need.state}
        </p>
      ) : null}
      {need.bidId ? (
        <p className="mt-1 text-sm text-muted">
          On bid: {need.bidTitle || need.bidId} · {need.pricedQuotes} priced{" "}
          {need.pricedQuotes === 1 ? "quote" : "quotes"} on its line
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {unlinked ? (
          <>
            <Button type="button" disabled={busy} onClick={onStart}>
              Start a bid
            </Button>
            <div className="flex min-w-[16rem] flex-1 flex-wrap items-end gap-2">
              <select
                aria-label={`Open bids in ${needCategoryName(need.category)}`}
                className={SELECT_CLASS + " flex-1"}
                value={bidId}
                onChange={(event) => setBidId(event.target.value)}
                disabled={busy || sameCategory.length === 0}
              >
                <option value="">
                  {sameCategory.length ? "Pick an open bid in this category" : "No open bid in this category"}
                </option>
                {sameCategory.map((bid) => (
                  <option key={bid.id} value={bid.id}>
                    {bid.title} ({bid.lines} {bid.lines === 1 ? "line" : "lines"})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !bidId}
                onClick={() => onAdd(bidId)}
              >
                Add to an open bid
              </Button>
            </div>
          </>
        ) : null}
        {need.bidId ? (
          <Button
            type="button"
            disabled={busy || need.pricedQuotes === 0}
            onClick={onSend}
            title={need.pricedQuotes === 0 ? "Record a quote with a price on this need's line first." : undefined}
          >
            {need.status === "quotes_sent" ? "Send the quotes again" : "Send quotes to the church"}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Close
        </Button>
      </div>
    </li>
  );
}
