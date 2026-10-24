/**
 * The authorized price contact on a quote: a senior person at the vendor who
 * can bind the company to the quoted prices, and the attestation they tick.
 *
 * Pure (one relative import), so the bid page, the desk, the portal, the
 * catalog pages, and the tests (`node --experimental-strip-types`) all read
 * the same words.
 */
import { longDate } from "./price-term.ts";

export type PriceContact = {
  name: string;
  title: string;
  email: string;
  phone: string;
};

export const EMPTY_PRICE_CONTACT: PriceContact = { name: "", title: "", email: "", phone: "" };

/** The words on the attestation checkbox, with the company named. */
export function attestationText(company: string): string {
  const name = company.trim() || "my company";
  return `I am authorized to commit ${name} to these prices for member churches of United Under God for the price term.`;
}

/** Who this contact is, in one line, for the desk and the copied order details. */
export function describePriceContact(contact: PriceContact): string {
  return [contact.name, contact.title, contact.email, contact.phone].filter(Boolean).join(", ");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Every price contact rule. Throws a sentence the vendor can act on. */
export function cleanPriceContact(input: Partial<PriceContact> | undefined): PriceContact {
  const name = (input?.name ?? "").trim();
  const title = (input?.title ?? "").trim();
  const email = (input?.email ?? "").trim().toLowerCase();
  const phone = (input?.phone ?? "").trim();
  if (!name) throw new Error("Name the person authorized to commit the company to these prices.");
  if (!title) throw new Error("Give that person's title, such as owner, president, or sales manager.");
  if (!EMAIL.test(email)) throw new Error("Enter a working email for the authorized price contact.");
  if ((phone.match(/\d/g) ?? []).length < 7) {
    throw new Error("Enter a working phone number for the authorized price contact.");
  }
  if (name.length > 160 || title.length > 160 || email.length > 200 || phone.length > 40) {
    throw new Error("That price contact is too long to store.");
  }
  return { name, title, email, phone };
}

/** The contact and the ticked attestation together; both are required on every quote. */
export function requireAttestedContact(
  input: { contact?: Partial<PriceContact>; attested?: boolean },
  company: string,
): { contact: PriceContact; attestation: string } {
  const contact = cleanPriceContact(input.contact);
  if (input.attested !== true) {
    throw new Error(`Tick “${attestationText(company)}” to submit.`);
  }
  return { contact, attestation: attestationText(company) };
}

/** A saved default, which may be blank; each field is checked only when the vendor fills it. */
export function cleanDefaultPriceContact(input: Partial<PriceContact>): PriceContact {
  const any = ["name", "title", "email", "phone"].some(
    (key) => (input[key as keyof PriceContact] ?? "").trim() !== "",
  );
  return any ? cleanPriceContact(input) : { ...EMPTY_PRICE_CONTACT };
}

/** The short text block a member copies to place an order. */
export function orderDetailsText(entry: {
  vendorName: string;
  title: string;
  unitPrice: string;
  unit: string;
  referenceCode: string;
  goodThrough: string;
  priceContact: PriceContact;
  vendorEmail?: string;
}): string {
  return [
    `Vendor: ${entry.vendorName}`,
    `Item: ${entry.title}`,
    `Program price: ${(entry.unitPrice ? `$${entry.unitPrice}` : "price on request")}${entry.unit ? ` / ${entry.unit}` : ""}`,
    `Reference: ${entry.referenceCode}`,
    entry.goodThrough ? `Good through: ${longDate(entry.goodThrough)}` : "",
    `Price contact: ${describePriceContact(entry.priceContact)}`,
    entry.vendorEmail ? `Vendor email: ${entry.vendorEmail}` : "",
    `We are a United Under God member church ordering at the program price, reference ${entry.referenceCode}.`,
  ]
    .filter(Boolean)
    .join("\n");
}
