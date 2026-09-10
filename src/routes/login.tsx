import { createFileRoute, Navigate } from "@tanstack/react-router";
import { SealMark } from "@/components/seal-mark";
import { Button } from "@/components/ui/button";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Sign in — United Under God desk" }],
  }),
});

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper">
        <div className="h-10 w-40 animate-pulse rounded-md bg-cream" />
      </main>
    );
  }
  if (user) return <Navigate to="/admin" />;

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5">
      <div className="w-full max-w-sm">
        <SealMark className="size-14 text-forest" />
        <h1 className="mt-5 font-display text-3xl">Staff desk</h1>
        <p className="mt-3 text-sm text-muted">
          Sign in with the email Lincoln has on the desk. The public site does
          not need an account.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {GROK_PROVIDERS.map((p) => (
            <Button
              key={p.providerId}
              type="button"
              variant="secondary"
              onClick={() => signIn(p.providerId, { callbackURL: "/admin" })}
            >
              Continue with {p.label}
            </Button>
          ))}
        </div>
      </div>
    </main>
  );
}
