import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listMembers, type MemberListRow } from "@/lib/member-actions";

export const Route = createFileRoute("/admin/members")({
  component: MembersPage,
  head: () => ({
    meta: [{ title: "Members — Desk" }],
  }),
});

function stands(row: MemberListRow) {
  const labels = [
    row.wantsSeal ? "Seal" : "",
    row.wantsBuying ? "Buying" : "",
    row.wantsMission ? "Mission" : "",
    row.wantsVolunteer ? "Hands" : "",
  ].filter(Boolean);
  return labels.join(" · ") || "—";
}

function MembersPage() {
  const [rows, setRows] = useState<MemberListRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void listMembers()
      .then(setRows)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load members.");
      });
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl">Members</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        People and organizations who created an account on this site. Pantry
        neighbors live on Plenty.
      </p>
      {error ? (
        <p className="mt-6 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 && !error ? (
        <p className="mt-8 text-muted">No members yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-rule text-xs tracking-[0.14em] text-subtle uppercase">
                <th className="py-3 pr-4 font-semibold">Name</th>
                <th className="py-3 pr-4 font-semibold">Organization</th>
                <th className="py-3 pr-4 font-semibold">Standing in</th>
                <th className="py-3 font-semibold">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b border-rule/70">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{row.name || "—"}</div>
                    <div className="text-xs text-subtle">
                      {[row.orgType, row.city].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted">{row.organization || "—"}</td>
                  <td className="py-3 pr-4">{stands(row)}</td>
                  <td className="py-3 text-muted">{row.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
