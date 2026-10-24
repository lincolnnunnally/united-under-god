import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PreferredBadge, RankingDisclosure } from "@/components/vendor-ranking";
import {
  decideCategoryRequestFn,
  hideReviewFn,
  previewBroadcastFn,
  previewReviewRequestFn,
  readProgramDeskFn,
  sendBroadcastFn,
  sendReviewRequestFn,
  unhideReviewFn,
  type ProgramDesk,
} from "@/lib/program-actions";
import { SPEND_CATEGORIES, getSpendCategory } from "@/lib/church-spend";
import { HIDE_REASONS, HIDE_REASON_LABELS } from "@/lib/review-store";
import { describeCategories } from "@/lib/vendor-store";
import { INELIGIBLE_TEXT, displayScore, isRankedCategory } from "@/lib/vendor-rank";

/**
 * The desk's vendor program: rankings with their breakdown, category changes
 * to approve, review requests and moderation, catalog messages, and monthly
 * reports. Nothing is sent until Send is pressed after a preview.
 */
export function ProgramSection() {
  const [desk, setDesk] = useState<ProgramDesk | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    readProgramDeskFn()
      .then(setDesk)
      .catch((err) => setError(err instanceof Error ? err.message : "The vendor program did not load."));
  }, []);

  async function run(work: () => Promise<ProgramDesk>) {
    setError("");
    try {
      setDesk(await work());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
      return false;
    }
  }

  return (
    <section className="mt-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]" data-program-desk="">
      <h2 className="font-display text-xl">Vendor program</h2>
      {error ? (
        <p className="mt-2 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      {!desk ? (
        <p className="mt-2 text-sm text-muted">Loading…</p>
      ) : !desk.ready ? (
        <p className="mt-2 text-sm text-muted">
          The vendor program tables are not in the database yet. Apply
          migrations/0010_source_vendor_portal.sql, then reload.
        </p>
      ) : (
        <div className="mt-2 grid gap-8">
          <Rankings desk={desk} />
          <CategoryRequests desk={desk} run={run} />
          <ReviewRequests desk={desk} run={run} />
          <Reviews desk={desk} run={run} />
          <Broadcast desk={desk} run={run} />
          <Reports desk={desk} />
        </div>
      )}
    </section>
  );
}

type Run = (work: () => Promise<ProgramDesk>) => Promise<boolean>;

const SELECT_CLASS =
  "min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)] md:text-sm";

function companyOf(desk: ProgramDesk, vendorId: string) {
  return desk.vendors.find((vendor) => vendor.id === vendorId)?.company ?? "Vendor";
}

function when(iso: string) {
  return iso ? `${iso.slice(0, 16).replace("T", " ")} UTC` : "";
}

