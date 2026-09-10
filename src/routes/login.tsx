import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { SealMark } from "@/components/seal-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PLENTY_URL } from "@/lib/content";
import { readMyPlace } from "@/lib/member-actions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Sign in — United Under God" }],
  }),
});

function nameFromEmail(email: string) {
  const local = email.split("@")[0] || "Friend";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SignedInRedirect() {
  const [to, setTo] = useState<"/" | "/admin" | "/account" | null>(null);
  useEffect(() => {
    void readMyPlace()
      .then((place) => setTo(place.isStaff ? "/admin" : "/account"))
      .catch(() => setTo("/account"));
  }, []);
  if (!to) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper">
        <div className="h-10 w-40 animate-pulse rounded-md bg-cream" />
      </main>
    );
  }
  return <Navigate to={to} />;
}

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "create">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper">
        <div className="h-10 w-40 animate-pulse rounded-md bg-cream" />
      </main>
    );
  }
  if (user) return <SignedInRedirect />;

  async function goAfterAuth() {
    try {
      const place = await readMyPlace();
      window.location.href = place.isStaff ? "/admin" : "/account";
    } catch {
      window.location.href = "/account";
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Use a real email so we can reach you.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for the password.");
      return;
    }
    if (mode === "create" && !name.trim()) {
      setError("A name lets us know who is standing with us.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      if (mode === "create") {
        const { error: signUpError } = await authClient.signUp.email({
          email: trimmed,
          password,
          name: name.trim() || nameFromEmail(trimmed),
        });
        if (signUpError) {
          const message = signUpError.message || "Could not create that account.";
          if (/already|exists/i.test(message)) {
            setMode("in");
            setError("That email already has an account. Sign in with it.");
          } else {
            setError(message);
          }
          return;
        }
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: trimmed,
          password,
        });
        if (signInError) {
          setError(
            signInError.message ||
              "That email and password did not match. First time? Create an account.",
          );
          return;
        }
      }
      await goAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onOauth(providerId: string) {
    setBusy(true);
    setError("");
    const failTimer = window.setTimeout(() => {
      setError("Google and X did not start. Use email and password.");
      setBusy(false);
    }, 4000);
    try {
      await signIn(providerId, {
        callbackURL: "/account",
        errorCallbackURL: "/login",
      });
      setError("Google and X did not start. Use email and password.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google and X could not start. Use email and password.",
      );
    } finally {
      window.clearTimeout(failTimer);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" aria-label="United Under God home">
          <SealMark className="size-14 text-forest" />
        </Link>
        <h1 className="mt-5 font-display text-3xl">
          {mode === "create" ? "Create an account" : "Sign in"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          For churches, businesses, charities, and households who want the seal,
          united buying, Live on Mission, or to stand with the work. Staff use
          this same door.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
          {mode === "create" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="member-name">Your name</Label>
              <Input
                id="member-name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={busy}
              />
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="member-password">Password</Label>
            <Input
              id="member-password"
              name="password"
              type="password"
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              disabled={busy}
            />
          </div>

          {error ? (
            <p className="text-sm text-ink" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={busy}>
            {busy
              ? "Working…"
              : mode === "create"
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 min-h-11 text-sm text-forest underline-offset-4 hover:underline"
          disabled={busy}
          onClick={() => {
            setMode(mode === "in" ? "create" : "in");
            setError("");
          }}
        >
          {mode === "in" ? "First time? Create an account" : "Already have an account? Sign in"}
        </button>

        <p className="mt-6 text-sm text-muted">
          Need food from the Vidalia pantry, or to volunteer there? Sign in on{" "}
          <a
            href={PLENTY_URL}
            className="text-forest underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Plenty
          </a>
          — not here.
        </p>

        <div className="mt-8 border-t border-rule pt-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-subtle uppercase">
            Or try Google / X
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {GROK_PROVIDERS.map((provider) => (
              <Button
                key={provider.providerId}
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void onOauth(provider.providerId)}
              >
                Continue with {provider.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
