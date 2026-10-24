import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PreferredBadge, RankingDisclosure } from "@/components/vendor-ranking";
import { PriceContactFields } from "@/components/price-contact-fields";
import { attestationText, type PriceContact } from "@/lib/price-contact";
import { longDate } from "@/lib/price-term";
import {
  acceptPortalTermsFn,
  confirmPortalPricesFn,
  deletePortalFileFn,
  openPortalBidFn,
  savePortalPriceContactFn,
  submitPortalPriceUpdateFn,
  savePortalProfileFn,
  setPortalOfferFn,
  signOutPortalFn,
  submitPortalReportFn,
  type PortalRead,
} from "@/lib/portal-actions";
import {
  ACCEPT_ATTRIBUTE,
  FILE_KINDS,
  FILE_KIND_LABELS,
  MAX_FILES_PER_VENDOR,
  UPLOAD_CHUNK_BYTES,
  fileCatalogName,
  fileSize,
} from "@/lib/vendor-files";
import { US_STATES, describeCategories, vendorCategoryOptions } from "@/lib/vendor-store";
import { AGREE_LABEL, VENDOR_TERMS_VERSION, termsChange } from "@/lib/vendor-terms";
import { MIN_RECORD } from "@/lib/vendor-rank";

type Ok = Extract<PortalRead, { state: "ok" }>;
type Write = Promise<{ ok: true; read: PortalRead } | { ok: false; error: string }>;

const SELECT_CLASS =
  "min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)] md:text-sm";

