import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import {
  Users, MailCheck, CalendarCheck, TrendingUp, Building2, Search, Plus,
  Crown, Sparkles, ArrowUpRight, MessageCircle, Filter, MoreHorizontal, Coffee, Activity,
} from "lucide-react";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "팀 플랜 — 짐피티 GymPT" },
      { name: "description", content: "지점·트레이너·회원을 한 화면에서 관리하는 짐 운영 대시보드" },
    ],
  }),
  component: Team,
});

const BRANCHES = [
  { id: "gn", name: "강남점", trainers: 6, members: 184, fillRate: 92 },
  { id: "ss", name: "성수점", trainers: 4, members: 121, fillRate: 86 },
  { id: "yt", name: "용산점", trainers: 3, members: 78, fillRate: 74 },
];

const TRAINERS = [
  { name: "박재현", branch: "강남점", members: 32, responded: 27, assigned: 25, satisfaction: 96, status: "조율 완료", avatar: "박" },
  { name: "이수민", branch: "강남점", members: 28, responded: 24, assigned: 22, satisfaction: 93, status: "조율 중", avatar: "이" },
  { name: "최도윤", branch: "성수점", members: 30, responded: 22, assigned: 20, satisfaction: 89, status: "응답 대기", avatar: "최" },
  { name: "윤하늘", branch: "성수점", members: 26, responded: 26, assigned: 26, satisfaction: 100, status: "확정 완료", avatar: "윤" },
  { name: "한지호", branch: "용산점", members: 24, responded: 18, assigned: 16, satisfaction: 81, status: "응답 대기", avatar: "한" },
  { name: "정유진", branch: "강남점", members: 22, responded: 22, assigned: 21, satisfaction: 95, status: "확정 완료", avatar: "정" },
];

const ACTIVITY = [
  { who: "박재현 트레이너", what: "다음 주 일정을 확정 알림으로 발송", when: "방금 전" },
  { who: "윤하늘 트레이너", what: "회원 26명 모두 응답 완료", when: "12분 전" },
  { who: "최도윤 트레이너", what: "전체 카톡 재알림 발송 (8명)", when: "34분 전" },
  { who: "정유진 트레이너", what: "수동 일정 조정 — 김민서 → 화 19시", when: "1시간 전" },
  { who: "이수민 트레이너", what: "AI 시간표 다시 계산", when: "2시간 전" },
];

const POINT_LEADERS = [
  { name: "최유나", branch: "강남점", week: 10, total: 240 },
  { name: "정수민", branch: "성수점", week: 10, total: 180 },
  { name: "이도현", branch: "강남점", week: 10, total: 160 },
  { name: "박서윤", branch: "강남점", week: 10, total: 130 },
];

