import { createFileRoute, Link } from "@tanstack/react-router";
import { BecomeMemberCta } from "@/components/member-gate";
import { CovenantBadge, ReportProblemLink } from "@/components/report-problem";
import { SiteShell } from "@/components/site-shell";
import {
  PreferredBadge,
  RankingDisclosure,
  ReviewLine,
  ScoreLine,
} from "@/components/vendor-ranking";
import { readVendorProfileFn } from "@/lib/public-vendor-actions";
import { pageHead } from "@/lib/seo";
import { FILE_KIND_LABELS, fileSize, type FileKind } from "@/lib/vendor-files";
import type { PublicReview } from "@/lib/review-store";

/** A program vendor's public profile: details, standing in each catalog, published reviews, files. */
export const Route = createFileRoute("/buying/vendor/$id")({
  loader: ({ params }) => readVendorProfileFn({ data: { vendorId: params.id } }),
  component: VendorProfilePage,
  head: ({ loaderData, params }) => {
    const company = loaderData?.state === "ok" ? loaderData.profile.company : "Program vendor";
    // The page a non-member sees is a thin stub; keep search engines on the catalogs.
    return pageHead({
      title: `${company}: program vendor | United Under God`,
      description: `${company} serves churches in the United Under God buying program. Verified church reviews and catalog standing.`,
      path: `/buying/vendor/${params.id}`,
      noindex: loaderData?.state !== "ok",
    });
  },
});

function VendorProfilePage() {
  const read = Route.useLoaderData();
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-4xl px-5 py-16 md:px-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link to="/buying" className="underline-offset-4 hover:text-ink hover:underline">
              Group buying
            </Link>
            {" / "}
            <span aria-current="page">Program vendor</span>
          </nav>
          {read.state === "ok" ? (
            read.profile.locked ? (
              <LockedHeader company={read.profile.company} />
            ) : (
              <Header profile={read.profile} />
            )
          ) : (
            <>
              <h1 className="mt-6 text-3xl">
                {read.state === "missing" ? "This vendor is not listed" : "This page could not load"}
              </h1>
              <p className="mt-4 text-muted">
                {read.state === "missing"
                  ? "It may not be in the program right now."
                  : "Please try again shortly."}{" "}
                <Link to="/buying" className="text-forest underline-offset-4 hover:underline">
                  All buying catalogs
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
      {read.state === "ok" ? (
        read.profile.locked ? (
          <LockedBody profile={read.profile} />
        ) : (
          <Body profile={read.profile} />
        )
      ) : null}
    </SiteShell>
  );
}

type ViewerProfile = Extract<Awaited<ReturnType<typeof readVendorProfileFn>>, { state: "ok" }>["profile"];
type Profile = Exclude<ViewerProfile, { locked: true }>;
type Locked = Extract<ViewerProfile, { locked: true }>;

function LockedHeader({ company }: { company: string }) {
  return (
    <>
      <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-forest uppercase">
        Program vendor
      </p>
      <h1 className="mt-3 text-4xl">{company}</h1>
    </>
  );
}

/** A viewer who is not a member church: the name, its catalogs and standing, and the invitation. */
function LockedBody({ profile }: { profile: Locked }) {
  return (
    <section className="mx-auto max-w-4xl px-5 py-12 md:px-8">
      <Catalogs catalogs={profile.catalogs} />
      <BecomeMemberCta what={`${profile.company}'s contacts, brochures, and reviews`} className="mt-12" />
    </section>
  );
}

function Catalogs({ catalogs }: { catalogs: Profile["catalogs"] }) {
  return (
    <>
      <h2 className="text-2xl">In the catalogs</h2>
      <RankingDisclosure className="mt-2" />
      <ul className="mt-4 divide-y divide-rule rounded-xl bg-cream shadow-[var(--shadow-border)]">
        {catalogs.map((catalog) => (
          <li key={catalog.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <Link
              to="/buying/$category"
              params={{ category: catalog.id }}
              className="font-medium underline-offset-4 hover:underline"
            >
              {catalog.name}
            </Link>
            {catalog.preferred ? <PreferredBadge /> : null}
            {catalog.position ? <span className="text-sm text-muted">#{catalog.position}</span> : null}
            <ScoreLine score={catalog.score} newToProgram={catalog.newToProgram} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Header({ profile }: { profile: Profile }) {
  return (
    <>
      <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-forest uppercase">
        Program vendor
      </p>
      <h1 className="mt-3 text-4xl">{profile.company}</h1>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <ReviewLine count={profile.reviewCount} average={profile.reviewAverage} />
        {profile.covenant ? <CovenantBadge /> : null}
      </div>
      {profile.description ? <p className="mt-5 max-w-2xl text-ink">{profile.description}</p> : null}
      <p className="mt-4 text-sm text-muted">Area: {profile.area}</p>
      <p className="mt-1 text-sm text-muted">
        {profile.phone ? <a href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`}>{profile.phone}</a> : null}
        {profile.phone && profile.website ? " · " : null}
        {profile.website ? (
          <a
            href={profile.website}
            target="_blank"
            rel="noreferrer nofollow"
            className="text-forest underline-offset-4 hover:underline"
          >
            {profile.website.replace(/^https?:\/\//, "")}
          </a>
        ) : null}
      </p>
    </>
  );
}

function Body({ profile }: { profile: Profile }) {
  return (
    <section className="mx-auto max-w-4xl px-5 py-12 md:px-8">
      <Catalogs catalogs={profile.catalogs} />

      <h2 className="mt-12 text-2xl">Verified church reviews</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Only churches that bought through the program can review a vendor. We publish honest
        reviews, good or bad.
      </p>
      {profile.reviews.length === 0 ? (
        <p className="mt-4 text-muted">No published reviews yet.</p>
      ) : (
        <ul className="mt-4 grid gap-4">
          {profile.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}

      {profile.filesVisible && profile.files.length ? (
        <>
          <h2 className="mt-12 text-2xl">Brochures and price sheets</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {profile.files.map((file) => (
              <li key={file.id}>
                <a
                  href={`/api/vendor-files/${file.id}`}
                  rel="nofollow"
                  className="text-forest underline-offset-4 hover:underline"
                >
                  {file.title}
                </a>
                <span className="text-muted">
                  {" "}
                  · {FILE_KIND_LABELS[file.kind as FileKind] ?? "File"}
                  {file.catalog ? ` · ${file.catalog}` : ""} · {fileSize(file.size)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <ReportProblemLink className="mt-12" />
    </section>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const yes = (value: boolean) => (value ? "yes" : "no");
  return (
    <li className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]">
      <p className="font-medium">
        {review.overall} of 5 <span className="text-muted">· {review.author}</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        Quality {review.quality} of 5 · On time: {yes(review.onTime)} · Final bill matched the
        quote: {yes(review.billMatched)} · Would hire again: {yes(review.hireAgain)}
      </p>
      <p className="mt-3 whitespace-pre-line text-ink">{review.comment}</p>
      <p className="mt-2 text-xs text-subtle">
        {review.catalog ? `${review.catalog} · ` : ""}
        {review.createdAt}
      </p>
    </li>
  );
}
