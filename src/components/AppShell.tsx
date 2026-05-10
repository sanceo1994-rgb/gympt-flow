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

function Footer() {
  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto max-w-[1480px] px-6 py-10 grid gap-6 lg:grid-cols-3 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
              <span className="font-black text-[13px]">G</span>
            </div>
            <span className="font-extrabold text-ink">짐피티 · GymPT</span>
          </div>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            운동은 선생님이, 일정은 짐피티가.<br />
            PT 트레이너를 위한 똑똑한 일정 비서.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 lg:col-span-2">
          <div>
            <p className="font-semibold text-ink mb-2">서비스</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>트레이너 일정 조율</li>
              <li>학생 예약 페이지</li>
              <li>AI 최적 시간표</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-ink mb-2">회사</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>이용약관</li>
              <li>개인정보처리방침</li>
              <li>©2026 GymPT</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
