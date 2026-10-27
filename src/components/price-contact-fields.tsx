import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PriceContact } from "@/lib/price-contact";

/**
 * The authorized price contact on a quote, and its attestation box. Used on
 * the vendor's bid page, in the vendor portal, and on the desk. With no
 * `attestation`, only the four contact fields are drawn (the portal default).
 */
export function PriceContactFields({
  idPrefix,
  contact,
  onChange,
  disabled,
  attestation,
  attested,
  onAttest,
  legend = "Authorized price contact",
  help = "A senior person at your company who is authorized to commit it to these prices, such as the owner, a vice president, or the sales manager.",
}: {
  idPrefix: string;
  contact: PriceContact;
  onChange: (next: PriceContact) => void;
  disabled?: boolean;
  attestation?: string;
  attested?: boolean;
  onAttest?: (value: boolean) => void;
  legend?: string;
  help?: string;
}) {
  const field = (key: keyof PriceContact, label: string, type = "text", autoComplete?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`${idPrefix}-pc-${key}`}>
        {label}
        {attestation ? <span className="text-muted"> (required)</span> : null}
      </Label>
      <Input
        id={`${idPrefix}-pc-${key}`}
        type={type}
        autoComplete={autoComplete}
        value={contact[key]}
        onChange={(event) => onChange({ ...contact, [key]: event.target.value })}
        required={Boolean(attestation)}
        disabled={disabled}
      />
    </div>
  );
  return (
    <fieldset className="grid gap-3 rounded-xl bg-cream p-4 shadow-[var(--shadow-border)]" data-price-contact="">
      <legend className="font-medium">{legend}</legend>
      <p className="text-sm text-muted">{help}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", "Name", "text", "name")}
        {field("title", "Title", "text", "organization-title")}
        {field("email", "Email", "email", "email")}
        {field("phone", "Phone", "tel", "tel")}
      </div>
      {attestation ? (
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-forest)]"
            checked={Boolean(attested)}
            onChange={(event) => onAttest?.(event.target.checked)}
            required
            disabled={disabled}
          />
          <span>{attestation}</span>
        </label>
      ) : null}
    </fieldset>
  );
}
