/** Shown when a sign-up is refused and no confirmation note is sent. */
export const SIGNUP_LIMIT_MESSAGE = "We're at today's sign-up limit. Please try again tomorrow.";

export const SIGNUP_STATUS_CLASS = "mt-4 text-ink";
export const SIGNUP_ALERT_CLASS = "mt-4 text-mission";

export type SignupFeedback = {
  role: "status" | "alert";
  className: string;
  text: string;
};

/**
 * What the sign-up form shows.
 * A refused cap is an alert with the limit sentence.
 * A new address and an address that is already subscribed share the inbox sentence.
 */
export function verseSignupFeedback(result: {
  ok: boolean;
  state?: string;
  message?: string;
  error?: string;
}): SignupFeedback {
  if (result.ok) {
    return { role: "status", className: SIGNUP_STATUS_CLASS, text: result.message ?? "" };
  }
  if (result.state === "refused") {
    return {
      role: "alert",
      className: SIGNUP_ALERT_CLASS,
      text: result.error?.trim() || SIGNUP_LIMIT_MESSAGE,
    };
  }
  return { role: "alert", className: SIGNUP_ALERT_CLASS, text: result.error ?? "" };
}

export function isSignupRefused(result: {
  ok: boolean;
  state?: string;
  error?: string;
}): result is { ok: false; state: "refused"; error: string } {
  return result.ok === false && result.state === "refused";
}
