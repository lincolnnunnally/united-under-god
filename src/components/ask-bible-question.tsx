import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Variant = "indigo" | "movement";

export function AskBibleQuestion({ variant = "indigo" }: { variant?: Variant }) {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      kind: "bible-question",
      question: String(data.get("question") || "").trim(),
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      at: new Date().toISOString(),
    };
    if (!payload.question) return;
    const key = "uug-involvement";
    const existing = JSON.parse(localStorage.getItem(key) || "[]") as unknown[];
    localStorage.setItem(key, JSON.stringify([payload, ...existing].slice(0, 40)));
    form.reset();
    setStatus("sent");
  }

  if (variant === "movement") {
    if (status === "sent") {
      return (
        <div id="ask" className="rounded-xl bg-cream px-6 py-8 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-2xl">Received.</h3>
          <p className="mt-3 text-muted">
            If this is on many hearts, it will become a public answer.
          </p>
        </div>
      );
    }
    return (
      <form
        id="ask"
        onSubmit={handleSubmit}
        className="rounded-xl bg-cream p-6 shadow-[var(--shadow-border)] md:p-8"
      >
        <h3 className="font-display text-2xl">Ask a question</h3>
        <p className="mt-2 text-sm text-muted">
          For you — not a church office form. We work real questions into the
          library.
        </p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="bible-q">Your question</Label>
          <Textarea id="bible-q" name="question" required maxLength={4000} rows={4} />
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="bible-name">Name (optional)</Label>
          <Input id="bible-name" name="name" maxLength={200} />
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="bible-email">Email if you want a reply (optional)</Label>
          <Input id="bible-email" name="email" type="email" maxLength={320} />
        </div>
        <Button type="submit" className="mt-6">
          Send the question
        </Button>
      </form>
    );
  }

  if (status === "sent") {
    return (
      <div className="bible-form" id="ask">
        <h3>Received.</h3>
        <p className="bible-form-sub">
          If this is on many hearts, it will become a public answer.
        </p>
      </div>
    );
  }

  return (
    <form className="bible-form" id="ask" onSubmit={handleSubmit}>
      <h3>Ask a question</h3>
      <p className="bible-form-sub">
        For you — not a church office form. We work real questions into the library.
      </p>
      <label>
        Your question
        <textarea name="question" required maxLength={4000} rows={4} />
      </label>
      <label>
        Name (optional)
        <input name="name" type="text" maxLength={200} />
      </label>
      <label>
        Email if you want a reply (optional)
        <input name="email" type="email" maxLength={320} />
      </label>
      <button className="bible-btn" type="submit">
        Send the question
      </button>
    </form>
  );
}
