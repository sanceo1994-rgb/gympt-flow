import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/booking")({
  component: Booking,
});

const DAYS = [
  { d: "월", date: "11.25" },
  { d: "화", date: "11.26" },
  { d: "수", date: "11.27" },
  { d: "목", date: "11.28" },
  { d: "금", date: "11.29" },
  { d: "토", date: "11.30" },
];

const SLOTS: Record<string, { time: string; demand: "여유" | "보통" | "혼잡"; recommended?: boolean; full?: boolean }[]> = {
  월: [
    { time: "07:00", demand: "여유" },
    { time: "12:00", demand: "보통", recommended: true },
    { time: "19:00", demand: "혼잡" },
    { time: "20:00", demand: "혼잡", full: true },
  ],
  화: [
    { time: "07:00", demand: "보통" },
    { time: "09:00", demand: "여유", recommended: true },
    { time: "19:00", demand: "혼잡" },
  ],
  수: [
    { time: "09:00", demand: "보통" },
    { time: "14:00", demand: "여유" },
    { time: "19:00", demand: "혼잡", recommended: true },
    { time: "20:00", demand: "혼잡" },
  ],
  목: [
    { time: "07:00", demand: "여유" },
    { time: "17:00", demand: "보통" },
    { time: "19:00", demand: "혼잡" },
  ],
  금: [
    { time: "09:00", demand: "보통" },
    { time: "19:00", demand: "혼잡" },
    { time: "20:00", demand: "혼잡", recommended: true },
  ],
  토: [
    { time: "09:00", demand: "여유", recommended: true },
    { time: "11:00", demand: "보통" },
    { time: "14:00", demand: "여유" },
  ],
};

function Booking() {
  const [activeDay, setActiveDay] = useState("화");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const toggle = (slot: string) => {
    setSelected((prev) => {
      if (prev.includes(slot)) return prev.filter((s) => s !== slot);
      if (prev.length >= 3) return prev;
      return [...prev, slot];
    });
  };

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground font-bold">PT 예약</p>
            <p className="text-[14px] font-extrabold text-ink">도윤 트레이너</p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6">
        {/* Intro */}
        <div className="text-center">
          <span className="chip"><Sparkles className="h-3 w-3" /> 다음 주 PT 일정</span>
          <h1 className="mt-3 text-[26px] sm:text-[30px] font-black text-ink leading-tight">
            원하는 시간을<br />최대 3개까지 골라주세요
          </h1>
          <p className="mt-2 text-[13px] text-ink-soft">선호 순서대로 1·2·3순위가 됩니다. 트레이너 선생님이 가장 잘 맞는 시간을 배정해드려요.</p>
        </div>

        {/* Name / phone */}
        <div className="mt-6 grid sm:grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="h-12 px-4 rounded-2xl bg-card border border-border text-[14px] font-semibold focus:border-primary outline-none" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="휴대폰 번호" className="h-12 px-4 rounded-2xl bg-card border border-border text-[14px] font-semibold focus:border-primary outline-none" />
        </div>

        {/* Day tabs */}
        <div className="mt-6 -mx-4 px-4 flex gap-2 overflow-x-auto pb-2 marquee-mask">
          {DAYS.map((d) => {
            const active = activeDay === d.d;
            return (
              <button
                key={d.d}
                onClick={() => setActiveDay(d.d)}
                className={`shrink-0 px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[64px] transition ${active ? "bg-ink text-white" : "bg-card border border-border text-ink-soft"}`}
              >
                <span className="text-[11px] font-bold">{d.date}</span>
                <span className="text-[16px] font-black">{d.d}</span>
              </button>
            );
          })}
        </div>

        {/* Slots */}
        <div className="mt-3 grid gap-2">
          {SLOTS[activeDay].map((s) => {
            const key = `${activeDay} ${s.time}`;
            const isSelected = selected.includes(key);
            const order = selected.indexOf(key) + 1;
            const full = s.full;
            return (
              <button
                key={key}
                disabled={full && !isSelected}
                onClick={() => !full && toggle(key)}
                className={`relative w-full p-4 rounded-2xl border-2 text-left transition ${
                  isSelected ? "border-primary bg-primary-soft" : full ? "border-border bg-muted opacity-50" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[20px] font-black text-ink">{s.time}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <DemandPill demand={s.demand} />
                      {s.recommended && <span className="px-2 h-5 inline-flex items-center rounded-full bg-ink text-white text-[10px] font-black">추천</span>}
                      {full && <span className="px-2 h-5 inline-flex items-center rounded-full bg-muted-foreground/20 text-ink-soft text-[10px] font-bold">마감</span>}
                    </div>
                  </div>
                  {isSelected ? (
                    <div className="h-9 w-9 rounded-full bg-primary text-white grid place-items-center font-black">
                      {order}
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-full border-2 border-border" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected */}
        {selected.length > 0 && (
          <div className="mt-6 panel p-4">
            <p className="text-[11px] font-bold uppercase text-ink-soft">내가 선택한 시간</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selected.map((s, i) => (
                <span key={s} className={`inline-flex items-center gap-1.5 pl-2 pr-3 h-9 rounded-full font-bold text-[13px] ${i === 0 ? "bg-primary text-white" : "bg-muted text-ink"}`}>
                  <span className={`h-5 w-5 grid place-items-center rounded-full ${i === 0 ? "bg-white text-primary" : "bg-card text-ink"} text-[11px] font-black`}>{i + 1}</span>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1 text-[12px]">
            <p className="font-bold text-ink">{selected.length}/3 선택됨</p>
            <p className="text-muted-foreground">최소 1개 이상 선택해주세요</p>
          </div>
          <button
            disabled={selected.length === 0 || !name || !phone}
            className="h-12 px-6 rounded-full bg-primary text-white text-[14px] font-bold shadow-pink disabled:opacity-40 inline-flex items-center gap-1"
          >
            제출하기 <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DemandPill({ demand }: { demand: "여유" | "보통" | "혼잡" }) {
  const map = {
    여유: "bg-primary/10 text-primary",
    보통: "bg-primary/30 text-ink",
    혼잡: "bg-primary text-white",
  };
  return <span className={`px-2 h-5 inline-flex items-center rounded-full text-[10px] font-black ${map[demand]}`}>{demand}</span>;
}
