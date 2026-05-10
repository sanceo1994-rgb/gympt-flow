import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Plus, Link as LinkIcon, Copy, Send } from "lucide-react";

export const Route = createFileRoute("/schedule")({
  component: Schedule,
});

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const TIMES = ["07:00", "09:00", "12:00", "14:00", "17:00", "19:00", "20:00"];

function Schedule() {
  const [slots, setSlots] = useState<Record<string, number>>({
    "월-19:00": 2, "화-07:00": 1, "수-09:00": 2, "수-19:00": 2, "금-20:00": 2, "토-11:00": 3,
  });
  const total = Object.values(slots).reduce((a, b) => a + b, 0);
  const toggle = (d: string, t: string) => {
    const key = `${d}-${t}`;
    setSlots((p) => {
      const n = { ...p };
      if (n[key]) delete n[key];
      else n[key] = 1;
      return n;
    });
  };
  const setCap = (d: string, t: string, n: number) => {
    setSlots((p) => ({ ...p, [`${d}-${t}`]: Math.max(1, n) }));
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[12px] font-bold text-primary uppercase tracking-widest">주간 일정</p>
          <h1 className="mt-1 text-[26px] sm:text-[30px] font-black text-ink">다음 주 가능 시간 만들기</h1>
          <p className="mt-1 text-[13px] text-ink-soft">슬롯과 정원을 선택하면 학생용 예약 링크가 자동으로 생성됩니다.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-full bg-card border border-border-strong text-[13px] font-bold">초안 저장</button>
          <button className="h-10 px-4 rounded-full bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shadow-pop">
            <Send className="h-3.5 w-3.5" /> 학생에게 시간 선택 요청
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="활성 슬롯" v={Object.keys(slots).length.toString()} />
        <Stat label="총 정원" v={total.toString()} />
        <Stat label="현재 학생" v="14" />
        <Stat label="예상 응답률" v="86%" />
      </div>

      <div className="mt-6 panel p-5 overflow-x-auto">
        <div className="min-w-[640px] grid grid-cols-[80px_repeat(7,1fr)] gap-1.5">
          <div></div>
          {DAYS.map((d) => <div key={d} className="text-center font-bold text-ink-soft text-[12px] py-2">{d}</div>)}
          {TIMES.map((t) => (
            <>
              <div key={t} className="text-right pr-2 text-muted-foreground text-[12px] font-semibold self-center">{t}</div>
              {DAYS.map((d) => {
                const key = `${d}-${t}`;
                const cap = slots[key];
                const active = !!cap;
                return (
                  <button
                    key={key}
                    onClick={() => toggle(d, t)}
                    className={`group h-14 rounded-lg border-2 transition relative ${active ? "border-primary bg-primary-soft" : "border-dashed border-border hover:border-primary/40 hover:bg-primary/5"}`}
                  >
                    {active ? (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setCap(d, t, cap - 1); }} className="h-5 w-5 rounded-full bg-white text-primary font-black">−</button>
                        <span className="font-black text-primary">{cap}</span>
                        <button onClick={(e) => { e.stopPropagation(); setCap(d, t, cap + 1); }} className="h-5 w-5 rounded-full bg-white text-primary font-black">+</button>
                      </div>
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground mx-auto opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                );
              })}
            </>
          ))}
        </div>
      </div>

      <div className="mt-6 panel p-5">
        <p className="text-[11px] font-bold text-ink-soft uppercase tracking-widest">학생 예약 링크</p>
        <div className="mt-3 flex items-center gap-2 px-4 h-12 rounded-full bg-surface-muted border border-border">
          <LinkIcon className="h-4 w-4 text-primary" />
          <span className="flex-1 truncate text-[13px] font-mono text-ink">gympt.kr/b/dy-20251125-aF3xK</span>
          <button className="h-8 px-3 rounded-full bg-ink text-white text-[12px] font-bold inline-flex items-center gap-1">
            <Copy className="h-3 w-3" /> 복사
          </button>
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">학생은 가입 없이 이 링크에서 1·2·3순위 시간을 선택할 수 있어요.</p>
      </div>
    </AppShell>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted border border-border p-4">
      <p className="text-[11px] font-bold uppercase text-ink-soft">{label}</p>
      <p className="mt-1 text-[24px] font-black text-ink">{v}</p>
    </div>
  );
}
