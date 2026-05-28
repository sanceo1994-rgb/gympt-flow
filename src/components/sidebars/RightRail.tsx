import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Trophy, Megaphone, ChevronRight, LogOut, Calendar, Users, User, CalendarHeart, Copy, Check, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function RightRail() {
  const { user } = useAuth();
  const role = (user?.user_metadata as { role?: string } | undefined)?.role as "trainer" | "student" | undefined;
  const name = (user?.user_metadata as { name?: string } | undefined)?.name ?? user?.email?.split("@")[0] ?? "회원";
  const avatar = (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url;

  const [toast, setToast] = useState<string | null>(null);
  const fireToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("gympt-user");
      window.dispatchEvent(new Event("gympt-auth"));
    } catch {}
    window.location.href = "/";
  };

  const copyInvite = async () => {
    const code = (name || "PGPT").slice(0, 4).toUpperCase().padEnd(4, "X");
    const origin = typeof window !== "undefined" ? window.location.origin : "https://pickgympt.app";
    const link = `${origin}/login?invite=${code}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    try {
      await navigator.clipboard.writeText(link);
      fireToast("초대 링크 복사 완료! 카톡으로 동료에게 공유해보세요 💌");
    } catch {
      fireToast("복사에 실패했어요. 다시 시도해주세요");
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-1">

      {/* Top floating toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[80] w-[min(520px,calc(100vw-24px))] animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl bg-ink text-white shadow-pop px-4 py-3 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-primary grid place-items-center shrink-0">
              <Share2 className="h-4 w-4 text-white" />
            </span>
            <p className="text-[13px] font-extrabold leading-snug flex-1">{toast}</p>
            <Check className="h-4 w-4 text-primary shrink-0" />
          </div>
        </div>
      )}

      {/* User card */}
      {user ? (
        <div className="rounded-2xl bg-white border border-border p-4">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/15 grid place-items-center text-[16px] font-black text-primary">{name[0]}</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-extrabold text-ink truncate">{name}님 안녕하세요!</p>
              <p className="text-[11px] font-bold text-ink-soft mt-0.5">{role === "trainer" ? "트레이너" : "학생/회원"}</p>
            </div>
            <button onClick={handleLogout} title="로그아웃" className="h-7 w-7 rounded-full grid place-items-center text-ink-soft hover:bg-muted hover:text-ink">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {role === "trainer" ? (
              <>
                <Link to="/students" className="rounded-xl bg-surface-muted hover:bg-muted px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-ink">
                  <Users className="h-3.5 w-3.5 text-primary" /> 학생 관리
                </Link>
                <Link to="/booking" className="rounded-xl bg-surface-muted hover:bg-muted px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-ink">
                  <CalendarHeart className="h-3.5 w-3.5 text-primary" /> 내 예약화면
                </Link>
              </>
            ) : (
              <Link to="/pt-history" className="rounded-xl bg-surface-muted hover:bg-muted px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <Calendar className="h-3.5 w-3.5 text-primary" /> PT 내역
              </Link>
            )}
            <Link to="/profile" className="rounded-xl bg-surface-muted hover:bg-muted px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-ink">
              <User className="h-3.5 w-3.5 text-ink-soft" /> 내 정보
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-border p-4">
          <p className="text-[14px] font-extrabold text-ink">픽짐피티에 오신 걸 환영해요</p>
          <p className="mt-1 text-[12px] text-ink-soft">로그인하면 PT 일정과 내역을 한 번에 관리할 수 있어요.</p>
          <Link to="/login" className="mt-3 inline-flex h-9 items-center gap-1 px-4 rounded-full bg-ink text-white text-[12px] font-bold">
            로그인 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Gym ranking */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">인기 헬스장 TOP 5</p>
          </div>
          <span className="text-[10px] text-muted-foreground">실시간</span>
        </div>
        <ol className="mt-3 space-y-2.5 text-[13px]">
          {[
            ["스포애니 강남점", "강남구", "▲ 12%"],
            ["짐박스 성수", "성동구", "▲ 8%"],
            ["바디스튜디오 분당", "분당", "▲ 6%"],
            ["코어짐 잠실", "송파", "▲ 4%"],
            ["핏필 홍대", "마포", "▲ 2%"],
          ].map(([name, area, delta], i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className={`h-6 w-6 rounded-md grid place-items-center text-[11px] font-black ${i === 0 ? "bg-primary text-white" : "bg-muted text-ink-soft"}`}>
                {i + 1}
              </span>
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink leading-tight truncate">{name}</p>
                <p className="text-[11px] text-muted-foreground">{area}</p>
              </div>
              <span className="text-[11px] font-bold text-primary">{delta}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Promo / invite */}
      <div className="rounded-2xl bg-white border border-border p-4">
        <span className="inline-flex items-center px-2 h-5 rounded-full bg-ink text-white text-[10px] font-black tracking-widest">EVENT</span>
        <p className="mt-3 text-[15px] font-extrabold text-ink leading-tight">
          동료쌤 초대 +<br />Basic 14일 무료
        </p>
        <p className="mt-2 text-[12px] text-ink-soft leading-relaxed">
          초대한 쌤이 첫 일정을 만들면 두 분 모두 14일 무료.
        </p>
        <button
          onClick={copyInvite}
          className="mt-4 inline-flex h-9 items-center gap-1.5 px-4 rounded-full bg-primary text-white text-[12px] font-bold w-full justify-center hover:brightness-110"
        >
          <Copy className="h-3.5 w-3.5" /> 트레이너 초대 링크 복사
        </button>
      </div>

      {/* Notice */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">공지</p>
        </div>
        <ul className="mt-2.5 space-y-2 text-[13px]">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
            <p className="text-ink leading-snug">12월 알림톡 정책 변경 안내</p>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
            <p className="text-ink-soft leading-snug">v2.4 업데이트 — AI 시간표 속도 개선</p>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
            <p className="text-ink-soft leading-snug">단체 트레이너 요금제 베타 모집</p>
          </li>
        </ul>
      </div>
    </div>
  );
}
