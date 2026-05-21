import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { Calendar, Award, TrendingUp, Flame, CalendarClock, AlertTriangle, X, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/pt-history")({
  head: () => ({ meta: [{ title: "내 PT 내역 — 픽짐피티" }] }),
  component: PTHistory,
});

type Status = "완료" | "취소" | "예정";
type Row = { date: string; time: string; trainer: string; gym: string; status: Status; note: string; daysFromToday?: number };

// "today" is mocked as 2026-05-20 to align with the daysFromToday metadata.
const HISTORY: Row[] = [
  { date: "26.05.27 (수)", time: "19:00", trainer: "박재현", gym: "하이엔드 강남점", status: "예정", note: "상체 (가슴/등)", daysFromToday: 7 },
  { date: "26.05.23 (토)", time: "11:00", trainer: "박재현", gym: "하이엔드 강남점", status: "예정", note: "하체 + 코어", daysFromToday: 3 },
  { date: "26.05.20 (수)", time: "19:00", trainer: "박재현", gym: "하이엔드 강남점", status: "예정", note: "유산소 + 복근", daysFromToday: 0 },
  { date: "26.05.12 (화)", time: "19:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "하체 + 코어" },
  { date: "26.05.09 (토)", time: "11:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "상체 (어깨/팔)" },
  { date: "26.05.07 (목)", time: "07:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "유산소 + 복근" },
  { date: "26.05.05 (화)", time: "19:00", trainer: "박재현", gym: "하이엔드 강남점", status: "취소", note: "회원 사정" },
  { date: "26.05.02 (토)", time: "10:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "데드리프트 폼 교정" },
  { date: "26.04.30 (목)", time: "19:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "하체 + 코어" },
  { date: "26.04.27 (월)", time: "20:00", trainer: "박재현", gym: "하이엔드 강남점", status: "완료", note: "상체 (가슴/등)" },
];

const SLOTS = ["월 19:00", "월 20:00", "화 07:00", "화 19:00", "수 19:00", "수 20:00", "목 07:00", "목 19:00", "금 19:00", "금 20:00", "토 09:00", "토 11:00"];

function PTHistory() {
  const completed = HISTORY.filter((h) => h.status === "완료").length;
  const upcoming = useMemo(() => HISTORY.filter((h) => h.status === "예정" && (h.daysFromToday ?? 999) >= 0).sort((a, b) => (a.daysFromToday ?? 0) - (b.daysFromToday ?? 0))[0], []);
  const isToday = upcoming?.daysFromToday === 0;

  const [reschedOpen, setReschedOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);


  const fireToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2400);
  };

  return (
    <AppShell>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">내 정보</p>
        <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-tight">PT 내역</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">지금까지의 수업 기록을 한눈에 확인하세요.</p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Kpi icon={<Calendar className="h-4 w-4" />} label="총 수업" value={HISTORY.length} suffix="회" />
        <Kpi icon={<Award className="h-4 w-4" />} label="완료" value={completed} suffix="회" accent />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="잔여 횟수" value={14} suffix="/30회" />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-muted">
            <tr className="text-[11px] font-bold uppercase text-ink-soft">
              <th className="px-4 py-3 text-left">일시</th>
              <th className="px-4 py-3 text-left">트레이너 / 지점</th>
              <th className="px-4 py-3 text-left">메모</th>
              <th className="px-4 py-3 text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((h, i) => {
              const isUpcoming = h.status === "예정";
              return (
                <tr
                  key={i}
                  className={`border-t border-border ${isUpcoming ? "bg-primary/[0.04] ring-2 ring-primary/60 ring-inset" : ""}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink tabular-nums">{h.date}</p>
                    <p className="text-[11px] text-ink-soft tabular-nums">{h.time}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{h.trainer}</p>
                    <p className="text-[11px] text-ink-soft">{h.gym}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{h.note}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center whitespace-nowrap px-2.5 h-6 rounded-full text-[11px] font-extrabold ${
                      h.status === "완료" ? "bg-primary/10 text-primary" :
                      h.status === "예정" ? "bg-primary text-white shadow-pop" :
                      "bg-destructive/10 text-destructive"
                    }`}>{h.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom floating "next PT" bar */}
      {upcoming && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl">
          <div className={`rounded-2xl shadow-pop border ${isToday ? "bg-ink text-white border-ink" : "bg-white border-border"} px-4 py-3 flex items-center gap-3`}>
            <span className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${isToday ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
              {isToday ? <Flame className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              {isToday ? (
                <>
                  <p className="text-[13.5px] font-black leading-tight">🔥 오늘은 PT 당일입니다!</p>
                  <p className="text-[11.5px] opacity-80 mt-0.5">{upcoming.date.slice(9)} {upcoming.time} · {upcoming.trainer} 트레이너 — 컨디션 점검하고 가볍게 데우고 오세요!</p>
                </>
              ) : (
                <>
                  <p className="text-[13.5px] font-black leading-tight text-ink">다음 PT까지 <span className="text-primary tabular-nums">D-{upcoming.daysFromToday}</span> · 열심히 운동해봐요! 💪</p>
                  <p className="text-[11.5px] text-ink-soft mt-0.5">{upcoming.date} {upcoming.time} · {upcoming.trainer} 트레이너 ({upcoming.note})</p>
                </>
              )}
            </div>
            {isToday ? (
              <button
                onClick={() => setCancelOpen(true)}
                className="shrink-0 h-10 px-4 rounded-xl bg-destructive text-white text-[12px] font-extrabold inline-flex items-center gap-1.5 hover:brightness-110"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> 당일 취소
              </button>
            ) : (
              <button
                onClick={() => setReschedOpen(true)}
                className="shrink-0 h-10 px-4 rounded-xl bg-primary text-white text-[12px] font-extrabold inline-flex items-center gap-1.5 hover:brightness-110 shadow-pop"
              >
                <CalendarClock className="h-3.5 w-3.5" /> 일정 변경
              </button>
            )}
          </div>
        </div>
      )}

      {/* Day-of cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={(v) => { setCancelOpen(v); if (!v) setCancelReason(""); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink">
              <AlertTriangle className="h-5 w-5 text-destructive" /> PT 당일 취소
            </DialogTitle>
            <DialogDescription className="text-[13px] text-ink-soft leading-relaxed">
              당일에 취소하면 <b className="text-destructive">잔여 횟수가 1회 차감</b>돼요 ㅠㅠ<br />
              그래도 취소를 요청할까요?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-1">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">
              취소 사유 <span className="text-ink-soft/70 normal-case font-bold">(선택)</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="예) 갑작스러운 야근 / 컨디션 난조 — 트레이너님께 한 줄 사정 전달돼요"
              className="mt-1.5 w-full px-3 py-2 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13px] text-ink resize-none"
            />
          </div>
          <DialogFooter>
            <button onClick={() => setCancelOpen(false)} className="h-10 px-4 rounded-xl bg-white border border-border-strong text-ink text-[12.5px] font-bold">유지</button>
            <button
              onClick={() => {
                setCancelOpen(false);
                const tail = cancelReason.trim() ? ` · 사유: ${cancelReason.trim().slice(0, 24)}` : "";
                fireToast(`당일 취소 요청을 트레이너님께 전송했어요 (잔여 -1)${tail}`);
                setCancelReason("");
              }}
              className="h-10 px-4 rounded-xl bg-destructive text-white text-[12.5px] font-extrabold"
            >
              취소 요청
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Right-side reschedule sheet (Notion-like) */}
      <Sheet open={reschedOpen} onOpenChange={setReschedOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-6 py-5 border-b border-border bg-surface-muted">
            <SheetTitle className="text-[18px] font-black text-ink">PT 일정 변경</SheetTitle>
            <SheetDescription className="text-[12.5px] text-ink-soft">
              가능한 시간 중 하나를 선택하면 트레이너님께 변경 요청이 전송돼요.
            </SheetDescription>
          </SheetHeader>
          <div className="p-6 flex-1 overflow-y-auto">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">이번 주 빈 시간</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SLOTS.map((s) => {
                const active = pickedSlot === s;
                return (
                  <button
                    key={s}
                    onClick={() => setPickedSlot(s)}
                    className={`h-12 rounded-xl text-[13px] font-bold transition border ${active ? "bg-ink text-white border-ink shadow-pop" : "bg-white text-ink border-border hover:border-ink/40"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-border p-4 flex gap-2">
            <button onClick={() => setReschedOpen(false)} className="h-11 flex-1 rounded-xl bg-white border border-border-strong text-ink text-[13px] font-bold inline-flex items-center justify-center gap-1.5">
              <X className="h-3.5 w-3.5" /> 닫기
            </button>
            <button
              disabled={!pickedSlot}
              onClick={() => { setReschedOpen(false); fireToast(`변경 요청 전송 ✓ (${pickedSlot})`); setPickedSlot(null); }}
              className="h-11 flex-[1.4] rounded-xl bg-primary text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-pop"
            >
              <Check className="h-3.5 w-3.5" /> 변경 요청 보내기
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] rounded-full bg-ink text-white px-4 h-11 shadow-pop inline-flex items-center gap-2 text-[12.5px] font-bold animate-in fade-in slide-in-from-top-2">
          <Check className="h-4 w-4 text-primary" /> {toast}
        </div>
      )}
    </AppShell>
  );
}

function Kpi({ icon, label, value, suffix, accent }: { icon: React.ReactNode; label: string; value: number; suffix?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "bg-ink text-white border-ink" : "bg-white border-border"}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${accent ? "text-primary" : "text-ink-soft"}`}>{icon}{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-[28px] font-black tabular-nums leading-none">{value}</span>
        {suffix && <span className={`text-[12px] font-bold ${accent ? "text-white/70" : "text-ink-soft"}`}>{suffix}</span>}
      </div>
    </div>
  );
}
