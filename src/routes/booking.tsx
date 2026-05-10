import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Check, Ban, Info, X, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "학생 예약 — 짐피티 GymPT" },
      { name: "description", content: "원하는 PT 시간을 원하는 만큼 선택하세요. 다른 학생들이 어느 시간을 많이 골랐는지 한눈에 보입니다." },
    ],
  }),
  component: Booking,
});

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i); // 06~22

// Pre-existing student demand (how many other students already picked each slot)
const DEMAND: Record<string, number> = {
  "월-7": 1, "월-19": 4, "월-20": 5,
  "화-7": 3, "화-9": 1, "화-19": 4, "화-20": 2,
  "수-9": 2, "수-12": 1, "수-19": 5, "수-20": 4,
  "목-7": 2, "목-17": 2, "목-19": 3,
  "금-9": 2, "금-19": 5, "금-20": 4,
  "토-9": 3, "토-10": 2, "토-11": 4, "토-14": 2,
};

// Trainer-closed slots
const CLOSED = new Set<string>(["일-7", "일-8", "일-9", "일-10", "일-11", "일-12", "일-13", "일-14", "일-15", "일-16", "일-17", "일-18", "일-19", "일-20", "일-21", "일-22", "월-12", "월-13", "월-14"]);

function heatLevel(n: number, isMine: boolean) {
  if (isMine) return 5;
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

function getWeekLabel(offset: number) {
  const base = new Date(2026, 4, 11); // May 11, 2026 Mon (placeholder anchor)
  base.setDate(base.getDate() + offset * 7);
  const end = new Date(base);
  end.setDate(end.getDate() + 6);
  const f = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
  return `${f(base)} – ${f(end)}`;
}

function Booking() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unavailable, setUnavailable] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [activeDay, setActiveDay] = useState("화");

  const toggle = (key: string) => {
    if (unavailable) return;
    if (CLOSED.has(key)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedList = useMemo(() => Array.from(selected), [selected]);

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">학생 예약</p>
          <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-[1.15] tracking-tight">
            가능한 시간을<br />원하는 만큼 골라주세요
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-soft leading-relaxed">
            색이 진할수록 다른 학생들이 많이 선택한 시간이에요. 트레이너님이 모두 모아 가장 잘 맞는 시간으로 확정해 드려요.
          </p>
        </div>
        {selectedList.length > 0 && !unavailable && (
          <span className="inline-flex items-center h-7 px-3 rounded-full bg-ink text-white text-[12px] font-bold tabular-nums">
            {selectedList.length}개 선택됨
          </span>
        )}
      </div>

      {/* Week selector */}
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-surface-muted border border-border px-3 py-2">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          disabled={weekOffset <= 0}
          className="h-9 w-9 rounded-xl grid place-items-center text-ink-soft hover:bg-white disabled:opacity-30"
          aria-label="이전 주"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-bold text-ink-soft">
            {weekOffset === 0 ? "이번 주" : weekOffset === 1 ? "다음 주" : `${weekOffset}주 뒤`}
          </p>
          <p className="text-[14px] font-extrabold text-ink tabular-nums">{getWeekLabel(weekOffset)}</p>
        </div>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          disabled={weekOffset >= 4}
          className="h-9 w-9 rounded-xl grid place-items-center text-ink-soft hover:bg-white disabled:opacity-30"
          aria-label="다음 주"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Identity */}
      <div className="mt-4 grid sm:grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="h-12 px-4 rounded-xl bg-white border border-border text-[14px] font-semibold focus:border-primary outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="휴대폰 번호" className="h-12 px-4 rounded-xl bg-white border border-border text-[14px] font-semibold focus:border-primary outline-none" />
      </div>

      {/* Heatmap legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-ink-soft">
          <span>적게 선택</span>
          <span className="h-3 w-5 rounded-sm border border-border heat-0" />
          <span className="h-3 w-5 rounded-sm heat-1" />
          <span className="h-3 w-5 rounded-sm heat-2" />
          <span className="h-3 w-5 rounded-sm heat-3" />
          <span className="h-3 w-5 rounded-sm heat-4" />
          <span>많이 선택</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-ink" /> 내 선택</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-muted line-through" /> 닫힘</span>
        </div>
      </div>

      {/* DESKTOP — week heatmap */}
      <div className={`hidden sm:block pb-32 ${unavailable ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="mt-4 rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-[44px_repeat(7,1fr)] bg-surface-muted border-b border-border">
            <div className="p-2 text-[10px] text-muted-foreground font-bold text-center">시간</div>
            {DAYS.map((d) => (
              <div key={d} className="p-2 text-center text-[13px] font-extrabold text-ink">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-[44px_repeat(7,1fr)]">
            {HOURS.map((h) => (
              <React.Fragment key={h}>
                <div className="border-b border-border bg-surface-muted/60 grid place-items-center text-[10px] font-bold text-muted-foreground tabular-nums">
                  {String(h).padStart(2, "0")}
                </div>
                {DAYS.map((d) => {
                  const key = `${d}-${h}`;
                  const closed = CLOSED.has(key);
                  const isMine = selected.has(key);
                  const baseDemand = DEMAND[key] ?? 0;
                  const lvl = heatLevel(baseDemand, isMine);
                  return (
                    <button
                      key={key}
                      disabled={closed}
                      onClick={() => toggle(key)}
                      className={`relative h-10 border-b border-l border-border transition group heat-${lvl}
                        ${closed ? "bg-muted text-muted-foreground/60 cursor-not-allowed" : "hover:ring-2 hover:ring-ink/40 hover:ring-inset"}
                        ${isMine ? "ring-2 ring-ink ring-inset z-10" : ""}
                      `}
                    >
                      {isMine && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className={`sm:hidden pb-32 ${unavailable ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="mt-3 -mx-5 px-5 flex gap-2 overflow-x-auto pb-2 marquee-mask">
          {DAYS.map((d) => {
            const active = activeDay === d;
            return (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`shrink-0 px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[56px] transition ${active ? "bg-ink text-white" : "bg-surface-muted text-ink-soft"}`}
              >
                <span className="text-[16px] font-black">{d}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid gap-1.5">
          {HOURS.map((h) => {
            const key = `${activeDay}-${h}`;
            const closed = CLOSED.has(key);
            const isMine = selected.has(key);
            const dem = DEMAND[key] ?? 0;
            const lvl = heatLevel(dem, isMine);
            return (
              <button
                key={key}
                disabled={closed}
                onClick={() => toggle(key)}
                className={`w-full p-3 rounded-xl text-left transition heat-${lvl} ${closed ? "bg-muted opacity-50" : ""} ${isMine ? "ring-2 ring-ink" : "border border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-black tabular-nums">{String(h).padStart(2, "0")}:00</p>
                  {isMine ? (
                    <span className="h-7 w-7 rounded-full bg-white text-ink grid place-items-center"><Check className="h-4 w-4" /></span>
                  ) : closed ? (
                    <span className="text-[11px] text-muted-foreground">닫힘</span>
                  ) : (
                    <span className="text-[11px] font-bold text-ink-soft">{dem > 0 ? `${dem}명 선택` : "—"}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating banner */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(720px,calc(100vw-24px))]">
        <div className="rounded-2xl bg-ink text-white shadow-pink p-3 flex items-center gap-2.5">
          <button
            onClick={() => { setUnavailable((v) => !v); if (!unavailable) setSelected(new Set()); }}
            className={`h-11 px-3 rounded-xl text-[12px] font-bold inline-flex items-center gap-1 shrink-0 transition ${
              unavailable ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Ban className="h-3.5 w-3.5" /> {unavailable ? "PT 불가 ON" : "PT 불가"}
          </button>

          <div className="flex-1 min-w-0">
            {unavailable ? (
              <p className="text-[13px] font-semibold">이번 주는 PT가 어려워요. 트레이너에게 자동으로 전달됩니다.</p>
            ) : selectedList.length === 0 ? (
              <p className="text-[12px] text-white/70">가능한 시간을 <b className="text-white">원하는 만큼</b> 골라주세요.</p>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {selectedList.map((s) => (
                  <span key={s} className="shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-1.5 h-7 rounded-full bg-white/15 text-white text-[12px] font-bold">
                    {s.replace("-", " ")}시
                    <button onClick={(e) => { e.stopPropagation(); setSelected((p) => { const n = new Set(p); n.delete(s); return n; }); }} className="opacity-70 hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            disabled={(!unavailable && selectedList.length === 0) || !name || !phone}
            className="h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shrink-0 disabled:opacity-40 hover:brightness-110"
          >
            제출 <Check className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-soft justify-center">
          <Info className="h-3 w-3" />
          <span>이름·번호 입력 후 제출 가능</span>
          <span className="mx-1">·</span>
          <Link to="/" className="font-semibold hover:text-primary">짐피티 소개</Link>
        </div>
      </div>
    </AppShell>
  );
}
