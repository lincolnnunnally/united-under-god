import { inquiryChallenge } from "@/lib/desk-actions";
import { solveVersePowInBrowser } from "@/lib/verse-pow";

const LATER = "We could not take that just now. Please try again in a little while.";

/** Same challenge and proof the daily verse sign-up uses. */
export async function inquiryProof(): Promise<
  { ok: true; powChallenge: string; powNonce: string } | { ok: false; error: string }
> {
  try {
    const issued = await inquiryChallenge();
    if (!issued.ok) return { ok: false, error: issued.error };
    const powNonce = await solveVersePowInBrowser(issued.challenge, issued.bits);
    if (!powNonce) return { ok: false, error: LATER };
    return { ok: true, powChallenge: issued.challenge, powNonce };
  } catch {
    return { ok: false, error: LATER };
  }
}