function Rankings({ desk }: { desk: ProgramDesk }) {
  const [open, setOpen] = useState("");
  return (
    <div>
      <h3 className="font-display text-lg">Rankings</h3>
      <RankingDisclosure className="mt-1" />
      {desk.rankings.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No approved vendor in a ranked catalog yet.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {desk.rankings.map(({ category, rows }) => (
            <li key={category} className="rounded-lg bg-paper px-4 py-2 shadow-[var(--shadow-border)]">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between text-left text-sm"
                onClick={() => setOpen((id) => (id === category ? "" : category))}
              >
                <span className="font-medium">{getSpendCategory(category)?.name ?? category}</span>
                <span className="text-muted">
                  {rows.filter((row) => row.ranked).length} ranked · {rows.length} listed
                </span>
              </button>
              {open === category ? (
                <ol className="grid gap-1 pb-2 text-sm">
                  {rows.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center gap-2">
                      <span>{row.position ? `#${row.position}` : "–"}</span>
                      <span className="font-medium">{row.company}</span>
                      {row.preferred ? <PreferredBadge /> : null}
                      <span className="text-muted">
                        {displayScore(row.breakdown)} of 100 (service {row.breakdown.points.service.toFixed(1)}, price{" "}
                        {row.breakdown.points.price.toFixed(1)}, support {row.breakdown.points.support.toFixed(1)})
                        {row.ineligible ? ` · not ranked: ${INELIGIBLE_TEXT[row.ineligible]}` : ""}
                        {row.newToProgram ? " · new to the program" : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRequests({ desk, run }: { desk: ProgramDesk; run: Run }) {
  const [busy, setBusy] = useState(false);
  async function decide(vendorId: string, approve: boolean) {
    setBusy(true);
    await run(() => decideCategoryRequestFn({ data: { vendorId, approve } }));
    setBusy(false);
  }
  return (
    <div>
      <h3 className="font-display text-lg">Category changes waiting</h3>
      {desk.categoryRequests.length === 0 ? (
        <p className="mt-1 text-sm text-muted">None.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {desk.categoryRequests.map((request) => (
            <li key={request.vendorId} className="rounded-lg bg-paper px-4 py-3 text-sm shadow-[var(--shadow-border)]">
              <p className="font-medium">{request.company}</p>
              {request.added.length ? <p className="text-muted">Add: {describeCategories(request.added).join("; ")}</p> : null}
              {request.removed.length ? (
                <p className="text-muted">Remove: {describeCategories(request.removed).join("; ")}</p>
              ) : null}
              <p className="text-xs text-subtle">Asked {when(request.requestedAt)}</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" disabled={busy} onClick={() => void decide(request.vendorId, true)}>
                  Approve
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void decide(request.vendorId, false)}>
                  Decline
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type RequestPreview = Awaited<ReturnType<typeof previewReviewRequestFn>>;

function ReviewRequests({ desk, run }: { desk: ProgramDesk; run: Run }) {
  const empty = { vendorId: "", category: "", churchName: "", contactName: "", email: "", job: "" };
  const [form, setForm] = useState(empty);
  const [preview, setPreview] = useState<RequestPreview | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const vendor = desk.vendors.find((row) => row.id === form.vendorId);
  const set = (key: keyof typeof empty) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setPreview(null);
  };

  async function onPreview(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNote("");
    try {
      setPreview(await previewReviewRequestFn({ data: form }));
    } catch (err) {
      setNote(err instanceof Error ? err.message : "The preview did not load.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    let result = { ok: false, error: "" };
    const ok = await run(async () => {
      const out = await sendReviewRequestFn({ data: form });
      result = out.result;
      return out.desk;
    });
    if (ok) {
      setPreview(null);
      setForm(empty);
      setNote(result.ok ? "Sent." : `Not sent: ${result.error}`);
    }
    setBusy(false);
  }

  return (
    <div>
      <h3 className="font-display text-lg">Ask a church for a review</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        After a real program job. The church contact gets a private link; their name and email are
        never shown. Vendor-reported closed jobs send this automatically.
      </p>
      <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onPreview(event)}>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-vendor">Vendor</Label>
          <select id="rr-vendor" className={SELECT_CLASS} value={form.vendorId} onChange={(e) => set("vendorId")(e.target.value)} required>
            <option value="">Pick a vendor</option>
            {desk.vendors
              .filter((row) => row.status !== "removed")
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.company}
                </option>
              ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-category">Catalog</Label>
          <select id="rr-category" className={SELECT_CLASS} value={form.category} onChange={(e) => set("category")(e.target.value)}>
            <option value="">Not sure</option>
            {(vendor?.catalogs ?? []).map((id) => (
              <option key={id} value={id}>
                {getSpendCategory(id)?.name ?? id}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-church">Church</Label>
          <Input id="rr-church" value={form.churchName} onChange={(e) => set("churchName")(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-contact">Contact name</Label>
          <Input id="rr-contact" value={form.contactName} onChange={(e) => set("contactName")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-email">Contact email</Label>
          <Input id="rr-email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rr-job">The job</Label>
          <Input id="rr-job" value={form.job} onChange={(e) => set("job")(e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" disabled={busy}>
            Preview request
          </Button>
        </div>
      </form>
      {preview ? (
        <div className="mt-3 grid gap-2 rounded-lg bg-paper p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm font-medium">To: {preview.to}</p>
          <p className="text-sm font-medium">Subject: {preview.email.subject}</p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-cream p-3 text-sm text-ink">{preview.email.text}</pre>
          <div className="flex gap-2">
            <Button type="button" disabled={busy} onClick={() => void send()}>
              {busy ? "Sending…" : "Send"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {note ? (
        <p className="mt-2 text-sm text-ink" role="status">
          {note}
        </p>
      ) : null}
      {desk.requests.length ? (
        <ul className="mt-3 grid gap-1 text-sm text-muted">
          {desk.requests.slice(0, 40).map((row) => (
            <li key={row.id}>
              {companyOf(desk, row.vendorId)} · {row.churchName} ({row.email}) · {row.origin === "report" ? "vendor report" : "desk"} ·{" "}
              {row.emailStatus}
              {row.emailError ? ` (${row.emailError})` : ""} · {when(row.sentAt)}
              {row.usedAt ? " · reviewed" : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Reviews({ desk, run }: { desk: ProgramDesk; run: Run }) {
  return (
    <div>
      <h3 className="font-display text-lg">Reviews</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Hide a review only if it is abusive, uses profanity, or shares private information, never
        for being negative. Every hide is logged with its reason, and a hidden review's ratings
        still count.
      </p>
      {desk.reviews.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No reviews yet.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {desk.reviews.map((review) => (
            <ReviewItem key={review.id} desk={desk} review={review} run={run} />
          ))}
        </ul>
      )}
      {desk.moderation.length ? (
        <div className="mt-3">
          <p className="text-sm font-medium">Moderation log</p>
          <ul className="mt-1 grid gap-1 text-sm text-muted">
            {desk.moderation.map((row) => (
              <li key={row.id}>
                {when(row.createdAt)} · {row.action}
                {row.reason ? ` · ${HIDE_REASON_LABELS[row.reason as keyof typeof HIDE_REASON_LABELS] ?? row.reason}` : ""} ·{" "}
                {row.note} · {row.author}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ReviewItem({
  desk,
  review,
  run,
}: {
  desk: ProgramDesk;
  review: ProgramDesk["reviews"][number];
  run: Run;
}) {
  const [hiding, setHiding] = useState(false);
  const [reason, setReason] = useState<string>(HIDE_REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function hide() {
    setBusy(true);
    const ok = await run(() => hideReviewFn({ data: { reviewId: review.id, reason, note } }));
    if (ok) setHiding(false);
    setBusy(false);
  }
  async function unhide() {
    setBusy(true);
    await run(() => unhideReviewFn({ data: { reviewId: review.id, note: "Published again." } }));
    setBusy(false);
  }

  return (
    <li className="rounded-lg bg-paper px-4 py-3 text-sm shadow-[var(--shadow-border)]">
      <p className="font-medium">
        {companyOf(desk, review.vendorId)} · {review.overall} of 5 · {review.churchName}
        {review.showChurchName ? " (named)" : " (shown as a program church)"} · {review.status}
        {review.hiddenReason ? ` (${HIDE_REASON_LABELS[review.hiddenReason as keyof typeof HIDE_REASON_LABELS] ?? review.hiddenReason})` : ""}
      </p>
      <p className="text-muted">
        Quality {review.quality} · on time {review.onTime ? "yes" : "no"} · bill matched {review.billMatched ? "yes" : "no"} · hire again{" "}
        {review.hireAgain ? "yes" : "no"}
      </p>
      <p className="mt-1 whitespace-pre-line text-ink">{review.comment}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {review.status === "published" ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setHiding((on) => !on)}>
            {hiding ? "Cancel" : "Hide…"}
          </Button>
        ) : (
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void unhide()}>
            Publish again
          </Button>
        )}
      </div>
      {hiding ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`hide-${review.id}`}>Reason</Label>
            <select id={`hide-${review.id}`} className={SELECT_CLASS} value={reason} onChange={(e) => setReason(e.target.value)}>
              {HIDE_REASONS.map((value) => (
                <option key={value} value={value}>
                  {HIDE_REASON_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`hide-note-${review.id}`}>What in it is abusive, profane, or private?</Label>
            <Input id={`hide-note-${review.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div>
            <Button type="button" disabled={busy || !note.trim()} onClick={() => void hide()}>
              Hide and log
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

type BroadcastPreview = Awaited<ReturnType<typeof previewBroadcastFn>>;

function Broadcast({ desk, run }: { desk: ProgramDesk; run: Run }) {
  const empty = { category: "", subcategory: "", area: "", subject: "", body: "" };
  const [form, setForm] = useState(empty);
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const category = getSpendCategory(form.category);
  const set = (key: keyof typeof empty) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value, ...(key === "category" ? { subcategory: "" } : {}) }));
    setPreview(null);
  };

  async function onPreview(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNote("");
    try {
      setPreview(await previewBroadcastFn({ data: form }));
    } catch (err) {
      setNote(err instanceof Error ? err.message : "The preview did not load.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!preview) return;
    setBusy(true);
    let summary = "";
    const ok = await run(async () => {
      const out = await sendBroadcastFn({ data: { ...form, sendKey: preview.sendKey } });
      summary = `Sent ${out.result.sent.length}.${out.result.failed.length ? ` Not sent: ${out.result.failed.length}.` : ""}${out.result.skipped.length ? ` Already sent: ${out.result.skipped.length}.` : ""}`;
      return out.desk;
    });
    if (ok) {
      setPreview(null);
      setForm(empty);
      setNote(summary);
    }
    setBusy(false);
  }

  return (
    <div>
      <h3 className="font-display text-lg">Message the vendors in a catalog</h3>
      <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onPreview(event)}>
        <div className="grid gap-1.5">
          <Label htmlFor="bc-category">Catalog</Label>
          <select id="bc-category" className={SELECT_CLASS} value={form.category} onChange={(e) => set("category")(e.target.value)} required>
            <option value="">Pick a catalog</option>
            {SPEND_CATEGORIES.filter(isRankedCategory).map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bc-sub">Subcategory (optional)</Label>
          <select id="bc-sub" className={SELECT_CLASS} value={form.subcategory} onChange={(e) => set("subcategory")(e.target.value)}>
            <option value="">All of it</option>
            {(category?.subcategories ?? []).map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bc-area">Area (state codes, optional)</Label>
          <Input id="bc-area" value={form.area} placeholder="GA, SC" onChange={(e) => set("area")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bc-subject">Subject</Label>
          <Input id="bc-subject" value={form.subject} onChange={(e) => set("subject")(e.target.value)} required />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="bc-body">Message</Label>
          <Textarea
            id="bc-body"
            rows={4}
            value={form.body}
            placeholder="We're refreshing this catalog — please update your pricing in your portal."
            onChange={(e) => set("body")(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" disabled={busy}>
            Preview message
          </Button>
        </div>
      </form>
      {preview ? (
        <div className="mt-3 grid gap-2 rounded-lg bg-paper p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm font-medium">
            To {preview.recipients.length} {preview.recipients.length === 1 ? "vendor" : "vendors"} serving {preview.targetName}
          </p>
          <p className="text-sm text-muted">{preview.recipients.map((row) => `${row.company} (${row.email})`).join(", ") || "Nobody matches."}</p>
          <p className="text-sm font-medium">Subject: {preview.email.subject}</p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-cream p-3 text-sm text-ink">{preview.email.text}</pre>
          <p className="text-xs text-subtle">Each vendor gets its own greeting. Pressing Send twice sends once.</p>
          <div className="flex gap-2">
            <Button type="button" disabled={busy || preview.recipients.length === 0} onClick={() => void send()}>
              {busy ? "Sending…" : `Send to ${preview.recipients.length}`}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {note ? (
        <p className="mt-2 text-sm text-ink" role="status">
          {note}
        </p>
      ) : null}
      {desk.broadcasts.length ? (
        <ul className="mt-3 grid gap-1 text-sm text-muted">
          {desk.broadcasts.map((row) => (
            <li key={row.id}>
              {when(row.createdAt)} · {row.target} · “{row.subject}” · sent {row.sent}
              {row.failed ? `, failed ${row.failed}` : ""} · {row.sentBy}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Reports({ desk }: { desk: ProgramDesk }) {
  return (
    <div>
      <h3 className="font-display text-lg">Monthly reports</h3>
      {desk.reports.length === 0 ? (
        <p className="mt-1 text-sm text-muted">No vendor reports yet.</p>
      ) : (
        <ul className="mt-2 grid gap-1 text-sm text-muted">
          {desk.reports.slice(0, 100).map((row) => (
            <li key={row.id}>
              {row.month} · {companyOf(desk, row.vendorId)} ·{" "}
              {row.kind === "none"
                ? "none this month"
                : `${row.kind === "job" ? `closed job for ${row.churchName} (${row.email})` : "sales"} · ${getSpendCategory(row.category)?.name ?? row.category} · $${row.amount}`}
              {row.description ? ` · ${row.description}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
