import { MEMBER_PRICE_LABEL, MEMBERSHIP_FREE } from "./membership.ts";

/**
 * What United Under God does for a church, charity, ministry, or Christian-owned business,
 * in plain words, and which sign-up is for whom. Owner (2026-11-25): churches and charities
 * do not understand what the benefit is of working with us, or what we offer. Shown on the
 * home page (doors and a short list) and in full on /organizations.
 *
 * Every line restates what the page it links to already promises. Change the page and this
 * together; never promise a discount, an amount, or a turnaround here.
 */

export const SANCTUARY_AVL_URL = "https://sanctuaryavl.unitedundergod.org/";

export type Door = {
  id: "church" | "organization" | "vendor" | "helper";
  who: string;
  promise: string;
  to: string;
  cta: string;
};

/** The four doors under the home page's opening: who you are, and the one page for you. */
export const DOORS: readonly Door[] = [
  {
    id: "church",
    who: "A church",
    promise: "Pay less for what you buy, get a church website, and stand with other pastors.",
    to: "/membership",
    cta: "For churches",
  },
  {
    id: "organization",
    who: "A charity, ministry, or Christian business",
    promise: "Get things quoted, share tools and volunteers, and turn surplus into gifts.",
    to: "/organizations",
    cta: "For organizations",
  },
  {
    id: "vendor",
    who: "A vendor or partner",
    promise: "Quote on what churches need, without cold calls. You pay only when you are paid.",
    to: "/buying/sell-to-churches",
    cta: "For vendors",
  },
  {
    id: "helper",
    who: "Someone who wants to help",
    promise: "Serve a neighbor this week, or give your time, money, or goods.",
    to: "/mission",
    cta: "Find a way to help",
  },
] as const;

export type Offer = {
  id: string;
  title: string;
  body: string;
  /** Who it is for, in a few words. */
  forWho: string;
  to: string;
  cta: string;
  /** An address on another site. */
  external?: boolean;
};

/** What we do for you. The first two are the practical reasons most organizations come. */
export const OFFERS: readonly Offer[] = [
  {
    id: "buying",
    title: "Pay less for what you already buy",
    body: "We ask vendors to bid for the whole group on toner, paper, software, and supplies, then show members the awarded price and the vendor. The smallest church sees the same price as the largest.",
    forWho: "Churches, charities, and Christian-owned businesses",
    to: "/buying",
    cta: "See group buying",
  },
  {
    id: "need",
    title: "Get anything quoted, without the sales calls",
    body: "Tell us what you need. Suppliers compete for it and never see who you are. When several members need something similar, it goes out as one larger bid. You choose a quote, or none.",
    forWho: "Any church, ministry, or Christian-owned business",
    to: "/buying/need",
    cta: "Post a need",
  },
  {
    id: "website",
    title: "A website for your church",
    body: "Member churches get a church website on a unitedundergod.org address, built for them as part of membership.",
    forWho: "Member churches",
    to: "/membership",
    cta: "About membership",
  },
  {
    id: "tools",
    title: "Tools that work together",
    body: "Church management, websites, food pantry and donation tools, and printer monitoring, built to share information so you enter it once and spend less time on admin.",
    forWho: "Churches, charities, and businesses",
    to: "/apps",
    cta: "See the tools",
  },
  {
    id: "av",
    title: "Every word heard on Sunday",
    body: "Sound, livestream, and lighting planned and installed for your sanctuary, with your volunteers trained to run it.",
    forWho: "Churches",
    to: SANCTUARY_AVL_URL,
    cta: "Talk with us about your sanctuary",
    external: true,
  },
  {
    id: "outreach",
    title: "Outreach your people will join",
    body: "Live on Mission gives your congregation simple, real ways to serve neighbors this week, and we help you plan it.",
    forWho: "Churches and ministries",
    to: "/mission",
    cta: "Live on Mission",
  },
  {
    id: "surplus",
    title: "Surplus that becomes supply",
    body: "Grocers, restaurants, and farms that donate unsold food may deduct up to twice as much as throwing it away. Sign up once and we pick it up.",
    forWho: "Businesses",
    to: "/food-donors",
    cta: "See what you could deduct",
  },
  {
    id: "together",
    title: "You do not do it alone",
    body: "Member churches are invited to pastor fellowship, and when a vendor falls short, a problem resolution process stands with you.",
    forWho: "Member churches",
    to: "/membership",
    cta: "What members receive",
  },
] as const;

/** The question every pastor asks next: what does it cost, and who pays for this? */
export const WHAT_IT_COSTS: readonly string[] = [
  MEMBERSHIP_FREE
    ? "The seal and membership are free, with no contract. Tell us any time and we take you off the list."
    : `The seal is free. Membership is ${MEMBER_PRICE_LABEL.toLowerCase()}, with no contract.`,
  "The rebates program vendors pay us, and what partners pay us when you sign up for a service through us, fund the work: running bids, checking vendors, building church websites, and seeing problems through.",
  "A service with its own price, like a sound installation or a paid app, is priced by that service, and you pay only for what you choose.",
  "United Under God, Inc. is a 501(c)(3) nonprofit.",
] as const;

export type Path = {
  id: "seal" | "member" | "need" | "vendor";
  title: string;
  forWho: string;
  body: string;
  to: string;
  cta: string;
};

/** "Which is right for me?": every way to sign up, in one place. */
export const PATHS: readonly Path[] = [
  {
    id: "seal",
    title: "The seal",
    forWho: "Any church, business, charity, or household",
    body: "A public statement that you intend to be one body with the church in your town. Free, never for sale, and it links to a public page anyone can check.",
    to: "/join",
    cta: "Take the seal",
  },
  {
    id: "member",
    title: "Member church",
    forWho: "A church",
    body: "The buying catalogs with vendors and awarded prices, a church website, pastor fellowship, and help when a vendor falls short.",
    to: "/membership",
    cta: "Become a member church",
  },
  {
    id: "need",
    title: "Post a need",
    forWho: "Any church, ministry, or Christian-owned business",
    body: "One thing you need quoted, like chairs for the fellowship hall. No account or membership needed.",
    to: "/buying/need",
    cta: "Post a need",
  },
  {
    id: "vendor",
    title: "Vendor partner",
    forWho: "A business that sells to churches",
    body: "Hear about bids in your area and quote on them. You pay only when you are paid.",
    to: "/buying/sell-to-churches",
    cta: "Become a vendor partner",
  },
] as const;
