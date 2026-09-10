export const EIN = "81-3554390";
export const LEGAL_NAME = "United Under God, Inc.";
export const MIN_CENTS = 100;
export const MAX_CENTS = 5_000_000;
export const SUGGESTED = [2500, 5000, 10000, 25000];
export const LIVE_GIVE_URL = "https://unitedundergod.org/give";

export function clampAmount(cents: number): number | null {
  if (!Number.isFinite(cents)) return null;
  const whole = Math.round(cents);
  if (whole < MIN_CENTS || whole > MAX_CENTS) return null;
  return whole;
}

export function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}
