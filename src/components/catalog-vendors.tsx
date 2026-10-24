import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CovenantBadge } from "@/components/report-problem";
import {
  PreferredBadge,
  RankingDisclosure,
  ReviewLine,
  ScoreLine,
} from "@/components/vendor-ranking";
import { readCatalogVendorsFn } from "@/lib/public-vendor-actions";
import { FILE_KIND_LABELS, fileSize, type FileKind } from "@/lib/vendor-files";
import { getSpendCategory } from "@/lib/church-spend";
import { isRankedCategory } from "@/lib/vendor-rank";
import type { CatalogVendor, CatalogVendorsRead } from "@/lib/vendor-listing";

/**
 * Program vendors serving one catalog, in ranked order, with the Preferred
 * badge on the top eligible vendor and the ranking disclosure above the list.
 * One self-contained section, so a page can wrap it (for example in a gate).
 */
export function CatalogVendors({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [read, setRead] = useState<CatalogVendorsRead | null>(null);
  // Licensed catalogs (insurance, benefits, banking, payroll and tax, audit) are not ranked.
  const ranked = isRankedCategory(getSpendCategory(categoryId));

  useEffect(() => {
    if (!ranked) return;
    let live = true;
    readCatalogVendorsFn({ data: { categoryId } })
      .then((next) => live && setRead(next))
      .catch(() => live && setRead({ vendors: [], ranked: true, unavailable: true, filesVisible: false }));
    return () => {
      live = false;
    };
  }, [categoryId, ranked]);

  if (!ranked || (read && !read.ranked && !read.unavailable)) return null;

  return (
    <section className="border-t border-rule" id="vendors" data-catalog-vendors="">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <h2 className="max-w-2xl text-3xl">Program vendors for {categoryName.toLowerCase()}</h2>
        <p className="mt-4 max-w-2xl text-muted">
          Every approved vendor serving this catalog is listed. Vendors with a record are ranked;
          churches still buy from whichever vendor they choose.
        </p>
        <RankingDisclosure className="mt-3" />
        {!read ? (
          <p className="mt-8 text-sm text-muted">Loading vendors…</p>
        ) : read.unavailable ? (
          <p className="mt-8 text-sm text-muted">Vendors could not be loaded just now. Please check back shortly.</p>
        ) : read.vendors.length === 0 ? (
          <p className="mt-8 text-sm text-muted">
            No program vendor serves this catalog yet.{" "}
            <Link to="/buying/vendors" className="text-forest underline-offset-4 hover:underline">
              Vendors can sign up here.
            </Link>
          </p>
        ) : (
          <ol className="mt-8 grid gap-4">
            {read.vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} filesVisible={read.filesVisible} />
            ))}
          </ol>
        )}
      </div>
    </section>
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
        {vendor.phone && vendor.website ? " · " : null}
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
