import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { DonorBenefits } from "@/components/donor-benefits";
import { InvolvementForm } from "@/components/involvement-form";
import { SealBadge } from "@/components/seal-mark";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { BENEFITS, PILLARS, SCRIPTURE } from "@/lib/content";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  useEffect(() => {
    if (window.location.hostname.startsWith("bible.")) {
      void navigate({ to: "/bible" });
    }
  }, [navigate]);
  return (
    <SiteShell>
      <section className="relative isolate min-h-[92svh] overflow-hidden bg-ink text-paper">
        <img
          src="/images/hero.jpg"
          alt="Neighbors packing food together in a small-town warehouse"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/62 to-ink/28" />
        <div className="relative mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:px-8 md:pb-20">
          <p className="rise-in text-xs font-semibold tracking-[0.2em] text-paper/80 uppercase">
            A movement of Christians
          </p>
          <h1 className="rise-in rise-in-1 mt-4 max-w-3xl font-display text-4xl italic text-paper sm:text-5xl">
            United. Loving. Active.
          </h1>
          <p className="rise-in rise-in-2 mt-5 max-w-2xl text-lg text-paper/88">
            Not united because we share a building on Sunday. United under the
            authority of God — in grace, forgiveness, and reconciliation — and
            in work that makes the world look more like His Kingdom.
          </p>
          <div className="rise-in rise-in-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="invert" size="lg">
              <Link to="/join">
                Join the movement
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/give">Give what you have</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-rule bg-forest text-paper">
        <div className="mx-auto max-w-3xl px-5 py-12 text-center md:px-8">
          <p className="font-display text-xl italic leading-snug sm:text-2xl">
            “{SCRIPTURE.matthew.text}”
          </p>
          <p className="mt-4 text-xs font-semibold tracking-[0.18em] text-paper/70 uppercase">
            {SCRIPTURE.matthew.ref}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:px-8 md:py-24">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            The miss
          </p>
          <h2 className="mt-3 text-3xl">
            Calling ourselves united is not the same as being one.
          </h2>
          <div className="mt-6 space-y-4 text-muted">
            <p>
              Too many of us treat unity as attendance. We sit in the same room,
              sing the same songs, and go home still divided — still unreconciled,
              still uninvolved, still unseen by the neighbors who needed us this
              week.
            </p>
            <p>
              Jesus prayed that we would be one, so the world would believe. He
              told us to love one another with the love we had been shown. He
              told us to let our good works be seen, so people would praise our
              Father in heaven.
            </p>
            <p>
              United Under God exists to call Christians into that life: united
              under God’s authority, united in love, and active through the
              church doing things that actually change the world around us.
            </p>
          </div>
        </div>
        <figure className="overflow-hidden rounded-xl shadow-[var(--shadow-soft)]">
          <img
            src="/images/mission.jpg"
            alt="A neighbor handing groceries to another on a front porch"
            className="aspect-[3/2] w-full object-cover"
          />
        </figure>
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Three cords
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl">
            This is the life we are calling the church into.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className="border-t border-rule pt-6">
                <p className="font-display text-sm text-subtle">{pillar.kicker}</p>
                <h3 className="mt-2 font-display text-2xl italic">{pillar.title}</h3>
                <p className="mt-2 font-medium text-ink">{pillar.lead}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center md:px-8 md:py-24">
        <figure className="overflow-hidden rounded-xl shadow-[var(--shadow-soft)]">
          <img
            src="/images/hands.jpg"
            alt="Hands packing food into paper bags"
            className="aspect-[4/3] w-full object-cover"
          />
        </figure>
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Live on Mission
          </p>
          <h2 className="mt-3 text-3xl">
            See the need. Do the thing. Tell the story.
          </h2>
          <p className="mt-5 text-muted">
            This is not extra. It is the thing you already needed to do — and
            the thing you will get the greatest joy from. Live on Mission is
            the walk. Spark of Hope is where the story lives, so the next
            person does not start from zero.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink">
            <li className="border-l-2 border-forest pl-4">
              See the need. Maybe God let you see it so you could help.
            </li>
            <li className="border-l-2 border-forest pl-4">
              Do the thing. A meal, a truck, a porch, a pantry shift.
            </li>
            <li className="border-l-2 border-forest pl-4">
              Tell the story — so courage travels.
            </li>
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/mission">
                Start living on mission
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <a
                href="https://spark.unitedundergod.org"
                target="_blank"
                rel="noreferrer"
              >
                Spark of Hope
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y border-rule bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="text-xs font-semibold tracking-[0.18em] text-paper/60 uppercase">
            Why join
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl text-paper">
            There is a blessing in obeying this — financially, socially, and in
            the soul.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {BENEFITS.map((item) => (
              <article key={item.title}>
                <h3 className="font-display text-xl italic text-paper">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-paper/75">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:items-center md:px-8 md:py-24">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Vidalia food pantry
          </p>
          <h2 className="mt-3 text-3xl">
            The food that will not sell can still feed a family tonight.
          </h2>
          <p className="mt-5 text-muted">
            We are opening a pantry in Vidalia. About one in five people in the
            Vidalia-Lyons area live below the poverty line. In Toombs County,
            roughly one in four children faces food insecurity. Grocery stores,
            restaurants, and farms throw away food that is still good — while
            neighbors go without.
          </p>
          <p className="mt-4 text-muted">
            If you have food you cannot sell, you have a meal someone needs.
            Give it. We will put it in their hands. You will see the people who
            ate because of you.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/food-donors">For grocery stores</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/pantry">The Vidalia pantry</Link>
            </Button>
          </div>
        </div>
        <figure className="overflow-hidden rounded-xl shadow-[var(--shadow-soft)]">
          <img
            src="/images/pantry.jpg"
            alt="Food pantry shelves being stocked with produce and canned goods"
            className="aspect-[3/2] w-full object-cover"
          />
        </figure>
      </section>

      <section className="bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <DonorBenefits compact />
        </div>
      </section>

      <section className="border-y border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[auto_1fr] md:px-8 md:py-24">
          <SealBadge />
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
              The seal
            </p>
            <h2 className="mt-3 text-3xl">
              A public statement that you intend to be unified — and to fulfill
              the biblical mandate.
            </h2>
            <p className="mt-5 max-w-prose text-muted">
              Churches, businesses, charities, governments, and Christian-led
              teams can display the seal. It is free. It is never for sale. It
              always links back to a public page, so anyone can see what you
              meant by it. Keep your denomination. Keep your associations. We
              are not competing with you. We are calling you into one body —
              God’s Kingdom, our purpose.
            </p>
            <Button asChild className="mt-8">
              <Link to="/join">
                Take the seal
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1fr_1.05fr] md:px-8 md:py-24">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Raise your hand
          </p>
          <h2 className="mt-3 text-3xl">Maybe God let you see this so you could help.</h2>
          <p className="mt-5 text-muted">
            Offer time, money, or goods. Ask for the seal. Say you are ready to
            live on mission. We will not treat a raised hand as a mailing list.
            We will put you to work in love.
          </p>
          <blockquote className="mt-8 border-l-2 border-forest pl-5">
            <p className="font-display text-xl italic leading-snug">
              “{SCRIPTURE.john.text}”
            </p>
            <footer className="mt-3 text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
              {SCRIPTURE.john.ref}
            </footer>
          </blockquote>
        </div>
        <InvolvementForm intent="hand" />
      </section>
    </SiteShell>
  );
}
