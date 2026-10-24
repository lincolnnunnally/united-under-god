import type { ChurchMarket } from "./church-market.ts";
import { FEES, VENDOR_TERMS_PATH, type FeeConfig } from "./vendor-terms.ts";

/**
 * Words for /buying/sell-to-churches, the vendor recruitment page. Rates come
 * from the fee config in vendor-terms.ts, never typed by hand.
 *
 * Copy rules (scripts/sell-to-churches.test.mjs checks them):
 * - The church count is churches listed in our church directory. They have not
 *   signed up and are not obliged to buy; never call them members or customers.
 * - No promise of sales, revenue, or a number of leads.
 * - No "AI", and no installer or vendor named.
 *
 * Imported by node's test runner: relative imports, no framework code.
 */

export const SELL_PATH = "/buying/sell-to-churches";
export const SIGNUP_PATH = "/buying/vendors";

export const SELL_TITLE = "Sell to churches: the church vendor program | United Under God";

export const SELL_DESCRIPTION =
  "Become a church supplier. Get invited to group bids from churches in your area, quote online in minutes, and pay a small fee only when a church pays you.";

export type Reason = { title: string; body: string };
export type Step = { title: string; body: string };
export type Faq = { q: string; a: string };

export function percent(n: number): string {
  return `${n}%`;
}

/** Why partner: the pitch, with the rates read from the config. */
export function reasons(config: FeeConfig = FEES): Reason[] {
  return [
    {
      title: "Churches come to you",
      body: "Churches in the program pool what they need into group bids. When a bid matches what you supply and where you serve, the invitation comes to you. No cold calling.",
    },
    {
      title: "One bid, many churches",
      body: "A group bid can carry the needs of several churches at once, so one good quote can put your company in front of all of them.",
    },
    {
      title: "Quote online in minutes",
      body: "Each invitation is a private link. Open it, see the line items, and send your prices from any phone or computer. No portal to learn.",
    },
    {
      title: "Your invoice, your relationship",
      body: "Churches buy directly from you, on your invoice, and pay you directly. We never sit between you and your payment.",
    },
    {
      title: "Pay only when you are paid",
      body: `There is no sign-up fee and no monthly fee. You pay ${percent(config.rebate.percent)} on catalog and recurring sales and ${percent(config.referral.percent)} on referred projects, due ${config.dueDays} days after the church pays you.`,
    },
    {
      title: "A mission partner",
      body: "United Under God is a 501(c)(3) nonprofit. The fees vendors pay fund the buying program and its service to churches, so your work keeps helping after the sale.",
    },
    {
      title: "Standing that is earned",
      body: "Partner standing is for vendors who stand behind their work. Vendors in the program make a covenant to make it right when something goes wrong.",
    },
    {
      title: "Bids that fit you",
      body: "Pick the categories you supply and the states you serve. You are only invited to bids that match, and you never have to accept a job.",
    },
  ];
}

export const STEPS: Step[] = [
  {
    title: "Sign up",
    body: "Tell us what you supply and where you serve. Signing up costs nothing.",
  },
  {
    title: "Get approved",
    body: "We review each company before its first invitation, so churches can trust who they hear from.",
  },
  {
    title: "Receive bid invitations",
    body: "When a bid opens in your catalogs and your area, you get an email with a private link to quote online.",
  },
  {
    title: "Win and serve churches",
    body: "Churches that choose your quote buy directly from you. Do good work, report your program sales, and build standing.",
  },
];

/** The FAQ, shown on the page and mirrored exactly in FAQPage JSON-LD. */
export function sellFaq(
  market: Pick<ChurchMarket, "states"> | null,
  program: { catalogs: number },
  config: FeeConfig = FEES,
): Faq[] {
  const listed = market?.states.map((row) => row.name) ?? [];
  const where = listed.length
    ? `Our church directory today lists churches in ${joinNames(listed)}. `
    : "";
  return [
    {
      q: "What does it cost?",
      a: `Signing up is free, and there is no monthly fee. On sales made through the program you pay a ${percent(config.rebate.percent)} rebate on catalog items and recurring service contracts, and a ${percent(config.referral.percent)} referral fee on project and referral jobs from churches introduced to you. The full rules are in the Vendor Terms.`,
    },
    {
      q: "When do I pay?",
      a: `Only after a church pays you. You report program sales and closed jobs ${config.reporting}, including months with none, and each fee is due ${config.dueDays} days after you are paid.`,
    },
    {
      q: "Do churches have to buy from me?",
      a: "No. Every church chooses freely, and a church never has to buy from you. Signing up gets you invited to bids that match you; it does not promise any sale. You never have to accept a job either.",
    },
    {
      q: "Which areas?",
      a: `${where}You choose the states you serve when you sign up, or nationwide if you ship anywhere. You are invited only to bids in your area.`,
    },
    {
      q: "What categories?",
      a: `There are ${program.catalogs} buying catalogs, from office supplies and janitorial service to facilities, grounds, technology, and seasonal needs. You pick every category and subcategory you supply. Insurance, benefits, banking and loans, payroll and payroll tax, and audit and tax preparation are handled separately through licensed or qualified providers.`,
    },
  ];
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** The plain market line under the big number. Counts directory listings only. */
export function marketLine(market: Pick<ChurchMarket, "states">): string {
  const n = market.states.length;
  return `Churches listed in our church directory across ${n} ${n === 1 ? "state" : "states"}. A listing is not a sign-up or a promise to buy. It shows how many churches are in the area you serve.`;
}

export const TERMS_PATH = VENDOR_TERMS_PATH;
