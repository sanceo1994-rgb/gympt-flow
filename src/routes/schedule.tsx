import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import React, { useMemo, useState } from "react";
import { Send, Sparkles, Check, ChevronLeft, ChevronRight, Ban, Lock, Users, MailCheck, CalendarCheck, Pencil, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "트레이너 일정 조율 — 짐피티 GymPT" },
      { name: "description", content: "달력으로 학생 응답을 한눈에 확인하고, 안되는 시간만 닫으면 AI가 최적 시간표를 만들어드려요." },
    ],
  }),
  component: Schedule,
});

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i);

const PICKS: Record<string, string[]> = {
  "월-19": ["김지원", "한승호", "최유나", "이도현"],
  "월-20": ["김지원", "한승호", "박서윤", "최유나", "정수민"],
  "화-7": ["박서윤", "정수민"],
  "화-19": ["김지원", "한승호", "최유나"],
  "수-9": ["최유나", "정수민"],
  "수-19": ["김지원", "한승호", "최유나", "이도현", "박서윤"],
  "수-20": ["김지원", "한승호", "박서윤"],
  "목-7": ["박서윤"],
  "목-19": ["김지원", "이도현"],
  "금-19": ["김지원", "한승호", "최유나", "이도현", "박서윤"],
  "금-20": ["김지원", "한승호", "박서윤", "최유나"],
  "토-9": ["최유나", "정수민"],
  "토-11": ["정수민", "박서윤", "이도현"],
};

function heatLevel(n: number) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

function getWeekLabel(offset: number) {
  const base = new Date(2026, 4, 11);
  base.setDate(base.getDate() + offset * 7);
  const end = new Date(base);
  end.setDate(end.getDate() + 6);
  const f = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
  return `${f(base)} – ${f(end)}`;
}

type Status = "응답완료" | "응답대기" | "불가";
type Student = {
  name: string;
  status: Status;
  picks: string[];
  lastPT: string;
  remaining: number;
  total: number;
};

const STUDENTS: Student[] = [
  { name: "김지원", status: "응답완료", picks: ["월 19시", "월 20시", "수 19시", "금 19시"], lastPT: "5.7 (목)", remaining: 14, total: 30 },
  { name: "박서윤", status: "응답완료", picks: ["화 07시", "수 19시", "금 19시", "금 20시"], lastPT: "5.8 (금)", remaining: 7, total: 20 },
  { name: "최유나", status: "응답완료", picks: ["수 09시", "수 19시", "금 19시", "토 09시"], lastPT: "5.6 (수)", remaining: 22, total: 40 },
  { name: "정수민", status: "응답완료", picks: ["화 07시", "토 09시", "토 11시"], lastPT: "5.4 (월)", remaining: 3, total: 20 },
  { name: "한승호", status: "응답완료", picks: ["월 19시", "월 20시", "수 19시", "금 19시"], lastPT: "5.9 (토)", remaining: 11, total: 24 },
  { name: "이도현", status: "응답대기", picks: [], lastPT: "5.2 (토)", remaining: 5, total: 10 },
  { name: "오지훈", status: "불가", picks: [], lastPT: "5.5 (화)", remaining: 8, total: 20 },
];

const AI_RESULT_INIT = [
  { day: "월", hour: "19:00", name: "김지원" },
  { day: "월", hour: "20:00", name: "한승호" },
  { day: "화", hour: "07:00", name: "박서윤" },
  { day: "수", hour: "09:00", name: "최유나" },
  { day: "수", hour: "19:00", name: "이도현" },
  { day: "금", hour: "20:00", name: "정수민" },
];

