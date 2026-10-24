import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  previewSourceInvites,
  sendSourceInvites,
  updateSourceVendor,
  type DeskView,
  type SendInvitesResult,
  type SourceBid,
  type VendorRow,
} from "@/lib/source-actions";
import {
  describeArea,
  describeCategories,
  matchVendors,
  vendorCategoryOptions,
} from "@/lib/vendor-store";
import { cn } from "@/lib/utils";

type Run = (work: () => Promise<DeskView>) => Promise<boolean>;

const STATUS_ORDER: Record<string, number> = { pending: 0, approved: 1, paused: 2, removed: 3 };

/** The desk's vendor list: sign-ups to approve, pause, or remove, and edit. */
export function VendorsSection({ desk, onRun }: { desk: DeskView; onRun: Run }) {
  const [showRemoved, setShowRemoved] = useState(false);
  const vendors = [...desk.vendors]
    .filter((vendor) => showRemoved || vendor.status !== "removed")
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  const pending = desk.vendors.filter((vendor) => vendor.status === "pending").length;
  const approved = desk.vendors.filter((vendor) => vendor.status === "approved").length;

  return (
    <section className="mt-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
      <h2 className="font-display text-xl">Vendors</h2>
      {!desk.vendorsReady ? (
        <p className="mt-2 text-sm text-muted">
          The vendor tables are not in the database yet. Apply migrations/0007_source_vendors.sql,
          then reload.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {desk.vendors.length === 0
              ? "No vendor sign-ups yet. Vendors sign up at /buying/vendors."
              : `${approved} approved, ${pending} waiting for review. Only approved vendors get invitations.`}
          </p>
          <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-forest)]"
              checked={showRemoved}
              onChange={(event) => setShowRemoved(event.target.checked)}
            />
            Show removed vendors
          </label>
          <ul className="mt-3 grid gap-3">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} onRun={onRun} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function VendorCard({ vendor, onRun }: { vendor: VendorRow; onRun: Run }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function setStatus(status: string) {
    setBusy(true);
    try {
      await onRun(() => updateSourceVendor({ data: { vendorId: vendor.id, status } }));
    } finally {
      setBusy(false);
    }
  }

  const actions: { status: string; label: string }[] = [
    ...(vendor.status !== "approved" ? [{ status: "approved", label: "Approve" }] : []),
    ...(vendor.status === "approved" ? [{ status: "paused", label: "Pause" }] : []),
    ...(vendor.status !== "removed" ? [{ status: "removed", label: "Remove" }] : []),
  ];

  return (
    <li className="rounded-lg bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{vendor.company}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-subtle">{vendor.status}</p>
          <p className="mt-1 text-sm text-muted">
            {vendor.contactName} · {vendor.email} · {vendor.phone}
            {vendor.website ? (
              <>
                {" · "}
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  {vendor.website.replace(/^https?:\/\//, "")}
                </a>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-sm text-muted">
            Area: {describeArea(vendor)} · General liability insurance:{" "}
            {vendor.insured ? "yes" : "no"}
          </p>
          <p className="mt-1 text-sm text-muted">
            Serves: {describeCategories(vendor.categories).join("; ")}
          </p>
          {vendor.notes ? <p className="mt-1 text-sm text-muted">Notes: {vendor.notes}</p> : null}
          <p className="mt-1 text-xs text-subtle">
            Agreed to Vendor Terms {vendor.termsVersion} on{" "}
            {vendor.termsAcceptedAt.slice(0, 16).replace("T", " ")} UTC
            {vendor.termsIp ? ` from ${vendor.termsIp}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.status}
              type="button"
              variant={action.status === "approved" ? "primary" : "secondary"}
              disabled={busy}
              onClick={() => void setStatus(action.status)}
            >
              {action.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setEditing((on) => !on)}
          >
            {editing ? "Close" : "Edit"}
          </Button>
        </div>
      </div>
      {editing ? (
        <VendorEditor vendor={vendor} onRun={onRun} onDone={() => setEditing(false)} />
      ) : null}
    </li>
  );
}

function VendorEditor({
  vendor,
  onRun,
  onDone,
}: {
  vendor: VendorRow;
  onRun: Run;
  onDone: () => void;
}) {
  const [picked, setPicked] = useState(new Set(vendor.categories));
  const [nationwide, setNationwide] = useState(vendor.nationwide);
  const [states, setStates] = useState(vendor.states.join(", "));
  const [places, setPlaces] = useState(vendor.places.join(", "));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const ok = await onRun(() =>
        updateSourceVendor({
          data: {
            vendorId: vendor.id,
            categories: [...picked],
            nationwide,
            states: nationwide ? [] : states.split(/[\s,;]+/).filter(Boolean),
            places: nationwide ? "" : places,
          },
        }),
      );
      if (ok) onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 grid gap-4 border-t border-rule pt-4">
      <div className="grid gap-2">
        <p className="text-sm font-medium">Categories</p>
        {vendorCategoryOptions().map(({ category, subcategories }) => (
          <details key={category.id} className="rounded-md bg-cream px-3 py-1">
            <summary className="min-h-11 cursor-pointer py-2 text-sm">
              {category.name}
              <span className="text-muted">
                {" "}
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
                    onChange={(event) =>
                      setPicked((set) => {
                        const next = new Set(set);
                        if (event.target.checked) next.add(key);
                        else next.delete(key);
                        return next;
                      })
                    }
                  />
                  {sub.name}
                </label>
              ))}
            </div>
          </details>
        ))}
      </div>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`states-${vendor.id}`}>States (codes)</Label>
            <Input
              id={`states-${vendor.id}`}
              value={states}
              onChange={(event) => setStates(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`places-${vendor.id}`}>Cities or ZIP codes</Label>
            <Textarea
              id={`places-${vendor.id}`}
              rows={2}
              value={places}
              onChange={(event) => setPlaces(event.target.value)}
            />
          </div>
        </div>
      )}
      <div>
        <Button type="button" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save vendor"}
        </Button>
      </div>
    </div>
  );
}

type Preview = Awaited<ReturnType<typeof previewSourceInvites>>;

/**
 * Invitations for one bid: the approved vendors that match, a preview of the
 * exact email, and Send. Nothing goes out until Send is pressed.
 */
export function InvitePanel({ bid, desk, onRun }: { bid: SourceBid; desk: DeskView; onRun: Run }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SendInvitesResult | null>(null);

  const invites = desk.invites.filter((invite) => invite.bidId === bid.id);
  const sentTo = new Set(
    invites.filter((invite) => invite.emailStatus === "sent").map((invite) => invite.vendorId),
  );
  const matches = matchVendors(desk.vendors, bid);
  const name = (vendorId: string) =>
    desk.vendors.find((vendor) => vendor.id === vendorId)?.company ?? "Vendor";

  async function openPreview() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const next = await previewSourceInvites({ data: { bidId: bid.id } });
      setPreview(next);
      setChosen(
        new Set(next.vendors.filter((vendor) => !vendor.invited).map((vendor) => vendor.id)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "The preview did not load.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    try {
      let sent: SendInvitesResult | null = null;
      const ok = await onRun(async () => {
        const out = await sendSourceInvites({ data: { bidId: bid.id, vendorIds: [...chosen] } });
        sent = out.result;
        return out.desk;
      });
      if (ok) {
        setResult(sent);
        setPreview(null);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h3 className="font-display text-xl">Invite vendors</h3>
      {!desk.vendorsReady ? (
        <p className="mt-2 text-sm text-muted">
          Apply migrations/0007_source_vendors.sql to invite vendors.
        </p>
      ) : bid.status !== "open" ? (
        <p className="mt-2 text-sm text-muted">This bid is closed. Reopen it to invite vendors.</p>
      ) : !bid.category ? (
        <p className="mt-2 text-sm text-muted">
          This bid has no category, so no vendors match it. Open bids from a template to tag them.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {matches.length === 0
              ? "No approved vendor serves this category and area yet."
              : `${matches.length} approved ${matches.length === 1 ? "vendor matches" : "vendors match"} this bid's category and area: ${matches.map((vendor) => `${vendor.company}${sentTo.has(vendor.id) ? " (invited)" : ""}`).join(", ")}.`}
          </p>
          {matches.length ? (
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void openPreview()}
              >
                Preview invitation
              </Button>
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <p className="mt-2 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-4 grid gap-3 rounded-lg bg-cream p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm font-medium">Send to</p>
          <ul className="grid gap-1">
            {preview.vendors.map((vendor) => (
              <li key={vendor.id}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-forest)]"
                    disabled={vendor.invited || busy}
                    checked={!vendor.invited && chosen.has(vendor.id)}
                    onChange={(event) =>
                      setChosen((set) => {
                        const next = new Set(set);
                        if (event.target.checked) next.add(vendor.id);
                        else next.delete(vendor.id);
                        return next;
                      })
                    }
                  />
                  {vendor.company} · {vendor.email}
                  {vendor.invited ? " · already invited" : ""}
                </label>
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium">Subject: {preview.email.subject}</p>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 text-sm text-ink shadow-[var(--shadow-border)]">
            {preview.email.text}
          </pre>
          <p className="text-xs text-subtle">
            Each vendor gets its own private link and its own greeting. Nothing is sent until you
            press Send.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || chosen.size === 0} onClick={() => void send()}>
              {busy
                ? "Sending…"
                : `Send to ${chosen.size} ${chosen.size === 1 ? "vendor" : "vendors"}`}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {result ? (
        <p className="mt-3 text-sm text-ink" role="status">
          Sent {result.sent.length}.
          {result.failed.length
            ? ` Not sent: ${result.failed.map((row) => `${name(row.vendorId)} (${row.error})`).join(", ")}.`
            : ""}
          {result.skipped.length
            ? ` Skipped: ${result.skipped.map((row) => `${name(row.vendorId)} (${row.reason})`).join(", ")}.`
            : ""}
        </p>
      ) : null}

      {invites.length ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Invitation log</p>
          <ul className="mt-1 grid gap-1 text-sm text-muted">
            {invites.map((invite) => (
              <li key={invite.id} className={cn(invite.emailStatus === "failed" && "text-ink")}>
                {name(invite.vendorId)} · {invite.email} · {invite.emailStatus}
                {invite.emailError ? ` (${invite.emailError})` : ""} ·{" "}
                {invite.sentAt.slice(0, 16).replace("T", " ")} UTC
                {invite.openedAt ? " · opened" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
