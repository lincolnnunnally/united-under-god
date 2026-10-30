import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { readCampaignsDeskFn, type CampaignView } from "@/lib/campaign-actions";
import { NEED_STATUSES, NEED_STATUS_LABELS } from "@/lib/church-needs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/campaigns")({
  component: CampaignsPage,
  head: () => ({
    meta: [{ title: "Campaigns — Desk" }],
  }),
});

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignView[] | null>(null);
  const [ready, setReady] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void readCampaignsDeskFn()
      .then((result) => {
        setCampaigns(result.campaigns);
        setReady(result.ready);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load campaigns."));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl">Campaigns</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        One offer, the email that tells churches about it, the page they land on, and every church
        that asked. Requests run through Needs on the SOURCE desk: start the bid there, send the
        quotes, and the church chooses on its private page.
      </p>
      {error ? (
        <p className="mt-6 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}
      {!ready ? (
        <p className="mt-6 text-sm text-muted">
          The campaign column is not set up yet. It arrives with the next build.
        </p>
      ) : null}
      {campaigns === null && !error ? <div className="mt-8 h-40 animate-pulse rounded-xl bg-cream" /> : null}
      {campaigns?.map((campaign) => (
        <CampaignCard key={campaign.slug} campaign={campaign} />
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "warn" }) {
  return (
    <div className="rounded-lg bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
      <p className="text-xs tracking-[0.14em] text-subtle uppercase">{label}</p>
      <p className={cn("mt-1 font-display text-2xl", tone === "warn" ? "text-mission-ink" : "text-ink")}>
        {value}
      </p>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignView }) {
  const chosen = campaign.counts.chosen;
  return (
    <section className="mt-8 rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs tracking-[0.14em] text-subtle uppercase">
            Started {campaign.startedOn} · {campaign.region}
          </p>
          <h2 className="mt-1 font-display text-2xl">{campaign.name}</h2>
          <p className="mt-2 text-sm text-muted">{campaign.short}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={campaign.landingPath}
            target="_blank"
            rel="noreferrer"
            className="min-h-11 rounded-md bg-forest px-3 py-2 text-sm text-paper hover:bg-forest-deep"
          >
            Open the page
          </a>
          <Link
            to="/buying/desk"
            className="min-h-11 rounded-md px-3 py-2 text-sm text-ink shadow-[var(--shadow-border)]"
          >
            Needs on SOURCE
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Churches asked" value={campaign.total} />
        <Stat label="Last 7 days" value={campaign.last7Days} />
        <Stat
          label="Ready to bid"
          value={`${campaign.bidders.length} of ${campaign.biddersWanted}`}
          tone={campaign.biddersReady ? undefined : "warn"}
        />
        <Stat label="Bid chosen" value={chosen} />
      </div>

      <h3 className="mt-8 font-display text-xl">Where the requests are</h3>
      <ol className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        {NEED_STATUSES.map((status) => (
          <li key={status} className="rounded-lg bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
            <p className="text-xs text-subtle">{NEED_STATUS_LABELS[status]}</p>
            <p className="mt-1 font-display text-xl">{campaign.counts[status]}</p>
          </li>
        ))}
      </ol>

      <h3 className="mt-8 font-display text-xl">The companies ready to bid</h3>
      {!campaign.biddersReady ? (
        <p className="mt-2 max-w-2xl text-sm text-mission-ink" role="alert">
          The page promises {campaign.biddersWanted} companies. Only {campaign.bidders.length}{" "}
          approved {campaign.bidders.length === 1 ? "company serves" : "companies serve"} this
          work in {campaign.states.join(", ")}. Approve or add them on SOURCE → Vendors (category
          Audio-visual: systems) so the requests that come in can be bid out.
        </p>
      ) : null}
      {campaign.bidders.length ? (
        <ul
          className={cn(
            "mt-3 grid gap-3",
            // Three across only when there are exactly three; never orphan a card.
            campaign.bidders.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2",
          )}
        >
          {campaign.bidders.map((bidder) => (
            <li key={bidder.id} className="rounded-lg bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
              <p className="font-medium">{bidder.company}</p>
              <p className="text-sm text-muted">
                {bidder.area}
                {bidder.insured ? " · insured" : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <h3 className="mt-8 font-display text-xl">The emails</h3>
      <ol className="mt-3 grid gap-3">
        {campaign.emails.map((email, i) => (
          <li key={email.subject} className="rounded-lg bg-paper px-4 py-3 shadow-[var(--shadow-border)]">
            <p className="text-xs text-subtle">
              {i + 1}. {email.when} · {email.sentBy}
            </p>
            <p className="mt-1 font-medium">{email.subject}</p>
            {email.subjectB ? <p className="text-sm text-muted">B: {email.subjectB}</p> : null}
            <p className="mt-1 text-sm text-muted">{email.purpose}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        The first email goes out from ChurchConnect’s outreach as “{campaign.outreach.key}”,
        starting at {campaign.outreach.startDaily} a weekday. Its sends, opens, clicks, and the A/B
        result are in ChurchConnect’s outreach results; raise its number there when it clearly works.
      </p>

      <h3 className="mt-8 font-display text-xl">Churches that asked</h3>
      {campaign.requests.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No requests yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="border-b border-rule text-xs tracking-[0.14em] text-subtle uppercase">
                <th className="py-3 pr-4 font-semibold">Church</th>
                <th className="py-3 pr-4 font-semibold">Place</th>
                <th className="py-3 pr-4 font-semibold">Asked for</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Asked</th>
              </tr>
            </thead>
            <tbody>
              {campaign.requests.map((row) => (
                <tr key={row.id} className="border-b border-rule align-top">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{row.churchName}</p>
                    <p className="text-muted">{row.contactName}</p>
                  </td>
                  <td className="py-3 pr-4">
                    {row.city}, {row.state}
                  </td>
                  <td className="py-3 pr-4">{row.title}</td>
                  <td className="py-3 pr-4">
                    {row.statusLabel}
                    {row.bidTitle ? <p className="text-muted">{row.bidTitle}</p> : null}
                  </td>
                  <td className="py-3 pr-4">{row.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
