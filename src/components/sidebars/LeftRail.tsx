import { Link } from "@tanstack/react-router";
import { Sparkles, Gift, BookOpen, Dumbbell } from "lucide-react";
import iconCalendar from "@/assets/icon-calendar.png";

export function LeftRail() {
  return (
    <div className="space-y-4">
      <div className="side-panel p-5">
        <div className="flex items-center gap-3">
          <img src={iconCalendar} alt="" className="h-10 w-10" loading="lazy" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">GymPT 소개</p>
            <p className="text-sm font-bold text-ink">5분 만에 다음 주 일정 끝</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-ink-soft leading-relaxed">
          학생은 원하는 시간을 고르고, 선생님은 가장 많은 수업이 가능한
          최적 시간표를 받아요.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline"
        >
          서비스 자세히 보기 →
        </Link>
      </div>

      <div className="side-panel p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">트레이너 팁</p>
        </div>
        <ul className="mt-3 space-y-2.5 text-[13px] text-ink">
          <li className="flex gap-2">
            <span className="text-primary font-black">01</span>
            매주 화요일 오전에 다음 주 일정을 열면 응답률이 가장 높아요.
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-black">02</span>
            인기 시간대에는 정원을 1~2명 늘려보세요.
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-black">03</span>
            미응답 학생에게는 24시간 후 자동 재알림이 효과적이에요.
          </li>
        </ul>
      </div>

      <div className="rounded-2xl bg-ink text-white p-5 overflow-hidden relative">
        <div className="absolute -right-6 -bottom-8 h-32 w-32 rounded-full bg-primary/30 blur-2xl" />
        <Gift className="h-5 w-5 text-primary" />
        <p className="mt-3 font-extrabold text-[15px] leading-snug">
          동료쌤 초대하고<br />
          Basic 14일 무료
        </p>
        <p className="mt-1 text-[12px] text-white/60">
          초대한 쌤이 첫 일정을 만들면 두 분 모두 14일 무료.
        </p>
        <button className="mt-4 inline-flex h-9 items-center px-4 rounded-full bg-primary text-white text-[12px] font-bold hover:brightness-110">
          동료쌤 초대하기
        </button>
      </div>

      <div className="side-panel p-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-ink-soft" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">사용 가이드</p>
        </div>
        <ul className="mt-3 space-y-2 text-[13px]">
          <li className="flex items-center justify-between hover:text-primary cursor-pointer">
            <span>주간 일정 만들기</span><span className="text-muted-foreground">3분</span>
          </li>
          <li className="flex items-center justify-between hover:text-primary cursor-pointer">
            <span>AI 최적 시간표 사용법</span><span className="text-muted-foreground">2분</span>
          </li>
          <li className="flex items-center justify-between hover:text-primary cursor-pointer">
            <span>학생 일괄 초대하기</span><span className="text-muted-foreground">1분</span>
          </li>
        </ul>
      </div>

      <div className="side-panel p-5">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">인기 트레이너</p>
        </div>
        <ol className="mt-3 space-y-2 text-[13px]">
          {[
            ["김도윤 트레이너", "강남 · 132명"],
            ["이서연 트레이너", "성수 · 121명"],
            ["박민호 트레이너", "잠실 · 98명"],
          ].map(([name, sub], i) => (
            <li key={i} className="flex items-center gap-3">
              <span className={`h-6 w-6 rounded-full grid place-items-center text-[11px] font-black ${i === 0 ? "bg-primary text-white" : "bg-muted text-ink-soft"}`}>
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-ink leading-tight">{name}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
