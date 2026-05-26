import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/student")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      try { sessionStorage.setItem("pgpt-demo", "student"); } catch {}
    }
    throw redirect({ to: "/booking" });
  },
});
