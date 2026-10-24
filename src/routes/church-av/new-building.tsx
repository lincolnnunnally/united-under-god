import { createFileRoute } from "@tanstack/react-router";
import {
  LandingActions,
  LandingBody,
  LandingCrumbs,
  LandingLook,
} from "@/components/church-av-landing";
import { SiteShell } from "@/components/site-shell";
import { getLanding, landingHead } from "@/lib/church-av-landing";

const PAGE = getLanding("new-building");

export const Route = createFileRoute("/church-av/new-building")({
  component: NewBuildingPage,
  head: () => landingHead(PAGE),
});

/** A sanctuary floor plan in blueprint line work, with AV positions marked. */
function FloorPlan() {
  const marks = [
    { x: 70, y: 52, label: "Speaker" },
    { x: 250, y: 52, label: "Speaker" },
    { x: 160, y: 44, label: "Hanging point" },
    { x: 160, y: 196, label: "Camera" },
    { x: 60, y: 150, label: "Camera" },
    { x: 160, y: 228, label: "Sound booth" },
  ];
  return (
    <figure className="av-nb-plan">
      <svg
        viewBox="0 0 320 260"
        role="img"
        aria-label="A sanctuary floor plan with speaker, hanging point, camera, and sound booth positions marked"
      >
        <rect x="30" y="20" width="260" height="225" className="av-nb-wall" />
        <path d="M100 20 V70 H220 V20" className="av-nb-line" />
        <path d="M30 245 H140 M180 245 H290" className="av-nb-wall-thick" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <line x1="55" x2="145" y1={95 + i * 18} y2={95 + i * 18} className="av-nb-line" />
            <line x1="175" x2="265" y1={95 + i * 18} y2={95 + i * 18} className="av-nb-line" />
          </g>
        ))}
        <path d="M30 12 H290" className="av-nb-dim" />
        <path d="M30 8 V16 M290 8 V16" className="av-nb-dim" />
        {marks.map((m) => (
          <g key={m.label}>
            <circle cx={m.x} cy={m.y} r="5" className="av-nb-mark" />
            <text x={m.x + 8} y={m.y + 4} className="av-nb-label">
              {m.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="av-nb-caption">
        Planned on paper first: where the speakers, cameras, and sound booth go, and what hangs from
        the ceiling.
      </figcaption>
    </figure>
  );
}

function NewBuildingPage() {
  return (
    <SiteShell>
      <LandingLook page={PAGE}>
        <header className="av-nb-hero">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-10 pb-16 md:grid-cols-[1.1fr_1fr] md:items-center md:px-8 md:pb-20">
            <div>
              <LandingCrumbs page={PAGE} />
              <p className="av-l-eyebrow mt-8">{PAGE.eyebrow}</p>
              <h1 className="av-nb-h1">{PAGE.h1}</h1>
              <p className="av-nb-lead">{PAGE.lead}</p>
              <LandingActions page={PAGE} className="mt-8" />
            </div>
            <FloorPlan />
          </div>
        </header>
        <LandingBody page={PAGE} />
      </LandingLook>
    </SiteShell>
  );
}
