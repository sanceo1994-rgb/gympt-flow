import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import React, { useState } from "react";
import { Plus, Link as LinkIcon, Copy, Send, Sparkles, Ban, Check, Clock, Users, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "트레이너 일정 조율 — 짐피티 GymPT" },
      { name: "description", content: "다음 주 가능 시간을 1시간 단위로 열고, 학생 응답을 모아 AI가 최적 시간표를 만들어드려요." },
    ],
  }),
  component: Schedule,
});

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i); // 06~22

const INITIAL: Record<string, number> = {
  "월-19": 2, "월-20": 2,
  "화-7": 2, "화-9": 1, "화-19": 3,
  "수-9": 2, "수-19": 3, "수-20": 3,
  "목-7": 1, "목-17": 2, "목-19": 3,
  "금-9": 2, "금-19": 3, "금-20": 3,
  "토-9": 2, "토-11": 3, "토-14": 2,
};

type Status = "확정" | "응답완료" | "응답대기" | "불가" | "미배정";
const STUDENTS: { name: string; status: Status; picks: string[]; assigned?: string }[] = [
  { name: "김지원", status: "응답완료", picks: ["월 19시", "수 19시", "금 20시"], assigned: "월 19시" },
  { name: "박서윤", status: "확정", picks: ["화 07시", "목 07시"], assigned: "화 07시" },
  { name: "이도현", status: "응답대기", picks: [] },
  { name: "최유나", status: "응답완료", picks: ["수 09시", "금 09시"], assigned: "수 09시" },
  { name: "한승호", status: "미배정", picks: ["월 20시", "화 20시", "수 20시"] },
  { name: "정수민", status: "확정", picks: ["토 11시"], assigned: "토 11시" },
  { name: "오지훈", status: "불가", picks: [] },
];

