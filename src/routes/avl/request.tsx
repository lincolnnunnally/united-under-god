import { createFileRoute } from "@tanstack/react-router";
import { AvlHero, AvlRequest, avlHead } from "@/components/sanctuary-avl";

export const Route = createFileRoute("/avl/request")({
  component: () => (
    <>
      <AvlHero eyebrow="Plan my room" title="Tell us about your sanctuary" cta={false}>
        <p>
          We will call you within one business day. Nothing here is a price or a quote, and it costs
          your church nothing to talk.
        </p>
      </AvlHero>
      <AvlRequest path="/avl/request" label="request" heading="Your room, in a few lines" />
    </>
  ),
  head: () =>
    avlHead({
      title: "Plan Your Church Sound, Lighting & Video",
      description:
        "Tell us about your sanctuary. A church installation team will call within one business day, walk your room and design for it.",
      path: "/avl/request",
    }),
});
