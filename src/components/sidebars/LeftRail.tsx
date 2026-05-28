import { Link } from "@tanstack/react-router";
import { TrendingUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/pickgympt-logo.png";

const TRAINERS: { name: string; sub: string; color: string }[] = [
  { name: "김도윤 트레이너", sub: "강남 · 132명", color: "#FFB199" },
  { name: "이서연 트레이너", sub: "성수 · 121명", color: "#A0D8FF" },
  { name: "박민호 트레이너", sub: "잠실 · 98명", color: "#C5B6FF" },
  { name: "최하늘 트레이너", sub: "분당 · 87명", color: "#FFE08A" },
  { name: "조유나 트레이너", sub: "마포 · 76명", color: "#B6E8C5" },
];

export function LeftRail() {
  const [bizOpen, setBizOpen] = useState(false);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
      {/* Brand / slogan — directly on gray, centered */}
      <Link to="/" className="block px-4 pt-1 pb-1">
        <div className="flex items-center justify-center">
          <img src={logo} alt="픽짐피티" className="h-24 xl:h-28 w-auto object-contain" />
        </div>
        <p className="-mt-3 text-center text-[13px] font-black text-ink leading-snug tracking-tight">
          PT 일정 조율, <span className="text-primary">50배</span> 빠르게.
        </p>
      </Link>

      {/* Ad slot */}
      <div className="rounded-2xl bg-white border border-border p-3.5">
        <span className="inline-flex items-center px-2 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-widest">AD</span>
        <p className="mt-2 text-[15px] font-extrabold text-ink leading-tight">
          픽짐피티 Pro<br />첫 달 50% 할인
        </p>
        <p className="mt-1.5 text-[11.5px] text-ink-soft leading-relaxed">
          학생 40명 + 알림톡 600건 포함. 지금 가입하면 한 달 무료.
        </p>
        <button className="mt-3 inline-flex h-8 items-center px-4 rounded-full bg-ink text-white text-[11.5px] font-bold w-full justify-center">
          요금제 보기
        </button>
      </div>

      {/* Ranking */}
      <div className="rounded-2xl bg-white border border-border p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">인기 트레이너</p>
          </div>
          <span className="text-[10px] text-muted-foreground">금주</span>
        </div>
        <ol className="mt-2.5 space-y-1.5 text-[13px]">
          {TRAINERS.map(({ name, sub, color }, i) => (
            <li key={i}>
              <Link to="/booking" className="flex items-center gap-2.5 hover:bg-surface-muted rounded-lg p-1 -m-1 transition">
                <span className={`h-5 w-5 rounded-md grid place-items-center text-[10px] font-black shrink-0 ${i === 0 ? "bg-primary text-white" : i < 3 ? "bg-ink text-white" : "bg-muted text-ink-soft"}`}>
                  {i + 1}
                </span>
                <div
                  className="h-7 w-7 rounded-xl grid place-items-center text-[11px] font-black text-white shrink-0 ring-1 ring-black/5"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-ink/80">{name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink leading-tight truncate hover:text-primary transition">{name}</p>
                  <p className="text-[10.5px] text-muted-foreground truncate">{sub}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>


      {/* Footer — legal links + business info */}
      <div className="px-2 pt-1 pb-2 text-[10.5px] text-ink-soft">

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-ink">이용약관</Link>
          <span className="text-border">·</span>
          <Link to="/" className="hover:text-ink">개인정보처리방침</Link>
          <span className="text-border">·</span>
          <Link to="/" className="hover:text-ink">광고/협업 문의</Link>
        </div>
        <button
          onClick={() => setBizOpen((v) => !v)}
          className="mt-2 mx-auto flex items-center gap-1 text-[10.5px] text-ink-soft hover:text-ink"
        >
          사업자 정보 보기 <ChevronDown className={`h-3 w-3 transition ${bizOpen ? "rotate-180" : ""}`} />
        </button>
        {bizOpen && (
          <div className="mt-2 rounded-lg bg-white border border-border p-3 leading-relaxed text-[10.5px]">
            <p><b className="text-ink">상호</b> 픽짐피티(주)</p>
            <p><b className="text-ink">대표</b> 박재현</p>
            <p><b className="text-ink">사업자등록번호</b> 123-45-67890</p>
            <p><b className="text-ink">통신판매업</b> 2026-서울강남-01234</p>
            <p><b className="text-ink">주소</b> 서울시 강남구 테헤란로 123, 5층</p>
            <p><b className="text-ink">고객센터</b> support@pickgympt.com</p>
            <p className="mt-1.5 text-ink-soft/70">© 2026 PickGymPT, Inc.</p>
          </div>
        )}
      </div>
    </div>
  );
}
