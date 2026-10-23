import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { StageIllustration } from "@/components/church-av-stage";
import { Button } from "@/components/ui/button";
import {
  AGES,
  BUILDINGS,
  CEILINGS,
  DECIDERS,
  EMPTY_ANSWERS,
  PLANNER_PROCESS,
  PROBLEMS,
  SEATS,
  STYLES,
  SURFACES,
  WARRANTY_LINE,
  answerRows,
  clearSaved,
  loadSaved,
  saveAnswers,
  answersToSearch,
  cleanAnswers,
  missionBenefits,
  nextSteps,
  recommend,
  type Answers,
  type Choice,
} from "@/lib/church-av-planner";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------ questions

type StepDef = {
  title: string;
  hint?: string;
  done: (a: Answers) => boolean;
  render: (a: Answers, set: (patch: Partial<Answers>) => void) => ReactNode;
};

const STEPS: StepDef[] = [
  {
    title: "How does your church worship?",
    hint: "This shapes everything else, including whether a screen belongs in the room at all.",
    done: (a) => Boolean(a.style),
    render: (a, set) => (
      <Options name="style" choices={STYLES} value={a.style} onChange={(style) => set({ style })} />
    ),
  },
  {
    title: "How many seats are in the sanctuary?",
    done: (a) => Boolean(a.seats),
    render: (a, set) => (
      <Options name="seats" choices={SEATS} value={a.seats} onChange={(seats) => set({ seats })} />
    ),
  },
  {
    title: "Tell us about the room",
    hint: "Your best guess is fine.",
    done: (a) => Boolean(a.age && a.ceiling && a.surfaces),
    render: (a, set) => (
      <div className="space-y-8">
        <Options
          legend="When was the sanctuary built?"
          name="age"
          choices={AGES}
          value={a.age}
          onChange={(age) => set({ age })}
        />
        <Options
          legend="How tall is the ceiling?"
          name="ceiling"
          choices={CEILINGS}
          value={a.ceiling}
          onChange={(ceiling) => set({ ceiling })}
        />
        <Options
          legend="What are the surfaces like?"
          name="surfaces"
          choices={SURFACES}
          value={a.surfaces}
          onChange={(surfaces) => set({ surfaces })}
        />
      </div>
    ),
  },
  {
    title: "What is not working?",
    hint: "Choose any that apply, or none.",
    done: () => true,
    render: (a, set) => (
      <fieldset>
        <legend className="sr-only">What is not working</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROBLEMS.map((p) => {
            const checked = a.problems.includes(p.value);
            return (
              <label key={p.value} className={optionClass(checked)}>
                <input
                  type="checkbox"
                  name="problems"
                  value={p.value}
                  checked={checked}
                  onChange={() =>
                    set({
                      problems: checked
                        ? a.problems.filter((x) => x !== p.value)
                        : [...a.problems, p.value],
                    })
                  }
                  className="mt-1 size-4 shrink-0 accent-forest"
                />
                <span className="text-ink">{p.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    ),
  },
  {
    title: "Do you livestream, or want to?",
    done: (a) => Boolean(a.livestream),
    render: (a, set) => (
      <Options
        name="livestream"
        choices={[
          { value: "yes", label: "Yes", hint: "We stream now, or we would like to" },
          { value: "no", label: "No", hint: "Not for now" },
        ]}
        value={a.livestream}
        onChange={(livestream) => set({ livestream })}
      />
    ),
  },
  {
    title: "Any building plans?",
    done: (a) => Boolean(a.building),
    render: (a, set) => (
      <Options
        name="building"
        choices={BUILDINGS}
        value={a.building}
        onChange={(building) => set({ building })}
      />
    ),
  },
  {
    title: "Who makes the decision?",
    hint: "So the summary is written for the people who will read it.",
    done: (a) => Boolean(a.decider),
    render: (a, set) => (
      <Options
        name="decider"
        choices={DECIDERS}
        value={a.decider}
        onChange={(decider) => set({ decider })}
      />
    ),
  },
];

function optionClass(selected: boolean) {
  return cn(
    "flex cursor-pointer items-start gap-3 rounded-lg bg-paper p-4 shadow-[var(--shadow-border)] transition-colors",
    "has-[:focus-visible]:shadow-[0_0_0_2px_var(--color-forest)]",
    selected ? "bg-forest/10 shadow-[0_0_0_2px_var(--color-forest)]" : "hover:bg-surface",
  );
}

function Options<T extends string>({
  legend,
  name,
  choices,
  value,
  onChange,
}: {
  legend?: string;
  name: string;
  choices: Choice<T>[];
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      {legend ? (
        <legend className="mb-3 font-display text-lg text-ink">{legend}</legend>
      ) : (
        <legend className="sr-only">{name}</legend>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {choices.map((c) => (
          <label key={c.value} className={optionClass(value === c.value)}>
            <input
              type="radio"
              name={name}
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
              className="mt-1 size-4 shrink-0 accent-forest"
            />
            <span>
              <span className="block text-ink">{c.label}</span>
              {c.hint ? <span className="mt-0.5 block text-sm text-muted">{c.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ------------------------------------------------------------ wizard

export function PlannerWizard({
  initialProblem,
  onAnswers,
}: {
  initialProblem?: string;
  onAnswers: (answers: Answers, finished: boolean) => void;
}) {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setAnswers(saved.answers);
      setStep(saved.step);
    } else if (initialProblem) {
      setAnswers({
        ...EMPTY_ANSWERS,
        problems: cleanAnswers({ problems: initialProblem }).problems,
      });
    }
    setLoaded(true);
  }, [initialProblem]);

  useEffect(() => {
    if (!loaded) return;
    saveAnswers(answers, step);
    onAnswers(answers, step >= STEPS.length);
  }, [answers, step, loaded, onAnswers]);

  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));
  const finished = step >= STEPS.length;

  if (finished) {
    return (
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="secondary" onClick={() => setStep(STEPS.length - 1)}>
          <ArrowLeft className="size-4" />
          Change my answers
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            clearSaved();
            setAnswers(EMPTY_ANSWERS);
            setStep(0);
          }}
        >
          Start over
        </Button>
      </div>
    );
  }

  const current = STEPS[step];
  return (
    <div className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] sm:p-8">
      <div className="flex items-center justify-between gap-4 text-sm text-muted">
        <span>
          Question {step + 1} of {STEPS.length}
        </span>
        {step > 0 || answers.style ? (
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => {
              clearSaved();
              setAnswers(EMPTY_ANSWERS);
              setStep(0);
            }}
          >
            Start over
          </button>
        ) : null}
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-rule"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={step}
        aria-label="Planner progress"
      >
        <div
          className="h-full bg-forest transition-[width]"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>
      <h2 className="mt-6 text-2xl">{current.title}</h2>
      {current.hint ? <p className="mt-2 text-muted">{current.hint}</p> : null}
      <div className="mt-6">{current.render(answers, set)}</div>
      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button disabled={!current.done(answers)} onClick={() => setStep((s) => s + 1)}>
          {step === STEPS.length - 1 ? "See our recommendation" : "Next"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted">
        Your answers stay in this browser so you can come back to them. Nothing is sent until you
        choose to send it.
      </p>
    </div>
  );
}

// ------------------------------------------------------------ summary

/**
 * The committee summary: answers, recommendation by tier, stage illustration,
 * mission benefits, process, budget placeholder, and next steps. Prints on its
 * own (see the print rules in styles.css).
 */
export function PlannerSummary({ answers }: { answers: Answers }) {
  const tiers = recommend(answers);
  const style = answers.style ?? "traditional";
  return (
    <div data-print-summary className="space-y-12 print:space-y-6 print:text-[11pt]">
      <div className="hidden print:block">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest uppercase">
          United Under God · Church Room Planner
        </p>
        <p className="mt-1 font-display text-2xl">Committee summary</p>
      </div>

      <section className="grid gap-8 md:grid-cols-[1.2fr_1fr] print:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="text-2xl">Your church’s answers</h2>
          <dl className="mt-4 divide-y divide-rule border-y border-rule text-sm">
            {answerRows(answers).map((row) => (
              <div key={row.label} className="grid grid-cols-[9rem_1fr] gap-3 py-2">
                <dt className="text-muted">{row.label}</dt>
                <dd className="text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <StageIllustration style={style} className="print:break-inside-avoid" />
      </section>

      <section>
        <h2 className="text-2xl">Our recommendation</h2>
        <p className="mt-2 text-muted">
          In plain language, in the order most churches would do it. Every item is a starting point
          for a conversation, not a quote.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-3 print:grid-cols-1">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className="rounded-xl bg-cream p-5 shadow-[var(--shadow-border)] print:break-inside-avoid print:shadow-none print:border print:border-rule"
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-forest uppercase">
                Tier {i + 1}
              </p>
              <h3 className="mt-1 font-display text-xl">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted">{tier.lead}</p>
              <ul className="mt-4 space-y-4">
                {tier.items.map((item) => (
                  <li key={item.title} className="border-l-2 border-forest pl-3">
                    <p className="text-ink">{item.title}</p>
                    <p className="mt-1 text-sm text-muted">{item.body}</p>
                    {item.help ? (
                      <Link
                        to="/church-av/help/$slug"
                        params={{ slug: item.help }}
                        className="mt-1 inline-block text-sm text-forest underline-offset-4 hover:underline print:hidden"
                      >
                        Why this matters
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="print:break-inside-avoid">
        <h2 className="text-2xl">How it serves the mission</h2>
        <ul className="mt-4 space-y-2">
          {missionBenefits(answers).map((b) => (
            <li key={b} className="border-l-2 border-forest pl-3 text-ink">
              {b}
            </li>
          ))}
        </ul>
      </section>

      <section className="print:break-inside-avoid">
        <h2 className="text-2xl">How the process works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          {PLANNER_PROCESS.map((step, i) => (
            <li key={step.step} className="border-t border-rule pt-3">
              <p className="font-display text-lg">
                {i + 1}. {step.step}
              </p>
              <p className="mt-1 text-sm text-muted">{step.lead}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-ink">
          Every installation includes training after commissioning and on-site training the first
          Sunday, and a {WARRANTY_LINE}
        </p>
      </section>

      {/* OWNER: price bands need installer approval */}
      <section className="rounded-xl border border-dashed border-rule p-5 print:break-inside-avoid">
        <h2 className="text-2xl">Budget ranges — ask us</h2>
        <p className="mt-2 text-muted">
          Every room is different, so we do not put numbers on this page. The Dream phase includes
          initial budgets once the room and the goals are clear, and the work can be phased so it
          fits how your church gives.
        </p>
      </section>

      <section className="print:break-inside-avoid">
        <h2 className="text-2xl">Next steps</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink">
          {nextSteps(answers).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-6 hidden text-sm text-muted print:block">
          www.unitedundergod.org/church-av · Nothing in this summary is a price or a quote.
        </p>
      </section>
    </div>
  );
}

export function SummaryActions({ answers }: { answers: Answers }) {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <Button asChild size="lg">
        <a href="#talk">
          Send this to us
          <ArrowRight className="size-4" />
        </a>
      </Button>
      <Button variant="secondary" size="lg" onClick={() => window.print()}>
        <Printer className="size-4" />
        Print committee summary
      </Button>
      <Button asChild variant="ghost" size="lg">
        <Link to="/church-av/planner/summary" search={answersToSearch(answers)}>
          Shareable summary link
        </Link>
      </Button>
    </div>
  );
}
