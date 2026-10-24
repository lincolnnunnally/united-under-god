import type { BuyingModel } from "./church-spend.ts";

/**
 * The one place the buying program's vendor fees live. The Vendor Terms page,
 * the invitation email, the public disclosure line, and the fee lookup all
 * read from here, so a rate is never typed into copy by hand.
 *
 * Imported by node's test runner: relative imports, no framework code.
 */

/** Bump when the terms text or a rate changes. Stored with each acceptance. */
export const VENDOR_TERMS_VERSION = "2026-10-24";

export const VENDOR_TERMS_PATH = "/buying/vendor-terms";

export type FeeConfig = {
  /** Paid on sales of catalog items and recurring-contract services. */
  rebate: { percent: number; models: BuyingModel[] };
  /** Paid on jobs from churches introduced through the program. */
  referral: { percent: number; models: BuyingModel[] };
  /** How often the vendor reports program sales and closed jobs. */
  reporting: "monthly";
  /** Fees are due this many days after the vendor is paid. */
  dueDays: number;
};

export const FEES: FeeConfig = {
  rebate: { percent: 2, models: ["catalog", "contract"] },
  referral: { percent: 10, models: ["project", "referral"] },
  reporting: "monthly",
  dueDays: 30,
};

export type FeeKind = "rebate" | "referral";

/**
 * The fee on an item with this buying model. Licensed referral-only parts
 * (insurance, benefits, banking and loans, payroll and tax, audit) are
 * not covered by these terms and return null.
 */
export function feeFor(
  model: BuyingModel,
  licensed = false,
  config: FeeConfig = FEES,
): { kind: FeeKind; percent: number } | null {
  if (licensed) return null;
  if (config.rebate.models.includes(model))
    return { kind: "rebate", percent: config.rebate.percent };
  if (config.referral.models.includes(model)) {
    return { kind: "referral", percent: config.referral.percent };
  }
  return null;
}

/**
 * The short public line on /buying, each /buying/<category> page, and each
 * vendor bid page. Plain, and not hidden.
 */
export const FEE_DISCLOSURE =
  "Vendors in the buying program pay United Under God rebates and referral fees. United Under God retains these rebates to support the buying program and its service to churches.";

export type TermsSection = { heading: string; body: string[] };

/** The Vendor Terms, in plain language, built from the fee config. */
export function vendorTerms(config: FeeConfig = FEES): TermsSection[] {
  const rebate = `${config.rebate.percent}%`;
  const referral = `${config.referral.percent}%`;
  return [
    {
      heading: "Who these terms are for",
      body: [
        "These terms apply to a business that signs up to serve churches through the United Under God buying program. By ticking “I agree to the Vendor Terms” when you sign up, you accept them.",
        "They do not cover insurance, health or retirement benefits, banking and loans, payroll and payroll tax, or audit and tax preparation. Those are handled separately, through licensed or qualified providers, under their own arrangements.",
      ],
    },
    {
      heading: `The ${rebate} rebate`,
      body: [
        `On catalog items and recurring service contracts, you pay United Under God a rebate of ${rebate} of your sales made through the program. Examples: toner and ink, paper and office supplies, janitorial supplies, and recurring services such as cleaning, lawn care, or pest control.`,
      ],
    },
    {
      heading: `The ${referral} referral fee`,
      body: [
        `On project and referral work, you pay United Under God a referral fee of ${referral} of each job from a church introduced to you through the program. Examples: sound, livestream, and lighting, and building and facilities projects such as roofing, HVAC replacement, paving, or renovation.`,
      ],
    },
    {
      heading: "Reporting and when fees are due",
      body: [
        `Report your program sales and closed jobs to United Under God ${config.reporting}, including months with none.`,
        `Each fee is due ${config.dueDays} days after you are paid by the church.`,
      ],
    },
    {
      heading: "Churches buy from you directly",
      body: [
        "Churches always buy directly from you, on your invoice, and pay you directly. United Under God does not take payment for your goods or services.",
        "Every church chooses freely. A church never has to buy from you, and you never have to accept a job.",
      ],
    },
    {
      heading: "Disclosure",
      body: [
        "United Under God tells churches plainly that vendors pay rebates and referral fees, and that United Under God retains these rebates to support the buying program and its service to churches.",
      ],
    },
    {
      heading: "Removal",
      body: [
        "United Under God can pause or remove a vendor from the program, including a vendor that does not report or does not pay fees when due. Fees already earned stay due.",
      ],
    },
    {
      heading: "Changes",
      body: [
        "If these terms change, the new version gets a new date and we will tell you before it applies to new sales or jobs.",
      ],
    },
  ];
}

/** The terms as plain text (for email and tests). */
export function vendorTermsText(config: FeeConfig = FEES): string {
  return vendorTerms(config)
    .map((section) => [section.heading, ...section.body].join("\n"))
    .join("\n\n");
}

/** One plain line describing the fees, for the invitation email. */
export function feeSummary(config: FeeConfig = FEES): string {
  return `Under the Vendor Terms you pay a ${config.rebate.percent}% rebate on catalog and recurring-contract sales made through the program, and a ${config.referral.percent}% referral fee on project and referral jobs from churches introduced through the program. You report ${config.reporting}; fees are due ${config.dueDays} days after you are paid.`;
}
