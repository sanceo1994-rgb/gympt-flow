import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";

export function DemoBanner({ role }: { role: "student" | "trainer" }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("pgpt-demo") === role) setShow(true);
    } catch {}
  }, [role]);
  if (!show) return null;
  const label = role === "student" ? "회원" : "트레이너";
  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-primary to-[#FF6FB1] text-white">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3 text-[13px]">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="flex-1 font-bold">
          🎬 <b>{label} 화면 체험 모드</b> · 모든 데이터는 가상이에요. 자유롭게 클릭해보세요!
        </span>
        <Link
          to="/login"
          className="hidden sm:inline-flex h-8 items-center px-3 rounded-full bg-white text-primary text-[12px] font-extrabold hover:brightness-105"
        >
          가입하고 진짜 쓰기
        </Link>
        <button
          onClick={() => { try { sessionStorage.removeItem("pgpt-demo"); } catch {}; setShow(false); }}
          className="h-7 w-7 grid place-items-center rounded-full hover:bg-white/15"
          aria-label="체험 모드 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
