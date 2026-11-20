import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  AvlHero,
  AvlRequest,
  Cards,
  PriceTable,
  Section,
  SizeCards,
  avlHead,
} from "@/components/sanctuary-avl";
import { AVL_ORIGIN } from "@/lib/sanctuary-avl-host";
import {
  AVL_NAME,
  AVL_TAGLINE,
  BENEFITS,
  GUIDES,
  INSTALLER_PROMISES,
  UPGRADE_SIGNS,
} from "@/lib/sanctuary-avl";

export const Route = createFileRoute("/avl/")({
  component: AvlHome,
  head: () =>
    avlHead({
      title: "Sanctuary AVL | Church Sound, Lighting, Video & LED Walls",
      description:
        "Church sound systems, stage lighting, cameras, livestream and LED walls, designed and installed by church installation teams with nearly 30 years of church work. Nationwide.",
      path: "/avl",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": `${AVL_ORIGIN}/#organization`,
          name: AVL_NAME,
          url: `${AVL_ORIGIN}/`,
          description: AVL_TAGLINE,
          areaServed: "US",
        },
      ],
    }),
});

function AvlHome() {
  return (
    <>
      <AvlHero
        eyebrow="Church sound · lighting · video · LED walls"
        title="Every word heard. Every face seen. Every seat included."
        image={{
          src: "/images/led-wall/hero.jpg",
          alt: "A church stage with an LED wall and stage lighting",
        }}
      >
        <p>
          Sanctuary AVL brings your church a team that has spent nearly 30 years designing and
          installing sound, lighting and video in sanctuaries across the country. Tell us about your
          room; they walk it, design for it and install it.
        </p>
      </AvlHero>

      <Section title="Built by people who know a sanctuary">
        <Cards items={INSTALLER_PROMISES} />
      </Section>

      <section className="border-y border-rule bg-cream">
        <Section
          title="Plan by the size of your room"
          intro={
            <p>
              Not only for big churches. A room of about 300 seats can carry a full modern system,
              and smaller rooms have needs of their own. Start with the room you have.
            </p>
          }
        >
          <SizeCards />
        </Section>
      </section>

      <Section
        title="Signs your church has outgrown its system"
        intro={<p>Most churches notice one Sunday at a time. These are the signs we hear most.</p>}
      >
        <Cards
          items={UPGRADE_SIGNS.slice(0, 6).map((sign) => ({
            title: sign.title,
            body: sign.body,
            href: sign.help ? (
              <Link
                to="/avl/help/$slug"
                params={{ slug: sign.help }}
                className="text-forest hover:underline"
              >
                Why it happens and how to fix it <ArrowRight className="inline h-3.5 w-3.5" />
              </Link>
            ) : undefined,
          }))}
        />
        <p className="mt-6">
          <Link
            to="/avl/guides/$slug"
            params={{ slug: "signs-your-church-needs-an-av-upgrade" }}
            className="text-forest hover:underline"
          >
            All the signs, and what to fix first <ArrowRight className="inline h-4 w-4" />
          </Link>
        </p>
      </Section>

      <section className="border-y border-rule bg-cream">
        <Section
          title="Ballpark costs"
          intro={
            <p>
              A committee needs a starting point before it can plan a budget or a campaign. These
              are typical ranges by room size.
            </p>
          }
        >
          <PriceTable />
          <p className="mt-6">
            <Link
              to="/avl/guides/$slug"
              params={{ slug: "church-av-cost" }}
              className="text-forest hover:underline"
            >
              What moves the number up or down <ArrowRight className="inline h-4 w-4" />
            </Link>
          </p>
        </Section>
      </section>

      <Section title="What a better room gives your church">
        <Cards items={BENEFITS} />
      </Section>

      <section className="border-t border-rule bg-cream">
        <Section title="Guides for pastors and committees">
          <ul className="grid gap-4 md:grid-cols-2">
            {GUIDES.map((guide) => (
              <li key={guide.slug}>
                <Link
                  to="/avl/guides/$slug"
                  params={{ slug: guide.slug }}
                  className="block rounded-xl bg-paper p-6 shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
                >
                  <span className="font-display text-xl text-heading">{guide.label}</span>
                  <span className="mt-2 block text-sm text-muted">{guide.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </section>

      <AvlRequest path="/avl" label="home" />
    </>
  );
}
