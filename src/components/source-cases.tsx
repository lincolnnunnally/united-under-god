import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  FINDINGS,
  FINDING_LABELS,
  PROBLEM_TYPE_LABELS,
  REMEDY_KINDS,
  REMEDY_LABELS,
  describeRemedy,
  nextConsequence,
} from "@/lib/case-store";
import {
  addCaseEntryFn,
  addCommitteePersonFn,
  assignMediatorsFn,
  decideCaseFn,
  escalateCaseFn,
  markRemedyFn,
  previewChurchDecisionFn,
  previewMediatorNoticeFn,
  previewVendorNoticeFn,
  sendChurchDecisionFn,
  sendMediatorLinksFn,
  sendVendorNoticeFn,
  setCaseStatusFn,
  setCommitteeActiveFn,
  type CaseRow,
  type DeskView,
} from "@/lib/source-actions";
import { CONSEQUENCES, CONSEQUENCE_LABELS } from "@/lib/vendor-terms";
import { cn } from "@/lib/utils";

type Run = (work: () => Promise<DeskView>) => Promise<boolean>;

const SELECT_CLASS =
  "min-h-11 w-full rounded-md bg-paper px-3.5 text-base text-ink shadow-[var(--shadow-border)] outline-none focus-visible:shadow-[0_0_0_2px_var(--color-forest)] disabled:opacity-50 md:text-sm";

function when(value: string) {
  return value ? `${value.slice(0, 16).replace("T", " ")} UTC` : "";
}

/** Cases on the desk: each church report, heard, decided, and followed through. */
export function CasesSection({ desk, onRun }: { desk: DeskView; onRun: Run }) {
  const [showClosed, setShowClosed] = useState(false);
  if (!desk.vendorsReady) return null;
  const cases = desk.cases.filter((row) => showClosed || row.status !== "closed");
  const open = desk.cases.filter((row) => row.status !== "closed").length;
  const flagged = desk.cases.filter((row) => row.remedyOverdue || row.responseOverdue).length;

  return (
    <section className="mt-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]" data-cases="">
      <h2 className="font-display text-xl">Cases</h2>
      {!desk.casesReady ? (
        <p className="mt-2 text-sm text-muted">
          The case tables are not in the database yet. Apply
          migrations/0008_source_vendor_cases.sql, then reload.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {desk.cases.length === 0
              ? "No reports yet. Churches report a problem at /buying/report."
              : `${open} not closed${flagged ? `, ${flagged} flagged overdue` : ""}.`}
          </p>
          <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-forest)]"
              checked={showClosed}
              onChange={(event) => setShowClosed(event.target.checked)}
            />
            Show closed cases
          </label>
          <ul className="mt-3 grid gap-3">
            {cases.map((row) => (
              <CaseCard key={row.id} row={row} desk={desk} onRun={onRun} />
            ))}
          </ul>
          <CommitteePanel desk={desk} onRun={onRun} />
        </>
      )}
    </section>
  );
}

