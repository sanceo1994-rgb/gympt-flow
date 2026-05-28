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
        <div className="mx-auto max-w-[1600px] grid gap-0 lg:grid-cols-[minmax(240px,1fr)_minmax(0,3fr)_minmax(240px,1fr)] xl:grid-cols-[minmax(260px,1fr)_minmax(0,3.2fr)_minmax(260px,1fr)] 2xl:grid-cols-[minmax(300px,1fr)_minmax(0,3.4fr)_minmax(300px,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-0 h-screen overflow-hidden px-4 py-3 flex flex-col">
              {left ?? <LeftRail />}
            </div>
          </aside>
          <main className="bg-white min-h-screen min-w-0">
            <div className="px-5 sm:px-7 lg:px-8 py-6">{children}</div>
          </main>
          <aside className="hidden lg:block">
            <div className="sticky top-0 h-screen overflow-hidden px-4 py-3 flex flex-col">
              {right ?? <RightRail />}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
