import { Sparkles, TrendingUp, MapPin } from "lucide-react";

export function LeftRail() {
  return (
    <div className="space-y-3">
      {/* Ad slot */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="relative h-32 bg-gradient-to-br from-primary to-[#FF6BA8]">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute bottom-3 left-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">AD</p>
            <p className="text-[15px] font-extrabold leading-tight">짐피티 Pro<br />첫 달 50% 할인</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-[12px] text-ink-soft leading-relaxed">
            학생 40명 + 알림톡 600건 포함. 지금 가입하면 한 달 무료.
          </p>
          <button className="mt-3 inline-flex h-9 items-center px-4 rounded-full bg-ink text-white text-[12px] font-bold w-full justify-center">
            요금제 보기
          </button>
        </div>
      </div>

      {/* Ranking */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">인기 트레이너 랭킹</p>
          </div>
          <span className="text-[10px] text-muted-foreground">금주</span>
        </div>
        <ol className="mt-3 space-y-2.5 text-[13px]">
          {[
            ["김도윤 트레이너", "강남 · 132명"],
            ["이서연 트레이너", "성수 · 121명"],
            ["박민호 트레이너", "잠실 · 98명"],
            ["최하늘 트레이너", "분당 · 87명"],
            ["조유나 트레이너", "마포 · 76명"],
          ].map(([name, sub], i) => (
            <li key={i} className="flex items-center gap-3">
              <span className={`h-6 w-6 rounded-md grid place-items-center text-[11px] font-black ${i === 0 ? "bg-primary text-white" : i < 3 ? "bg-ink text-white" : "bg-muted text-ink-soft"}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink leading-tight truncate">{name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Tip */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">짐피티 팁</p>
        </div>
        <p className="mt-2 text-[13px] text-ink leading-relaxed">
          매주 <b className="text-primary">화요일 오전</b>에 다음 주 일정을 열면 응답률이 평균 18% 더 높아요.
        </p>
      </div>
    </div>
  );
}
