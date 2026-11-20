import { createFileRoute } from "@tanstack/react-router";
import { AvlHero, AvlRequest, Cards, FaqList, Section, avlHead } from "@/components/sanctuary-avl";
import { INSTALLER_PROMISES } from "@/lib/sanctuary-avl";

const STEPS = [
  {
    title: "1. Tell us about your room",
    body: "A few lines: how many it seats, what is not working, and any building plans.",
  },
  {
    title: "2. A call within one business day",
    body: "A church installation team calls to talk through what you are hearing and seeing.",
  },
  {
    title: "3. A walkthrough of your sanctuary",
    body: "They measure the room, listen to it, and look at power, cable paths and the stage.",
  },
  {
    title: "4. A design and a written proposal",
    body: "One plan for sound, lighting and video, with ballpark phases if you want to spread it out.",
  },
  {
    title: "5. You decide",
    body: "Nothing is ordered until your church says yes. Then they install it and train your volunteers.",
  },
];

const FAQ = [
  {
    q: "Who is Sanctuary AVL?",
    a: "We bring churches to experienced church installation teams. A service of United Under God, Inc., a 501(c)(3) nonprofit.",
  },
  {
    q: "How is Sanctuary AVL paid?",
    a: "By the installer, as a referral fee, when a church goes ahead. Your church never pays us, and the price you see is the installer’s price.",
  },
  {
    q: "Who installs the system?",
    a: "A church installation team with nearly 30 years of church work, covering churches nationwide.",
  },
  {
    q: "Do you work with small churches?",
    a: "Yes. Some of the best systems we have seen are in rooms of about 300 seats, and smaller rooms have their own needs. Start with the room you have.",
  },
];

export const Route = createFileRoute("/avl/how-it-works")({
  component: HowItWorks,
  head: () =>
    avlHead({
      title: "How Sanctuary AVL Works",
      description:
        "Tell us about your sanctuary, get a call within one business day, a walkthrough, a design and a written proposal. Sanctuary AVL is paid by the installer, never by your church.",
      path: "/avl/how-it-works",
    }),
});

function HowItWorks() {
  return (
    <>
      <AvlHero eyebrow="How it works" title="From what you hear on Sunday to a room that works">
        <p>
          You tell us about your room. A church installation team does the rest: walkthrough,
          design, proposal, install and training.
        </p>
      </AvlHero>
      <Section title="The steps">
        <Cards items={STEPS} />
      </Section>
      <section className="border-y border-rule bg-cream">
        <Section title="Who does the work">
          <Cards items={INSTALLER_PROMISES} />
        </Section>
      </section>
      <Section title="Questions">
        <div className="max-w-3xl">
          <FaqList faq={FAQ} />
        </div>
      </Section>
      <AvlRequest path="/avl/how-it-works" label="how it works" />
    </>
  );
}
