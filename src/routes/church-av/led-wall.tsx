import { createFileRoute } from "@tanstack/react-router";
import {
  LandingActions,
  LandingBody,
  LandingCrumbs,
  LandingLook,
} from "@/components/church-av-landing";
import { BidHeroPicture, BidPains } from "@/components/church-av-bids";
import { SiteShell } from "@/components/site-shell";
import { getLanding, landingHead } from "@/lib/church-av-landing";

const PAGE = getLanding("led-wall");

export const Route = createFileRoute("/church-av/led-wall")({
  component: LedWallPage,
  head: () => landingHead(PAGE),
});

function LedWallPage() {
  return (
    <SiteShell>
      <LandingLook page={PAGE}>
        <header className="av-part-hero">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-10 pb-16 md:grid-cols-[1fr_1.15fr] md:items-center md:px-8 md:pb-20">
            <div>
              <LandingCrumbs page={PAGE} />
              <p className="av-l-eyebrow mt-8">{PAGE.eyebrow}</p>
              <h1 className="av-part-h1">{PAGE.h1}</h1>
              <p className="av-part-lead">{PAGE.lead}</p>
              <LandingActions page={PAGE} className="mt-8" />
            </div>
            <BidHeroPicture />
          </div>
          <BidPains page={PAGE} />
        </header>
        <LandingBody page={PAGE} />
      </LandingLook>
    </SiteShell>
  );
}
