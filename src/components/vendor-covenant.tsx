import type { TermsSection } from "@/lib/vendor-terms";

/** The covenant section, rendered as a numbered list of commitments. */
export function CovenantBlock({ section }: { section: TermsSection }) {
  return (
    <div
      id="covenant"
      className="scroll-mt-24 rounded-xl bg-cream p-6 shadow-[var(--shadow-border)]"
      data-covenant=""
    >
      <h2 className="text-2xl">{section.heading}</h2>
      {section.body.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-muted">
          {paragraph}
        </p>
      ))}
      <ol className="mt-6 grid gap-4">
        {(section.points ?? []).map((point, index) => (
          <li key={point.title} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
            <span className="font-display text-lg text-forest">{index + 1}.</span>
            <div>
              <p>
                <span className="font-medium text-ink">{point.title}</span>{" "}
                <span className="text-muted">{point.text}</span>
              </p>
              {point.list ? (
                <ul className="mt-2 list-disc pl-5 text-muted">
                  {point.list.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {point.after ? <p className="mt-2 text-muted">{point.after}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
