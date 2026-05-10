import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Check, Sparkles, Ban, Info, X } from "lucide-react";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "학생 예약 — 짐피티 GymPT" },
      { name: "description", content: "원하는 PT 시간을 1·2·3순위까지 골라주세요. PC에서는 주간 달력으로, 모바일에서는 요일 탭으로 빠르게." },
    ],
  }),
  component: Booking,
});

const DAYS = [
  { d: "월", date: "11.25" },
  { d: "화", date: "11.26" },
  { d: "수", date: "11.27" },
  { d: "목", date: "11.28" },
  { d: "금", date: "11.29" },
  { d: "토", date: "11.30" },
  { d: "일", date: "12.01" },
];

// 06:00 ~ 22:00 hourly slots
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i);

type Demand = "여유" | "보통" | "혼잡" | "마감" | "닫힘";
// Trainer-defined slots: which hours are open per day, with capacity & current bookings
const SLOT_GRID: Record<string, { cap: number; booked: number } | null> = (() => {
  const grid: Record<string, { cap: number; booked: number } | null> = {};
  const open: Record<string, [number, number][]> = {
    월: [[7, 1], [12, 2], [19, 3], [20, 3]],
    화: [[7, 2], [9, 1], [19, 3]],
    수: [[9, 2], [14, 1], [19, 3], [20, 3]],
    목: [[7, 1], [17, 2], [19, 3]],
    금: [[9, 2], [19, 3], [20, 3]],
    토: [[9, 2], [11, 3], [14, 2]],
    일: [],
  };
  for (const day of DAYS) {
    for (const h of HOURS) grid[`${day.d}-${h}`] = null;
    for (const [h, cap] of open[day.d]) {
      const booked = h === 19 || h === 20 ? cap : Math.max(0, cap - 1);
      grid[`${day.d}-${h}`] = { cap, booked };
    }
  }
  return grid;
})();

function demandOf(slot: { cap: number; booked: number } | null): Demand {
  if (!slot) return "닫힘";
  if (slot.booked >= slot.cap) return "마감";
  const ratio = slot.booked / slot.cap;
  if (ratio >= 0.66) return "혼잡";
  if (ratio >= 0.34) return "보통";
  return "여유";
}

