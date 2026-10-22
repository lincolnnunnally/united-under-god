import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";

export function SignInNudge({ about }: { about: string }) {
  return (
    <p className="mt-6 text-sm text-muted">
      <SignedOut>
        <Link to="/login" className="text-forest underline-offset-4 hover:underline">
          Create an account
        </Link>{" "}
        to save your spot and get updates on {about}. It’s free.
      </SignedOut>
      <SignedIn>
        You’re signed in. Manage this from{" "}
        <Link to="/account" className="text-forest underline-offset-4 hover:underline">
          your account
        </Link>
        .
      </SignedIn>
    </p>
  );
}
