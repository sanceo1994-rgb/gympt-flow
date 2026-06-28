import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DemoBanner } from "@/components/DemoBanner";
import { Check, Ban, Instagram, Award, Coffee, Lock, X } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/demo/student")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("pgpt-demo", "student");
      } catch {}
    }
  },
  head: () => ({
    meta: [{ title: "학생 화면 체험 — 픽짐피티 PickGymPT" }],
  }),
  component: DemoStudentBooking,
});

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i);

const DEMAND: Record<string, number> = {
  "월-7": 1, "월-19": 4, "월-20": 5,
  "화-7": 3, "화-9": 1, "화-19": 4, "화-20": 2,
  "수-9": 2, "수-12": 1, "수-19": 5, "수-20": 4,
  "목-7": 2, "목-17": 2, "목-19": 3,
  "금-9": 2, "금-19": 5, "금-20": 4,
  "토-9": 3, "토-10": 2, "토-11": 4, "토-14": 2,
};

const CLOSED = new Set<string>([
  "일-7", "일-8", "일-9", "일-10", "일-11", "일-12", "일-13", "일-14",
  "일-15", "일-16", "일-17", "일-18", "일-19", "일-20", "일-21", "일-22",
  "월-12", "월-13", "월-14",
]);

const TRAINER_SPECS = ["2024 NPC 보디빌딩 1위", "NSCA-CPT", "생활스포츠지도사 2급", "FMS Lv.2"];

