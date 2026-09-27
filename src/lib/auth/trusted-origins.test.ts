import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { trustedOriginsForBaseURL } from "./trusted-origins.ts";

describe("trustedOriginsForBaseURL", () => {
  it("trusts apex and www when BETTER_AUTH_URL is the apex", () => {
    assert.deepEqual(trustedOriginsForBaseURL("https://unitedundergod.org"), [
      "https://unitedundergod.org",
      "https://www.unitedundergod.org",
    ]);
  });

  it("trusts apex and www when BETTER_AUTH_URL is www", () => {
    assert.deepEqual(trustedOriginsForBaseURL("https://www.unitedundergod.org"), [
      "https://www.unitedundergod.org",
      "https://unitedundergod.org",
    ]);
  });

  it("keeps a non-public base URL unchanged", () => {
    assert.deepEqual(trustedOriginsForBaseURL("https://preview.example.com"), [
      "https://preview.example.com",
    ]);
  });
});
