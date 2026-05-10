import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { LeftRail } from "./sidebars/LeftRail";
import { RightRail } from "./sidebars/RightRail";

type Props = {
  children: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  /** Remove the default white card wrapping the main column (use when page has its own surface) */
  bare?: boolean;
};

export function AppShell({ children, left, right, bare = false }: Props) {
  return (
    <div className="min-h-screen bg-surface-muted text-ink">
      <TopBar />
      <div className="mx-auto max-w-[1440px] px-3 sm:px-5 lg:px-6 py-4 lg:py-6">
        <div className="grid grid-cols-12 gap-4 lg:gap-5">
          {/* LEFT — clearly grey rail */}
          <aside className="hidden lg:block lg:col-span-3 xl:col-span-3">
            <div className="sticky top-20 space-y-3">{left ?? <LeftRail />}</div>
          </aside>

          {/* CENTER — only main content, white surface */}
          <main className="col-span-12 lg:col-span-6 xl:col-span-6">
            {bare ? (
              <div className="rounded-3xl bg-card border border-border overflow-hidden">{children}</div>
            ) : (
              <div className="rounded-3xl bg-card border border-border p-4 sm:p-6 lg:p-8">{children}</div>
            )}
          </main>

          {/* RIGHT — clearly grey rail */}
          <aside className="hidden lg:block lg:col-span-3 xl:col-span-3">
            <div className="sticky top-20 space-y-3">{right ?? <RightRail />}</div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface-muted">
      <div className="mx-auto max-w-[1440px] px-6 py-10 grid gap-6 lg:grid-cols-3 text-sm">
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
              <li>알림톡</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-ink mb-2">회사</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>이용약관</li>
              <li>개인정보처리방침</li>
              <li>고객문의</li>
              <li>©2026 GymPT</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
