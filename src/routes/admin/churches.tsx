import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listMemberChurchesForDesk } from "@/lib/membership-actions";
import type { MemberChurch } from "@/lib/membership-store";

export const Route = createFileRoute("/admin/churches")({
  component: ChurchesPage,
  head: () => ({
    meta: [{ title: "Member churches — Desk" }],
  }),
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Started, not paid",
  active: "Member",
  past_due: "Past due",
  canceled: "Canceled",
};

function ChurchesPage() {
  const [rows, setRows] = useState<MemberChurch[] | null>(null);
  const [ready, setReady] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void listMemberChurchesForDesk()
      .then((result) => {
        setRows(result.churches);
        setReady(result.ready);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load member churches."));
  }, []);

  const active = rows?.filter((row) => row.status === "active").length ?? 0;

  return (
    <div>
      <h1 className="font-display text-3xl">Member churches</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Churches that started or finished membership. Status comes from Stripe webhooks; payments
        themselves live in Stripe and on the owner dashboard.
      </p>
      {error ? (
        <p className="mt-6 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      {!ready ? <p className="mt-6 text-sm text-muted">The membership tables are not set up yet.</p> : null}
      {rows === null && !error ? <div className="mt-8 h-24 animate-pulse rounded-xl bg-cream" /> : null}
      {rows && rows.length === 0 ? <p className="mt-8 text-muted">No member churches yet.</p> : null}
      {rows && rows.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-ink">{active} active</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-rule text-xs tracking-[0.14em] text-subtle uppercase">
                  <th className="py-3 pr-4 font-semibold">Church</th>
                  <th className="py-3 pr-4 font-semibold">Contact</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 font-semibold">Paid through</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-b border-rule/70">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{row.churchName || "—"}</div>
                      <div className="text-xs text-subtle">
                        {[row.city, row.state].filter(Boolean).join(", ")}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {row.contactName}
                      <div className="text-xs">{[row.email, row.phone].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="py-3 pr-4">{STATUS_LABEL[row.status] ?? row.status}</td>
                    <td className="py-3 text-muted">
                      {row.currentPeriodEnd ? row.currentPeriodEnd.slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
