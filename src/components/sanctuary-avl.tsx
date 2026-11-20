import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { InvolvementForm } from "@/components/involvement-form";
import { Button } from "@/components/ui/button";
import { AVL_ORIGIN, avlUrl } from "@/lib/sanctuary-avl-host";
import {
  AVL_NAME,
  BALLPARK_NOTE,
  ROOM_SIZES,
  SYSTEMS,
  rangeText,
  type RoomSize,
} from "@/lib/sanctuary-avl";
import { ldJsonMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

/**
 * Sanctuary AVL's own look on top of this app's design tokens: the shell
 * re-points the shared color variables to a cool "stage light" palette, so the
 * existing Button, form and type styles read as Sanctuary AVL without a second
 * component set. Nothing here names or pictures a partner company.
 */
const AVL_THEME = {
  "--color-paper": "#0a0c11",
  "--color-cream": "#11141c",
  "--color-surface": "#181c26",
  "--color-forest": "#6cc3ff",
  "--color-forest-deep": "#a8dcff",
  "--color-primary": "#6cc3ff",
  "--color-primary-foreground": "#0a0c11",
  "--color-ring": "#6cc3ff",
  "--color-stone": "#6cc3ff",
  "--color-stone-hover": "#a8dcff",
  "--color-rule": "#222838",
  "--color-rule-strong": "#2d3447",
  "--color-border": "#222838",
  "--color-card": "#11141c",
} as CSSProperties;

const NAV = [
  { to: "/avl/guides", label: "Guides", params: undefined },
  { to: "/avl/guides/$slug", label: "Costs", params: { slug: "church-av-cost" } },
  { to: "/avl/how-it-works", label: "How it works", params: undefined },
] as const;

export function AvlShell({ children }: { children: ReactNode }) {
  return (
    <div style={AVL_THEME} className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8">
          <Link to="/avl" className="flex items-center gap-2" aria-label={`${AVL_NAME} home`}>
            <AvlMark />
            <span className="font-display text-xl tracking-wide text-heading uppercase">
              Sanctuary <span className="text-forest">AVL</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                params={item.params as never}
                className="text-muted hover:text-heading"
                activeProps={{ className: "text-heading" }}
                activeOptions={{ exact: true }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button asChild size="sm">
            <Link to="/avl/request">Plan my room</Link>
          </Button>
        </div>
        <nav
          className="flex gap-5 overflow-x-auto border-t border-rule px-5 py-2 text-sm md:hidden"
          aria-label="Main"
        >
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              params={item.params as never}
              className="shrink-0 text-muted hover:text-heading"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-rule bg-cream">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 text-sm md:grid-cols-3 md:px-8">
          <div>
            <p className="font-display text-lg tracking-wide text-heading uppercase">
              Sanctuary <span className="text-forest">AVL</span>
            </p>
            <p className="mt-2 text-muted">Sound, lighting and video for churches, nationwide.</p>
          </div>
          <div>
            <p className="font-semibold text-heading">Guides</p>
            <ul className="mt-2 space-y-1.5">
              {ROOM_SIZES.map((size) => (
                <li key={size.slug}>
                  <Link
                    to="/avl/sizes/$slug"
                    params={{ slug: size.slug }}
                    className="text-muted hover:text-heading"
                  >
                    {size.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/avl/guides" className="text-muted hover:text-heading">
                  All guides
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-muted">
            <p>
              Sanctuary AVL brings churches to experienced church installation teams. We are paid by
              the installer when a church goes ahead, never by your church.
            </p>
            <p className="mt-3">A service of United Under God, Inc., a 501(c)(3) nonprofit.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AvlMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="7"
        fill="#11141c"
        stroke="#6cc3ff"
        strokeWidth="2"
      />
      <path d="M16 6 L9 26 M16 6 L23 26" stroke="#6cc3ff" strokeWidth="2" strokeLinecap="round" />
      <path d="M11.5 19 H20.5" stroke="#a8dcff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AvlHero({
  eyebrow,
  title,
  children,
  image,
  cta = true,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  image?: { src: string; alt: string };
  cta?: boolean;
}) {
  return (
    <section className="relative overflow-hidden border-b border-rule">
      {image ? (
        <>
          <img
            src={image.src}
            alt={image.alt}
            className="absolute inset-0 h-full w-full object-cover opacity-45"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/85 to-paper/30" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(108,195,255,0.18),transparent_60%)]" />
      )}
      <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl leading-tight text-heading md:text-6xl">{title}</h1>
        {children ? <div className="mt-5 max-w-2xl text-lg text-ink/90">{children}</div> : null}
        {cta ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/avl/request">
                Plan my room <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/avl/guides/$slug" params={{ slug: "church-av-cost" }}>
                See ballpark costs
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function Section({
  title,
  intro,
  children,
  className,
}: {
  title?: string;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20", className)}>
      {title ? <h2 className="text-3xl text-heading md:text-4xl">{title}</h2> : null}
      {intro ? <div className="mt-4 max-w-2xl text-muted">{intro}</div> : null}
      <div className={title || intro ? "mt-8" : ""}>{children}</div>
    </section>
  );
}

export function Cards({ items }: { items: { title: string; body: string; href?: ReactNode }[] }) {
  // Four (or two) cards sit two across; never leave one alone on a row of three.
  const three = items.length % 3 === 0 || items.length > 6;
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2", three && "lg:grid-cols-3")}>
      {items.map((item) => (
        <li key={item.title} className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-xl text-heading">{item.title}</h3>
          <p className="mt-2 text-muted">{item.body}</p>
          {item.href ? <div className="mt-3 text-sm">{item.href}</div> : null}
        </li>
      ))}
    </ul>
  );
}

export function SizeCards() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ROOM_SIZES.map((size) => (
        <li key={size.slug}>
          <Link
            to="/avl/sizes/$slug"
            params={{ slug: size.slug }}
            className="group flex h-full flex-col rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
          >
            <span className="font-display text-2xl text-heading">{size.label}</span>
            <span className="mt-2 flex-1 text-sm text-muted">{size.typical[0]}</span>
            <span className="mt-4 text-sm text-forest group-hover:underline">
              What your room needs <ArrowRight className="inline h-3.5 w-3.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Ballpark ranges, every size, or one size highlighted. */
export function PriceTable({ only }: { only?: RoomSize }) {
  const sizes = only ? [only] : ROOM_SIZES;
  return (
    <div>
      <div className="overflow-x-auto rounded-xl shadow-[var(--shadow-border)]">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-surface text-xs tracking-[0.12em] text-subtle uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">System</th>
              {sizes.map((size) => (
                <th key={size.slug} className="px-4 py-3 font-semibold">
                  {size.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-cream">
            {SYSTEMS.map((system) => (
              <tr key={system.key} className="border-t border-rule align-top">
                <th scope="row" className="px-4 py-4 font-normal">
                  <span className="font-semibold text-heading">{system.label}</span>
                  <span className="mt-1 block max-w-xs text-xs text-muted">{system.covers}</span>
                </th>
                {sizes.map((size) => (
                  <td key={size.slug} className="px-4 py-4 whitespace-nowrap text-ink">
                    {rangeText(size.ranges[system.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">{BALLPARK_NOTE}</p>
    </div>
  );
}

export function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <Check className="mt-1 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FaqList({ faq }: { faq: { q: string; a: string }[] }) {
  if (!faq.length) return null;
  return (
    <dl className="divide-y divide-rule rounded-xl bg-cream shadow-[var(--shadow-border)]">
      {faq.map((item) => (
        <div key={item.q} className="p-6">
          <dt className="font-semibold text-heading">{item.q}</dt>
          <dd className="mt-2 text-muted">{item.a}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The request form: the same "av" inquiry every church AV page sends (owner
 * email, the church's confirmation, the hourly ChurchConnect pipeline sync),
 * with Sanctuary AVL's words and a "Sent from: Sanctuary AVL …" line.
 */
export function AvlRequest({
  path,
  label,
  heading = "Tell us about your room",
}: {
  /** The /avl route path the form sits on. */
  path: string;
  /** Short page name for the "Sent from" line. */
  label: string;
  heading?: string;
}) {
  return (
    <section id="plan" className="scroll-mt-24 border-t border-rule bg-cream">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <h2 className="text-3xl text-heading md:text-4xl">{heading}</h2>
          <p className="mt-4 text-muted">
            A few lines is enough: how many people the room seats, what is not working, and whether
            you are building or renovating. A church installation team with nearly 30 years of
            church work will call you, walk your room and design for it.
          </p>
          <div className="mt-6">
            <Checklist
              items={[
                "No cost to your church to talk or for the walkthrough.",
                "A design for your room and a written proposal. You decide.",
                "We are paid by the installer when a church goes ahead, never by your church.",
              ]}
            />
          </div>
        </div>
        <InvolvementForm
          intent="av"
          source={{
            path: path.replace(/^\/avl/, "") || "/",
            label: `Sanctuary AVL ${label}`,
            origin: AVL_ORIGIN,
          }}
          submitLabel="Plan my room"
          messageLabel="About your room: seats, what is not working, any building plans"
          copy={{
            title: "Sanctuary AVL",
            lead: "Tell us about your sanctuary. We will call you back to talk it through.",
            done: "A church installation team will call you within one business day to talk through your room. Nothing here is a price or a quote.",
          }}
        />
      </div>
    </section>
  );
}

/** Head tags for a Sanctuary AVL page: its own canonical, title and site name. */
export function avlHead({
  title,
  description,
  path,
  jsonLd = [],
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown>[];
  type?: "website" | "article";
}) {
  const url = avlUrl(path);
  const full = title.includes(AVL_NAME) ? title : `${title} | ${AVL_NAME}`;
  return {
    meta: [
      { title: full },
      { name: "description", content: description },
      { property: "og:title", content: full },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: type },
      { property: "og:site_name", content: AVL_NAME },
      { property: "og:image", content: `${AVL_ORIGIN}/images/led-wall/email.jpg` },
      { name: "twitter:title", content: full },
      { name: "twitter:description", content: description },
      ...jsonLd.map(ldJsonMeta),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function avlBreadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: avlUrl(item.path),
    })),
  };
}

export function avlFaqJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