function heatLevel(n: number, isMine: boolean) {
  if (isMine) return 5;
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

function DemoStudentBooking() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unavailable, setUnavailable] = useState(false);
  const [confirmUnavail, setConfirmUnavail] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editConfirm, setEditConfirm] = useState(false);
  const [toast, setToast] = useState<{ title: string; sub?: string } | null>(null);

  const selectedList = useMemo(() => Array.from(selected), [selected]);
  const hasEmpty = useMemo(() => selectedList.some((k) => !DEMAND[k]), [selectedList]);
  const fivePlus = selectedList.length >= 5;

  const fireToast = (title: string, sub?: string) => {
    setToast({ title, sub });
    setTimeout(() => setToast(null), 2400);
  };

  const toggle = (key: string) => {
    if (unavailable || CLOSED.has(key)) return;
    if (submitted) {
      setEditConfirm(true);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onUnavailableClick = () => (unavailable ? setUnavailable(false) : setConfirmUnavail(true));

  const confirmUnavailable = () => {
    setUnavailable(true);
    setSelected(new Set());
    setConfirmUnavail(false);
    setSubmitted(true);
    fireToast("'이번 주 PT 불가'로 전달했어요 (체험 모드 · 저장되지 않음)");
  };

  const handleSubmit = () => {
    setSubmitted(true);
    fireToast(
      unavailable ? "'이번 주 PT 불가'로 전달했어요" : `${selectedList.length}개 시간이 트레이너에게 전달됐어요`,
      "체험 모드 · 실제로 저장되지는 않아요",
    );
    if (!unavailable && (hasEmpty || fivePlus)) {
      setTimeout(
        () => fireToast("+10P 적립!", hasEmpty ? "비어있던 시간을 골라줬어요 ☕" : "5개 이상 골라줬어요 ☕"),
        1200,
      );
    }
  };

  return (
    <AppShell>
      <DemoBanner role="student" />
      <section className="rounded-2xl border border-border overflow-hidden bg-white">
        <div className="h-16" style={{ background: "linear-gradient(135deg, #E23A8A, #FF8AC2)" }} />
        <div className="px-5 sm:px-6 -mt-10 pb-5">
          <div className="flex items-start sm:items-end gap-4 flex-wrap">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-surface-muted ring-4 ring-white grid place-items-center text-[28px] font-black text-ink shadow-sm">
                김
              </div>
              <VerifiedBadge />
            </div>
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="인스타그램"
              className="ml-auto mt-10 sm:mt-0 h-9 w-9 rounded-full text-white grid place-items-center hover:brightness-110 self-start sm:self-end order-2 sm:order-3 shadow-sm"
              style={{
                background:
                  "radial-gradient(circle at 30% 110%, #FED373 0%, #F15245 35%, #D92E7F 60%, #9B36B7 85%, #515ECF 100%)",
              }}
            >
              <Instagram className="h-4 w-4" />
            </a>
            <div className="w-full sm:flex-1 sm:min-w-0 sm:pb-1.5 flex items-baseline gap-3 flex-wrap order-3 sm:order-2">
              <h1 className="text-[20px] sm:text-[22px] font-black text-ink leading-tight">김트레이너 트레이너</h1>
              <p className="text-[12px] font-bold text-ink-soft truncate">하이엔드 강남점</p>
            </div>
          </div>
          <p className="mt-4 text-[13.5px] text-ink-soft leading-relaxed">
            안녕하세요, 8년차 퍼스널 트레이너입니다. 단기간의 결과보다는{" "}
            <b className="text-ink">평생 가져갈 운동 습관</b>을 만드는 데 집중합니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TRAINER_SPECS.map((spec, index) => (
              <span
                key={spec}
                className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-bold ${index === 0 ? "bg-primary/10 text-primary" : "bg-muted text-ink"}`}
              >
                <Award className="h-3 w-3" /> {spec}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">학생 예약 · 다음 주</p>
          <h2 className="mt-1.5 text-[24px] sm:text-[28px] font-black text-ink leading-[1.15] tracking-tight">
            가능한 시간을<br />원하는 만큼 골라주세요
          </h2>
          <p className="mt-2 text-[13.5px] text-ink-soft leading-relaxed">
            색이 진할수록 다른 학생들이 많이 선택한 시간이에요.
          </p>
        </div>
        {submitted ? (
          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[oklch(0.95_0.05_160)] text-[oklch(0.40_0.12_160)] text-[12px] font-extrabold">
            <Check className="h-3.5 w-3.5" /> 제출 완료 · 상시 수정 가능
          </span>
        ) : selectedList.length > 0 && !unavailable ? (
          <span className="inline-flex items-center h-7 px-3 rounded-full bg-ink text-white text-[12px] font-bold tabular-nums">
            {selectedList.length}개 선택됨
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border-2 border-border-strong bg-white p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-[oklch(0.95_0.08_75)] border border-[oklch(0.80_0.12_75)] grid place-items-center shrink-0">
          <Coffee className="h-4.5 w-4.5 text-[oklch(0.50_0.15_55)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-extrabold text-ink">
            <span className="text-ink-soft">픽짐피티 포인트</span> 적립 안내
          </p>
          <p className="mt-0.5 text-[12px] text-ink-soft leading-relaxed">
            <b className="text-ink">아무도 선택 안 한 시간</b>을 고르거나 <b className="text-ink">5개 이상</b>을 선택하면 +10P.
          </p>
        </div>
      </div>

      <div className={`pb-32 ${unavailable ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="mt-4 rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-[36px_repeat(7,1fr)] sm:grid-cols-[44px_repeat(7,1fr)] bg-surface-muted border-b border-border">
            <div className="p-1.5 sm:p-2 text-[10px] text-muted-foreground font-bold text-center">시간</div>
            {DAYS.map((d) => (
              <div key={d} className="p-2 text-center text-[13px] font-extrabold text-ink">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[36px_repeat(7,1fr)] sm:grid-cols-[44px_repeat(7,1fr)]">
            {HOURS.map((h) => (
              <Frag key={h}>
                <div className="border-b border-border bg-surface-muted/60 grid place-items-center text-[10px] font-bold text-muted-foreground tabular-nums">
                  {String(h).padStart(2, "0")}
                </div>
                {DAYS.map((d) => {
                  const key = `${d}-${h}`;
                  const closed = CLOSED.has(key);
                  const isMine = selected.has(key);
                  const dem = DEMAND[key] ?? 0;
                  const lvl = heatLevel(dem, isMine);
                  return (
                    <button
                      key={key}
                      disabled={closed}
                      onClick={() => toggle(key)}
                      className={`relative h-12 sm:h-10 border-b border-l border-border transition group heat-${lvl}
                        ${closed ? "bg-muted text-muted-foreground/60 cursor-not-allowed" : "active:scale-[0.97] hover:ring-2 hover:ring-ink/40 hover:ring-inset"}
                        ${isMine ? "ring-2 ring-ink ring-inset z-10" : ""}
                      `}
                    >
                      {closed ? (
                        <Lock className="absolute inset-0 m-auto h-3 w-3 text-muted-foreground/60" />
                      ) : isMine ? (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                      ) : null}
                    </button>
                  );
                })}
              </Frag>
            ))}
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-soft sm:hidden">셀을 탭해서 가능한 시간을 골라주세요.</p>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-24px))]">
        <div className="rounded-2xl bg-ink text-white shadow-pink p-3 flex items-center gap-2.5">
          <div className={`flex-1 min-w-0 flex items-center gap-2.5 transition ${submitted ? "opacity-55 pointer-events-none" : ""}`}>
            <button
              onClick={onUnavailableClick}
              className={`h-11 px-3 rounded-xl text-[12px] font-bold inline-flex items-center gap-1 shrink-0 transition ${unavailable ? "bg-destructive text-white" : "bg-destructive/15 text-destructive hover:bg-destructive/25"}`}
            >
              <Ban className="h-3.5 w-3.5" /> {unavailable ? "PT 불가 ON" : "PT 불가"}
            </button>
            <div className="flex-1 min-w-0">
              {submitted ? (
                <p className="text-[12.5px] font-semibold text-white/90 inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  {unavailable ? "'이번 주 PT 불가'로 전달됐어요" : `${selectedList.length}개 시간이 트레이너에게 전달됐어요`}
                </p>
              ) : unavailable ? (
                <p className="text-[13px] font-semibold">이번 주는 PT가 어려워요.</p>
              ) : selectedList.length === 0 ? (
                <p className="text-[12px] text-white/70">
                  가능한 시간을 <b className="text-white">원하는 만큼</b> 골라주세요.
                </p>
              ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {selectedList.map((s) => (
                    <span
                      key={s}
                      className="shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-1.5 h-7 rounded-full bg-white/15 text-white text-[12px] font-bold"
                    >
                      {s.replace("-", " ")}시
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected((p) => {
                            const n = new Set(p);
                            n.delete(s);
                            return n;
                          });
                        }}
                        className="opacity-70 hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => (submitted ? setEditConfirm(true) : handleSubmit())}
            disabled={!submitted && !unavailable && selectedList.length === 0}
            className="h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shrink-0 disabled:opacity-40 hover:brightness-110"
          >
            {submitted ? "수정 제출" : "제출"} <Check className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={confirmUnavail} onOpenChange={setConfirmUnavail}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <div className="mb-3 grid h-28 w-28 place-items-center rounded-[28px] bg-destructive/10 text-destructive [&>svg]:h-10 [&>svg]:w-10">
              <Ban className="h-5 w-5" />
            </div>
            <DialogTitle>이번 주 PT 불가로 표시할까요?</DialogTitle>
            <DialogDescription>선택했던 시간이 모두 취소되고, 트레이너에게 "이번 주 불가"로 전달돼요.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setConfirmUnavail(false)} className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold">
              취소
            </button>
            <button onClick={confirmUnavailable} className="h-10 px-4 rounded-full bg-destructive text-white text-[12px] font-bold">
              불가로 표시
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editConfirm} onOpenChange={setEditConfirm}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <div className="mb-3 grid h-28 w-28 place-items-center rounded-[28px] bg-primary/10 text-primary [&>svg]:h-10 [&>svg]:w-10">
              <Check className="h-5 w-5" />
            </div>
            <DialogTitle>시간을 수정하시겠어요?</DialogTitle>
            <DialogDescription>수정하면 다시 시간을 고르거나 PT 불가로 바꿀 수 있어요.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setEditConfirm(false)} className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold">
              취소
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setEditConfirm(false);
              }}
              className="h-10 px-4 rounded-full bg-primary text-white text-[12px] font-bold shadow-pop"
            >
              네, 수정할게요
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl bg-ink text-white px-4 py-3 shadow-pop flex items-center gap-2.5 min-w-[280px]">
            <span className="h-8 w-8 rounded-full bg-primary grid place-items-center">
              {toast.title.startsWith("+") ? <Coffee className="h-4 w-4 text-white" /> : <Check className="h-4 w-4 text-white" />}
            </span>
            <div>
              <p className="text-[13px] font-extrabold leading-tight">{toast.title}</p>
              {toast.sub && <p className="text-[11px] text-white/60 mt-0.5">{toast.sub}</p>}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Frag({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
