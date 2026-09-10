import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/understanding-the-bible")({
  beforeLoad: () => {
    throw redirect({ to: "/bible" });
  },
  component: () => null,
});
