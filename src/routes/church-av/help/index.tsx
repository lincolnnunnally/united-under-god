import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AvHero, RequestSection } from "@/components/church-av";
import { SiteShell } from "@/components/site-shell";
import { breadcrumbJsonLd } from "@/lib/church-av";
import { HELP_PAGES, helpPath } from "@/lib/church-av-help";
import { absoluteUrl, pageHead } from "@/lib/seo";

const PATH = "/church-av/help";
const DESCRIPTION =
  "Plain-language help for pastors and church committees: why sound, hearing, livestream, and volunteer problems happen in a sanctuary, and what fixes them.";

export const Route = createFileRoute("/church-av/help/")({
  component: HelpIndex,
  head: () =>
    pageHead({
      title: "Church Sound & Livestream Problems, Explained | United Under God",
      description: DESCRIPTION,
      path: PATH,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Church sound and livestream problems, explained",
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
        title="Sound, hearing, and livestream problems, explained"
        crumbs={[{ name: "Church sound, video & lighting", to: "/church-av" }, { name: "Help" }]}
      >
        <p>
          Start with what you are noticing on Sunday morning. Each page explains why it happens, in
          plain language, what fixes it, and how fixing it serves your congregation.
        </p>
      </AvHero>
      <section className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
        <ul className="grid gap-6 sm:grid-cols-2">
          {HELP_PAGES.map((page) => (
            <li key={page.slug} className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]">
              <h2 className="font-display text-xl">
                <Link
                  to="/church-av/help/$slug"
                  params={{ slug: page.slug }}
                  className="text-forest underline-offset-4 hover:underline"
                >
                  {page.h1}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted">{page.description}</p>
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
      <RequestSection source={{ path: PATH, label: "Church AV help" }} />
    </SiteShell>
  );
}