function Booking() {
  const [selected, setSelected] = useState<string[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [activeDay, setActiveDay] = useState("화");

  const toggle = (key: string) => {
    if (unavailable) return;
    const slot = SLOT_GRID[key];
    if (!slot || slot.booked >= slot.cap) return;
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((s) => s !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  };

  const status = unavailable
    ? { label: "이번 주 PT 불가", tone: "ink" as const }
    : selected.length === 0
    ? { label: "선택 대기", tone: "muted" as const }
    : { label: `${selected.length}순위까지 선택됨`, tone: "primary" as const };

  return (
    <AppShell bare>
      <div className="px-5 sm:px-7 lg:px-8 pt-6 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="chip"><Sparkles className="h-3 w-3" /> 다음 주 PT 일정</span>
          <span className={`text-[11px] font-bold px-2.5 h-6 inline-flex items-center rounded-full ${
            status.tone === "primary" ? "bg-primary text-white" : status.tone === "ink" ? "bg-ink text-white" : "bg-muted text-ink-soft"
          }`}>
            {status.label}
          </span>
        </div>
        <h1 className="mt-3 text-[26px] sm:text-[30px] font-black text-ink leading-tight">
          원하는 시간을<br />최대 3개까지 골라주세요
        </h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          선호 순서대로 1·2·3순위가 됩니다. 도윤 트레이너가 가장 잘 맞는 시간으로 확정해 드려요.
        </p>

        {/* Identity */}
        <div className="mt-5 grid sm:grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="h-12 px-4 rounded-2xl bg-surface-muted border border-border text-[14px] font-semibold focus:border-primary outline-none" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="휴대폰 번호" className="h-12 px-4 rounded-2xl bg-surface-muted border border-border text-[14px] font-semibold focus:border-primary outline-none" />
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
          <Legend swatch="bg-primary/10" label="여유" />
          <Legend swatch="bg-primary/30" label="보통" />
          <Legend swatch="bg-primary/60" label="혼잡" />
          <Legend swatch="bg-muted" label="마감" />
          <Legend swatch="bg-card border border-dashed" label="미오픈" />
        </div>
      </div>

      {/* DESKTOP — week calendar */}
      <div className={`hidden sm:block px-5 sm:px-7 lg:px-8 pb-32 ${unavailable ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="mt-3 rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] bg-surface-muted border-b border-border">
            <div className="p-2 text-[11px] text-muted-foreground font-bold text-center">시간</div>
            {DAYS.map((d) => (
              <div key={d.d} className="p-2 text-center">
                <p className="text-[10px] text-muted-foreground font-bold">{d.date}</p>
                <p className="text-[13px] font-extrabold text-ink">{d.d}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[56px_repeat(7,1fr)]">
            {HOURS.map((h) => (
              <div key={h} className="contents">
                <div className="border-b border-border bg-surface-muted/60 grid place-items-center text-[10px] font-bold text-muted-foreground">
                  {String(h).padStart(2, "0")}
                </div>
                {DAYS.map((d) => {
                  const key = `${d.d}-${h}`;
                  const slot = SLOT_GRID[key];
                  const dm = demandOf(slot);
                  const isSel = selected.includes(key);
                  const order = selected.indexOf(key) + 1;
                  const disabled = !slot || dm === "마감";
                  return (
                    <button
                      key={key}
                      disabled={disabled}
                      onClick={() => toggle(key)}
                      className={`relative h-10 border-b border-l border-border text-left transition group
                        ${isSel ? "bg-primary text-white ring-2 ring-primary z-10" : ""}
                        ${!isSel && dm === "여유" ? "bg-primary/5 hover:bg-primary/15" : ""}
                        ${!isSel && dm === "보통" ? "bg-primary/15 hover:bg-primary/25" : ""}
                        ${!isSel && dm === "혼잡" ? "bg-primary/30 hover:bg-primary/40" : ""}
                        ${!isSel && dm === "마감" ? "bg-muted text-muted-foreground" : ""}
                        ${!slot ? "bg-card" : ""}
                      `}
                    >
                      {isSel && (
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="h-6 w-6 rounded-full bg-white text-primary text-[12px] font-black grid place-items-center">{order}</span>
                        </span>
                      )}
                      {!isSel && slot && dm === "마감" && (
                        <span className="absolute inset-0 grid place-items-center text-[10px] font-bold">마감</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE — day tabs + list */}
      <div className={`sm:hidden px-5 pb-32 ${unavailable ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="mt-3 -mx-5 px-5 flex gap-2 overflow-x-auto pb-2 marquee-mask">
          {DAYS.map((d) => {
            const active = activeDay === d.d;
            return (
              <button
                key={d.d}
                onClick={() => setActiveDay(d.d)}
                className={`shrink-0 px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[60px] transition ${active ? "bg-ink text-white" : "bg-surface-muted text-ink-soft"}`}
              >
                <span className="text-[11px] font-bold">{d.date}</span>
                <span className="text-[16px] font-black">{d.d}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid gap-2">
          {HOURS.filter((h) => SLOT_GRID[`${activeDay}-${h}`]).map((h) => {
            const key = `${activeDay}-${h}`;
            const slot = SLOT_GRID[key]!;
            const dm = demandOf(slot);
            const isSel = selected.includes(key);
            const order = selected.indexOf(key) + 1;
            const full = dm === "마감";
            return (
              <button
                key={key}
                disabled={full}
                onClick={() => toggle(key)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition ${
                  isSel ? "border-primary bg-primary-soft" : full ? "border-border bg-muted opacity-60" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[20px] font-black text-ink">{String(h).padStart(2, "0")}:00</p>
                    <DemandPill demand={dm} />
                  </div>
                  {isSel ? (
                    <div className="h-9 w-9 rounded-full bg-primary text-white grid place-items-center font-black">{order}</div>
                  ) : (
                    <div className="h-9 w-9 rounded-full border-2 border-border" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating selected banner */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(720px,calc(100vw-24px))]">
        <div className="rounded-2xl bg-ink text-white shadow-pink p-3 sm:p-4 flex items-center gap-3">
          <button
            onClick={() => { setUnavailable((v) => !v); if (!unavailable) setSelected([]); }}
            className={`h-11 px-3 rounded-xl text-[12px] font-bold inline-flex items-center gap-1 shrink-0 transition ${
              unavailable ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title="이번 주 PT 불가"
          >
            <Ban className="h-3.5 w-3.5" /> {unavailable ? "PT 불가 ON" : "PT 불가"}
          </button>

          <div className="flex-1 min-w-0">
            {unavailable ? (
              <p className="text-[13px] font-semibold">이번 주는 PT가 어려워요. 트레이너에게 자동 알림이 갑니다.</p>
            ) : selected.length === 0 ? (
              <p className="text-[12px] text-white/70">선택한 시간이 여기에 표시돼요. <b className="text-white">최대 3개</b>까지 가능합니다.</p>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {selected.map((s, i) => (
                  <span key={s} className={`shrink-0 inline-flex items-center gap-1.5 pl-1.5 pr-2.5 h-8 rounded-full text-[12px] font-bold ${i === 0 ? "bg-primary text-white" : "bg-white/15 text-white"}`}>
                    <span className={`h-5 w-5 grid place-items-center rounded-full ${i === 0 ? "bg-white text-primary" : "bg-white/90 text-ink"} text-[10px] font-black`}>{i + 1}</span>
                    {s.replace("-", " ")}시
                    <button onClick={(e) => { e.stopPropagation(); setSelected((p) => p.filter((x) => x !== s)); }} className="opacity-70 hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            disabled={(!unavailable && selected.length === 0) || !name || !phone}
            className="h-11 px-5 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shrink-0 disabled:opacity-40 hover:brightness-110"
          >
            제출하기 <Check className="h-4 w-4" />
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

function DemandPill({ demand }: { demand: Demand }) {
  const map: Record<Demand, string> = {
    여유: "bg-primary/10 text-primary",
    보통: "bg-primary/30 text-ink",
    혼잡: "bg-primary text-white",
    마감: "bg-muted text-ink-soft",
    닫힘: "bg-muted text-muted-foreground",
  };
  return <span className={`mt-1 px-2 h-5 inline-flex items-center rounded-full text-[10px] font-black ${map[demand]}`}>{demand}</span>;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}
