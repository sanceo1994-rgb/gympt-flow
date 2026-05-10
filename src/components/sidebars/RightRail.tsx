import { Link } from "@tanstack/react-router";
import { MapPin, Trophy, Megaphone } from "lucide-react";

export function RightRail() {
  return (
    <div className="space-y-3">
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

      {/* Promo ad — flat */}
      <div className="rounded-2xl bg-white border border-border p-4">
        <span className="inline-flex items-center px-2 h-5 rounded-full bg-ink text-white text-[10px] font-black tracking-widest">EVENT</span>
        <p className="mt-3 text-[15px] font-extrabold text-ink leading-tight">
          동료쌤 초대 +<br />Basic 14일 무료
        </p>
        <p className="mt-2 text-[12px] text-ink-soft leading-relaxed">
          초대한 쌤이 첫 일정을 만들면 두 분 모두 14일 무료.
        </p>
        <Link to="/pricing" className="mt-4 inline-flex h-9 items-center px-4 rounded-full bg-primary text-white text-[12px] font-bold w-full justify-center">
          지금 초대하기
        </Link>
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
