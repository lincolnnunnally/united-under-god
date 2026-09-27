import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DESK_URL,
  OWNER_EMAIL,
  buildInquiryNotice,
  isArrivalRequest,
  type InquiryNoticeRow,
} from "./desk.ts";
import { DEFAULT_DESK_FROM, deskFromAddress, finishDeskSend } from "./desk-mail.ts";

const emptyDesk = { routes: [], staff: [] as const };

function row(overrides: Partial<InquiryNoticeRow> = {}): InquiryNoticeRow {
  return {
    kind: "goods-furniture",
    kinds: "goods-furniture",
    name: "Ada Pastor",
    email: "ada@example.org",
    phone: "912-555-0100",
    organization: "Vidalia Methodist",
    city: "Vidalia",
    address: "12 Dock Street",
    message: "Two couches, second floor",
    details: JSON.stringify({
      pickupDay: "Sat",
      pickupWindow: "10am",
      categories: "Furniture",
      vehicle: "Box truck",
      helpers: "Two people",
    }),
    created_at: "2026-09-27T14:00:00.000Z",
    ...overrides,
  };
}

describe("goods pickup owner notice", () => {
  it("emails the owner with when, where, what, org, and contact", () => {
    const notice = buildInquiryNotice({
      inquiry: row(),
      ...emptyDesk,
    });
    assert.equal(isArrivalRequest("goods-furniture"), true);
    assert.equal(OWNER_EMAIL, "lincoln@unitedundergod.org");
    assert.deepEqual(notice.to, ["lincoln@unitedundergod.org"]);
    assert.equal(notice.subject, "Pickup request needs your attention: Ada Pastor");
    assert.match(notice.text, /When: Sat · 10am/);
    assert.match(notice.text, /Where: 12 Dock Street, Vidalia/);
    assert.match(notice.text, /What: Furniture · Box truck · Two people · Two couches, second floor/);
    assert.match(notice.text, /Organization: Vidalia Methodist/);
    assert.match(notice.text, /Contact: Ada Pastor/);
    assert.match(notice.text, /Email: ada@example.org/);
    assert.match(notice.text, /Phone: 912-555-0100/);
    assert.match(notice.text, /Submitted: 2026-09-27T14:00:00.000Z/);
    assert.ok(notice.text.includes(`Review it: ${DESK_URL}`));
  });

  it("does not send the pickup notice for food, seal, or time", () => {
    for (const kind of ["food", "seal", "time", "buying", "mission"] as const) {
      const notice = buildInquiryNotice({
        inquiry: row({ kind, kinds: kind, organization: "Some Church" }),
        ...emptyDesk,
      });
      assert.equal(isArrivalRequest(kind), false);
      assert.deepEqual(notice.to, []);
      assert.equal(notice.subject.startsWith("Pickup request needs your attention:"), false);
    }
  });

  it("keeps a single owner address when the route list already has it", () => {
    const notice = buildInquiryNotice({
      inquiry: row(),
      routes: [{ email: OWNER_EMAIL, kinds: "all", role: "always" }],
      staff: [],
    });
    assert.deepEqual(notice.to, ["lincoln@unitedundergod.org"]);
  });
});

describe("desk mail fail-safe", () => {
  it("uses the verified sending domain unless RESEND_FROM is set", () => {
    assert.match(DEFAULT_DESK_FROM, /@emails\.unitedundergod\.org>/);
    assert.equal(deskFromAddress({}), DEFAULT_DESK_FROM);
    assert.equal(
      deskFromAddress({ RESEND_FROM: "United Under God <desk@emails.unitedundergod.org>" }),
      "United Under God <desk@emails.unitedundergod.org>",
    );
  });

  it("returns success to the caller when the mailer throws", async () => {
    const lines: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      const result = await finishDeskSend({ id: "inq-1", kind: "goods-furniture" }, async () => {
        throw new Error("smtp down ada@example.org 912-555-0100");
      });
      assert.deepEqual(result, { sent: 0, attempted: 0 });
      assert.match(lines[0] ?? "", /\[desk-mail\] send failed inquiry=inq-1 kind=goods-furniture/);
      assert.equal((lines[0] ?? "").includes("ada@example.org"), false);
      assert.equal((lines[0] ?? "").includes("912-555-0100"), false);
    } finally {
      console.error = original;
    }
  });

  it("keeps the saved result when the provider rejects the send", async () => {
    const result = await finishDeskSend({ id: "inq-2", kind: "goods-clothes" }, async () => ({
      sent: 0,
      attempted: 1,
    }));
    assert.deepEqual(result, { sent: 0, attempted: 1 });
  });
});