function CaseCard({ row, desk, onRun }: { row: CaseRow; desk: DeskView; onRun: Run }) {
  const [busy, setBusy] = useState(false);
  async function run(work: () => Promise<DeskView>) {
    setBusy(true);
    try {
      return await onRun(work);
    } finally {
      setBusy(false);
    }
  }
  const vendor = desk.vendors.find((v) => v.id === row.vendorId);

  return (
    <li className="rounded-lg bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
      <details>
        <summary className="flex min-h-11 cursor-pointer flex-wrap items-baseline justify-between gap-2">
          <span className="font-medium">
            {row.churchName} · {row.vendorName}
            {row.problemType ? ` · ${PROBLEM_TYPE_LABELS[row.problemType]}` : ""}
          </span>
          <span className="text-xs uppercase tracking-[0.14em] text-subtle">
            {CASE_STATUS_LABELS[row.status]}
            {row.responseOverdue ? " · response overdue" : ""}
            {row.remedyOverdue ? " · remedy overdue" : ""}
          </span>
        </summary>

        <div className="mt-3 grid gap-6">
          <div className="grid gap-1 text-sm text-muted">
            <p>
              {row.contactName} · {row.email} · {row.phone}
            </p>
            {row.problemType ? (
              <p className="font-medium text-ink">
                {PROBLEM_TYPE_LABELS[row.problemType]}
                {row.referenceCode ? ` · reference ${row.referenceCode}` : " · no reference given"}
              </p>
            ) : row.referenceCode ? (
              <p>Program reference: {row.referenceCode}</p>
            ) : null}
            <p>
              Bought: {row.purchase} ({row.purchasedOn}) · reported {when(row.createdAt)}
            </p>
            <p className="whitespace-pre-line">What went wrong: {row.problem}</p>
            <p className="whitespace-pre-line">What would make it right: {row.wanted}</p>
            {vendor ? (
              <p>
                Vendor: {vendor.status}
                {vendor.consequence !== "none"
                  ? ` · ${CONSEQUENCE_LABELS[vendor.consequence]}`
                  : ""}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`status-${row.id}`}>Status</Label>
              <select
                id={`status-${row.id}`}
                className={SELECT_CLASS}
                value={row.status}
                disabled={busy}
                onChange={(event) =>
                  void run(() =>
                    setCaseStatusFn({ data: { caseId: row.id, status: event.target.value } }),
                  )
                }
              >
                {CASE_STATUSES.map((status) => (
                  <option
                    key={status}
                    value={status}
                    disabled={status === "decided" && !row.finding}
                  >
                    {CASE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <MailStep
            title="Notify the vendor"
            hint={
              row.vendorNotifiedAt
                ? `Notified ${when(row.vendorNotifiedAt)}; response due by ${row.vendorResponseDue}${row.vendorRespondedAt ? `; responded ${when(row.vendorRespondedAt)}` : ""}. Sending again makes a fresh link.`
                : "Email the vendor the church's concern, a private link to respond, and the response date."
            }
            disabled={row.status === "closed"}
            preview={() => previewVendorNoticeFn({ data: { caseId: row.id } })}
            send={async () => {
              const out = await sendVendorNoticeFn({ data: { caseId: row.id } });
              return {
                desk: out.desk,
                note: out.result.ok ? "Sent." : `Not sent: ${out.result.error}`,
              };
            }}
            onRun={onRun}
          />

          <Timeline row={row} />
          <EntryForm row={row} onRun={onRun} />
          <Mediators row={row} desk={desk} onRun={onRun} />
          <DecisionForm row={row} onRun={onRun} />
          {row.finding ? (
            <FollowThrough
              row={row}
              vendorConsequence={vendor?.consequence ?? "none"}
              onRun={onRun}
            />
          ) : null}
          {row.finding ? (
            <MailStep
              title="Tell the church the decision"
              hint={
                row.churchToldAt
                  ? `Told ${when(row.churchToldAt)}.`
                  : "Email the church the finding and the remedy owed."
              }
              disabled={false}
              preview={() => previewChurchDecisionFn({ data: { caseId: row.id } })}
              send={async () => {
                const out = await sendChurchDecisionFn({ data: { caseId: row.id } });
                return {
                  desk: out.desk,
                  note: out.result.ok ? "Sent." : `Not sent: ${out.result.error}`,
                };
              }}
              onRun={onRun}
            />
          ) : null}
        </div>
      </details>
    </li>
  );
}

type MailPreview = { to: string; email: { subject: string; text: string } };

/** Preview the exact email, then Send. Nothing goes out until Send is pressed. */
function MailStep({
  title,
  hint,
  disabled,
  preview,
  send,
  onRun,
}: {
  title: string;
  hint: string;
  disabled: boolean;
  preview: () => Promise<MailPreview>;
  send: () => Promise<{ desk: DeskView; note: string }>;
  onRun: Run;
}) {
  const [shown, setShown] = useState<MailPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function open() {
    setBusy(true);
    setNote("");
    try {
      setShown(await preview());
    } catch (err) {
      setNote(err instanceof Error ? err.message : "The preview did not load.");
    } finally {
      setBusy(false);
    }
  }

  async function go() {
    setBusy(true);
    try {
      let message = "";
      const ok = await onRun(async () => {
        const out = await send();
        message = out.note;
        return out.desk;
      });
      if (ok) {
        setShown(null);
        setNote(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3 className="font-display text-lg">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted">{hint}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy || disabled}
          onClick={() => void open()}
        >
          Preview email
        </Button>
        {note ? (
          <span className="text-sm text-ink" role="status">
            {note}
          </span>
        ) : null}
      </div>
      {shown ? (
        <div className="mt-3 grid gap-2 rounded-lg bg-cream p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm font-medium">To: {shown.to}</p>
          <p className="text-sm font-medium">Subject: {shown.email.subject}</p>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 text-sm text-ink shadow-[var(--shadow-border)]">
            {shown.email.text}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void go()}>
              {busy ? "Sending…" : "Send"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setShown(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  report: "Church report",
  vendor_notified: "Vendor notified",
  vendor_response: "Vendor response",
  note: "Note (desk only)",
  message: "Message",
  mediators: "Mediators",
  mediator_notified: "Mediator link",
  recommendation: "Recommendation",
  decision: "Decision",
  remedy: "Remedy",
  escalation: "Escalation",
  church_told: "Church told",
  status: "Status",
};

function Timeline({ row }: { row: CaseRow }) {
  return (
    <div>
      <h3 className="font-display text-lg">Timeline</h3>
      <ol className="mt-2 grid gap-2">
        {row.events.map((event) => (
          <li
            key={event.id}
            className={cn(
              "rounded-md bg-cream px-3 py-2 text-sm",
              event.kind === "note" && "border-l-2 border-forest",
            )}
          >
            <p className="text-xs text-subtle">
              {when(event.createdAt)} · {event.author} · {EVENT_LABELS[event.kind] ?? event.kind}
            </p>
            <p className="mt-1 whitespace-pre-line text-ink">{event.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EntryForm({ row, onRun }: { row: CaseRow; onRun: Run }) {
  const [kind, setKind] = useState<"note" | "message">("note");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const ok = await onRun(() => addCaseEntryFn({ data: { caseId: row.id, kind, body } }));
      if (ok) setBody("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-2" onSubmit={(event) => void onSubmit(event)}>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="radio"
            className="size-4 accent-[var(--color-forest)]"
            checked={kind === "note"}
            onChange={() => setKind("note")}
          />
          Note (desk only; mediators don’t see it)
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="radio"
            className="size-4 accent-[var(--color-forest)]"
            checked={kind === "message"}
            onChange={() => setKind("message")}
          />
          Message (a record of a call or email)
        </label>
      </div>
      <Textarea
        aria-label="Note or message"
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        disabled={busy}
      />
      <div>
        <Button type="submit" variant="secondary" disabled={busy || !body.trim()}>
          Add to timeline
        </Button>
      </div>
    </form>
  );
}

function Mediators({ row, desk, onRun }: { row: CaseRow; desk: DeskView; onRun: Run }) {
  const assigned = new Set(row.mediators.map((m) => m.personId));
  const available = desk.committee.filter((p) => p.active && !assigned.has(p.id));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [toSend, setToSend] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{ subject: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const closed = row.status === "closed";

  function toggle(set: Set<string>, id: string, on: boolean) {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  }

  async function assign() {
    setBusy(true);
    try {
      const ok = await onRun(() =>
        assignMediatorsFn({ data: { caseId: row.id, personIds: [...picked] } }),
      );
      if (ok) setPicked(new Set());
    } finally {
      setBusy(false);
    }
  }

  async function openPreview() {
    setBusy(true);
    setNote("");
    try {
      setPreview(await previewMediatorNoticeFn({ data: { caseId: row.id } }));
      setToSend(
        new Set(row.mediators.filter((m) => m.emailStatus !== "sent").map((m) => m.personId)),
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : "The preview did not load.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    try {
      let message = "";
      const ok = await onRun(async () => {
        const out = await sendMediatorLinksFn({ data: { caseId: row.id, personIds: [...toSend] } });
        message = `Sent ${out.result.sent.length}.${out.result.failed.length ? ` Not sent: ${out.result.failed.map((f) => f.error).join(", ")}.` : ""}`;
        return out.desk;
      });
      if (ok) {
        setPreview(null);
        setNote(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3 className="font-display text-lg">Committee</h3>
      {row.mediators.length ? (
        <ul className="mt-2 grid gap-1 text-sm text-muted">
          {row.mediators.map((m) => (
            <li key={m.id}>
              {m.name} · {m.email}
              {m.emailStatus ? ` · link ${m.emailStatus}` : " · no link sent yet"}
              {m.emailError ? ` (${m.emailError})` : ""}
              {m.sentAt ? ` · ${when(m.sentAt)}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted">No mediators on this case.</p>
      )}
      {!closed && available.length ? (
        <div className="mt-2 grid gap-1">
          <p className="text-sm font-medium">Assign from the committee list</p>
          {available.map((p) => (
            <label key={p.id} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-forest)]"
                checked={picked.has(p.id)}
                onChange={(event) => setPicked((set) => toggle(set, p.id, event.target.checked))}
              />
              {p.name} · {p.email}
            </label>
          ))}
          <div>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || picked.size === 0}
              onClick={() => void assign()}
            >
              Assign mediators
            </Button>
          </div>
        </div>
      ) : null}
      {!closed && row.mediators.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void openPreview()}
          >
            Preview mediator email
          </Button>
          {note ? (
            <span className="text-sm text-ink" role="status">
              {note}
            </span>
          ) : null}
        </div>
      ) : null}
      {preview ? (
        <div className="mt-3 grid gap-2 rounded-lg bg-cream p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm font-medium">Send to</p>
          {row.mediators.map((m) => (
            <label key={m.id} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-forest)]"
                checked={toSend.has(m.personId)}
                onChange={(event) =>
                  setToSend((set) => toggle(set, m.personId, event.target.checked))
                }
              />
              {m.name} · {m.email}
              {m.emailStatus === "sent" ? " · already sent (a new link replaces it)" : ""}
            </label>
          ))}
          <p className="text-sm font-medium">Subject: {preview.subject}</p>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 text-sm text-ink shadow-[var(--shadow-border)]">
            {preview.text}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || toSend.size === 0} onClick={() => void send()}>
              {busy ? "Sending…" : `Send to ${toSend.size}`}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DecisionForm({ row, onRun }: { row: CaseRow; onRun: Run }) {
  const [finding, setFinding] = useState<string>(row.finding);
  const [remedyKind, setRemedyKind] = useState<string>(row.remedyKind || "none");
  const [remedyText, setRemedyText] = useState(row.remedyText);
  const [remedyDue, setRemedyDue] = useState(row.remedyDue);
  const [consequence, setConsequence] = useState<string>(row.consequence || "none");
  const [note, setNote] = useState(row.decisionNote);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!row.finding);

  if (row.status === "closed") {
    return row.finding ? <DecisionSummary row={row} /> : null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const ok = await onRun(() =>
        decideCaseFn({
          data: { caseId: row.id, finding, remedyKind, remedyText, remedyDue, consequence, note },
        }),
      );
      if (ok) setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3 className="font-display text-lg">Decision</h3>
      {row.finding ? <DecisionSummary row={row} /> : null}
      {!open ? (
        <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
          Change the decision
        </Button>
      ) : (
        <form className="mt-2 grid gap-3" onSubmit={(event) => void onSubmit(event)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`finding-${row.id}`}>Finding</Label>
              <select
                id={`finding-${row.id}`}
                className={SELECT_CLASS}
                value={finding}
                onChange={(event) => {
                  setFinding(event.target.value);
                  if (event.target.value === "not_at_fault") {
                    setRemedyKind("none");
                    setConsequence("none");
                  }
                }}
                required
              >
                <option value="">Choose</option>
                {FINDINGS.map((value) => (
                  <option key={value} value={value}>
                    {FINDING_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`consequence-${row.id}`}>Standing consequence</Label>
              <select
                id={`consequence-${row.id}`}
                className={SELECT_CLASS}
                value={consequence}
                disabled={finding === "not_at_fault"}
                onChange={(event) => setConsequence(event.target.value)}
              >
                {CONSEQUENCES.map((value) => (
                  <option key={value} value={value}>
                    {CONSEQUENCE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`remedy-${row.id}`}>Remedy owed</Label>
              <select
                id={`remedy-${row.id}`}
                className={SELECT_CLASS}
                value={remedyKind}
                disabled={finding === "not_at_fault"}
                onChange={(event) => setRemedyKind(event.target.value)}
              >
                {REMEDY_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {REMEDY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`due-${row.id}`}>Remedy due by</Label>
              <Input
                id={`due-${row.id}`}
                type="date"
                value={remedyDue}
                disabled={remedyKind === "none"}
                onChange={(event) => setRemedyDue(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`remedy-text-${row.id}`}>The remedy, in words</Label>
            <Input
              id={`remedy-text-${row.id}`}
              value={remedyText}
              disabled={remedyKind === "none"}
              placeholder="Replace the two failed speakers and re-tune the system"
              onChange={(event) => setRemedyText(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`reasons-${row.id}`}>Reasons (sent to the church)</Label>
            <Textarea
              id={`reasons-${row.id}`}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <p className="text-xs text-subtle">
            Suspension pauses the vendor (no invitations, prices off the catalogs). Revocation
            removes it. Probation shows on the desk; a probation vendor is invited only when you
            tick it.
          </p>
          <div>
            <Button type="submit" disabled={busy || !finding}>
              {busy ? "Saving…" : "Record the decision"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function DecisionSummary({ row }: { row: CaseRow }) {
  if (!row.finding) return null;
  return (
    <div className="mt-1 grid gap-1 text-sm text-ink">
      <p>{FINDING_LABELS[row.finding]}</p>
      <p>
        Remedy:{" "}
        {describeRemedy({
          remedyKind: row.remedyKind || "none",
          remedyText: row.remedyText,
          remedyDue: row.remedyDue,
        })}
      </p>
      <p>Standing: {CONSEQUENCE_LABELS[row.consequence || "none"]}</p>
      {row.decisionNote ? (
        <p className="whitespace-pre-line text-muted">{row.decisionNote}</p>
      ) : null}
      <p className="text-xs text-subtle">Decided {when(row.decidedAt)}</p>
    </div>
  );
}

function FollowThrough({
  row,
  vendorConsequence,
  onRun,
}: {
  row: CaseRow;
  vendorConsequence: (typeof CONSEQUENCES)[number];
  onRun: Run;
}) {
  const [busy, setBusy] = useState(false);
  async function run(work: () => Promise<DeskView>) {
    setBusy(true);
    try {
      await onRun(work);
    } finally {
      setBusy(false);
    }
  }
  const owes = row.remedyKind && row.remedyKind !== "none";
  const levels = CONSEQUENCES as readonly string[];
  const from = levels[
    Math.max(levels.indexOf(row.consequence || "none"), levels.indexOf(vendorConsequence))
  ] as (typeof CONSEQUENCES)[number];
  const next = row.finding !== "not_at_fault" ? nextConsequence(from) : null;

  return (
    <div>
      <h3 className="font-display text-lg">Follow-through</h3>
      {owes ? (
        <p
          className={cn("mt-1 text-sm", row.remedyOverdue ? "font-medium text-ink" : "text-muted")}
        >
          {row.remedyStatus === "done"
            ? `Remedy done ${when(row.remedyMarkedAt)}.`
            : row.remedyStatus === "not_done"
              ? "Remedy marked not done."
              : row.remedyOverdue
                ? `Remedy overdue: it was due by ${row.remedyDue}.`
                : `Remedy pending, due by ${row.remedyDue}.`}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">No remedy owed.</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {owes && row.status !== "closed" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || row.remedyStatus === "done"}
              onClick={() => void run(() => markRemedyFn({ data: { caseId: row.id, done: true } }))}
            >
              Mark remedy done
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || row.remedyStatus === "not_done"}
              onClick={() =>
                void run(() => markRemedyFn({ data: { caseId: row.id, done: false } }))
              }
            >
              Mark not done
            </Button>
          </>
        ) : null}
        {next && row.status !== "closed" ? (
          <Button
            type="button"
            variant={row.remedyOverdue ? "primary" : "ghost"}
            disabled={busy}
            onClick={() => void run(() => escalateCaseFn({ data: { caseId: row.id } }))}
          >
            Escalate to {CONSEQUENCE_LABELS[next].toLowerCase()}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** The reusable list of people who can mediate. */
function CommitteePanel({ desk, onRun }: { desk: DeskView; onRun: Run }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const ok = await onRun(() => addCommitteePersonFn({ data: { name, email } }));
      if (ok) {
        setName("");
        setEmail("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 border-t border-rule pt-4">
      <h3 className="font-display text-lg">Committee list</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        People you can choose to mediate a case. Choose some per case; each gets a private link.
      </p>
      {desk.committee.length ? (
        <ul className="mt-2 grid gap-1 text-sm">
          {desk.committee.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2">
              <span className={cn(!p.active && "text-subtle line-through")}>
                {p.name} · {p.email}
              </span>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void onRun(() =>
                    setCommitteeActiveFn({ data: { personId: p.id, active: !p.active } }),
                  )
                }
              >
                {p.active ? "Retire" : "Restore"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        onSubmit={(event) => void onSubmit(event)}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="committee-name">Name</Label>
          <Input
            id="committee-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="committee-email">Email</Label>
          <Input
            id="committee-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="secondary" disabled={busy}>
          Add to the list
        </Button>
      </form>
    </div>
  );
}
