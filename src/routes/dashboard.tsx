import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Sparkles, ArrowRight, Send, Filter, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const STUDENTS = [
  { name: "김지원", phone: "010-1234-5678", status: "응답완료", picks: ["월 19시", "수 19시", "금 20시"], assigned: "월 19시", remain: 8, last: "11.18", noti: "확정발송" },
  { name: "박서윤", phone: "010-2222-3344", status: "확정완료", picks: ["화 07시", "목 07시"], assigned: "화 07시", remain: 12, last: "11.19", noti: "확정발송" },
  { name: "이도현", phone: "010-9876-5432", status: "응답대기", picks: [], assigned: "-", remain: 4, last: "11.10", noti: "재전송 필요" },
  { name: "최유나", phone: "010-3333-4444", status: "응답완료", picks: ["수 09시", "금 09시"], assigned: "수 09시", remain: 6, last: "11.20", noti: "대기" },
  { name: "한승호", phone: "010-7777-8888", status: "미배정", picks: ["월 20시", "화 20시", "수 20시"], assigned: "-", remain: 10, last: "11.17", noti: "대기" },
  { name: "정수민", phone: "010-5555-6666", status: "확정완료", picks: ["토 11시"], assigned: "토 11시", remain: 3, last: "11.21", noti: "확정발송" },
  { name: "오지훈", phone: "010-1111-2222", status: "응답대기", picks: [], assigned: "-", remain: 7, last: "11.12", noti: "재전송 필요" },
];

