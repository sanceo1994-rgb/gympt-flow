import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Award, Calendar, CalendarClock, Check, Flame, TrendingUp, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pickDisplayName } from "@/lib/display-name";

export const Route = createFileRoute("/pt-history")({
  head: () => ({ meta: [{ title: "내 PT 내역 - 픽짐피티" }] }),
  component: PTHistory,
});

type Status = "완료" | "취소" | "당일 취소" | "예정";
type SessionRow = {
  id: string;
  scheduled_at: string;
  status: string;
  note: string | null;
  trainers: { name: string; gym: string | null } | { name: string; gym: string | null }[] | null;
};
type Row = {
  id: string;
  date: string;
  time: string;
  trainer: string;
  gym: string;
  status: Status;
  note: string;
  daysFromToday: number;
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function historyRow(session: SessionRow): Row {
  const scheduled = new Date(session.scheduled_at);
  const trainer = one(session.trainers);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(scheduled);
  target.setHours(0, 0, 0, 0);
  const daysFromToday = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const status: Status =
    session.status === "cancelled"
      ? daysFromToday === 0
        ? "당일 취소"
        : "취소"
      : session.status === "completed" || scheduled.getTime() < Date.now()
        ? "완료"
        : "예정";

  return {
    id: session.id,
    date: `${String(scheduled.getFullYear()).slice(2)}.${String(scheduled.getMonth() + 1).padStart(2, "0")}.${String(scheduled.getDate()).padStart(2, "0")} (${DAY_NAMES[scheduled.getDay()]})`,
    time: `${String(scheduled.getHours()).padStart(2, "0")}:${String(scheduled.getMinutes()).padStart(2, "0")}`,
    trainer: pickDisplayName(trainer?.name) ?? "트레이너",
    gym: trainer?.gym || "소속 센터",
    status,
    note: session.note?.trim() || "수업 메모 없음",
    daysFromToday,
  };
}

function PTHistory() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<Row[]>([]);
  const [remaining, setRemaining] = useState({ current: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const completed = history.filter((h) => h.status === "완료").length;
  const upcoming = useMemo(
    () =>
      history
        .filter((h) => h.status === "예정" && h.daysFromToday >= 0)
        .sort((a, b) => a.daysFromToday - b.daysFromToday)[0],
    [history],
  );
  const isToday = upcoming?.daysFromToday === 0;

  useEffect(() => {
    if (authLoading) return;
    if (!user || String(user.id).startsWith("virtual-")) {
      setHistory([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadHistory() {
      setLoading(true);
      const [{ data: sessions }, { data: roster }] = await Promise.all([
        supabase
          .from("pt_sessions")
          .select("id,scheduled_at,status,note,trainers(name,gym)")
          .eq("student_user_id", user.id)
          .order("scheduled_at", { ascending: false }),
        supabase
          .from("student_rosters")
          .select("remaining_sessions,total_sessions")
          .eq("student_user_id", user.id)
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setHistory(((sessions ?? []) as SessionRow[]).map(historyRow));
      setRemaining({ current: roster?.remaining_sessions ?? 0, total: roster?.total_sessions ?? 0 });
      setLoading(false);
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  const fireToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  };

  return (
    <AppShell>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">내 정보</p>
        <h1 className="mt-1.5 text-[26px] font-black leading-tight text-ink sm:text-[30px]">PT 내역</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">지금까지의 수업 일정, 상태, 트레이너 메모를 확인하세요.</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <Kpi icon={<Calendar className="h-4 w-4" />} label="총 수업" value={history.length} suffix="회" />
        <Kpi icon={<Award className="h-4 w-4" />} label="완료" value={completed} suffix="회" accent />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="잔여" value={remaining.current} suffix={`/${remaining.total}회`} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-muted">
            <tr className="text-[11px] font-bold uppercase text-ink-soft">
              <th className="px-4 py-3 text-left">일시</th>
              <th className="px-4 py-3 text-left">트레이너 / 지점</th>
              <th className="hidden px-4 py-3 text-left sm:table-cell">메모</th>
              <th className="px-4 py-3 text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => {
              const isUpcoming = h.status === "예정";
              return (
                <tr key={h.id} className={`border-t border-border ${isUpcoming ? "bg-primary/[0.04] ring-2 ring-primary/60 ring-inset" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-bold tabular-nums text-ink">{h.date}</p>
                    <p className="text-[11px] tabular-nums text-ink-soft">{h.time}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-ink-soft sm:hidden">{h.note}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{h.trainer}</p>
                    <p className="text-[11px] text-ink-soft">{h.gym}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">{h.note}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill status={h.status} />
                  </td>
                </tr>
              );
            })}
            {!loading && history.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-[13px] text-ink-soft">
                  등록된 PT 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {upcoming && (
        <div data-bottom-floating className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2">
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-pop ${isToday ? "border-ink bg-ink text-white" : "border-border bg-white"}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isToday ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
              {isToday ? <Flame className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[13.5px] font-black leading-tight ${isToday ? "text-white" : "text-ink"}`}>
                {isToday ? "오늘은 PT 당일입니다" : <>다음 PT까지 <span className="tabular-nums text-primary">D-{upcoming.daysFromToday}</span></>}
              </p>
              <p className={`mt-0.5 truncate text-[11.5px] ${isToday ? "text-white/80" : "text-ink-soft"}`}>
                {upcoming.date} {upcoming.time} · {upcoming.trainer} 트레이너 · {upcoming.note}
              </p>
            </div>
            <button
              onClick={() => (isToday ? setCancelOpen(true) : setReschedOpen(true))}
              className={`h-10 shrink-0 rounded-xl px-4 text-[12px] font-extrabold ${isToday ? "bg-destructive text-white" : "bg-primary text-white shadow-pop"}`}
            >
              {isToday ? "당일 취소" : "일정 변경"}
            </button>
          </div>
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={(v) => { setCancelOpen(v); if (!v) setCancelReason(""); }}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink">
              <AlertTriangle className="h-5 w-5 text-destructive" /> PT 당일 취소
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-ink-soft">
              당일 취소 요청은 트레이너에게 전달됩니다.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="예: 컨디션 난조 / 갑작스러운 일정"
            className="w-full resize-none rounded-xl border border-border bg-surface-muted px-3 py-2 text-[13px] text-ink outline-none focus:border-ink focus:bg-white"
          />
          <DialogFooter>
            <button onClick={() => setCancelOpen(false)} className="h-10 rounded-xl border border-border-strong bg-white px-4 text-[12.5px] font-bold text-ink">
              닫기
            </button>
            <button
              onClick={() => {
                setCancelOpen(false);
                fireToast("당일 취소 요청을 보냈습니다.");
                setCancelReason("");
              }}
              className="h-10 rounded-xl bg-destructive px-4 text-[12.5px] font-extrabold text-white"
            >
              취소 요청
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={reschedOpen} onOpenChange={setReschedOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border bg-surface-muted px-6 py-5">
            <SheetTitle className="text-[18px] font-black text-ink">PT 일정 변경</SheetTitle>
            <SheetDescription className="text-[12.5px] text-ink-soft">
              가능한 시간 중 하나를 선택하면 변경 요청을 보냅니다.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">이번 주 빈 시간</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["월 19:00", "화 20:00", "수 07:00", "목 19:00", "금 20:00", "토 11:00"].map((slot) => (
                <button
                  key={slot}
                  onClick={() => setPickedSlot(slot)}
                  className={`h-12 rounded-xl border text-[13px] font-bold transition ${pickedSlot === slot ? "border-ink bg-ink text-white shadow-pop" : "border-border bg-white text-ink hover:border-ink/40"}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 border-t border-border p-4">
            <button onClick={() => setReschedOpen(false)} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border-strong bg-white text-[13px] font-bold text-ink">
              <X className="h-3.5 w-3.5" /> 닫기
            </button>
            <button
              disabled={!pickedSlot}
              onClick={() => {
                setReschedOpen(false);
                fireToast(`변경 요청을 보냈습니다. (${pickedSlot})`);
                setPickedSlot(null);
              }}
              className="inline-flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-primary text-[13px] font-extrabold text-white shadow-pop disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" /> 요청 보내기
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {toast && (
        <div className="fixed left-1/2 top-6 z-[70] inline-flex h-11 -translate-x-1/2 animate-in items-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-bold text-white shadow-pop fade-in slide-in-from-top-2">
          <Check className="h-4 w-4 text-primary" /> {toast}
        </div>
      )}
    </AppShell>
  );
}

function Kpi({ icon, label, value, suffix, accent }: { icon: React.ReactNode; label: string; value: number; suffix?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 sm:p-4 ${accent ? "border-ink bg-ink text-white" : "border-border bg-white"}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${accent ? "text-primary" : "text-ink-soft"}`}>
        {icon}
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-[24px] font-black leading-none tabular-nums sm:text-[28px]">{value}</span>
        {suffix && <span className={`text-[12px] font-bold ${accent ? "text-white/70" : "text-ink-soft"}`}>{suffix}</span>}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const tone =
    status === "완료"
      ? "bg-primary/10 text-primary"
      : status === "예정"
        ? "bg-primary text-white shadow-pop"
        : "bg-destructive/10 text-destructive";
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-extrabold ${tone}`}>
      {status}
    </span>
  );
}
