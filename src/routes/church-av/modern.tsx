import { createFileRoute } from "@tanstack/react-router";
import {
  LandingActions,
  LandingBody,
  LandingCrumbs,
  LandingLook,
} from "@/components/church-av-landing";
import { SiteShell } from "@/components/site-shell";
import { AV_CASE_STUDIES } from "@/lib/church-av";
import { getLanding, landingHead } from "@/lib/church-av-landing";

const PAGE = getLanding("modern");
const FEATURED = AV_CASE_STUDIES["word-of-faith"];

export const Route = createFileRoute("/church-av/modern")({
  component: ModernPage,
  head: () => landingHead(PAGE),
});

function ModernPage() {
  return (
    <SiteShell>
      <LandingLook page={PAGE}>
        <header className="av-mod-hero">
          <div className="av-mod-beams" aria-hidden="true">
            <span className="av-mod-beam av-mod-beam-1" />
            <span className="av-mod-beam av-mod-beam-2" />
            <span className="av-mod-beam av-mod-beam-3" />
            <span className="av-mod-beam av-mod-beam-4" />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-5 pt-10 pb-16 md:px-8 md:pb-24">
            <LandingCrumbs page={PAGE} />
            <p className="av-l-eyebrow mt-16 md:mt-28">{PAGE.eyebrow}</p>
            <h1 className="av-mod-h1">{PAGE.h1}</h1>
            <p className="av-mod-lead">{PAGE.lead}</p>
            <LandingActions page={PAGE} className="mt-10" />
            <div className="av-mod-feature">
              <p className="av-l-eyebrow">Featured project</p>
              <p className="av-mod-feature-title">
                {FEATURED.name}, {FEATURED.city}
              </p>
              <ul className="av-mod-feature-list">
                <li>{FEATURED.highlights[0]}</li>
                <li>{FEATURED.highlights[1]}</li>
              </ul>
            </div>
          </div>
        </header>
        <LandingBody page={PAGE} />
      </LandingLook>
    </SiteShell>
  );
}
