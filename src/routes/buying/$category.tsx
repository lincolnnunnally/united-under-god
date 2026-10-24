import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { InvolvementForm } from "@/components/involvement-form";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import {
  MODEL_EXPLAINED,
  MODEL_LABELS,
  allItems,
  catalogView,
  getSpendCategory,
  isLicensed,
  modelMix,
  type BuyingModel,
  type CatalogItemView,
  type SpendCategory,
} from "@/lib/church-spend";
import { listCatalogBook } from "@/lib/source-actions";
import { absoluteUrl, pageHead, serviceJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/buying/$category")({
  loader: async ({ params }) => {
    const category = getSpendCategory(params.category);
    if (!category) throw notFound();
    // Sound, livestream, and lighting have their own pages.
    if (category.route) throw redirect({ href: category.route, statusCode: 301 });
    const read = await listCatalogBook();
    return { categoryId: category.id, ...read };
  },
  component: CategoryPage,
  head: ({ loaderData }) => {
    const category = loaderData ? getSpendCategory(loaderData.categoryId) : undefined;
    if (!category) return { meta: [{ title: "Group buying | United Under God" }] };
    const path = `/buying/${category.id}`;
    return pageHead({
      title: category.subcategories.every((sub) => isLicensed(category, sub))
        ? `${category.name} for churches, by introduction | United Under God`
        : `${category.name}: church group buying | United Under God`,
      description: category.metaDescription,
      path,
      jsonLd: [
        serviceJsonLd({
          name: `Group buying for churches: ${category.name.toLowerCase()}`,
          description: category.metaDescription,
          path,
          serviceType: "Group purchasing",
          audience: "Churches, charities, and Christian-owned businesses",
        }),
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { name: "Home", path: "/" },
            { name: "Group buying", path: "/buying" },
            { name: category.name, path },
          ].map((crumb, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: crumb.name,
            item: absoluteUrl(crumb.path),
          })),
        },
      ],
    });
  },
});

const STATUS_TEXT: Record<CatalogItemView["status"], string> = {
  priced: "Group price",
  bidding: "Bid open now",
  referral: "By introduction",
  "not-bid": "Not bid yet",
};

