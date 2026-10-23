import { createFileRoute } from "@tanstack/react-router";
import {
  LandingActions,
  LandingBody,
  LandingCrumbs,
  LandingLook,
} from "@/components/church-av-landing";
import { SiteShell } from "@/components/site-shell";
import { getLanding, landingHead } from "@/lib/church-av-landing";

const PAGE = getLanding("livestream-ministry");

export const Route = createFileRoute("/church-av/livestream-ministry")({
  component: LivestreamPage,
  head: () => landingHead(PAGE),
});

/** A tablet on a kitchen table, showing Sunday's service. Illustrative only. */
function StreamScreen() {
  return (
    <figure className="av-live-device">
      <div className="av-live-screen">
        <svg viewBox="0 0 320 180" role="img" aria-label="A Sunday service on a tablet at home">
          <rect width="320" height="180" className="av-live-scene" />
          <rect x="0" y="130" width="320" height="50" className="av-live-floor" />
          <path d="M140 70 V36 a20 20 0 0 1 40 0 V70 Z" className="av-live-window" />
          <rect x="157" y="30" width="6" height="40" className="av-live-ink" />
          <rect x="146" y="40" width="28" height="6" className="av-live-ink" />
          <path d="M146 130 L150 104 L170 104 L174 130 Z" className="av-live-ink" />
          <circle cx="160" cy="92" r="8" className="av-live-ink" />
          {Array.from({ length: 7 }, (_, i) => (
            <circle key={i} cx={100 + i * 20} cy="84" r="4" className="av-live-choir" />
          ))}
        </svg>
        <span className="av-live-pill">
          <span className="av-live-dot" aria-hidden="true" />
          Live
        </span>
      </div>
      <figcaption className="av-live-caption">Sunday morning, at home.</figcaption>
    </figure>
  );
}

function LivestreamPage() {
  return (
    <SiteShell>
      <LandingLook page={PAGE}>
        <header className="av-live-hero">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-10 pb-16 md:grid-cols-[1.15fr_1fr] md:items-center md:px-8 md:pb-20">
            <div>
              <LandingCrumbs page={PAGE} />
              <p className="av-l-eyebrow mt-8">{PAGE.eyebrow}</p>
              <h1 className="av-live-h1">{PAGE.h1}</h1>
              <p className="av-live-lead">{PAGE.lead}</p>
              <LandingActions page={PAGE} className="mt-8" />
            </div>
            <StreamScreen />
          </div>
        </header>
        <LandingBody page={PAGE} />
      </LandingLook>
    </SiteShell>
  );
}
