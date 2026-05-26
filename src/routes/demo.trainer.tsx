import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/trainer")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      try { sessionStorage.setItem("pgpt-demo", "trainer"); } catch {}
    }
    throw redirect({ to: "/schedule" });
  },
});
