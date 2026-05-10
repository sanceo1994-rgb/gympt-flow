import type { ReactNode } from "react";
import { LeftRail } from "./sidebars/LeftRail";
import { RightRail } from "./sidebars/RightRail";

type Props = {
  children: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  bare?: boolean;
};

export function AppShell({ children, left, right }: Props) {
  return (
    <div className="min-h-screen bg-surface-muted text-ink">
      <div className="bg-bands">
        <div className="mx-auto max-w-[1600px] grid gap-0 lg:grid-cols-[1fr_2fr_1fr]">
          <aside className="hidden lg:block px-5 py-6">
            <div className="sticky top-6">{left ?? <LeftRail />}</div>
          </aside>
          <main className="bg-white min-h-screen">
            <div className="px-5 sm:px-7 lg:px-8 py-6">{children}</div>
          </main>
          <aside className="hidden lg:block px-5 py-6">
            <div className="sticky top-6">{right ?? <RightRail />}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}

