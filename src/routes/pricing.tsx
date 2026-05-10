import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "요금제 — 짐피티 GymPT" }] }),
  component: Pricing,
});

const PLANS = [
  { name: "Free", price: 0, students: 3, msgs: 30, sub: "처음 사용하는 트레이너" },
  { name: "Mini", price: 5900, students: 7, msgs: 100, sub: "소규모로 시작하는 1:1 PT" },
  { name: "Basic", price: 9900, students: 15, msgs: 220, sub: "가장 많이 선택하는 플랜", hot: true },
  { name: "Pro", price: 19900, students: 40, msgs: 600, sub: "풀타임 트레이너에게" },
];

function Pricing() {
  return (
    <AppShell>
      <div className="text-center">
        <span className="chip"><Sparkles className="h-3 w-3" /> 요금제</span>
        <h1 className="mt-3 text-[30px] sm:text-[40px] font-black text-ink leading-tight">
          딱 필요한 만큼만,<br /><span className="grad-pink-text">투명한 요금제</span>
        </h1>
        <p className="mt-3 text-[14px] text-ink-soft">언제든 변경하거나 취소할 수 있어요. 카드등록 없이 Free로 시작해보세요.</p>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PLANS.map((p) => (
          <div key={p.name} className={`relative rounded-2xl p-6 flex flex-col ${p.hot ? "bg-ink text-white" : "bg-card border border-border"}`}>
            {p.hot && <span className="absolute -top-3 left-1/2 -translate-x-1/2 chip bg-primary text-white">가장 인기</span>}
            <p className={`text-[13px] font-bold ${p.hot ? "text-white/70" : "text-ink-soft"}`}>{p.name}</p>
            <p className="mt-2">
              <span className={`text-[32px] font-black ${p.hot ? "text-white" : "text-ink"}`}>
                {p.price === 0 ? "무료" : `₩${p.price.toLocaleString()}`}
              </span>
              {p.price > 0 && <span className={`text-[13px] font-semibold ${p.hot ? "text-white/60" : "text-muted-foreground"}`}>/월</span>}
            </p>
            <p className={`mt-1 text-[12px] ${p.hot ? "text-white/70" : "text-muted-foreground"}`}>{p.sub}</p>

            <ul className={`mt-5 space-y-2 text-[13px] flex-1 ${p.hot ? "text-white/90" : "text-ink-soft"}`}>
              <Li>학생 {p.students}명</Li>
              <Li>알림톡 {p.msgs}건/월</Li>
              <Li>AI 최적 시간표</Li>
              <Li>예약 링크 무제한</Li>
              <Li>주간 리포트</Li>
            </ul>

            <button className={`mt-6 h-11 rounded-full font-bold text-[13px] ${p.hot ? "bg-primary text-white" : p.price === 0 ? "bg-card border border-border-strong text-ink" : "bg-ink text-white"}`}>
              {p.price === 0 ? "무료로 시작하기" : `${p.name} 시작하기`}
            </button>
          </div>
        ))}
      </div>

      {/* Team plan */}
      <div className="mt-10 rounded-3xl bg-gradient-to-br from-primary to-[#FF6BA8] text-white p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="grid lg:grid-cols-[1.4fr,1fr] gap-6 items-center">
          <div>
            <span className="pill-dark bg-white/15">Team Plan · 미리보기</span>
            <h2 className="mt-3 text-[28px] sm:text-[32px] font-black leading-tight">팀 단위 운영을 시작하세요</h2>
            <p className="mt-2 text-white/85 text-[14px]">팀장이 트레이너를 관리하고, 전체 가동률과 인기 시간을 한눈에 확인해요.</p>
            <p className="mt-5 text-[24px] font-black">₩49,000<span className="text-[13px] font-semibold text-white/80">/월</span></p>
            <p className="text-[12px] text-white/80">트레이너 3명 · 학생 80명 · 팀 대시보드</p>
            <button className="mt-5 inline-flex h-12 items-center px-6 rounded-full bg-white text-primary text-[14px] font-bold">
              팀 플랜 체험 신청
            </button>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
            <p className="text-[12px] font-bold text-white/80">포함 기능</p>
            <ul className="mt-3 space-y-2 text-[13px]">
              <Li dark>팀장 트레이너 관리</Li>
              <Li dark>트레이너별 가동률</Li>
              <Li dark>주간 운영 리포트</Li>
              <Li dark>인기 시간 혼잡도</Li>
              <Li dark>미배정 학생 트래킹</Li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Li({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <Check className={`mt-0.5 h-4 w-4 ${dark ? "text-white" : "text-primary"} shrink-0`} />
      <span>{children}</span>
    </li>
  );
}
