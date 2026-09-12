/** Enhanced food-inventory deduction (IRC § 170(e)(3)). Not tax advice. */

export function storeBenefit(input: {
  cost: number;
  wouldSell: number;
  haulFee?: number;
  weeks?: number;
}) {
  const basis = Math.max(0, Number(input.cost) || 0);
  const fmv = Math.max(0, Number(input.wouldSell) || 0);
  const profit = Math.max(0, fmv - basis);
  const uncapped = basis + profit * 0.5;
  const cap = basis * 2;
  const donate = Math.min(uncapped, cap);
  const haul = Math.max(0, Number(input.haulFee) || 0);
  const weeks = Math.max(1, Math.min(52, Math.round(Number(input.weeks) || 52)));
  const extra = Math.max(0, donate - basis);
  const weekly = extra + haul;
  return {
    dumpster: basis,
    donate,
    extra,
    capped: uncapped >= cap - 0.005,
    haul,
    weeks,
    weekly,
    yearly: weekly * weeks
  };
}

export function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}
