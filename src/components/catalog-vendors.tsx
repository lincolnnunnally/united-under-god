import { Link } from "@tanstack/react-router";
import { BecomeMemberCta } from "@/components/member-gate";
import { CovenantBadge } from "@/components/report-problem";
import { PreferredBadge, RankingDisclosure, ReviewLine, ScoreLine } from "@/components/vendor-ranking";
import type { CatalogVendorsView } from "@/lib/public-vendor-actions";
import { getSpendCategory } from "@/lib/church-spend";
import { FILE_KIND_LABELS, fileSize, type FileKind } from "@/lib/vendor-files";
import type { CatalogVendor, LockedCatalogVendor } from "@/lib/vendor-listing";
import { isRankedCategory } from "@/lib/vendor-rank";

/**
 * Program vendors serving one catalog, in ranked order, with the Preferred
 * badge on the top eligible vendor and the ranking disclosure above the list.
 * `read` comes from the page loader, already gated on the server: a viewer who
 * is not a member church gets names and the badge only.
 */
export function CatalogVendors({
  categoryId,
  categoryName,
  read,
}: {
  categoryId: string;
  categoryName: string;
  read: CatalogVendorsView;
}) {
  // Licensed catalogs (insurance, benefits, banking, payroll and tax, audit) are not ranked.
  if (!isRankedCategory(getSpendCategory(categoryId))) return null;
  if (!read.ranked && !read.unavailable) return null;

  return (
    <section className="border-t border-rule" id="vendors" data-catalog-vendors="">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="max-w-2xl text-3xl">Program vendors for {categoryName.toLowerCase()}</h2>
        <p className="mt-4 max-w-2xl text-muted">
          {read.unavailable || read.count === 0
            ? "Every approved vendor serving this catalog is listed here."
            : `${read.count} approved ${read.count === 1 ? "vendor serves" : "vendors serve"} this catalog. Vendors with a record are ranked; churches still buy from whichever vendor they choose.`}
        </p>
        <RankingDisclosure className="mt-3" />
        {read.unavailable ? (
          <p className="mt-8 text-sm text-muted">Vendors could not be loaded just now. Please check back shortly.</p>
        ) : read.vendors.length === 0 ? (
          <p className="mt-8 text-sm text-muted">
            No program vendor serves this catalog yet.{" "}
            <Link to="/buying/vendors" className="text-forest underline-offset-4 hover:underline">
              Vendors can sign up here.
            </Link>
          </p>
        ) : (
          <>
            <ol className="mt-8 grid gap-4">
              {read.vendors.map((vendor) =>
                vendor.locked ? (
                  <LockedCard key={vendor.id} vendor={vendor} />
                ) : (
                  <VendorCard key={vendor.id} vendor={vendor} filesVisible={read.filesVisible} />
                ),
              )}
            </ol>
            {read.member ? null : (
              <BecomeMemberCta
                what={`each vendor's contacts, brochures, and reviews for ${categoryName.toLowerCase()}`}
                className="mt-8"
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function LockedCard({ vendor }: { vendor: LockedCatalogVendor }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl bg-cream px-5 py-4 shadow-[var(--shadow-border)]" data-catalog-vendor="">
      <Link
        to="/buying/vendor/$id"
        params={{ id: vendor.id }}
        className="font-display text-xl underline-offset-4 hover:underline"
      >
        {vendor.company}
      </Link>
      {vendor.preferred ? <PreferredBadge /> : null}
    </li>
  );
}

function VendorCard({ vendor, filesVisible }: { vendor: CatalogVendor; filesVisible: boolean }) {
  return (
    <li className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)]" data-catalog-vendor="">
      <div className="flex flex-wrap items-center gap-2">
        {vendor.position ? <span className="text-sm text-subtle">#{vendor.position}</span> : null}
        <Link
          to="/buying/vendor/$id"
          params={{ id: vendor.id }}
          className="font-display text-xl underline-offset-4 hover:underline"
        >
          {vendor.company}
        </Link>
        {vendor.preferred ? <PreferredBadge /> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <ScoreLine score={vendor.score} newToProgram={vendor.newToProgram} />
        <ReviewLine count={vendor.reviewCount} average={vendor.reviewAverage} />
      </div>
      {vendor.covenant ? <CovenantBadge className="mt-1 block" /> : null}
      {vendor.description ? <p className="mt-3 text-sm text-ink">{vendor.description}</p> : null}
      {vendor.serves.length ? (
        <p className="mt-2 text-sm text-muted">Serves: {vendor.serves.join(", ")}</p>
      ) : null}
      {vendor.area ? <p className="mt-1 text-sm text-muted">Area: {vendor.area}</p> : null}
      <p className="mt-1 text-sm text-muted">
        {vendor.phone ? <a href={`tel:${vendor.phone.replace(/[^\d+]/g, "")}`}>{vendor.phone}</a> : null}
        {vendor.phone && (vendor.email || vendor.website) ? " · " : null}
        {vendor.email ? (
          <a href={`mailto:${vendor.email}`} className="text-forest underline-offset-4 hover:underline">
            {vendor.email}
          </a>
        ) : null}
        {vendor.email && vendor.website ? " · " : null}
        {vendor.website ? (
          <a
            href={vendor.website}
            target="_blank"
            rel="noreferrer nofollow"
            className="text-forest underline-offset-4 hover:underline"
          >
            {vendor.website.replace(/^https?:\/\//, "")}
          </a>
        ) : null}
      </p>
      {filesVisible && vendor.files.length ? (
        <ul className="mt-3 grid gap-1 text-sm">
          {vendor.files.map((file) => (
            <li key={file.id}>
              <a
                href={`/api/vendor-files/${file.id}`}
                className="text-forest underline-offset-4 hover:underline"
                rel="nofollow"
              >
                {file.title}
              </a>
              <span className="text-muted">
                {" "}
                · {FILE_KIND_LABELS[file.kind as FileKind] ?? "File"} · {fileSize(file.size)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
