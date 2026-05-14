import { Link } from "@tanstack/react-router";
import { TrendingUp, LayoutGrid, Calendar, Users } from "lucide-react";
import logo from "@/assets/gympt-logo.png";

const TRAINERS: { name: string; sub: string; color: string }[] = [
  { name: "김도윤 트레이너", sub: "강남 · 132명", color: "#FFB199" },
  { name: "이서연 트레이너", sub: "성수 · 121명", color: "#A0D8FF" },
  { name: "박민호 트레이너", sub: "잠실 · 98명", color: "#C5B6FF" },
  { name: "최하늘 트레이너", sub: "분당 · 87명", color: "#FFE08A" },
  { name: "조유나 트레이너", sub: "마포 · 76명", color: "#B6E8C5" },
];

export function LeftRail() {
  return (
    <div className="space-y-3">
      {/* Brand / slogan — directly on gray, centered-ish */}
      <Link to="/" className="block px-4 pt-2 pb-3">
        <div className="flex items-center justify-center gap-2.5">
          <img src={logo} alt="PickGymPT" width={36} height={36} className="h-9 w-9 object-contain" />
          <div className="leading-none">
            <p className="text-[20px] font-black tracking-tight text-ink">픽짐피티<span className="text-primary">.</span></p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-soft">PickGymPT</p>
          </div>
        </div>
        <p className="mt-4 text-center text-[14px] font-extrabold text-ink leading-snug tracking-tight">
          트레이너의 시간을<br />
          <span className="text-primary">10배 빠르게</span> 조율해요.
        </p>
        <p className="mt-1.5 text-center text-[11.5px] text-ink-soft leading-relaxed">
          반복되는 카톡 일정 조율, 이제 그만.
        </p>
      </Link>

      {/* Quick nav */}
      <nav className="grid grid-cols-3 gap-1.5 px-1">
        <Link to="/schedule" className="rounded-xl bg-white border border-border px-2 py-2.5 text-center hover:border-ink/40 transition flex flex-col items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-ink-soft" />
          <span className="text-[11px] font-bold text-ink">조율</span>
        </Link>
        <Link to="/booking" className="rounded-xl bg-white border border-border px-2 py-2.5 text-center hover:border-ink/40 transition flex flex-col items-center gap-1">
          <LayoutGrid className="h-3.5 w-3.5 text-ink-soft" />
          <span className="text-[11px] font-bold text-ink">예약</span>
        </Link>
        <Link to="/team" className="rounded-xl bg-white border border-border px-2 py-2.5 text-center hover:border-ink/40 transition flex flex-col items-center gap-1">
          <Users className="h-3.5 w-3.5 text-ink-soft" />
          <span className="text-[11px] font-bold text-ink">팀플랜</span>
        </Link>
      </nav>

      <div className="h-1" />

      {/* Ad slot — flat, friendly */}
      <div className="rounded-2xl bg-white border border-border p-4">
        <span className="inline-flex items-center px-2 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-widest">AD</span>
        <p className="mt-3 text-[16px] font-extrabold text-ink leading-tight">
          픽짐피티 Pro<br />첫 달 50% 할인
        </p>
        <p className="mt-2 text-[12px] text-ink-soft leading-relaxed">
          학생 40명 + 알림톡 600건 포함. 지금 가입하면 한 달 무료.
        </p>
        <button className="mt-4 inline-flex h-9 items-center px-4 rounded-full bg-ink text-white text-[12px] font-bold w-full justify-center">
          요금제 보기
        </button>
      </div>

      {/* Ranking */}
      <div className="rounded-2xl bg-white border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">인기 트레이너</p>
          </div>
          <span className="text-[10px] text-muted-foreground">금주</span>
        </div>
        <ol className="mt-3 space-y-2.5 text-[13px]">
          {TRAINERS.map(({ name, sub, color }, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className={`h-5 w-5 rounded-md grid place-items-center text-[10px] font-black shrink-0 ${i === 0 ? "bg-primary text-white" : i < 3 ? "bg-ink text-white" : "bg-muted text-ink-soft"}`}>
                {i + 1}
              </span>
              {/* Kakao-style avatar */}
              <div
                className="h-8 w-8 rounded-xl grid place-items-center text-[12px] font-black text-white shrink-0 ring-1 ring-black/5"
                style={{ backgroundColor: color }}
              >
                <span className="text-ink/80">{name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink leading-tight truncate">{name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

