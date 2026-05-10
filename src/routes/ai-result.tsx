import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { Sparkles, RotateCcw, Check, AlertCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/ai-result")({
  component: AIResult,
});

type Assignment = { name: string; slot: string; pref: 1 | 2 | 3 | null; locked?: boolean };

const INITIAL: Assignment[] = [
  { name: "김지원", slot: "월 19:00", pref: 1 },
  { name: "박서윤", slot: "화 07:00", pref: 1 },
  { name: "최유나", slot: "수 09:00", pref: 1 },
  { name: "정수민", slot: "토 11:00", pref: 2 },
  { name: "한승호", slot: "월 20:00", pref: 1 },
  { name: "백다은", slot: "수 19:00", pref: 2 },
  { name: "임채린", slot: "금 20:00", pref: 1 },
  { name: "강민재", slot: "화 07:00", pref: 3 },
  { name: "윤하늘", slot: "—", pref: null },
];

const SLOTS = ["월 19:00", "월 20:00", "화 07:00", "수 09:00", "수 19:00", "목 17:00", "금 20:00", "토 09:00", "토 11:00"];

function AIResult() {
  const [list, setList] = useState(INITIAL);
  const assigned = list.filter((s) => s.pref !== null).length;
  const rate = Math.round((assigned / list.length) * 100);
  const score = list.reduce((acc, s) => acc + (s.pref === 1 ? 100 : s.pref === 2 ? 70 : s.pref === 3 ? 40 : -1000), 0);

  return (
    <AppShell>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="chip"><Sparkles className="h-3 w-3" /> AI 최적 시간표 생성 완료</span>
          <h1 className="mt-3 text-[26px] sm:text-[30px] font-black text-ink">11/25 — 12/01 추천 시간표</h1>
          <p className="mt-1 text-[13px] text-ink-soft">선착순이 아니라, 모두에게 더 잘 맞는 결과예요.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-full bg-card border border-border-strong text-[13px] font-bold inline-flex items-center gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> AI 재생성
          </button>
          <Link to="/notifications" className="h-10 px-4 rounded-full bg-primary text-white text-[13px] font-bold shadow-pop inline-flex items-center gap-1">
            확정 알림 보내기 <Check className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Big label="배정률" value={`${rate}%`} tone="primary" />
        <Big label="배정 학생" value={`${assigned}/${list.length}`} />
        <Big label="총 만족도" value={String(score)} />
        <Big label="1순위 매칭" value={`${list.filter((s) => s.pref === 1).length}명`} />
      </div>

      <div className="mt-6 panel p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-extrabold text-ink">배정 결과</h3>
          <p className="text-[12px] text-muted-foreground">필요한 경우 직접 변경할 수 있어요</p>
        </div>
        <div className="mt-4 grid gap-2">
          {list.map((s, i) => (
            <div key={i} className={`rounded-2xl p-3 sm:p-4 flex items-center gap-3 ${s.pref === null ? "bg-warning/10 border border-warning/30" : "bg-surface-muted border border-border"}`}>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-[#FF6BA8] grid place-items-center text-white font-black">{s.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink">{s.name}</p>
                  {s.pref === 1 && <Badge tone="primary">1순위 매칭</Badge>}
                  {s.pref === 2 && <Badge tone="muted">2순위</Badge>}
                  {s.pref === 3 && <Badge tone="warn">3순위</Badge>}
                  {s.pref === null && <Badge tone="warn"><AlertCircle className="h-3 w-3 mr-1" /> 미배정</Badge>}
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">현재 배정: <b className="text-ink">{s.slot}</b></p>
              </div>
              <select
                value={s.slot}
                onChange={(e) => {
                  const v = e.target.value;
                  setList((p) => p.map((x, j) => j === i ? { ...x, slot: v, pref: v === "—" ? null : x.pref ?? 2 } : x));
                }}
                className="h-9 px-3 rounded-full bg-card border border-border text-[12px] font-bold outline-none focus:border-primary"
              >
                <option>—</option>
                {SLOTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="h-10 px-4 rounded-full bg-surface-muted text-ink text-[12px] font-bold">AI 배정으로 복원</button>
          <button className="h-10 px-4 rounded-full bg-ink text-white text-[12px] font-bold">최종 확정</button>
        </div>
      </div>

      <div className="mt-6 panel p-5">
        <h3 className="text-[16px] font-extrabold text-ink">슬롯 점유율</h3>
        <div className="mt-3 grid gap-2">
          {SLOTS.map((slot) => {
            const count = list.filter((s) => s.slot === slot).length;
            const cap = 2;
            const pct = Math.min(100, (count / cap) * 100);
            return (
              <div key={slot} className="flex items-center gap-3">
                <span className="w-24 text-[13px] font-bold text-ink">{slot}</span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[12px] font-bold text-ink-soft w-12 text-right">{count}/{cap}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function Big({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className={`rounded-2xl p-4 ${tone === "primary" ? "bg-primary text-white" : "bg-surface-muted border border-border"}`}>
      <p className={`text-[11px] font-bold uppercase ${tone === "primary" ? "text-white/80" : "text-ink-soft"}`}>{label}</p>
      <p className={`mt-1 text-[28px] font-black ${tone === "primary" ? "text-white" : "text-ink"}`}>{value}</p>
    </div>
  );
}
