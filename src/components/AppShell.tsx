import type { ReactNode } from "react";
import { LeftRail } from "./sidebars/LeftRail";
import { RightRail } from "./sidebars/RightRail";
import { MobileAccountHeader } from "./MobileAccountHeader";

type Props = {
  children: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  bare?: boolean;
};

export function AppShell({ children, left, right }: Props) {
  return (
    <div className="min-h-screen bg-surface-muted text-ink">
      <div>
        <div className="mx-auto grid w-full grid-cols-1 min-[1720px]:grid-cols-[minmax(0,1fr)_minmax(0,1080px)_minmax(0,1fr)]">
          <aside className="hidden min-w-0 min-[1720px]:block">
            <div className="sticky top-0 ml-auto flex h-screen w-full max-w-[320px] min-w-0 flex-col overflow-hidden py-3 pr-5">
              {left ?? <LeftRail />}
            </div>
          </aside>
          <main className="mx-auto min-h-screen w-full max-w-[1080px] min-w-0 bg-white min-[1720px]:max-w-none">
            <MobileAccountHeader />
            <div className="px-5 sm:px-7 lg:px-8 py-6">{children}</div>
          </main>
          <aside className="hidden min-w-0 min-[1720px]:block">
            <div className="sticky top-0 mr-auto flex h-screen w-full max-w-[320px] min-w-0 flex-col overflow-hidden py-3 pl-5">
              {right ?? <RightRail />}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
