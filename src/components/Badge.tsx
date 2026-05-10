import type { ReactNode } from "react";

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "primary" | "ink" | "muted" | "warn" | "success" }) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    ink: "bg-ink text-white",
    muted: "bg-muted text-ink-soft",
    warn: "bg-warning/15 text-[oklch(0.55_0.18_55)]",
    success: "bg-[oklch(0.95_0.05_160)] text-[oklch(0.40_0.12_160)]",
  };
  return <span className={`inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}
