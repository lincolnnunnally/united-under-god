import { createFileRoute, Link } from "@tanstack/react-router";
import { ReportProblemLink } from "@/components/report-problem";
import { SiteShell } from "@/components/site-shell";
import { CovenantBlock } from "@/components/vendor-covenant";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { VENDOR_TERMS_VERSION, vendorTerms } from "@/lib/vendor-terms";

export const Route = createFileRoute("/buying/vendor-terms")({
  component: VendorTermsPage,
  head: () =>
    pageHead({
      title: "Vendor Covenant and Vendor Terms | United Under God",
      description:
        "The standard every vendor in the United Under God church buying program agrees to keep: make it right, stand behind your work, quote honestly. Plus rebates, referral fees, and reporting.",
      path: "/buying/vendor-terms",
    }),
});

function VendorTermsPage() {
  const sections = vendorTerms();
  return (
    <SiteShell>
      <section className="border-b border-rule bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link to="/buying" className="underline-offset-4 hover:text-ink hover:underline">
              Group buying
            </Link>
            {" / "}
            <span aria-current="page">Vendor Terms</span>
          </nav>
          <h1 className="mt-6 text-4xl">Vendor Covenant and Vendor Terms</h1>
          <p className="mt-4 text-muted">Version {VENDOR_TERMS_VERSION}</p>
          <ReportProblemLink className="mt-4" />
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <div className="grid gap-10">
          {sections.map((section) =>
            section.covenant ? (
              <CovenantBlock key={section.heading} section={section} />
            ) : (
              <div key={section.heading}>
                <h2 className="text-2xl">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            ),
          )}
        </div>
        <div className="mt-12">
          <Button asChild>
            <Link to="/buying/vendors">Sign up as a vendor</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
