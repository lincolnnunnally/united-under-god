import type { BuyingModel } from "./church-spend.ts";

/**
 * The one place the buying program's vendor fees live. The Vendor Terms page,
 * the invitation email, the public disclosure line, and the fee lookup all
 * read from here, so a rate is never typed into copy by hand.
 *
 * Imported by node's test runner: relative imports, no framework code.
 */

/** Bump when the terms text or a rate changes. Stored with each acceptance. */
export const VENDOR_TERMS_VERSION = "2026-10-25";

/** The first terms version that carries the Vendor Covenant. */
export const COVENANT_SINCE = "2026-10-25";

export const VENDOR_TERMS_PATH = "/buying/vendor-terms";

/** Where a church reports a problem with a program vendor. */
export const REPORT_PATH = "/buying/report";

/** The words on the sign-up and re-acceptance checkbox. */
export const AGREE_LABEL = "I agree to the Vendor Covenant and Vendor Terms";

/**
 * True when a vendor accepted a terms version older than the current one,
 * so it has to accept the new covenant. Versions are ISO dates.
 */
export function needsCovenant(acceptedVersion: string, current = VENDOR_TERMS_VERSION): boolean {
  return !acceptedVersion || acceptedVersion < current;
}

/** True when the version a vendor accepted includes the Vendor Covenant. */
export function acceptedCovenant(acceptedVersion: string): boolean {
  return Boolean(acceptedVersion) && acceptedVersion >= COVENANT_SINCE;
}

/** The one number in the covenant, kept with the fees so copy never types it. */
export const COVENANT = {
  /** A vendor answers any concern from a church within this many business days. */
  responseBusinessDays: 2,
};

/** Standing consequences, mildest first. Escalation steps up this ladder. */
export const CONSEQUENCES = ["none", "warning", "probation", "suspension", "revocation"] as const;
export type Consequence = (typeof CONSEQUENCES)[number];

export const CONSEQUENCE_LABELS: Record<Consequence, string> = {
  none: "No consequence",
  warning: "Warning",
  probation: "Probation",
  suspension: "Suspension from invitations and catalogs",
  revocation: "Revoked from the program",
};

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

export type CovenantPoint = { title: string; text: string; list?: string[]; after?: string };

export type TermsSection = {
  heading: string;
  body: string[];
  /** The covenant's commitments, in order. Only the covenant section has them. */
  points?: CovenantPoint[];
  covenant?: boolean;
};

/** The Vendor Covenant: the standard every vendor agrees to. */
export function vendorCovenant(covenant = COVENANT): TermsSection {
  const days = covenant.responseBusinessDays;
  return {
    heading: "The Vendor Covenant",
    covenant: true,
    body: [
      "Churches trust the vendors in this program with money given for ministry. This covenant is the standard every vendor agrees to keep. It comes first because it matters more than the rates.",
    ],
    points: [
      {
        title: "Make it right.",
        text: "If it isn’t right for the church, you fix it, promptly. When the fault is yours, the fix costs the church nothing more.",
      },
      {
        title: "Stand behind your work.",
        text: "Honor your warranty and your word. What you promised is what you deliver.",
      },
      {
        title: "Go above and beyond.",
        text: "Serve every church the way you would want your own church served.",
      },
      {
        title: "Care about the church’s success.",
        text: "Give honest advice, even when it means a smaller sale.",
      },
      {
        title: "Quote honestly.",
        text: "The final bill matches the quote, unless the church approves a change in writing.",
      },
      {
        title: "Answer problems quickly.",
        text: `Respond to any concern from a church within ${days} business ${days === 1 ? "day" : "days"}.`,
      },
      {
        title: "Accept United Under God’s resolution.",
        text: "When a church raises a problem that you and the church cannot settle together, United Under God hears both sides and decides. We may appoint a committee to mediate. You agree to carry out the remedy decided: a repair, a redo, a credit, or a refund of the disputed part. If you do not, or if you break this covenant, you may be:",
        list: [
          "warned;",
          "placed on probation;",
          "suspended from bid invitations and catalogs;",
          "revoked from the program.",
        ],
        after:
          "Any consequence is set out in a written decision, and the outcome is recorded on your standing in the program.",
      },
    ],
  };
}

/** The covenant as plain text (for email and tests). */
export function covenantText(covenant = COVENANT): string {
  return sectionText(vendorCovenant(covenant));
}

function sectionText(section: TermsSection): string {
  const points = (section.points ?? []).map((point) =>
    [
      `${point.title} ${point.text}`,
      ...(point.list ?? []).map((line) => `  - ${line}`),
      point.after ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [section.heading, ...section.body, ...points].join("\n");
}

/** The Vendor Terms, in plain language, built from the fee config. The covenant leads. */
export function vendorTerms(config: FeeConfig = FEES, covenant = COVENANT): TermsSection[] {
  const rebate = `${config.rebate.percent}%`;
  const referral = `${config.referral.percent}%`;
  return [
    vendorCovenant(covenant),
    {
      heading: "Who these terms are for",
      body: [
        `These terms apply to a business that signs up to serve churches through the United Under God buying program. By ticking “${AGREE_LABEL}” when you sign up, you accept the covenant above and the terms below.`,
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
        "United Under God can pause or remove a vendor from the program, including a vendor that does not report or does not pay fees when due, or that does not keep the Vendor Covenant. Fees already earned stay due.",
      ],
    },
    {
      heading: "Changes",
      body: [
        "If these terms change, the new version gets a new date and we will tell you before it applies to new sales or jobs. We will send you a private link to review and accept the new version.",
      ],
    },
  ];
}

/** The terms as plain text (for email and tests). */
export function vendorTermsText(config: FeeConfig = FEES): string {
  return vendorTerms(config).map(sectionText).join("\n\n");
}

/** One plain line describing the fees, for the invitation email. */
export function feeSummary(config: FeeConfig = FEES): string {
  return `Under the Vendor Terms you pay a ${config.rebate.percent}% rebate on catalog and recurring-contract sales made through the program, and a ${config.referral.percent}% referral fee on project and referral jobs from churches introduced through the program. You report ${config.reporting}; fees are due ${config.dueDays} days after you are paid.`;
}