function Card({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] md:p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Note({ text, error }: { text: string; error?: boolean }) {
  if (!text) return null;
  return (
    <p className="mt-3 text-sm text-ink" role={error ? "alert" : "status"}>
      {text}
    </p>
  );
}

/** The signed-in vendor's portal. Every write returns the fresh portal. */
export function VendorPortal({ initial }: { initial: Ok }) {
  const router = useRouter();
  const [read, setRead] = useState<Ok>(initial);
  // A reload (after an upload or sign-in) brings fresh loader data.
  useEffect(() => setRead(initial), [initial]);

  async function run(work: () => Write): Promise<string> {
    try {
      const out = await work();
      if (!out.ok) return out.error;
      if (out.read.state === "ok") setRead(out.read);
      else await router.invalidate();
      return "";
    } catch {
      return "That did not save. Please try again shortly.";
    }
  }

  const { view } = read;
  async function signOut() {
    await signOutPortalFn().catch(() => undefined);
    await router.invalidate();
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mt-3 text-3xl">{view.vendor.company}</h1>
          <p className="mt-2 text-sm text-muted">
            Signed in as {view.vendor.email} · {view.vendor.status}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
      {view.vendor.needsTerms ? <TermsBanner run={run} /> : null}
      <Standing read={read} />
      <Invites read={read} />
      <Prices read={read} run={run} />
      <Offers read={read} run={run} />
      <Reports read={read} run={run} />
      <Files read={read} run={run} onUploaded={() => void router.invalidate().then(() => undefined)} />
      <Profile read={read} run={run} />
      <DefaultPriceContact read={read} run={run} />
    </div>
  );
}

type Run = (work: () => Write) => Promise<string>;
type PriceRow = Ok["prices"][number];

/**
 * The vendor's awarded program prices with their references and terms. Before
 * a term ends the vendor confirms the prices unchanged (the owner approves the
 * new term) or sends updated prices (they become its quote again).
 */
function Prices({ read, run }: { read: Ok; run: Run }) {
  const prices = read.prices;
  const bids = [...new Set(prices.map((row) => row.bidId))];
  return (
    <Card title="Your program prices" id="prices">
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Each awarded price has a program reference and a price term. A church that orders gives you
        the reference; under the Vendor Covenant you charge no more than the awarded price for the
        term. Before a term ends, confirm your prices for a new term or send updated prices.
      </p>
      {prices.length === 0 ? (
        <p className="mt-4 text-muted">You have no awarded prices yet.</p>
      ) : (
        <div className="mt-4 grid gap-6">
          {bids.map((bidId) => (
            <BidPrices
              key={bidId}
              rows={prices.filter((row) => row.bidId === bidId)}
              run={run}
              defaultContact={read.priceContact}
              disabled={read.view.vendor.needsTerms}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function BidPrices({
  rows,
  run,
  defaultContact,
  disabled,
}: {
  rows: PriceRow[];
  run: Run;
  defaultContact: PriceContact;
  disabled: boolean;
}) {
  const company = rows[0]!.vendorName;
  const [mode, setMode] = useState<"" | "confirm" | "update">("");
  const [contact, setContact] = useState<PriceContact>(rows[0]!.priceContact.name ? rows[0]!.priceContact : defaultContact);
  const [attested, setAttested] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.itemId, row.updatedPrice || row.unitPrice])),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const waiting = rows.some((row) => row.pendingConfirmation);
  const updated = rows.some((row) => row.updatedPricesWaiting);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    let error = "";
    if (mode === "confirm") {
      for (const row of rows) {
        error = await run(() =>
          confirmPortalPricesFn({ data: { bookId: row.bookId, priceContact: contact, attested } }),
        );
        if (error) break;
      }
    } else {
      error = await run(() =>
        submitPortalPriceUpdateFn({
          data: {
            bidId: rows[0]!.bidId,
            lines: rows.map((row) => ({ itemId: row.itemId, unitPrice: prices[row.itemId] ?? "" })),
            priceContact: contact,
            attested,
          },
        }),
      );
    }
    setBusy(false);
    if (error) setNote(error);
    else {
      setNote(
        mode === "confirm"
          ? "Thank you. We will approve the new term and let you know."
          : "Thank you. We will review your updated prices before they are published.",
      );
      setMode("");
      setAttested(false);
    }
  }

  return (
    <div className="rounded-lg bg-paper p-4 shadow-[var(--shadow-border)]">
      <p className="font-medium">{rows[0]!.bidTitle}</p>
      <ul className="mt-2 grid gap-1 text-sm">
        {rows.map((row) => (
          <li key={row.bookId}>
            {row.title}: ${row.unitPrice}
            {row.unit ? ` / ${row.unit}` : ""}
            <span className="text-muted">
              {" "}
              · <span className="font-mono">{row.referenceCode}</span> ·{" "}
              {row.ended ? `ended ${longDate(row.expiresOn)}` : `good through ${longDate(row.expiresOn)}`}
              {row.pendingConfirmation ? " · confirmation waiting for approval" : ""}
              {row.updatedPricesWaiting ? ` · updated to $${row.updatedPrice}, waiting for review` : ""}
            </span>
          </li>
        ))}
      </ul>
      {mode ? (
        <form className="mt-4 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
          {mode === "update" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <div key={row.itemId} className="grid gap-1.5">
                  <Label htmlFor={`update-${row.bookId}`}>
                    {row.title} (USD{row.unit ? ` / ${row.unit}` : ""})
                  </Label>
                  <Input
                    id={`update-${row.bookId}`}
                    inputMode="decimal"
                    value={prices[row.itemId] ?? ""}
                    onChange={(event) => setPrices((current) => ({ ...current, [row.itemId]: event.target.value }))}
                    required
                    disabled={busy}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              You confirm these prices are unchanged for a new term. The new term starts once United
              Under God approves it; until then the current term stands.
            </p>
          )}
          <PriceContactFields
            idPrefix={`prices-${rows[0]!.bidId}`}
            contact={contact}
            onChange={setContact}
            disabled={busy}
            attestation={attestationText(company)}
            attested={attested}
            onAttest={setAttested}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : mode === "confirm" ? "Confirm unchanged" : "Send updated prices"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={disabled || waiting} onClick={() => setMode("confirm")}>
            {waiting ? "Confirmation sent" : "Confirm prices unchanged for a new term"}
          </Button>
          <Button type="button" variant="secondary" disabled={disabled} onClick={() => setMode("update")}>
            {updated ? "Revise updated prices" : "Send updated prices"}
          </Button>
        </div>
      )}
      {disabled ? <p className="mt-2 text-sm text-muted">Accept the updated Vendor Terms above first.</p> : null}
      <Note text={note} />
    </div>
  );
}

/** The default price contact, prefilled on every quote and confirmation. */
function DefaultPriceContact({ read, run }: { read: Ok; run: Run }) {
  const [contact, setContact] = useState<PriceContact>(read.priceContact);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const error = await run(() => savePortalPriceContactFn({ data: contact }));
    setBusy(false);
    setNote(error || "Saved.");
  }
  return (
    <Card title="Default price contact" id="price-contact">
      <p className="mt-2 max-w-2xl text-sm text-muted">
        The senior person at your company who is authorized to commit it to the prices you quote.
        We fill this in on each quote for you; you can change it on any quote.
      </p>
      <form className="mt-4 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <PriceContactFields idPrefix="default" contact={contact} onChange={setContact} disabled={busy} />
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save price contact"}
          </Button>
        </div>
        <Note text={note} />
      </form>
    </Card>
  );
}

function TermsBanner({ run }: { run: (work: () => Write) => Promise<string> }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const agreed = new FormData(event.currentTarget).get("agreed") === "on";
    setBusy(true);
    setError(await run(() => acceptPortalTermsFn({ data: { agreed, termsVersion: VENDOR_TERMS_VERSION } })));
    setBusy(false);
  }
  return (
    <Card title="Please accept the updated Vendor Terms">
      <p className="mt-2 max-w-2xl text-muted">{termsChange()}</p>
      <p className="mt-2 text-sm text-muted">
        Read the{" "}
        <Link to="/buying/vendor-terms" target="_blank" className="text-forest underline-offset-4 hover:underline">
          Vendor Covenant and Vendor Terms
        </Link>{" "}
        (version {VENDOR_TERMS_VERSION}).
      </p>
      <form className="mt-4 grid gap-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" name="agreed" required className="mt-0.5 size-4 accent-[var(--color-forest)]" />
          <span>
            {AGREE_LABEL} (version {VENDOR_TERMS_VERSION}).
          </span>
        </label>
        <Note text={error} error />
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Accept"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function pts(value: number) {
  return value.toFixed(1);
}

function Standing({ read }: { read: Ok }) {
  const { view } = read;
  return (
    <Card title="Your standing">
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {view.reviewCount} verified {view.reviewCount === 1 ? "review" : "reviews"} · {view.awards}{" "}
        awarded bid {view.awards === 1 ? "line" : "lines"}. A score shows to churches once you have{" "}
        {MIN_RECORD.reviews} verified reviews or an awarded bid.
      </p>
      <RankingDisclosure className="mt-2" />
      {view.scores.length === 0 ? (
        <p className="mt-4 text-muted">You are not in any ranked catalog yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {view.scores.map((row) => (
            <li key={row.category} className="rounded-lg bg-paper p-4 shadow-[var(--shadow-border)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{row.name}</span>
                {row.preferred ? <PreferredBadge /> : null}
                <span className="text-sm text-muted">
                  {row.score !== null
                    ? `Score ${row.score} of 100 · #${row.position} of ${row.of} ranked`
                    : row.ineligible
                      ? `Not ranked: ${row.ineligible}`
                      : "New to the program (not ranked yet)"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Service record {pts(row.breakdown.points.service)} of {view.weights.service} (reviews{" "}
                {Math.round(row.breakdown.reviews * 100)} of 100, covenant history{" "}
                {Math.round(row.breakdown.covenant * 100)} of 100) · Price{" "}
                {pts(row.breakdown.points.price)} of {view.weights.price} · Program support{" "}
                {pts(row.breakdown.points.support)} of {view.weights.support}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-muted">
        <Link to="/buying/how-vendors-are-ranked" className="text-forest underline-offset-4 hover:underline">
          How the score works
        </Link>
      </p>
    </Card>
  );
}

function Invites({ read }: { read: Ok }) {
  const [error, setError] = useState("");
  async function open(inviteId: string) {
    setError("");
    const out = await openPortalBidFn({ data: { inviteId } }).catch(() => null);
    if (out?.ok) window.location.assign(out.path);
    else setError(out?.error ?? "That bid did not open. Please try again.");
  }
  const invites = read.view.invites;
  return (
    <Card title="Open bid invitations">
      {invites.length === 0 ? (
        <p className="mt-2 text-muted">No open bids for you right now. We email you when one opens.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {invites.map((invite) => (
            <li key={invite.inviteId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
              <span>
                <span className="font-medium">{invite.title}</span>
                <span className="text-sm text-muted">
                  {invite.neededBy ? ` · needed by ${invite.neededBy}` : ""}
                  {invite.quoted ? " · quoted" : " · not quoted yet"}
                </span>
              </span>
              <Button type="button" variant="secondary" onClick={() => void open(invite.inviteId)}>
                {invite.quoted ? "Revise quote" : "Quote"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Note text={error} error />
    </Card>
  );
}

function Offers({ read, run }: { read: Ok; run: (work: () => Write) => Promise<string> }) {
  const { view } = read;
  return (
    <Card title="What you offer the program" id="offers">
      <p className="mt-2 max-w-2xl text-sm text-muted">
        The rebate and referral fee in the Vendor Terms are minimums. You may offer more in any
        catalog to show you want the work; many vendors ask their manufacturers to help. It counts
        for less than your price and service, and raising prices to pay more lowers your ranking.
      </p>
      {view.offers.length === 0 ? (
        <p className="mt-4 text-muted">You do not serve a catalog that carries a program fee.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {view.offers.map((offer) => (
            <OfferRow key={offer.category} offer={offer} run={run} disabled={view.vendor.needsTerms} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function OfferRow({
  offer,
  run,
  disabled,
}: {
  offer: Ok["view"]["offers"][number];
  run: (work: () => Write) => Promise<string>;
  disabled: boolean;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const error = await run(() =>
      setPortalOfferFn({
        data: {
          category: offer.category,
          rebate: String(form.get("rebate") ?? ""),
          referral: String(form.get("referral") ?? ""),
        },
      }),
    );
    setNote(error || "Saved.");
    setBusy(false);
  }
  const label = { rebate: "Rebate on catalog and contract sales", referral: "Referral fee on project jobs" };
  return (
    <li className="rounded-lg bg-paper p-4 shadow-[var(--shadow-border)]">
      <form className="grid gap-3" onSubmit={(event) => void onSubmit(event)}>
        <p className="font-medium">{offer.name}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {offer.kinds.map((kind) => (
            <div key={kind} className="grid gap-1.5">
              <Label htmlFor={`offer-${offer.category}-${kind}`}>
                {label[kind]} (at least {offer.floors[kind]}%)
              </Label>
              <Input
                id={`offer-${offer.category}-${kind}`}
                name={kind}
                inputMode="decimal"
                placeholder={String(offer.floors[kind])}
                defaultValue={offer[kind] !== null ? String(offer[kind]) : ""}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" disabled={busy || disabled}>
            {busy ? "Saving…" : "Save rate"}
          </Button>
          {offer.updatedAt ? (
            <span className="text-xs text-subtle">Saved {offer.updatedAt.slice(0, 10)}</span>
          ) : (
            <span className="text-xs text-subtle">Blank means the minimum.</span>
          )}
        </div>
        {disabled ? <p className="text-sm text-muted">Accept the updated Vendor Terms above to set a rate.</p> : null}
        <Note text={note} />
      </form>
    </li>
  );
}

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

function Reports({ read, run }: { read: Ok; run: (work: () => Write) => Promise<string> }) {
  const { view } = read;
  const [kind, setKind] = useState("sales");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    setBusy(true);
    const error = await run(() =>
      submitPortalReportFn({
        data: {
          month: value("month"),
          kind,
          category: value("category"),
          amount: value("amount"),
          description: value("description"),
          churchName: value("churchName"),
          contactName: value("contactName"),
          email: value("email"),
          closedOn: value("closedOn"),
        },
      }),
    );
    setBusy(false);
    if (error) setNote(error);
    else {
      setNote(kind === "job" ? "Saved. We will check it and then ask the church how it went." : "Saved.");
      formRef.current?.reset();
    }
  }

  const catalogs = view.offers;
  return (
    <Card title="Monthly report" id="report">
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Report your program sales and closed jobs each month, including months with none. When you
        report a closed job, we check it and then email the church contact a private link to
        review the work.
      </p>
      <form ref={formRef} className="mt-4 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="report-month">Month</Label>
            <Input id="report-month" name="month" type="month" defaultValue={thisMonth()} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="report-kind">What you are reporting</Label>
            <select id="report-kind" className={SELECT_CLASS} value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="sales">Program sales for the month</option>
              <option value="job">A closed job</option>
              <option value="none">No program sales or jobs this month</option>
            </select>
          </div>
        </div>
        {kind === "none" ? null : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="report-category">Catalog</Label>
              <select id="report-category" name="category" required className={SELECT_CLASS} defaultValue="">
                <option value="" disabled>
                  Pick a catalog
                </option>
                {catalogs.map((row) => (
                  <option key={row.category} value={row.category}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-amount">{kind === "job" ? "Job total" : "Sales total"} (dollars)</Label>
              <Input id="report-amount" name="amount" inputMode="decimal" placeholder="1250.00" required />
            </div>
          </div>
        )}
        {kind === "job" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="report-church">Church</Label>
              <Input id="report-church" name="churchName" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-closed">Date the job closed</Label>
              <Input id="report-closed" name="closedOn" type="date" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-contact">Church contact name</Label>
              <Input id="report-contact" name="contactName" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-email">Church contact email</Label>
              <Input id="report-email" name="email" type="email" required />
            </div>
          </div>
        ) : null}
        {kind === "none" ? null : (
          <div className="grid gap-1.5">
            <Label htmlFor="report-description">{kind === "job" ? "What the job was" : "Notes (optional)"}</Label>
            <Textarea id="report-description" name="description" rows={2} required={kind === "job"} />
          </div>
        )}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Send report"}
          </Button>
        </div>
        <Note text={note} />
      </form>
      {view.reports.length ? (
        <ul className="mt-6 grid gap-1 text-sm text-muted">
          {view.reports.slice(0, 24).map((row) => (
            <li key={row.id}>
              {row.month} ·{" "}
              {row.kind === "none"
                ? "none"
                : `${row.kind === "job" ? `job for ${row.churchName}` : "sales"} · ${fileCatalogName(row.category)} · $${row.amount}`}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function Files({
  read,
  run,
  onUploaded,
}: {
  read: Ok;
  run: (work: () => Write) => Promise<string>;
  onUploaded: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const files = read.files;

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setNote("Choose a file.");
      return;
    }
    setBusy(true);
    setNote("Uploading…");
    try {
      let fileId = "";
      for (let offset = 0; offset < file.size; offset += UPLOAD_CHUNK_BYTES) {
        const piece = file.slice(offset, offset + UPLOAD_CHUNK_BYTES);
        const headers: Record<string, string> = { "Content-Type": "application/octet-stream" };
        if (fileId) {
          headers["x-file-id"] = fileId;
          headers["x-offset"] = String(offset);
        } else {
          headers["x-file-name"] = encodeURIComponent(file.name);
          headers["x-file-size"] = String(file.size);
          headers["x-file-kind"] = String(form.get("kind") ?? "");
          headers["x-file-title"] = encodeURIComponent(String(form.get("title") ?? ""));
          headers["x-file-category"] = String(form.get("category") ?? "");
        }
        const res = await fetch("/api/vendor-files", { method: "POST", headers, body: piece, credentials: "same-origin" });
        const out = (await res.json().catch(() => ({ ok: false, error: "That upload did not save." }))) as {
          ok: boolean;
          id?: string;
          error?: string;
        };
        if (!out.ok) throw new Error(out.error || "That upload did not save.");
        fileId = out.id ?? fileId;
      }
      setNote("Uploaded.");
      formRef.current?.reset();
      onUploaded();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "That upload did not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(fileId: string) {
    setNote(await run(() => deletePortalFileFn({ data: { fileId } })));
  }

  return (
    <Card title="Brochures, price sheets, and descriptions" id="files">
      <p className="mt-2 max-w-2xl text-sm text-muted">
        PDF, JPG, PNG, or WebP, up to 5 MB each, and up to {MAX_FILES_PER_VENDOR} files. Churches see
        them on your listing and your profile.
      </p>
      {files.length ? (
        <ul className="mt-4 grid gap-2 text-sm">
          {files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper px-4 py-2 shadow-[var(--shadow-border)]">
              <span>
                {file.status === "ready" ? (
                  <a href={`/api/vendor-files/${file.id}`} className="text-forest underline-offset-4 hover:underline">
                    {file.title}
                  </a>
                ) : (
                  <span>{file.title} (unfinished upload)</span>
                )}
                <span className="text-muted">
                  {" "}
                  · {FILE_KIND_LABELS[file.kind]}
                  {file.category ? ` · ${fileCatalogName(file.category)}` : ""} · {fileSize(file.size)}
                </span>
              </span>
              <Button type="button" variant="ghost" onClick={() => void remove(file.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <form ref={formRef} className="mt-4 grid gap-4" onSubmit={(event) => void upload(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="file-kind">What it is</Label>
            <select id="file-kind" name="kind" className={SELECT_CLASS} defaultValue="brochure">
              {FILE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {FILE_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="file-category">Catalog</Label>
            <select id="file-category" name="category" className={SELECT_CLASS} defaultValue="">
              <option value="">Every catalog I serve</option>
              {read.view.offers.map((row) => (
                <option key={row.category} value={row.category}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="file-title">Title (optional)</Label>
            <Input id="file-title" name="title" maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="file-file">File</Label>
            <input id="file-file" name="file" type="file" accept={ACCEPT_ATTRIBUTE} required className="min-h-11 text-sm" />
          </div>
        </div>
        <div>
          <Button type="submit" disabled={busy || files.length >= MAX_FILES_PER_VENDOR}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
        <Note text={note} />
      </form>
    </Card>
  );
}

function Profile({ read, run }: { read: Ok; run: (work: () => Write) => Promise<string> }) {
  const { vendor } = read.view;
  const pending = vendor.requestedCategories;
  const [picked, setPicked] = useState(new Set(pending.length ? pending : vendor.categories));
  const [nationwide, setNationwide] = useState(vendor.nationwide);
  const [states, setStates] = useState(new Set(vendor.states));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    setBusy(true);
    const error = await run(() =>
      savePortalProfileFn({
        data: {
          description: value("description"),
          website: value("website"),
          phone: value("phone"),
          nationwide,
          states: [...states],
          places: value("places"),
          categories: [...picked],
        },
      }),
    );
    setBusy(false);
    setNote(error || "Saved.");
  }

  const toggle = (set: Set<string>, keys: string[], on: boolean) => {
    const next = new Set(set);
    for (const key of keys) {
      if (on) next.add(key);
      else next.delete(key);
    }
    return next;
  };

  return (
    <Card title="Your profile" id="profile">
      <form className="mt-4 grid gap-5" onSubmit={(event) => void onSubmit(event)}>
        <div className="grid gap-1.5">
          <Label htmlFor="profile-description">Description churches see</Label>
          <Textarea id="profile-description" name="description" rows={4} maxLength={2000} defaultValue={vendor.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="profile-website">Website</Label>
            <Input id="profile-website" name="website" defaultValue={vendor.website} placeholder="example.com" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input id="profile-phone" name="phone" type="tel" defaultValue={vendor.phone} required />
          </div>
        </div>
        <fieldset className="grid gap-2">
          <legend className="font-medium">Service area</legend>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-forest)]"
              checked={nationwide}
              onChange={(event) => setNationwide(event.target.checked)}
            />
            Nationwide / ships anywhere
          </label>
          {nationwide ? null : (
            <>
              <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
                {US_STATES.map((state) => (
                  <label key={state.code} className="flex min-h-11 items-center gap-2 text-sm" title={state.name}>
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-forest)]"
                      checked={states.has(state.code)}
                      aria-label={state.name}
                      onChange={(event) => setStates((set) => toggle(set, [state.code], event.target.checked))}
                    />
                    {state.code}
                  </label>
                ))}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="profile-places">Cities or ZIP codes (optional, comma separated)</Label>
                <Textarea id="profile-places" name="places" rows={2} defaultValue={vendor.places.join(", ")} />
              </div>
            </>
          )}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="font-medium">Categories</legend>
          <p className="text-sm text-muted">
            Now: {vendor.categoryNames.join("; ") || "none"}. A change of categories waits for our
            approval; until then your current categories stay.
          </p>
          {pending.length ? (
            <p className="text-sm text-ink">Waiting for approval: {describeCategories(pending).join("; ")}</p>
          ) : null}
          {vendorCategoryOptions().map(({ category, subcategories }) => (
            <details key={category.id} className="rounded-lg bg-paper px-4 py-2 shadow-[var(--shadow-border)]">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2">
                <span>{category.name}</span>
                <span className="text-sm text-muted">
                  {subcategories.filter((row) => picked.has(row.key)).length || ""}
                </span>
              </summary>
              <div className="grid gap-1 pb-2">
                {subcategories.map(({ key, sub }) => (
                  <label key={key} className="flex min-h-11 items-center gap-2 pl-4 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-forest)]"
                      checked={picked.has(key)}
                      onChange={(event) => setPicked((set) => toggle(set, [key], event.target.checked))}
                    />
                    {sub.name}
                  </label>
                ))}
              </div>
            </details>
          ))}
        </fieldset>
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </Button>
        </div>
        <Note text={note} />
      </form>
      <p className="mt-4 text-sm text-muted">
        Your public profile:{" "}
        <Link to="/buying/vendor/$id" params={{ id: vendor.id }} className="text-forest underline-offset-4 hover:underline">
          view it
        </Link>
        . To change your company name or sign-in email, reply to any email from us.
      </p>
    </Card>
  );
}