function Schedule() {
  const [weekOffset, setWeekOffset] = useState(1);
  const [closed, setClosed] = useState<Set<string>>(new Set(["일-7", "일-8", "일-9", "일-10", "일-11", "일-12", "일-13", "일-14", "일-15", "일-16", "일-17", "일-18", "일-19", "일-20", "일-21", "일-22"]));
  const [editing, setEditing] = useState<Student | null>(null);

  const toggleClosed = (key: string) => {
    setClosed((p) => {
      const n = new Set(p);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const closeDay = (d: string) => {
    setClosed((p) => {
      const n = new Set(p);
      const allClosed = HOURS.every((h) => n.has(`${d}-${h}`));
      HOURS.forEach((h) => (allClosed ? n.delete(`${d}-${h}`) : n.add(`${d}-${h}`)));
      return n;
    });
  };

  const closeHour = (h: number) => {
    setClosed((p) => {
      const n = new Set(p);
      const allClosed = DAYS.every((d) => n.has(`${d}-${h}`));
      DAYS.forEach((d) => (allClosed ? n.delete(`${d}-${h}`) : n.add(`${d}-${h}`)));
      return n;
    });
  };

  const stats = useMemo(() => {
    const total = STUDENTS.length;
    const responded = STUDENTS.filter((s) => s.status !== "응답대기").length;
    const assignable = AI_RESULT_INIT.length;
    return { total, responded, assignable };
  }, []);

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">트레이너 일정 조율</p>
          <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-[1.15] tracking-tight">
            박재현 트레이너님!<br />저희가 시간을 조율해드릴게요
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-full bg-white border border-border-strong text-[13px] font-bold text-ink hover:bg-muted">초안 저장</button>
          <button className="h-10 px-4 rounded-full bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shadow-pop hover:brightness-110">
            <Send className="h-3.5 w-3.5" /> 학생에게 요청 보내기
          </button>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <KpiCard icon={<Users className="h-4 w-4" />} label="관리 회원" value={stats.total} suffix="명" />
        <KpiCard icon={<MailCheck className="h-4 w-4" />} label="응답 완료" value={stats.responded} suffix={`/${stats.total}명`} accent />
        <KpiCard icon={<CalendarCheck className="h-4 w-4" />} label="배정 가능" value={stats.assignable} suffix="명 (겹침 없음)" />
      </div>

      {/* Week selector */}
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-surface-muted border border-border px-3 py-2">
        <button
          onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
          disabled={weekOffset <= 0}
          className="h-9 w-9 rounded-xl grid place-items-center text-ink-soft hover:bg-white disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5 overflow-x-auto">
          {[0, 1, 2, 3, 4].map((o) => {
            const label = o === 0 ? "이번 주" : o === 1 ? "다음 주" : o === 2 ? "다다음 주" : `${o}주 뒤`;
            const active = weekOffset === o;
            return (
              <button
                key={o}
                onClick={() => setWeekOffset(o)}
                className={`shrink-0 h-9 px-3.5 rounded-xl text-[12px] font-bold transition ${
                  active ? "bg-ink text-white" : "text-ink-soft hover:bg-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setWeekOffset((o) => Math.min(4, o + 1))}
          disabled={weekOffset >= 4}
          className="h-9 w-9 rounded-xl grid place-items-center text-ink-soft hover:bg-white disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-[12px] font-bold text-ink tabular-nums">{getWeekLabel(weekOffset)}</p>

      {/* Pending responses + Quick Kakao re-notify */}
      <div className="mt-6 rounded-2xl border border-border bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-surface-muted">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-black text-ink">아직 응답하지 않은 회원</span>
            <span className="text-[12px] font-bold text-destructive tabular-nums">
              {STUDENTS.filter((s) => s.status === "응답대기").length}명
            </span>
          </div>
          <button className="h-9 px-3.5 rounded-full bg-[#FEE500] text-[#191600] text-[12px] font-extrabold inline-flex items-center gap-1.5 hover:brightness-95">
            <MessageCircle className="h-3.5 w-3.5 fill-[#191600]" /> 전체 카톡 재알림
          </button>
        </div>
        <ul className="divide-y divide-border">
          {STUDENTS.filter((s) => s.status === "응답대기").map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-surface-muted grid place-items-center font-black text-[12px] text-ink shrink-0">{s.name[0]}</div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-ink">{s.name}</p>
                  <p className="text-[11px] text-ink-soft">최근 PT {s.lastPT} · 잔여 <span className={s.remaining <= 5 ? "text-destructive font-bold" : ""}>{s.remaining}회</span></p>
                </div>
              </div>
              <button className="h-8 px-3 rounded-full bg-[#FEE500] text-[#191600] text-[11px] font-extrabold inline-flex items-center gap-1 hover:brightness-95 shrink-0">
                <MessageCircle className="h-3 w-3 fill-[#191600]" /> 재알림
              </button>
            </li>
          ))}
          {STUDENTS.filter((s) => s.status === "응답대기").length === 0 && (
            <li className="px-5 py-6 text-center text-[12px] text-ink-soft">모든 회원이 응답을 완료했어요 ✓</li>
          )}
        </ul>
      </div>

      {/* AI 최적 시간표 — moved up */}
      <div className="mt-4 rounded-2xl bg-ink text-white p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="chip bg-white/10 text-white"><Sparkles className="h-3 w-3" /> AI 최적 시간표</span>
            <h3 className="mt-2 text-[20px] sm:text-[22px] font-black leading-tight">
              학생 6명 / <span className="text-primary">6명 자동 배정</span>
              <span className="text-white/60 font-bold text-[14px]"> · 선호 만족 94%</span>
            </h3>
          </div>
          <div className="flex gap-2">
            <button className="h-9 px-3.5 rounded-full bg-white/10 text-white text-[12px] font-bold">다시 계산</button>
            <button className="h-9 px-3.5 rounded-full bg-primary text-white text-[12px] font-bold inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> 확정 알림
            </button>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AI_RESULT_INIT.map((r, i) => (
            <div key={i} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{r.day}요일</p>
                <p className="text-[15px] font-black tabular-nums">{r.hour}</p>
              </div>
              <span className="inline-flex items-center px-2 h-6 rounded-full bg-primary/20 text-primary text-[11px] font-extrabold">{r.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 1 — Calendar */}
      <section className="mt-8">
        <SectionHeader index="01" title="학생 선택 현황 + 안되는 시간 닫기" subtitle="셀 클릭으로 닫기/열기. 요일·시간 헤더를 누르면 행/열 전체를 한 번에 닫아요." />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-soft">
          <div className="flex items-center gap-2">
            <span>0명</span>
            <span className="h-3 w-5 rounded-sm border border-border heat-0" />
            <span className="h-3 w-5 rounded-sm heat-1" />
            <span className="h-3 w-5 rounded-sm heat-2" />
            <span className="h-3 w-5 rounded-sm heat-3" />
            <span className="h-3 w-5 rounded-sm heat-4" />
            <span>4+ 명</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3" /> 닫힌 시간</span>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-[44px_repeat(7,1fr)] bg-surface-muted border-b border-border">
            <div className="p-2 text-[10px] text-muted-foreground font-bold text-center">시간</div>
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => closeDay(d)}
                className="p-2 text-center text-[13px] font-extrabold text-ink hover:bg-white transition"
                title="이 요일 전체 닫기/열기"
              >
                {d}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[44px_repeat(7,1fr)]">
            {HOURS.map((h) => (
              <React.Fragment key={h}>
                <button
                  onClick={() => closeHour(h)}
                  className="border-b border-border bg-surface-muted/60 grid place-items-center text-[10px] font-bold text-muted-foreground tabular-nums hover:bg-white transition"
                  title="이 시간 전체 닫기/열기"
                >
                  {String(h).padStart(2, "0")}
                </button>
                {DAYS.map((d) => {
                  const key = `${d}-${h}`;
                  const picks = PICKS[key] ?? [];
                  const isClosed = closed.has(key);
                  const lvl = heatLevel(picks.length);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleClosed(key)}
                      title={picks.length ? picks.join(", ") : "선택한 학생 없음"}
                      className={`relative h-11 border-b border-l border-border transition group
                        ${isClosed ? "bg-muted text-muted-foreground/50" : `heat-${lvl} hover:ring-2 hover:ring-ink/40 hover:ring-inset`}
                      `}
                    >
                      {isClosed ? (
                        <Lock className="absolute inset-0 m-auto h-3.5 w-3.5" />
                      ) : picks.length > 0 ? (
                        <span className={`text-[11px] font-black tabular-nums ${lvl >= 4 ? "text-white" : "text-ink"}`}>{picks.length}</span>
                      ) : null}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — Student responses */}
      <section className="mt-10">
        <SectionHeader index="02" title="학생 응답" subtitle={`${stats.responded} / ${stats.total}명 응답 완료`} />

        <div className="mt-4 rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-muted">
              <tr className="text-left text-[11px] font-bold uppercase text-ink-soft">
                <th className="px-4 py-3">학생</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">최근 PT</th>
                <th className="px-4 py-3">남은 횟수</th>
                <th className="px-4 py-3">선택한 시간</th>
                <th className="px-4 py-3 text-right">조치</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s) => (
                <tr key={s.name} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-surface-muted grid place-items-center font-black text-[12px] text-ink">{s.name[0]}</div>
                      <span className="font-bold text-ink">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge s={s.status} /></td>
                  <td className="px-4 py-3 text-ink-soft tabular-nums">{s.lastPT}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={`font-extrabold ${s.remaining <= 5 ? "text-destructive" : "text-ink"}`}>{s.remaining}</span>
                    <span className="text-muted-foreground"> / {s.total}회</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {s.picks.length === 0 ? <span className="text-muted-foreground">—</span> : (
                      <div className="flex flex-wrap gap-1">
                        {s.picks.map((p) => (
                          <span key={p} className="inline-flex items-center px-2 h-6 rounded-full text-[11px] font-bold bg-muted text-ink">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(s)}
                      className="h-8 px-3 rounded-full bg-ink text-white text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> 일정 조정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name} · 일정 수동 조정</DialogTitle>
            <DialogDescription>학생의 응답과 무관하게 트레이너가 직접 시간을 지정합니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="text-[12px] font-bold text-ink-soft">배정 요일 / 시간</label>
            <div className="grid grid-cols-2 gap-2">
              <select className="h-10 px-3 rounded-xl border border-border bg-white text-[13px] font-semibold">
                {DAYS.map((d) => <option key={d}>{d}요일</option>)}
              </select>
              <select className="h-10 px-3 rounded-xl border border-border bg-white text-[13px] font-semibold">
                {HOURS.map((h) => <option key={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
            </div>
            <label className="text-[12px] font-bold text-ink-soft mt-2">메모</label>
            <textarea className="min-h-[72px] p-3 rounded-xl border border-border bg-white text-[13px]" placeholder="예: 다음 주는 출장으로 토요일 오전만 가능" />
          </div>
          <DialogFooter>
            <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold">취소</button>
            <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-full bg-primary text-white text-[12px] font-bold">저장</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function KpiCard({ icon, label, value, suffix, accent }: { icon: React.ReactNode; label: string; value: number; suffix?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "bg-ink text-white border-ink" : "bg-white border-border"}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${accent ? "text-primary" : "text-ink-soft"}`}>
        {icon}{label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-[28px] font-black tabular-nums leading-none">{value}</span>
        {suffix && <span className={`text-[12px] font-bold ${accent ? "text-white/70" : "text-ink-soft"}`}>{suffix}</span>}
      </div>
    </div>
  );
}

function SectionHeader({ index, title, subtitle }: { index: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] font-black tabular-nums text-primary tracking-widest">{index}</span>
        <h2 className="text-[18px] sm:text-[20px] font-black text-ink leading-tight">{title}</h2>
      </div>
      {subtitle && <p className="text-[12px] text-ink-soft">{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const map: Record<Status, string> = {
    응답완료: "bg-primary/15 text-primary",
    응답대기: "bg-muted text-ink-soft",
    불가: "bg-destructive/15 text-destructive",
  };
  const icon = s === "불가" ? <Ban className="h-3 w-3" /> : null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-bold ${map[s]}`}>
      {icon}{s}
    </span>
  );
}
