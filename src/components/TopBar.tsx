import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, CalendarDays, ClipboardList } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { to: "/", label: "홈" },
  { to: "/schedule", label: "트레이너 일정 조율", icon: ClipboardList },
  { to: "/booking", label: "학생 예약", icon: CalendarDays },
  { to: "/pricing", label: "요금제" },
];

export function TopBar() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-pop">
              <span className="font-black text-[15px]">G</span>
            </div>
            <span className="text-[17px] font-extrabold tracking-tight text-ink">
              픽짐피티<span className="text-muted-foreground font-medium">  PickGymPT</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.slice(1, 3).map((n) => {
              const active = path === n.to;
              const Icon = n.icon!;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition ${
                    active ? "bg-ink text-white" : "text-ink-soft hover:text-ink hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pricing"
            className="hidden md:inline-flex h-9 items-center px-4 rounded-full text-[13px] font-semibold text-ink-soft hover:text-ink"
          >
            요금제
          </Link>
          <Link
            to="/login"
            className="hidden md:inline-flex h-9 items-center px-4 rounded-full text-[13px] font-semibold text-ink hover:bg-muted"
          >
            로그인
          </Link>
          {loading ? (
            <button
              type="button"
              disabled
              className="inline-flex h-9 items-center px-4 rounded-full text-[13px] font-bold bg-primary text-white shadow-pop opacity-60"
            >
              무료로 시작하기
            </button>
          ) : (
            <Link
              to={user ? "/profile" : "/login"}
              className="inline-flex h-9 items-center px-4 rounded-full text-[13px] font-bold bg-primary text-white shadow-pop hover:brightness-110"
            >
              무료로 시작하기
            </Link>
          )}
          <button
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            onClick={() => setOpen((v) => !v)}
            aria-label="메뉴"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-card">
          <div className="px-4 py-3 grid gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold ${
                  path === n.to ? "bg-primary-soft text-primary" : "text-ink hover:bg-muted"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