function Team() {
  const [tab, setTab] = useState<"overview" | "trainers" | "branches" | "billing">("overview");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const totals = {
    trainers: TRAINERS.length,
    members: BRANCHES.reduce((s, b) => s + b.members, 0),
    branches: BRANCHES.length,
    fillRate: Math.round(BRANCHES.reduce((s, b) => s + b.fillRate, 0) / BRANCHES.length),
  };

  const filteredTrainers = branchFilter === "all" ? TRAINERS : TRAINERS.filter((t) => t.branch === BRANCHES.find((b) => b.id === branchFilter)?.name);

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="chip bg-primary/10 text-primary"><Crown className="h-3 w-3" /> 팀 플랜</span>
            <span className="chip bg-muted text-ink-soft">하이엔드 피트니스 그룹</span>
          </div>
          <h1 className="mt-2 text-[24px] sm:text-[30px] font-black text-ink leading-[1.15] tracking-tight">
            팀 운영 대시보드
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-soft">3개 지점 · {totals.trainers}명의 트레이너가 함께 일정 조율 중이에요.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-3.5 rounded-full bg-white border border-border-strong text-[13px] font-bold text-ink hover:bg-muted inline-flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> 트레이너 초대
          </button>
          <button className="h-10 px-3.5 rounded-full bg-ink text-white text-[13px] font-bold inline-flex items-center gap-1 hover:brightness-110">
            <Sparkles className="h-3.5 w-3.5" /> 주간 리포트
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Building2 className="h-4 w-4" />} label="지점" value={totals.branches} suffix="곳" />
        <Kpi icon={<Users className="h-4 w-4" />} label="트레이너" value={totals.trainers} suffix="명" delta="+2" />
        <Kpi icon={<MailCheck className="h-4 w-4" />} label="관리 회원" value={totals.members} suffix="명" delta="+11" accent />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="평균 확정율" value={totals.fillRate} suffix="%" delta="+3%" />
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-border flex gap-1 overflow-x-auto">
        {[
          { k: "overview", label: "개요" },
          { k: "trainers", label: "트레이너" },
          { k: "branches", label: "지점" },
          { k: "billing", label: "결제" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={`shrink-0 h-10 px-4 text-[13px] font-bold border-b-2 -mb-px transition ${tab === t.k ? "border-primary text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {/* Branch performance */}
          <section className="lg:col-span-2 rounded-2xl border border-border bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-[14px] font-black text-ink">지점별 성과</h2>
              <button className="text-[11px] font-bold text-ink-soft hover:text-ink inline-flex items-center gap-1">자세히 <ArrowUpRight className="h-3 w-3" /></button>
            </div>
            <ul className="divide-y divide-border">
              {BRANCHES.map((b) => (
                <li key={b.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center"><Building2 className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-black text-ink truncate">{b.name}</p>
                        <p className="text-[11px] text-ink-soft">트레이너 {b.trainers}명 · 회원 {b.members}명</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-black tabular-nums text-ink">{b.fillRate}%</p>
                      <p className="text-[10px] font-bold uppercase text-ink-soft">확정율</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-[#FF6FB1]" style={{ width: `${b.fillRate}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Activity feed */}
          <section className="rounded-2xl border border-border bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-[14px] font-black text-ink inline-flex items-center gap-1.5"><Activity className="h-4 w-4" /> 최근 활동</h2>
            </div>
            <ul className="divide-y divide-border">
              {ACTIVITY.map((a, i) => (
                <li key={i} className="px-5 py-3">
                  <p className="text-[12.5px] text-ink leading-snug"><b className="font-extrabold">{a.who}</b>님이 {a.what}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">{a.when}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Point leaders */}
          <section className="lg:col-span-2 rounded-2xl border border-[oklch(0.92_0.10_70)] bg-[oklch(0.99_0.03_70)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[oklch(0.92_0.10_70)] flex items-center justify-between">
              <h2 className="text-[14px] font-black text-ink inline-flex items-center gap-1.5"><Coffee className="h-4 w-4 text-[oklch(0.45_0.18_50)]" /> 이번 주 포인트 리더</h2>
              <span className="text-[11px] font-bold text-ink-soft">아무도 안 고른 칸 / 5개 이상 선택 시 +10P</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
              {POINT_LEADERS.map((p, i) => (
                <div key={p.name} className="rounded-xl bg-white border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="h-7 w-7 rounded-full bg-[oklch(0.85_0.15_70)] text-[oklch(0.30_0.15_50)] grid place-items-center text-[12px] font-black">{i + 1}</span>
                    <span className="text-[10px] font-bold text-ink-soft">{p.branch}</span>
                  </div>
                  <p className="mt-2 text-[14px] font-black text-ink truncate">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft tabular-nums">+{p.week}P 이번 주 · 총 {p.total}P</p>
                </div>
              ))}
            </div>
          </section>

          {/* Plan card */}
          <section className="rounded-2xl border border-ink bg-ink text-white p-5 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/40 blur-3xl" />
            <div className="relative">
              <span className="chip bg-white/10 text-white"><Crown className="h-3 w-3" /> 팀 플랜 PRO</span>
              <h3 className="mt-3 text-[20px] font-black leading-tight">월 ₩129,000</h3>
              <p className="mt-1 text-[12px] text-white/60">트레이너 무제한 · 지점 무제한 · 우선 지원</p>
              <div className="mt-4 grid gap-1.5 text-[12px]">
                {["AI 자동 일정 배정", "지점 통합 대시보드", "카카오톡 알림 무제한", "주간 자동 리포트"].map((f) => (
                  <p key={f} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {f}</p>
                ))}
              </div>
              <Link to="/pricing" className="mt-4 inline-flex h-10 px-4 rounded-full bg-primary text-white text-[12px] font-extrabold items-center gap-1">
                플랜 관리 <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>
      )}

      {tab === "trainers" && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-surface-muted rounded-xl px-3 h-10 flex-1 max-w-sm border border-border">
              <Search className="h-4 w-4 text-ink-soft" />
              <input placeholder="트레이너 검색" className="bg-transparent outline-none flex-1 text-[13px]" />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-ink-soft" />
              {[{ id: "all", name: "전체" }, ...BRANCHES.map((b) => ({ id: b.id, name: b.name }))].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBranchFilter(b.id)}
                  className={`h-9 px-3 rounded-full text-[12px] font-bold transition ${branchFilter === b.id ? "bg-ink text-white" : "bg-white border border-border text-ink-soft hover:bg-muted"}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border overflow-hidden bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-muted">
                <tr className="text-[11px] font-bold uppercase text-ink-soft">
                  <th className="px-4 py-3 text-center">트레이너</th>
                  <th className="px-4 py-3 text-center">지점</th>
                  <th className="px-4 py-3 text-center">관리 회원</th>
                  <th className="px-4 py-3 text-center">응답</th>
                  <th className="px-4 py-3 text-center">배정</th>
                  <th className="px-4 py-3 text-center">만족도</th>
                  <th className="px-4 py-3 text-center">상태</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainers.map((t) => (
                  <tr key={t.name} className="border-t border-border hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center font-black text-[12px]">{t.avatar}</div>
                        <span className="font-extrabold text-ink">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-ink-soft">{t.branch}</td>
                    <td className="px-4 py-3 text-center font-extrabold text-ink tabular-nums">{t.members}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-ink-soft">{t.responded} / {t.members}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-ink-soft">{t.assigned}명</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`tabular-nums font-extrabold ${t.satisfaction >= 95 ? "text-[oklch(0.55_0.18_160)]" : t.satisfaction >= 85 ? "text-ink" : "text-destructive"}`}>{t.satisfaction}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill s={t.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button title="카톡 재알림" className="h-8 w-8 rounded-full bg-[#FEE500] grid place-items-center text-[#191600] hover:brightness-95"><MessageCircle className="h-3.5 w-3.5 fill-[#191600]" /></button>
                        <button className="h-8 w-8 rounded-full bg-white border border-border grid place-items-center text-ink-soft hover:bg-muted"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "branches" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BRANCHES.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Building2 className="h-4.5 w-4.5" /></div>
                <div>
                  <p className="text-[14px] font-black text-ink">{b.name}</p>
                  <p className="text-[11px] text-ink-soft">트레이너 {b.trainers} · 회원 {b.members}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-[10px] font-bold uppercase text-ink-soft">확정율</p>
                  <p className="mt-1 text-[20px] font-black tabular-nums text-ink">{b.fillRate}%</p>
                </div>
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-[10px] font-bold uppercase text-ink-soft">PT/주</p>
                  <p className="mt-1 text-[20px] font-black tabular-nums text-ink">{Math.round(b.members * 1.6)}</p>
                </div>
              </div>
              <button className="mt-4 w-full h-10 rounded-xl bg-ink text-white text-[12px] font-bold inline-flex items-center justify-center gap-1">
                지점 보기 <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "billing" && (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl border border-border bg-white p-5">
            <h2 className="text-[14px] font-black text-ink">현재 플랜</h2>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-muted px-4 py-4">
              <div>
                <p className="text-[16px] font-black text-ink">팀 플랜 PRO</p>
                <p className="text-[12px] text-ink-soft">월 ₩129,000 · 다음 결제 6월 12일</p>
              </div>
              <button className="h-9 px-3.5 rounded-full bg-white border border-border-strong text-[12px] font-bold text-ink hover:bg-muted">플랜 변경</button>
            </div>
            <h3 className="mt-6 text-[13px] font-black text-ink">최근 결제 내역</h3>
            <ul className="mt-2 divide-y divide-border border border-border rounded-xl overflow-hidden">
              {[
                { date: "2026.05.12", amount: "₩129,000", status: "완료" },
                { date: "2026.04.12", amount: "₩129,000", status: "완료" },
                { date: "2026.03.12", amount: "₩129,000", status: "완료" },
              ].map((p) => (
                <li key={p.date} className="flex items-center justify-between px-4 py-3 text-[13px]">
                  <span className="text-ink-soft tabular-nums">{p.date}</span>
                  <span className="font-extrabold text-ink tabular-nums">{p.amount}</span>
                  <span className="text-[11px] font-bold text-[oklch(0.55_0.18_160)]">{p.status}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-border bg-white p-5">
            <h2 className="text-[14px] font-black text-ink">사용량 (이번 달)</h2>
            <div className="mt-3 grid gap-3">
              <UsageBar label="카톡 알림" used={1820} total={3000} />
              <UsageBar label="AI 시간표 계산" used={64} total={200} />
              <UsageBar label="활성 트레이너" used={6} total={100} />
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Kpi({ icon, label, value, suffix, accent, delta }: { icon: React.ReactNode; label: string; value: number; suffix?: string; accent?: boolean; delta?: string }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? "bg-primary/5 border-primary/20" : "bg-white border-border"}`}>
      <div className="flex items-center justify-between">
        <span className={`h-7 w-7 rounded-lg grid place-items-center ${accent ? "bg-primary/15 text-primary" : "bg-muted text-ink-soft"}`}>{icon}</span>
        {delta && <span className="text-[10px] font-bold text-[oklch(0.55_0.18_160)]">{delta}</span>}
      </div>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-1 text-[22px] font-black tabular-nums text-ink leading-none">
        {value}<span className="ml-1 text-[12px] font-bold text-ink-soft">{suffix}</span>
      </p>
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    "조율 완료": "bg-[oklch(0.95_0.05_160)] text-[oklch(0.40_0.12_160)]",
    "확정 완료": "bg-primary/10 text-primary",
    "조율 중": "bg-[oklch(0.95_0.07_70)] text-[oklch(0.40_0.16_50)]",
    "응답 대기": "bg-muted text-ink-soft",
  };
  return <span className={`inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-extrabold ${map[s] ?? "bg-muted text-ink-soft"}`}>{s}</span>;
}

function UsageBar({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-bold text-ink">{label}</span>
        <span className="text-ink-soft tabular-nums">{used.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
