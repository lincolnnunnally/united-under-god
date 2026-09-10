import { createFileRoute, Link } from "@tanstack/react-router";
import { InvolvementForm } from "@/components/involvement-form";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { DESKS, HAPPENINGS } from "@/lib/content";

export const Route = createFileRoute("/happenings")({
  component: HappeningsPage,
  head: () => ({
    meta: [{ title: "What’s on — United Under God" }],
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
            Enter once. The right people hear it. The right desk runs it.
          </h1>
          <p className="mt-5 max-w-2xl text-muted">
            We do not need another mega-app. We need one operations habit:
            put the event, the volunteer need, or the surplus in the desk that
            owns it. ChurchConnect is that habit for gatherings. Plenty is that
            habit for food. Operate is that habit for goods. This website is the
            front door.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="text-3xl">The desks</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Simplicity is not “one login for the universe.” Simplicity is knowing
          which door to open — and never entering the same fact twice.
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
            This list is the public face. The source of truth for events and
            volunteer shifts is ChurchConnect — so a pantry Saturday and a
            Sunday gathering are not typed in two places.
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
                href="https://churchconnect.unitedundergod.org"
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
            Tell us a name, a skill, a Saturday. We will not add you to a fog of
            email. We will put you on a shift, a route, or a porch.
          </p>
        </div>
        <InvolvementForm intent="time" />
      </section>
    </SiteShell>
  );
}
