import type { Sql } from "./db.ts";
import { CAMPAIGNS, type Campaign } from "./campaigns.ts";
import { NEED_STATUSES, NEED_STATUS_LABELS, type NeedStatus } from "./church-needs.ts";
import { describeArea, listVendors, matchVendors } from "./vendor-store.ts";

/**
 * The staff desk's Campaigns page (/admin/campaigns): for each campaign, who
 * is ready to bid, how many churches have asked, and where each request is
 * in the need flow. Numbers come from the database only; the email's sends,
 * opens and clicks live in ChurchConnect's outreach, which sends it.
 *
 * Imported by node's test runner: relative imports, no framework code.
 */

export type CampaignBidder = { id: string; company: string; area: string; insured: boolean };

export type CampaignRequest = {
  id: string;
  churchName: string;
  contactName: string;
  city: string;
  state: string;
  title: string;
  status: NeedStatus;
  statusLabel: string;
  bidTitle: string;
  createdAt: string;
};

export type CampaignView = Omit<Campaign, "confirmation"> & {
  bidders: CampaignBidder[];
  /** True when at least as many approved suppliers serve it as the page promises. */
  biddersReady: boolean;
  counts: Record<NeedStatus, number>;
  total: number;
  last7Days: number;
  requests: CampaignRequest[];
};

function text(value: unknown) {
  return String(value ?? "");
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : text(value);
}

function asStatus(value: unknown): NeedStatus {
  const status = text(value);
  return (NEED_STATUSES as readonly string[]).includes(status) ? (status as NeedStatus) : "new";
}

export async function readCampaignDesk(sql: Sql, now = new Date()): Promise<CampaignView[]> {
  const vendors = await listVendors(sql);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
  const views: CampaignView[] = [];
  for (const campaign of CAMPAIGNS) {
    const { confirmation: _confirmation, ...shown } = campaign;
    const bidders = matchVendors(vendors, {
      category: campaign.bid.category,
      subcategory: campaign.bid.subcategory,
      area: campaign.states.join(", "),
    }).map((vendor) => ({
      id: vendor.id,
      company: vendor.company,
      area: describeArea(vendor),
      insured: vendor.insured,
    }));
    const rows = await sql`
      select n.id, n.church_name, n.contact_name, n.city, n.state, n.title, n.status, n.created_at,
        coalesce(r.title, '') as bid_title
      from source_church_needs n
      left join source_bid_requests r on r.id = n.bid_id
      where n.campaign = ${campaign.slug}
      order by n.created_at desc
    `;
    const counts = Object.fromEntries(NEED_STATUSES.map((status) => [status, 0])) as Record<
      NeedStatus,
      number
    >;
    const requests = rows.map((row) => {
      const status = asStatus(row.status);
      counts[status] += 1;
      return {
        id: text(row.id),
        churchName: text(row.church_name),
        contactName: text(row.contact_name),
        city: text(row.city),
        state: text(row.state),
        title: text(row.title),
        status,
        statusLabel: NEED_STATUS_LABELS[status],
        bidTitle: text(row.bid_title),
        createdAt: iso(row.created_at),
      };
    });
    views.push({
      ...shown,
      bidders,
      biddersReady: bidders.length >= campaign.biddersWanted,
      counts,
      total: requests.length,
      last7Days: requests.filter((r) => new Date(r.createdAt).getTime() >= weekAgo).length,
      requests: requests.slice(0, 50),
    });
  }
  return views;
}
