import { Link } from "@tanstack/react-router";
import { Bell, CreditCard, MapPin, ChevronRight } from "lucide-react";
import iconTrophy from "@/assets/icon-trophy.png";

export function RightRail() {
  return (
    <div className="space-y-4">
      <div className="side-panel p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">내 계정</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-[#FF6BA8] grid place-items-center text-white font-black">D</div>
          <div className="flex-1">
            <p className="font-bold text-ink leading-tight">도윤 트레이너</p>
            <p className="text-[12px] text-muted-foreground">Basic · 다음 결제 12.21</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="학생" value="14" />
          <Stat label="이번주" value="38" />
          <Stat label="응답률" value="86%" />
        </div>
        <Link
          to="/dashboard"
          className="mt-4 inline-flex w-full h-10 items-center justify-center rounded-full bg-ink text-white text-[13px] font-bold hover:bg-ink/90"
        >
          대시보드로 이동
        </Link>
      </div>

      <div className="side-panel p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={iconTrophy} alt="" className="h-7 w-7" loading="lazy" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">인기 헬스장</p>
          </div>
          <button className="text-[11px] font-semibold text-muted-foreground">전체</button>
        </div>
        <ol className="mt-3 space-y-2.5 text-[13px]">
          {[
            ["스포애니 강남점", "강남구 · ▲ 12%"],
            ["짐박스 성수", "성동구 · ▲ 8%"],
            ["바디스튜디오 분당", "분당 · ▲ 6%"],
            ["코어짐 잠실", "송파 · ▲ 4%"],
          ].map(([name, sub], i) => (
            <li key={i} className="flex items-center gap-3">
              <span className={`h-6 w-6 rounded-md grid place-items-center text-[10px] font-black ${i === 0 ? "bg-primary text-white" : "bg-muted text-ink-soft"}`}>
                {i + 1}
              </span>
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-semibold text-ink leading-tight">{name}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="side-panel p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">알림</p>
          </div>
          <span className="chip">새 4</span>
        </div>
        <ul className="mt-3 space-y-2.5 text-[13px]">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <p><b>김지원</b> 학생이 다음 주 시간을 선택했어요.</p>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <p>미응답 학생 <b>3명</b>에게 자동 재알림 발송됨.</p>
          </li>
          <li className="flex gap-2 text-ink-soft">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
            <p>이번 주 확정 알림 22건 발송 완료.</p>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-primary to-[#FF6BA8] text-white p-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <CreditCard className="h-5 w-5" />
        <p className="mt-3 font-extrabold text-[15px] leading-snug">
          Pro로 업그레이드<br />학생 40명까지
        </p>
        <p className="mt-1 text-[12px] text-white/85">알림톡 600건 포함 · 월 19,900원</p>
        <Link to="/pricing" className="mt-4 inline-flex h-9 items-center px-4 rounded-full bg-white text-primary text-[12px] font-bold">
          요금제 보기 <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border border-border py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-[15px] font-extrabold text-ink">{value}</p>
    </div>
  );
}