function Dashboard() {
  const [filter, setFilter] = useState<"전체" | "응답대기" | "미배정">("전체");
  const visible = STUDENTS.filter((s) => filter === "전체" ? true : s.status === filter);

  return (
    <AppShell>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[12px] font-bold text-primary uppercase tracking-widest">트레이너 대시보드</p>
          <h1 className="mt-1 text-[26px] sm:text-[30px] font-black text-ink">안녕하세요, 도윤 트레이너님 👋</h1>
          <p className="mt-1 text-[13px] text-ink-soft">다음 주 일정 응답 현황과 AI 추천을 한눈에 확인하세요.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/schedule" className="h-10 px-4 inline-flex items-center rounded-full bg-card border border-border-strong text-[13px] font-bold">
            다음 주 일정 만들기
          </Link>
          <Link to="/ai-result" className="h-10 px-4 inline-flex items-center rounded-full bg-primary text-white text-[13px] font-bold shadow-pop">
            <Sparkles className="h-4 w-4 mr-1" /> AI 최적 시간표
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="총 학생" value="14" sub="+2 이번 달" />
        <Kpi label="응답 완료" value="9" sub="응답률 64%" tone="primary" />
        <Kpi label="응답 대기" value="3" sub="재알림 권장" />
        <Kpi label="확정 수업" value="22" sub="다음 주" />
      </div>

      {/* Heatmap */}
      <div className="mt-6 panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-ink-soft uppercase tracking-widest">주간 슬롯 히트맵</p>
            <h3 className="mt-1 text-[18px] font-extrabold text-ink">11/25 — 12/01 · 다음 주</h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary/15" /> 여유</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary/50" /> 보통</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary" /> 혼잡</span>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[560px] grid grid-cols-[60px_repeat(7,1fr)] gap-1 text-[11px]">
            <div></div>
            {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
              <div key={d} className="text-center font-bold text-ink-soft">{d}</div>
            ))}
            {["07시", "09시", "12시", "14시", "17시", "19시", "20시"].map((t, ri) => (
              <Row key={t} label={t} ri={ri} />
            ))}
          </div>
        </div>
      </div>

      {/* Students table */}
      <div className="mt-6 panel p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-bold text-ink-soft uppercase tracking-widest">내 학생</p>
            <h3 className="mt-1 text-[18px] font-extrabold text-ink">학생 응답 현황 · {visible.length}명</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-full bg-surface-muted border border-border">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input className="bg-transparent text-[13px] outline-none w-32" placeholder="학생 검색" />
            </div>
            <button className="h-9 px-3 inline-flex items-center gap-1 rounded-full bg-card border border-border text-[12px] font-bold">
              <Filter className="h-3.5 w-3.5" /> 필터
            </button>
            <button className="h-9 px-3 inline-flex items-center gap-1 rounded-full bg-ink text-white text-[12px] font-bold">
              <Send className="h-3.5 w-3.5" /> 일괄 알림
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(["전체", "응답대기", "미배정"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 h-8 rounded-full text-[12px] font-bold ${filter === f ? "bg-primary text-white" : "bg-surface-muted text-ink-soft"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-4 -mx-5 overflow-x-auto">
          <table className="w-full text-[13px] min-w-[820px]">
            <thead>
              <tr className="text-left text-[11px] uppercase font-bold text-muted-foreground border-y border-border">
                <th className="px-5 py-2.5">학생</th>
                <th className="py-2.5">상태</th>
                <th className="py-2.5">선호 시간</th>
                <th className="py-2.5">배정</th>
                <th className="py-2.5">잔여</th>
                <th className="py-2.5">최근 PT</th>
                <th className="py-2.5">알림</th>
                <th className="py-2.5 px-5 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s, i) => (
                <tr key={i} className="border-b border-border hover:bg-surface-muted/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-[#FF6BA8] grid place-items-center text-white font-black text-[12px]">{s.name[0]}</div>
                      <div>
                        <p className="font-bold text-ink leading-tight">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3"><StatusBadge status={s.status} /></td>
                  <td className="py-3">
                    {s.picks.length === 0 ? (
                      <span className="text-muted-foreground text-[12px]">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {s.picks.map((p, j) => (
                          <span key={j} className={`px-2 h-6 inline-flex items-center rounded-md text-[11px] font-bold ${j === 0 ? "bg-primary-soft text-primary" : "bg-muted text-ink-soft"}`}>
                            {j + 1}순위 {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 font-bold text-ink">{s.assigned}</td>
                  <td className="py-3 text-ink-soft">{s.remain}회</td>
                  <td className="py-3 text-ink-soft">{s.last}</td>
                  <td className="py-3"><NotiBadge n={s.noti} /></td>
                  <td className="py-3 px-5 text-right">
                    <button className="text-[12px] font-bold text-primary hover:underline">관리</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="h-9 px-3 rounded-full bg-primary-soft text-primary text-[12px] font-bold">응답대기 학생에게 재전송</button>
          <button className="h-9 px-3 rounded-full bg-surface-muted text-ink text-[12px] font-bold">전체 학생에게 일정 요청</button>
          <button className="h-9 px-3 rounded-full bg-surface-muted text-ink text-[12px] font-bold">선택 완료 학생만 보기</button>
        </div>
      </div>

      {/* AI banner */}
      <Link to="/ai-result" className="mt-6 block rounded-2xl bg-ink text-white p-6 relative overflow-hidden hover:brightness-110 transition">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/40 blur-3xl" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="pill-dark bg-white/15">AI 추천 준비 완료</span>
            <p className="mt-3 text-[20px] font-black leading-snug">9명의 응답을 모아 최적 시간표를 만들어볼까요?</p>
            <p className="mt-1 text-[12px] text-white/70">예상 1순위 매칭률 92% · 미배정 0명</p>
          </div>
          <span className="inline-flex h-11 items-center px-5 rounded-full bg-primary text-white text-[13px] font-bold">
            AI 최적 시간표 생성 <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </div>
      </Link>
    </AppShell>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "primary" }) {
  return (
    <div className={`rounded-2xl p-4 ${tone === "primary" ? "bg-primary text-white" : "bg-surface-muted border border-border"}`}>
      <p className={`text-[11px] font-bold uppercase ${tone === "primary" ? "text-white/80" : "text-ink-soft"}`}>{label}</p>
      <p className={`mt-1 text-[26px] font-black ${tone === "primary" ? "text-white" : "text-ink"}`}>{value}</p>
      <p className={`text-[11px] ${tone === "primary" ? "text-white/70" : "text-muted-foreground"}`}>{sub}</p>
    </div>
  );
}

function Row({ label, ri }: { label: string; ri: number }) {
  // pseudo-random demand
  const vals = [
    [20, 30, 50, 30, 20, 10, 0],
    [30, 60, 70, 80, 50, 40, 10],
    [10, 20, 40, 30, 30, 70, 50],
    [10, 20, 30, 30, 40, 50, 30],
    [50, 60, 70, 80, 90, 60, 30],
    [80, 90, 100, 90, 100, 70, 20],
    [90, 80, 70, 60, 80, 50, 10],
  ][ri];
  return (
    <>
      <div className="text-right pr-2 text-muted-foreground font-semibold self-center">{label}</div>
      {vals.map((v, i) => {
        const intensity = v / 100;
        const bg = `color-mix(in oklab, var(--primary) ${Math.round(intensity * 90)}%, var(--surface-muted))`;
        return (
          <div key={i} className="h-9 rounded-md transition hover:scale-[1.04] cursor-pointer" style={{ background: bg }} title={`${v}%`} />
        );
      })}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "응답완료") return <Badge tone="primary">{status}</Badge>;
  if (status === "확정완료") return <Badge tone="ink">{status}</Badge>;
  if (status === "응답대기") return <Badge tone="warn">{status}</Badge>;
  if (status === "미배정") return <Badge tone="warn">{status}</Badge>;
  return <Badge tone="muted">{status}</Badge>;
}
function NotiBadge({ n }: { n: string }) {
  if (n === "확정발송") return <Badge tone="success">{n}</Badge>;
  if (n === "재전송 필요") return <Badge tone="warn">{n}</Badge>;
  return <Badge tone="muted">{n}</Badge>;
}
