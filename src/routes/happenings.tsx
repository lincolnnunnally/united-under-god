import { createFileRoute, Link } from "@tanstack/react-router";
import { InvolvementForm } from "@/components/involvement-form";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { DESKS, HAPPENINGS } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/happenings")({
  component: HappeningsPage,
  head: () =>
    pageHead({
      title: "Ways to serve and events near Vidalia | United Under God",
      description: "What is happening now: ways to serve, events, and where to go for food help, donated goods, church events, and volunteering in Vidalia, Georgia and beyond.",
      path: "/happenings",
    }),
});

function HappeningsPage() {
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            What’s on
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">
            Ways to serve, events, and where to find help.
          </h1>
          <p className="mt-5 max-w-2xl text-muted">
            Here is what is happening now and where to go for each kind of
            help — events and volunteering, food, and donated goods.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="text-3xl">Where to go</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Each of these is built for one job, so you can get what you need
          quickly.
        </p>
        <ol className="mt-10 grid gap-6 md:grid-cols-2">
          {DESKS.map((desk, index) => (
            <li key={desk.name} className="border-t border-rule pt-5">
              <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-display text-2xl italic">{desk.name}</h3>
              <p className="mt-2 text-sm text-muted">{desk.role}</p>
              {desk.href ? (
                desk.href.startsWith("http") ? (
                  <a
                    href={desk.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-forest"
                  >
                    Open {desk.name}
                  </a>
                ) : (
                  <Link
                    to={desk.href as "/donate"}
                    className="mt-3 inline-block text-sm font-medium text-forest"
                  >
                    Open {desk.name}
                  </Link>
                )
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <h2 className="text-3xl">Needs right now</h2>
          <p className="mt-3 max-w-2xl text-muted">
            These are the places we could use help right now. Pick one and
            tell us when you are free.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {HAPPENINGS.map((item) => (
              <article
                key={item.title}
                className="rounded-xl bg-paper p-6 shadow-[var(--shadow-border)]"
              >
                <p className="text-xs font-semibold tracking-[0.16em] text-forest uppercase">
                  {item.desk}
                </p>
                <h3 className="mt-2 font-display text-xl">{item.title}</h3>
                <p className="mt-2 text-sm text-ink">{item.when}</p>
                <p className="mt-3 text-sm text-muted">{item.need}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <a
                href="https://www.churchconnect.cloud"
                target="_blank"
                rel="noreferrer"
              >
                Open ChurchConnect
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/mission">Live on Mission</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <h2 className="text-3xl">I can help with what’s on.</h2>
          <p className="mt-4 text-muted">
            Tell us your name, a skill, and when you are free. We won’t bury
            you in email — we will match you with a real shift or need.
          </p>
        </div>
        <InvolvementForm intent="time" />
      </section>
    </SiteShell>
  );
}
