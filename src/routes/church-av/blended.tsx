import { createFileRoute } from "@tanstack/react-router";
import {
  LandingActions,
  LandingBody,
  LandingCrumbs,
  LandingLook,
} from "@/components/church-av-landing";
import { StageIllustration } from "@/components/church-av-stage";
import { SiteShell } from "@/components/site-shell";
import { getLanding, landingHead } from "@/lib/church-av-landing";

const PAGE = getLanding("blended");

export const Route = createFileRoute("/church-av/blended")({
  component: BlendedPage,
  head: () => landingHead(PAGE),
});

function BlendedPage() {
  return (
    <SiteShell>
      <LandingLook page={PAGE}>
        <header className="av-blend-hero">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-10 pb-16 md:grid-cols-[1.1fr_1fr] md:items-center md:px-8 md:pb-20">
            <div>
              <LandingCrumbs page={PAGE} />
              <p className="av-l-eyebrow mt-8">{PAGE.eyebrow}</p>
              <h1 className="av-blend-h1">{PAGE.h1}</h1>
              <p className="av-blend-lead">{PAGE.lead}</p>
              <LandingActions page={PAGE} className="mt-8" />
            </div>
            <div className="av-blend-panel">
              <div className="av-blend-chips" aria-hidden="true">
                <span>Hymns</span>
                <span>Choir</span>
                <span>Band</span>
              </div>
              <StageIllustration style="blended" className="min-w-0" />
            </div>
          </div>
        </header>
        <LandingBody page={PAGE} />
      </LandingLook>
    </SiteShell>
  );
}
