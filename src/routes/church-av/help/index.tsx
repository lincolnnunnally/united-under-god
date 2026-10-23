import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AvHero, ProcessSection, RequestSection } from "@/components/church-av";
import { SiteShell } from "@/components/site-shell";
import { breadcrumbJsonLd } from "@/lib/church-av";
import { HELP_PAGES, helpPath } from "@/lib/church-av-help";
import { absoluteUrl, pageHead } from "@/lib/seo";

const PATH = "/church-av/help";
const DESCRIPTION =
  "Church sound, hearing, livestream, and volunteer problems, solved: why each one happens, how our installation team fixes it, and how to get it fixed in your sanctuary.";

export const Route = createFileRoute("/church-av/help/")({
  component: HelpIndex,
  head: () =>
    pageHead({
      title: "Church Sound & Livestream Problems, Solved | United Under God",
      description: DESCRIPTION,
      path: PATH,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Church sound and livestream problems, solved",
          description: DESCRIPTION,
          url: absoluteUrl(PATH),
          hasPart: HELP_PAGES.map((p) => ({
            "@type": "Article",
            headline: p.h1,
            url: absoluteUrl(helpPath(p)),
          })),
        },
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Church sound, video & lighting", path: "/church-av" },
          { name: "Help", path: PATH },
        ]),
      ],
    }),
});

function HelpIndex() {
  return (
    <SiteShell>
      <AvHero
        eyebrow="For pastors and committees"
        title="Sound, hearing, and livestream problems, solved"
        crumbs={[{ name: "Church sound, video & lighting", to: "/church-av" }, { name: "Help" }]}
      >
        <p>
          Pick what you are noticing on Sunday morning. Each page shows why it happens and how it
          gets fixed. Then we fix it for you: a walkthrough of your room, a design built for it,
          installation around your services, and training for your volunteers.
        </p>
      </AvHero>
      <section className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="text-3xl">What are you noticing?</h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {HELP_PAGES.map((page) => (
            <li key={page.slug}>
              <Link
                to="/church-av/help/$slug"
                params={{ slug: page.slug }}
                className="group flex h-full flex-col rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] transition-shadow hover:shadow-[0_0_0_2px_var(--color-forest)] focus-visible:shadow-[0_0_0_2px_var(--color-forest)] focus-visible:outline-none"
              >
                <h3 className="font-display text-xl text-ink">{page.h1}</h3>
                <p className="mt-2 flex-1 text-sm text-muted">{page.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest">
                  See how we fix it
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-muted">
          Not sure where to start?{" "}
          <Link
            to="/church-av/planner"
            className="inline-flex items-center gap-1 text-forest underline-offset-4 hover:underline"
          >
            Answer a few questions in the Church Room Planner
            <ArrowRight className="size-4" />
          </Link>
        </p>
      </section>
      <ProcessSection compact />
      <RequestSection
        heading="Tell us what you are hearing. We will fix it."
        source={{ path: PATH, label: "Church AV help" }}
      />
    </SiteShell>
  );
}