function CategoryPage() {
  const { categoryId, entries, bidding, unavailable } = Route.useLoaderData();
  const category = getSpendCategory(categoryId) as SpendCategory;
  const view = catalogView(category, entries, bidding);
  const mix = modelMix(allItems(category));
  const models = (Object.keys(mix) as BuyingModel[]).filter((model) => mix[model] > 0);
  const path = `/buying/${category.id}`;
  const referralOnly = view.sections.every((section) => section.requires?.kind === "licensed");

  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link to="/buying" className="underline-offset-4 hover:text-ink hover:underline">
              Group buying
            </Link>
            {" / "}
            <span aria-current="page">{category.name}</span>
          </nav>
          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-forest uppercase">
            Buying catalog
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl">{category.name}</h1>
          <p className="mt-5 max-w-2xl text-muted">{category.summary}</p>
          {category.requires ? <RequirementNote note={category.requires.note} /> : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <a href="#join">
                {referralOnly ? "Ask for an introduction" : "Tell us what you buy"}
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/buying">All buying catalogs</Link>
            </Button>
          </div>
          <p className="mt-6 max-w-2xl text-sm text-muted">
            {unavailable
              ? "Group prices could not be loaded just now. Please check back shortly."
              : view.pricedCount === 0
                ? "Nothing in this catalog has been bid yet. Prices appear here only after a bid is awarded."
                : `${view.pricedCount} of ${view.itemCount} items have a group price from an awarded bid.`}
          </p>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
          <h2 className="text-2xl">How these are bought</h2>
          <dl className="mt-6 grid gap-6 md:grid-cols-2">
            {models.map((model) => (
              <div key={model}>
                <dt className="font-medium text-ink">
                  {MODEL_LABELS[model]}
                  <span className="text-muted"> · {mix[model]}</span>
                </dt>
                <dd className="mt-1 text-sm text-muted">{MODEL_EXPLAINED[model]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-2xl text-sm text-muted">
            Group pricing comes from bids. We ask vendors to quote the group, award the bid, and
            list the awarded price here. Each church then buys what it needs, when it needs it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="max-w-2xl text-3xl">What is in this catalog</h2>
        <div className="mt-10 grid gap-12">
          {view.sections.map(({ sub, requires, items }) => (
            <div key={sub.id}>
              <h3 className="font-display text-xl">{sub.name}</h3>
              {requires && requires !== category.requires ? (
                <RequirementNote note={requires.note} />
              ) : null}
              <ul className="mt-4 divide-y divide-rule rounded-xl bg-cream shadow-[var(--shadow-border)]">
                {items.map((row) => (
                  <CatalogRow key={row.item.id} row={row} />
                ))}
              </ul>
            </div>
          ))}
        </div>
        {view.otherPrices.length ? (
          <div className="mt-12">
            <h3 className="font-display text-xl">Other group prices in this catalog</h3>
            <ul className="mt-4 divide-y divide-rule rounded-xl bg-cream shadow-[var(--shadow-border)]">
              {view.otherPrices.map((entry) => (
                <li key={entry.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-sm font-medium text-forest">
                      ${entry.unitPrice}
                      {entry.unit ? ` / ${entry.unit}` : ""}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted">{entry.vendorName}</p>
                  {entry.notes ? <p className="mt-1 text-sm text-muted">{entry.notes}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
          <div>
            {referralOnly ? (
              <>
                <h2 className="text-3xl">Ask for an introduction</h2>
                <p className="mt-4 text-muted">
                  Tell us what your church needs in {category.name.toLowerCase()}. We will introduce
                  you to a licensed professional who serves churches, and you will work with them
                  directly.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl">Not bid yet?</h2>
                <p className="mt-4 text-muted">
                  Tell us what your church buys in {category.name.toLowerCase()} and about how
                  often. Each church that tells us goes into the next bid, and a bid with more
                  churches in it is a stronger ask.
                </p>
              </>
            )}
            <p className="mt-6 text-sm text-muted">
              Joining group buying has no fee, and there is no minimum order.
            </p>
            <p className="mt-6">
              <Link to="/assessment" className="text-forest underline-offset-4 hover:underline">
                See where your church could save time and money
              </Link>
            </p>
          </div>
          <div id="join" className="scroll-mt-24">
            <InvolvementForm
              intent="buying"
              source={{ path, label: `Group buying: ${category.name}` }}
              messageLabel={
                referralOnly
                  ? `What does your church need in ${category.name.toLowerCase()}?`
                  : `What do you buy in ${category.name.toLowerCase()}, and how often?`
              }
            />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function RequirementNote({ note }: { note: string }) {
  return (
    <p className="mt-4 max-w-2xl rounded-lg bg-paper px-4 py-3 text-sm text-ink shadow-[var(--shadow-border)]">
      {note}
    </p>
  );
}

function CatalogRow({ row }: { row: CatalogItemView }) {
  const { item, status, prices } = row;
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{item.name}</p>
        <p
          className={status === "priced" ? "text-sm font-medium text-forest" : "text-sm text-muted"}
        >
          {STATUS_TEXT[status]}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted">
        {MODEL_LABELS[item.model]} · unit: {item.unit} · {item.frequency}
      </p>
      {prices.length ? (
        <ul className="mt-2 grid gap-1 text-sm">
          {prices.map((entry) => (
            <li key={entry.id}>
              <span className="font-medium text-forest">
                ${entry.unitPrice}
                {entry.unit ? ` / ${entry.unit}` : ""}
              </span>
              <span className="text-muted">
                {" "}
                · {entry.vendorName}
                {entry.notes ? ` · ${entry.notes}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : status === "not-bid" ? (
        <p className="mt-2 text-sm text-muted">
          Not bid yet.{" "}
          <a href="#join" className="text-forest underline-offset-4 hover:underline">
            Tell us what you buy
          </a>{" "}
          so we can include you in the next bid.
        </p>
      ) : status === "bidding" ? (
        <p className="mt-2 text-sm text-muted">
          Vendors are quoting this now.{" "}
          <a href="#join" className="text-forest underline-offset-4 hover:underline">
            Tell us what you buy
          </a>{" "}
          so your church is counted.
        </p>
      ) : null}
    </li>
  );
}
