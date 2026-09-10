import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { PLENTY_URL } from "@/lib/content";

export function SignInNudge({ about }: { about: string }) {
  return (
    <p className="mt-6 text-sm text-muted">
      <SignedOut>
        <Link to="/login" className="text-forest underline-offset-4 hover:underline">
          Create an account
        </Link>{" "}
        to keep your place in {about}. Need food from the pantry? Sign in on{" "}
        <a
          href={PLENTY_URL}
          className="text-forest underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Plenty
        </a>
        .
      </SignedOut>
      <SignedIn>
        This lives on{" "}
        <Link to="/account" className="text-forest underline-offset-4 hover:underline">
          your account
        </Link>
        — you can join it there.
      </SignedIn>
    </p>
  );
}
