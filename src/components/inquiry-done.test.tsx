import { Window } from "happy-dom";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createElement, type ReactNode } from "react";
import { ChurchAvPageFooter } from "./church-av-footer.tsx";
import { InquiryDone } from "./inquiry-done.tsx";
import { INQUIRY_FOLLOWUP } from "../lib/desk.ts";
import { INTENT_COPY } from "../lib/involvement.ts";

const dom = new Window({ url: "http://localhost/" });
const globals = globalThis as Record<string, unknown>;
globals.window = dom;
globals.document = dom.document;
globals.HTMLElement = dom.HTMLElement;
globals.Node = dom.Node;
globals.Element = dom.Element;
globals.DocumentFragment = dom.DocumentFragment;
globals.MutationObserver = dom.MutationObserver;
globals.getComputedStyle = dom.getComputedStyle.bind(dom);
globals.IS_REACT_ACT_ENVIRONMENT = true;

const { cleanup, render, screen } = await import("@testing-library/react");

const AV_LINE = "We’ll reach out soon to talk about your sanctuary.";
const GOODS_LINE =
  "We will look at what you told us — the pictures, the vehicle, the number of hands — and come get it. Then it goes to a neighbor.";
const INVOLVEMENT_LINE =
  "Someone from United Under God will be in touch. In the meantime, do not wait on us to start — a neighbor, a pantry shift, a first gift of food is already a step on mission.";

const STATES = [
  { saved: true, emailed: true, label: "saved+emailed" },
  { saved: false, emailed: true, label: "emailed-only" },
  { saved: true, emailed: false, label: "saved-only" },
] as const;

afterEach(() => {
  cleanup();
});

function panel(saved: boolean, emailed: boolean, children?: ReactNode) {
  return render(createElement(InquiryDone, { saved, emailed }, children));
}

describe("InquiryDone render", () => {
  for (const state of STATES) {
    it(`${state.label} shows the form's own line when children are provided`, () => {
      panel(state.saved, state.emailed, createElement("p", null, "Own line from the form"));
      const status = screen.getByRole("status");
      assert.equal(status.tabIndex, -1);
      assert.equal(status.getAttribute("aria-live"), "polite");
      assert.equal(document.activeElement, status);
      assert.equal(screen.getByText("Own line from the form").textContent, "Own line from the form");
      assert.equal(screen.queryByText(INQUIRY_FOLLOWUP), null);
      assert.equal(screen.queryByText("We received it."), null);
    });

    it(`${state.label} without children`, () => {
      panel(state.saved, state.emailed);
      const status = screen.getByRole("status");
      assert.equal(status.tabIndex, -1);
      assert.equal(document.activeElement, status);
      if (state.emailed) {
        assert.equal(screen.getByRole("heading", { name: "Thank you." }).textContent, "Thank you.");
        assert.equal(screen.getByText(INQUIRY_FOLLOWUP).textContent, INQUIRY_FOLLOWUP);
        assert.equal(screen.getByText("— United Under God").textContent, "— United Under God");
      } else {
        assert.equal(screen.queryByText(INQUIRY_FOLLOWUP), null);
        assert.equal(screen.queryByRole("heading", { name: "Thank you." }), null);
      }
    });
  }

  it("keeps church AV, involvement, and goods lines when the email went out but the save did not", () => {
    for (const line of [AV_LINE, INVOLVEMENT_LINE, GOODS_LINE]) {
      cleanup();
      panel(false, true, createElement("p", null, line));
      assert.equal(screen.getByText(line).textContent, line);
      assert.equal(screen.queryByText(INQUIRY_FOLLOWUP), null);
      assert.equal(screen.queryByText("Nothing here is a price or a quote."), null);
    }
  });

  it("puts the price line in the church AV page footer", () => {
    render(createElement(ChurchAvPageFooter));
    assert.equal(
      screen.getByText("Nothing here is a price or a quote.").textContent,
      "Nothing here is a price or a quote.",
    );
    assert.equal(INTENT_COPY.av.done, AV_LINE);
  });
});
