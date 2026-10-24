import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SIGNUP_ALERT_CLASS,
  SIGNUP_LIMIT_MESSAGE,
  SIGNUP_STATUS_CLASS,
  verseSignupFeedback,
} from "./verse-signup-copy.ts";

const INBOX =
  "Check your inbox for a note from United Under God. Open it and confirm, and the daily verse will start.";

describe("verse sign-up form copy", () => {
  it("shows the limit sentence for a refused sign-up and the inbox sentence for an address already on the list", () => {
    const refused = verseSignupFeedback({
      ok: false,
      state: "refused",
      error: SIGNUP_LIMIT_MESSAGE,
    });
    assert.equal(refused.role, "alert");
    assert.equal(refused.className, SIGNUP_ALERT_CLASS);
    assert.equal(refused.text, "We're at today's sign-up limit. Please try again tomorrow.");
    assert.equal(refused.text.includes("Check your inbox"), false);

    const fresh = verseSignupFeedback({ ok: true, state: "pending", message: INBOX });
    const already = verseSignupFeedback({ ok: true, state: "pending", message: INBOX });
    assert.equal(already.role, "status");
    assert.equal(already.className, SIGNUP_STATUS_CLASS);
    assert.equal(already.text, fresh.text);
    assert.equal(already.text, INBOX);
    assert.notEqual(already.text, refused.text);
  });

  it("leaves a different failure on the alert and does not call it the daily limit", () => {
    const invalid = verseSignupFeedback({
      ok: false,
      error: "Please enter an email address we can write to.",
    });
    assert.equal(invalid.role, "alert");
    assert.equal(invalid.className, SIGNUP_ALERT_CLASS);
    assert.equal(invalid.text, "Please enter an email address we can write to.");
    assert.notEqual(invalid.text, SIGNUP_LIMIT_MESSAGE);
  });
});
