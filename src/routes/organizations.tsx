import { createFileRoute, Link } from "@tanstack/react-router";
import { OfferList, WhatItCosts, WhichIsRight } from "@/components/front-door";
import { SiteShell } from "@/components/site-shell";
import { SignInNudge } from "@/components/sign-in-nudge";
import { Button } from "@/components/ui/button";
import { ORG_TYPES } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/organizations")({
  component: OrganizationsPage,
  head: () =>
    pageHead({
      title: "For churches, charities, and businesses | United Under God",
      description: "Churches, charities, and Christian-owned businesses that work together save money and reach more of their town: the seal, group buying, outreach, and church tools.",
      path: "/organizations",
    }),
});

function OrganizationsPage() {
  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden tone-night bg-ink text-paper">
        <img
          src="/images/fellowship.jpg"
          alt="Pastors and local leaders gathered around a table"
          className="absolute inset-0 size-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            Churches · businesses · charities · civic work
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl text-paper">
            Do more ministry with the money, time, and people you already
            have.
          </h1>
          <p className="mt-5 max-w-2xl text-paper/88">
            Churches, charities, and Christian-owned businesses that work
            together save money, share the load, and reach more of their town.
            We provide the tools and the connections to make that easy.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-10 md:px-8">
        <SignInNudge about="group buying, outreach, and the seal" />
      </section>

      <OfferList id="what-we-do" intro={false} className="mt-10 border-t" />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
          <WhatItCosts className="max-w-3xl" />
        </div>
      </section>

      <WhichIsRight />

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-2">
          {ORG_TYPES.map((item) => (
            <article key={item.title} className="border-t border-rule pt-6">
              <h2 className="text-2xl">{item.title}</h2>
              <p className="mt-3 text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/buying/need">Post a need</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/membership">Become a member church</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/join">Take the seal</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted">
          A business that sells to churches?{" "}
          <Link
            to="/buying/sell-to-churches"
            className="text-forest underline-offset-4 hover:underline"
          >
            See the church vendor program
          </Link>
          .
        </p>
      </section>
    </SiteShell>
  );
}
