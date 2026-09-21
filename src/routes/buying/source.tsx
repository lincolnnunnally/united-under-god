import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addSourceQuote,
  createSourceBid,
  publishSourceAward,
  readSourceDesk,
  setSourceBidStatus,
  setSourceQuoteStatus,
  setSourceWinners,
  type SourceBid,
  type SourceDesk,
} from "@/lib/source-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/buying/source")({
  component: SourcePage,
  head: () => ({
    meta: [{ title: "SOURCE buying — Desk" }],
  }),
});

type DraftItem = {
  key: string;
  description: string;
  quantity: string;
  unit: string;
};

function blankItem(): DraftItem {
  return { key: crypto.randomUUID(), description: "", quantity: "1", unit: "" };
}

function SourcePage() {
  return (
    <AdminShell>
      <SourceDesk />
    </AdminShell>
  );
}

function SourceDesk() {
  const [desk, setDesk] = useState<SourceDesk | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function apply(next?: SourceDesk, preferId?: string) {
    const data = next ?? (await readSourceDesk());
    setDesk(data);
    setSelectedId((current) => {
      const choice = preferId ?? current;
      if (choice && data.bids.some((bid) => bid.id === choice)) return choice;
      return data.bids[0]?.id ?? null;
    });
    return data;
  }

  useEffect(() => {
    void apply()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load SOURCE.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function run(
    work: () => Promise<SourceDesk>,
    preferId?: (data: SourceDesk) => string | undefined,
  ) {
    setError("");
    try {
      const data = await work();
      await apply(data, preferId?.(data));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
      return false;
    }
  }

  const selected = desk?.bids.find((bid) => bid.id === selectedId) ?? null;

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
        SOURCE
      </p>
      <h1 className="mt-2 text-3xl">Buying desk</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Open a bid, record the quotes that come back, award one or several
        winners on each item, and publish the buying book.
      </p>
      <p className="mt-2 text-sm text-muted">
        {desk
          ? desk.bookCount === 0
            ? "The buying book is empty. Nothing is published on the public page."
            : `${desk.bookCount} published ${desk.bookCount === 1 ? "entry" : "entries"} on the public buying page.`
          : "Loading the buying book…"}
      </p>
      {error ? (
        <p className="mt-4 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}

      <CreateBidForm
        disabled={loading}
        onCreate={(input) =>
          run(
            () =>
              createSourceBid({
                data: {
                  title: input.title,
                  summary: input.summary,
                  neededBy: input.neededBy,
                  items: input.items.map(({ description, quantity, unit }) => ({
                    description,
                    quantity,
                    unit,
                  })),
                },
              }),
            (next) => next.bids[0]?.id,
          )
        }
      />

      {loading ? (
        <p className="mt-10 text-muted">Loading bids…</p>
      ) : desk && desk.bids.length === 0 ? (
        <p className="mt-10 text-muted">No bid requests yet.</p>
      ) : desk ? (
        <div className="mt-10 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <ul className="grid gap-2 self-start">
            {desk.bids.map((bid) => (
              <li key={bid.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(bid.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-3 text-left",
                    bid.id === selectedId
                      ? "bg-forest text-paper"
                      : "bg-cream text-ink shadow-[var(--shadow-border)]",
                  )}
                >
                  <span className="block font-medium">{bid.title}</span>
                  <span
                    className={cn(
                      "mt-1 block text-xs uppercase tracking-[0.14em]",
                      bid.id === selectedId ? "text-paper/80" : "text-subtle",
                    )}
                  >
                    {bid.status} · {bid.quotes.length} quotes
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <BidWorkspace bid={selected} onRun={run} />
          ) : (
            <p className="text-muted">Choose a bid.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CreateBidForm({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (input: {
    title: string;
    summary: string;
    neededBy: string;
    items: DraftItem[];
  }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const saved = await onCreate({ title, summary, neededBy, items });
      if (!saved) return;
      setTitle("");
      setSummary("");
      setNeededBy("");
      setItems([blankItem()]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mt-8 grid gap-4 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]"
      onSubmit={(event) => void onSubmit(event)}
    >
      <h2 className="font-display text-xl">Open a bid</h2>
      <div className="grid gap-1.5">
        <Label htmlFor="bid-title">What are we buying?</Label>
        <Input
          id="bid-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          disabled={disabled || busy}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bid-summary">Notes for the quote</Label>
        <Textarea
          id="bid-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          disabled={disabled || busy}
        />
      </div>
      <div className="grid gap-1.5 sm:max-w-xs">
        <Label htmlFor="bid-needed">Needed by</Label>
        <Input
          id="bid-needed"
          type="date"
          value={neededBy}
          onChange={(event) => setNeededBy(event.target.value)}
          disabled={disabled || busy}
        />
      </div>
      <fieldset className="grid gap-3" disabled={disabled || busy}>
        <legend className="text-sm font-medium text-ink">Items</legend>
        {items.map((item, index) => (
          <div key={item.key} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_auto]">
            <Input
              aria-label={`Item ${index + 1} description`}
              placeholder="Item"
              value={item.description}
              onChange={(event) =>
                setItems((rows) =>
                  rows.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, description: event.target.value } : row,
                  ),
                )
              }
              required
            />
            <Input
              aria-label={`Item ${index + 1} quantity`}
              placeholder="Qty"
              value={item.quantity}
              onChange={(event) =>
                setItems((rows) =>
                  rows.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, quantity: event.target.value } : row,
                  ),
                )
              }
            />
            <Input
              aria-label={`Item ${index + 1} unit`}
              placeholder="Unit"
              value={item.unit}
              onChange={(event) =>
                setItems((rows) =>
                  rows.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, unit: event.target.value } : row,
                  ),
                )
              }
            />
            {items.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setItems((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
                }
              >
                Remove
              </Button>
            ) : (
              <span />
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setItems((rows) => [...rows, blankItem()])}
        >
          Add another item
        </Button>
      </fieldset>
      <div>
        <Button type="submit" disabled={disabled || busy}>
          {busy ? "Opening…" : "Open bid"}
        </Button>
      </div>
    </form>
  );
}

function BidWorkspace({
  bid,
  onRun,
}: {
  bid: SourceBid;
  onRun: (work: () => Promise<SourceDesk>) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<SourceDesk>) {
    setBusy(true);
    try {
      return await onRun(work);
    } finally {
      setBusy(false);
    }
  }

  const received = bid.quotes.filter((quote) => quote.status === "received");

  return (
    <div className="grid gap-8">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">{bid.title}</h2>
            {bid.summary ? <p className="mt-2 max-w-2xl text-sm text-muted">{bid.summary}</p> : null}
            {bid.neededBy ? (
              <p className="mt-2 text-sm text-muted">Needed by {bid.neededBy}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(() =>
                setSourceBidStatus({
                  data: {
                    bidId: bid.id,
                    status: bid.status === "open" ? "closed" : "open",
                  },
                }),
              )
            }
          >
            {bid.status === "open" ? "Close bid" : "Reopen bid"}
          </Button>
        </div>
        <ul className="mt-4 grid gap-2">
          {bid.items.map((item) => (
            <li key={item.id} className="text-sm text-ink">
              {item.description}
              <span className="text-muted">
                {" "}
                · {item.quantity || "1"}
                {item.unit ? ` ${item.unit}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <section>
        <h3 className="font-display text-xl">Quotes</h3>
        {bid.quotes.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No quotes received yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {bid.quotes.map((quote) => (
              <li
                key={quote.id}
                className="rounded-lg bg-cream px-4 py-3 shadow-[var(--shadow-border)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{quote.vendorName}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-subtle">
                      {quote.status}
                    </p>
                    {quote.vendorContact ? (
                      <p className="mt-1 text-sm text-muted">{quote.vendorContact}</p>
                    ) : null}
                    {quote.notes ? <p className="mt-1 text-sm text-muted">{quote.notes}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        setSourceQuoteStatus({
                          data: {
                            quoteId: quote.id,
                            status: quote.status === "withdrawn" ? "received" : "withdrawn",
                          },
                        }),
                      )
                    }
                  >
                    {quote.status === "withdrawn" ? "Restore quote" : "Withdraw quote"}
                  </Button>
                </div>
                <ul className="mt-2 text-sm text-muted">
                  {quote.lines.map((line) => {
                    const item = bid.items.find((row) => row.id === line.itemId);
                    return (
                      <li key={line.id}>
                        {item?.description ?? "Item"}:{" "}
                        {line.unitPrice ? `$${line.unitPrice}` : "no price"}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {bid.status === "open" ? (
          <QuoteForm bid={bid} disabled={busy} onRun={run} />
        ) : (
          <p className="mt-3 text-sm text-muted">
            This bid is closed. Reopen it to record another quote.
          </p>
        )}
      </section>

      <section>
        <h3 className="font-display text-xl">Winners</h3>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Each item can have one winner or several. Check every vendor the body
          may buy that item from.
        </p>
        {received.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No live quotes to award.</p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {bid.items.map((item) => {
              const winners = new Set(
                bid.awards.filter((award) => award.itemId === item.id).map((award) => award.quoteId),
              );
              return (
                <li key={item.id} className="rounded-lg bg-cream px-4 py-3">
                  <p className="font-medium">{item.description}</p>
                  {winners.size === 0 ? (
                    <p className="mt-1 text-sm text-muted">No winners yet.</p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">
                      {winners.size} {winners.size === 1 ? "winner" : "winners"}
                    </p>
                  )}
                  <ul className="mt-2 grid gap-1">
                    {received.map((quote) => {
                      const line = quote.lines.find((row) => row.itemId === item.id);
                      const priced = Boolean(line?.unitPrice);
                      const checked = winners.has(quote.id);
                      return (
                        <li key={quote.id}>
                          <label className="flex min-h-11 items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="size-4 accent-[var(--color-forest)]"
                              checked={checked}
                              disabled={busy || !priced}
                              onChange={(event) => {
                                const next = new Set(winners);
                                if (event.target.checked) next.add(quote.id);
                                else next.delete(quote.id);
                                void run(() =>
                                  setSourceWinners({
                                    data: { itemId: item.id, quoteIds: [...next] },
                                  }),
                                );
                              }}
                            />
                            <span>
                              {quote.vendorName}
                              {priced ? ` · $${line?.unitPrice}` : " · no price on this item"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-display text-xl">Buying book</h3>
        {bid.awards.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nothing to publish. Award at least one winner first.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {bid.awards.map((award) => {
              const item = bid.items.find((row) => row.id === award.itemId);
              const quote = bid.quotes.find((row) => row.id === award.quoteId);
              const published = bid.book.find((row) => row.awardId === award.id);
              const line = quote?.lines.find((row) => row.itemId === award.itemId);
              return (
                <li
                  key={award.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cream px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {item?.description ?? "Item"} · {quote?.vendorName ?? "Vendor"}
                    </p>
                    <p className="text-sm text-muted">
                      {line?.unitPrice ? `$${line.unitPrice}` : "No price"}
                      {published ? " · published" : " · not published"}
                    </p>
                  </div>
                  {published ? (
                    <span className="text-sm text-forest">On the public page</span>
                  ) : (
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(() => publishSourceAward({ data: { awardId: award.id } }))
                      }
                    >
                      Publish this entry
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {bid.book.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            This bid has no published buying-book entries.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function QuoteForm({
  bid,
  disabled,
  onRun,
}: {
  bid: SourceBid;
  disabled: boolean;
  onRun: (work: () => Promise<SourceDesk>) => Promise<boolean>;
}) {
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [notes, setNotes] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const saved = await onRun(() =>
        addSourceQuote({
          data: {
            bidId: bid.id,
            vendorName,
            vendorContact,
            notes,
            lines: bid.items.map((item) => ({
              itemId: item.id,
              unitPrice: prices[item.id] ?? "",
            })),
          },
        }),
      );
      if (!saved) return;
      setVendorName("");
      setVendorContact("");
      setNotes("");
      setPrices({});
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={(event) => void onSubmit(event)}>
      <h4 className="text-sm font-medium">Record a quote</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`vendor-${bid.id}`}>Vendor</Label>
          <Input
            id={`vendor-${bid.id}`}
            value={vendorName}
            onChange={(event) => setVendorName(event.target.value)}
            required
            disabled={disabled || busy}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`contact-${bid.id}`}>Contact</Label>
          <Input
            id={`contact-${bid.id}`}
            value={vendorContact}
            onChange={(event) => setVendorContact(event.target.value)}
            disabled={disabled || busy}
          />
        </div>
      </div>
      {bid.items.map((item) => (
        <div key={item.id} className="grid gap-1.5 sm:max-w-xs">
          <Label htmlFor={`price-${item.id}`}>{item.description} price</Label>
          <Input
            id={`price-${item.id}`}
            inputMode="decimal"
            placeholder="0.00"
            value={prices[item.id] ?? ""}
            onChange={(event) =>
              setPrices((current) => ({ ...current, [item.id]: event.target.value }))
            }
            disabled={disabled || busy}
          />
        </div>
      ))}
      <div className="grid gap-1.5">
        <Label htmlFor={`notes-${bid.id}`}>Quote notes</Label>
        <Textarea
          id={`notes-${bid.id}`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={disabled || busy}
        />
      </div>
      <div>
        <Button type="submit" disabled={disabled || busy}>
          {busy ? "Saving…" : "Save quote"}
        </Button>
      </div>
    </form>
  );
}
