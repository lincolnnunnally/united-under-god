import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INQUIRY_FOLLOWUP, INQUIRY_UNREACHABLE, OWNER_EMAIL } from "./desk.ts";
import { sendHardcodedOwnerEmail } from "./desk-mail.ts";
import { notifySavedInquiry, settleInquirySubmit } from "./desk-submit.ts";
import type { InquiryNoticeRow } from "./desk.ts";

function row(kind: string): InquiryNoticeRow {
  return {
    kind,
    kinds: kind,
    name: "Ada Pastor",
    email: "ada@example.org",
    phone: "912-555-0199",
    organization: "Vidalia Market",
    city: "Vidalia",
    address: "12 Dock Street",
    message: "Bakery and produce",
    details: JSON.stringify({
      pickupDay: "Sat",
      pickupWindow: "After 7pm",
      categories: "Furniture",
      orgType: "Grocery store",
    }),
    created_at: "2026-09-27T14:00:00.000Z",
  };
}

function silence() {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  return {
    lines,
    restore() {
      console.error = original;
    },
  };
}

describe("unsaved inquiry still emails the owner", () => {
  for (const kind of ["food", "goods-furniture"] as const) {
    it(`sends the full ${kind} inquiry to the hardcoded owner with NOT SAVED`, async () => {
      const log = silence();
      const sent: { to: string[]; subject: string; text: string }[] = [];
      try {
        const result = await settleInquirySubmit({
          inquiry: row(kind),
          write: async () => {
            const err = new Error("The database is not available.");
            err.name = "DbUnavailableError";
            throw err;
          },
          notifySaved: async () => {
            throw new Error("notify should not run");
          },
          sendUnsaved: async (notice) => {
            sent.push(notice);
            return { sent: 1 };
          },
        });
        assert.deepEqual(result, { ok: true, saved: false, emailed: true });
        assert.equal(sent.length, 1);
        assert.deepEqual(sent[0].to, [OWNER_EMAIL]);
        assert.equal(OWNER_EMAIL, "lincoln@unitedundergod.org");
        assert.match(sent[0].subject, /^NOT SAVED — /);
        assert.match(sent[0].subject, /Ada Pastor/);
        assert.match(sent[0].text, /NOT SAVED/);
        assert.match(sent[0].text, /Vidalia Market/);
        assert.match(sent[0].text, /ada@example.org/);
        assert.match(sent[0].text, /912-555-0199/);
        assert.match(sent[0].text, /12 Dock Street/);
        assert.match(sent[0].text, /Bakery and produce/);
        assert.match(log.lines[0] ?? "", /\[desk\] inquiry not saved kind=/);
        assert.equal((log.lines.join(" ")).includes("ada@example.org"), false);
        assert.equal((log.lines.join(" ")).includes("912-555-0199"), false);
        assert.equal((log.lines.join(" ")).includes("12 Dock Street"), false);
      } finally {
        log.restore();
      }
    });
  }

  it("does not claim success when the save and the email both fail", async () => {
    const log = silence();
    try {
      const result = await settleInquirySubmit({
        inquiry: row("food"),
        write: async () => {
          throw new Error("connection refused");
        },
        notifySaved: async () => ({ sent: 1 }),
        sendUnsaved: async () => ({ sent: 0 }),
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.saved, false);
        assert.equal(result.emailed, false);
        assert.equal(result.error, INQUIRY_UNREACHABLE);
        assert.match(result.error, /lincoln@unitedundergod.org/);
      }
      assert.equal(INQUIRY_FOLLOWUP, "We received it and will follow up.");
    } finally {
      log.restore();
    }
  });
});

describe("notify_routes failure falls back to the owner", () => {
  it("emails lincoln for a saved food inquiry when the route lookup throws", async () => {
    const log = silence();
    const owner: { to: string[]; subject: string; text: string }[] = [];
    try {
      const result = await notifySavedInquiry({
        inquiry: row("food"),
        loadRoutes: async () => {
          throw new Error("DbUnavailableError");
        },
        sendDesk: async () => {
          throw new Error("desk send should not run");
        },
        sendOwner: async (notice) => {
          owner.push(notice);
          return { sent: 1 };
        },
      });
      assert.equal(result.sent, 1);
      assert.deepEqual(owner[0].to, ["lincoln@unitedundergod.org"]);
      assert.equal(owner[0].subject.includes("NOT SAVED"), false);
      assert.match(owner[0].subject, /Food \/ grocery from Ada Pastor/);
      assert.match(owner[0].text, /Vidalia Market/);
      assert.match(log.lines[0] ?? "", /notify routes failed kind=food/);
      assert.equal(log.lines.join(" ").includes("ada@example.org"), false);
    } finally {
      log.restore();
    }
  });

  it("uses the desk list when the lookup works", async () => {
    let ownerCalls = 0;
    const result = await notifySavedInquiry({
      inquiry: row("seal"),
      loadRoutes: async () => ({
        routes: [{ email: "manager@example.org", kinds: "seal", role: "always" }],
        staff: [],
      }),
      sendDesk: async (notice) => {
        assert.deepEqual(notice.to, ["manager@example.org"]);
        assert.equal(notice.subject.includes("NOT SAVED"), false);
        return { sent: 1 };
      },
      sendOwner: async () => {
        ownerCalls += 1;
        return { sent: 1 };
      },
    });
    assert.equal(result.sent, 1);
    assert.equal(ownerCalls, 0);
  });
});

describe("hardcoded owner Resend send", () => {
  it("posts only to lincoln through Resend", async () => {
    const calls: { url: string; body: string }[] = [];
    const result = await sendHardcodedOwnerEmail({
      subject: "NOT SAVED — United Under God — Food / grocery from Ada Pastor",
      text: "ada@example.org 912-555-0199",
      apiKey: "re_test_key",
      logKind: "food",
      logLabel: "unsaved",
      fetchImpl: (async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), body: String(init?.body ?? "") });
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(result.sent, 1);
    assert.match(calls[0].url, /^https:\/\/api\.resend\.com\/emails$/);
    const payload = JSON.parse(calls[0].body) as {
      to: string[];
      subject: string;
      from: string;
      reply_to: string;
    };
    assert.deepEqual(payload.to, ["lincoln@unitedundergod.org"]);
    assert.equal(payload.from, "United Under God <no-reply@emails.unitedundergod.org>");
    assert.equal(payload.reply_to, "lincoln@unitedundergod.org");
    assert.match(payload.subject, /NOT SAVED/);
  });

  it("does not call the network when the Resend key is missing", async () => {
    const log = silence();
    let called = false;
    try {
      const result = await sendHardcodedOwnerEmail({
        subject: "NOT SAVED — x",
        text: "ada@example.org",
        apiKey: "  ",
        logKind: "goods-furniture",
        logLabel: "unsaved",
        fetchImpl: (async () => {
          called = true;
          return new Response("{}", { status: 200 });
        }) as typeof fetch,
      });
      assert.equal(called, false);
      assert.deepEqual(result, { sent: 0, attempted: 1 });
      assert.match(log.lines[0] ?? "", /unsaved email failed kind=goods-furniture/);
      assert.equal(log.lines.join(" ").includes("ada@example.org"), false);
    } finally {
      log.restore();
    }
  });
});
