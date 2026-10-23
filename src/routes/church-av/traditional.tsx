import { createFileRoute } from "@tanstack/react-router";
import {
  LandingActions,
  LandingBody,
  LandingCrumbs,
  LandingLook,
} from "@/components/church-av-landing";
import { SiteShell } from "@/components/site-shell";
import { getLanding, landingHead } from "@/lib/church-av-landing";

const PAGE = getLanding("traditional");

export const Route = createFileRoute("/church-av/traditional")({
  component: TraditionalPage,
  head: () => landingHead(PAGE),
});

/** A rose window in muted glass colors: ornament only, no motion. */
function RoseWindow() {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 120 120" className="av-trad-rose" aria-hidden="true" focusable="false">
      <circle cx="60" cy="60" r="56" className="av-trad-lead" fill="none" strokeWidth="2" />
      <circle cx="60" cy="60" r="50" className="av-trad-glass-gold" />
      {petals.map((deg, i) => (
        <path
          key={deg}
          d="M60 60 C52 44 52 22 60 12 C68 22 68 44 60 60 Z"
          transform={`rotate(${deg} 60 60)`}
          className={i % 2 ? "av-trad-glass-blue" : "av-trad-glass-ruby"}
        />
      ))}
      {petals.map((deg) => (
        <path
          key={`l${deg}`}
          d="M60 60 C52 44 52 22 60 12 C68 22 68 44 60 60 Z"
          transform={`rotate(${deg} 60 60)`}
          className="av-trad-lead"
          fill="none"
          strokeWidth="1.4"
        />
      ))}
      <circle
        cx="60"
        cy="60"
        r="11"
        className="av-trad-glass-green av-trad-lead"
        strokeWidth="1.4"
      />
      <rect x="58" y="51" width="4" height="18" className="av-trad-glass-gold" />
      <rect x="53" y="56" width="14" height="4" className="av-trad-glass-gold" />
    </svg>
  );
}

function Fleuron() {
  return (
    <div className="av-trad-fleuron" aria-hidden="true">
      <span />
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 3v18M7 9h10" strokeWidth="1.5" fill="none" />
      </svg>
      <span />
    </div>
  );
}

function TraditionalPage() {
  return (
    <SiteShell>
      <LandingLook page={PAGE}>
        <header className="av-trad-hero">
          <div className="mx-auto max-w-4xl px-5 pt-10 pb-16 text-center md:px-8 md:pt-14 md:pb-24">
            <LandingCrumbs page={PAGE} />
            <RoseWindow />
            <p className="av-l-eyebrow mt-6">{PAGE.eyebrow}</p>
            <h1 className="av-trad-h1">{PAGE.h1}</h1>
            <Fleuron />
            <p className="av-trad-lead-text">{PAGE.lead}</p>
            <LandingActions page={PAGE} className="mt-10 justify-center" />
          </div>
        </header>
        <LandingBody page={PAGE} />
      </LandingLook>
    </SiteShell>
  );
}