function Schedule() {
  const [slots, setSlots] = useState<Record<string, number>>(INITIAL);
  const [tab, setTab] = useState<"slots" | "responses" | "ai">("slots");

  const totalCap = Object.values(slots).reduce((a, b) => a + b, 0);
  const openCount = Object.keys(slots).length;

  const toggle = (d: string, h: number) => {
    const key = `${d}-${h}`;
    setSlots((p) => {
      const n = { ...p };
      if (n[key]) delete n[key];
      else n[key] = 1;
      return n;
    });
  };
  const setCap = (d: string, h: number, v: number) => {
    setSlots((p) => ({ ...p, [`${d}-${h}`]: Math.max(1, Math.min(8, v)) }));
  };

  return (
    <AppShell bare>
      <div className="px-5 sm:px-7 lg:px-8 pt-6 pb-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-black text-primary uppercase tracking-widest">트레이너 일정 조율</p>
            <h1 className="mt-1 text-[26px] sm:text-[30px] font-black text-ink leading-tight">다음 주 일정 만들기</h1>
            <p className="mt-1 text-[13px] text-ink-soft">슬롯을 열고 → 학생 예약을 받고 → AI가 최적 시간표를 짜드려요.</p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-full bg-card border border-border-strong text-[13px] font-bold text-ink hover:bg-muted">초안 저장</button>
            <button className="h-10 px-4 rounded-full bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shadow-pop hover:brightness-110">
              <Send className="h-3.5 w-3.5" /> 학생에게 시간 선택 요청
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat label="활성 슬롯" v={openCount.toString()} icon={<Clock className="h-3.5 w-3.5" />} />
          <Stat label="총 정원" v={totalCap.toString()} icon={<Users className="h-3.5 w-3.5" />} />
          <Stat label="응답 완료" v={`${STUDENTS.filter((s) => s.status !== "응답대기").length}/${STUDENTS.length}`} />
          <Stat label="이번 주 PT 불가" v={STUDENTS.filter((s) => s.status === "불가").length.toString()} accent />
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 p-1 bg-surface-muted rounded-full w-fit">
          {[
            ["slots", "1. 슬롯 열기"],
            ["responses", "2. 학생 응답"],
            ["ai", "3. AI 최적 시간표"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k as typeof tab)}
              className={`px-4 h-9 rounded-full text-[12px] font-bold transition ${
                tab === k ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: SLOTS — calendar grid */}
      {tab === "slots" && (
        <div className="px-5 sm:px-7 lg:px-8 pb-8">
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-[56px_repeat(7,1fr)] bg-surface-muted border-b border-border">
              <div className="p-2 text-[11px] text-muted-foreground font-bold text-center">시간</div>
              {DAYS.map((d) => (
                <div key={d} className="p-2 text-center text-[13px] font-extrabold text-ink">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              {HOURS.map((h) => (
                <React.Fragment key={h}>
                  <div className="border-b border-border bg-surface-muted/60 grid place-items-center text-[10px] font-bold text-muted-foreground">
                    {String(h).padStart(2, "0")}
                  </div>
                  {DAYS.map((d) => {
                    const key = `${d}-${h}`;
                    const cap = slots[key];
                    const active = !!cap;
                    return (
                      <button
                        key={key}
                        onClick={() => toggle(d, h)}
                        className={`group relative h-11 border-b border-l border-border transition ${
                          active ? "bg-primary/10 hover:bg-primary/15" : "bg-card hover:bg-primary/5"
                        }`}
                      >
                        {active ? (
                          <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                            <span onClick={(e) => { e.stopPropagation(); setCap(d, h, cap - 1); }} className="h-5 w-5 rounded-full bg-card border border-border text-primary text-[12px] font-black grid place-items-center cursor-pointer">−</span>
                            <span className="font-black text-primary text-[13px] tabular-nums">{cap}</span>
                            <span onClick={(e) => { e.stopPropagation(); setCap(d, h, cap + 1); }} className="h-5 w-5 rounded-full bg-card border border-border text-primary text-[12px] font-black grid place-items-center cursor-pointer">+</span>
                          </div>
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto opacity-0 group-hover:opacity-100" />
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Share link */}
          <div className="mt-5 rounded-2xl bg-surface-muted border border-border p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">학생 예약 링크</p>
                <p className="text-[13px] text-ink-soft mt-0.5">학생은 가입 없이 이 링크에서 1·2·3순위 시간을 선택할 수 있어요.</p>
              </div>
              <button onClick={() => setTab("responses")} className="text-[12px] font-bold text-ink-soft hover:text-primary inline-flex items-center gap-1">
                응답 보러가기 <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 px-4 h-12 rounded-xl bg-card border border-border">
              <LinkIcon className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate text-[13px] font-mono text-ink">gympt.kr/b/dy-20251125-aF3xK</span>
              <button className="h-8 px-3 rounded-full bg-ink text-white text-[12px] font-bold inline-flex items-center gap-1">
                <Copy className="h-3 w-3" /> 복사
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: RESPONSES */}
      {tab === "responses" && (
        <div className="px-5 sm:px-7 lg:px-8 pb-8">
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-muted">
                <tr className="text-left text-[11px] font-bold uppercase text-ink-soft">
                  <th className="px-4 py-3">학생</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">선호 시간</th>
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
                    <td className="px-4 py-3 text-ink-soft">
                      {s.picks.length === 0 ? <span className="text-muted-foreground">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {s.picks.map((p, i) => (
                            <span key={p} className={`inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-bold ${i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-ink-soft"}`}>
                              <span className="font-black">{i + 1}</span>{p}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.status === "응답대기" ? (
                        <button className="h-8 px-3 rounded-full bg-ink text-white text-[11px] font-bold">재알림</button>
                      ) : s.status === "불가" ? (
                        <span className="text-[11px] text-muted-foreground">제외됨</span>
                      ) : (
                        <button className="h-8 px-3 rounded-full bg-card border border-border text-[11px] font-bold text-ink">상세</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => setTab("ai")} className="h-11 px-5 rounded-full bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shadow-pop">
              <Sparkles className="h-4 w-4" /> AI 최적 시간표 생성
            </button>
          </div>
        </div>
      )}

      {/* TAB: AI */}
      {tab === "ai" && <AIResultPanel />}
    </AppShell>
  );
}

function AIResultPanel() {
  const result: { day: string; hour: string; name: string; pri: 1 | 2 | 3 }[] = [
    { day: "월", hour: "19:00", name: "김지원", pri: 1 },
    { day: "화", hour: "07:00", name: "박서윤", pri: 1 },
    { day: "수", hour: "09:00", name: "최유나", pri: 1 },
    { day: "수", hour: "20:00", name: "한승호", pri: 3 },
    { day: "토", hour: "11:00", name: "정수민", pri: 1 },
  ];
  return (
    <div className="px-5 sm:px-7 lg:px-8 pb-8">
      <div className="rounded-2xl bg-ink text-white p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/40 blur-3xl" />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="chip bg-white/10 text-white"><Sparkles className="h-3 w-3" /> AI 결과</span>
            <h3 className="mt-2 text-[22px] font-black leading-tight">
              학생 7명 중 <span className="text-primary">5명 시간 확정</span><br />
              평균 1순위 매칭 <span className="text-primary">88%</span>
            </h3>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-full bg-white/10 text-white text-[12px] font-bold">다시 계산</button>
            <button className="h-10 px-4 rounded-full bg-primary text-white text-[12px] font-bold inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> 확정 알림 보내기
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-muted">
            <tr className="text-left text-[11px] font-bold uppercase text-ink-soft">
              <th className="px-4 py-3">시간</th>
              <th className="px-4 py-3">학생</th>
              <th className="px-4 py-3">우선순위</th>
              <th className="px-4 py-3 text-right">조치</th>
            </tr>
          </thead>
          <tbody>
            {result.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-3 font-extrabold text-ink">{r.day} {r.hour}</td>
                <td className="px-4 py-3 text-ink">{r.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 h-5 inline-flex items-center rounded-full text-[10px] font-black ${
                    r.pri === 1 ? "bg-primary text-white" : r.pri === 2 ? "bg-primary/30 text-ink" : "bg-muted text-ink-soft"
                  }`}>
                    {r.pri}순위
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="h-7 px-3 rounded-full bg-card border border-border text-[11px] font-bold">변경</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, v, icon, accent }: { label: string; v: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${accent ? "bg-primary/5 border-primary/30" : "bg-surface-muted border-border"}`}>
      <div className="flex items-center gap-1.5 text-ink-soft">
        {icon}
        <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`mt-1 text-[22px] font-black ${accent ? "text-primary" : "text-ink"}`}>{v}</p>
    </div>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const map: Record<Status, string> = {
    확정: "bg-ink text-white",
    응답완료: "bg-primary/15 text-primary",
    응답대기: "bg-muted text-ink-soft",
    불가: "bg-primary text-white",
    미배정: "bg-warning/15 text-ink",
  };
  const icon = s === "불가" ? <Ban className="h-3 w-3" /> : null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-bold ${map[s]}`}>
      {icon}{s}
    </span>
  );
}
