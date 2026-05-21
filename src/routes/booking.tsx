import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Check, Ban, Info, X, Lock, Instagram, Megaphone, Award, Coffee, Sparkles, ArrowRight } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { awardPoints, getMyWeekPoints } from "@/lib/points.functions";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "학생 예약 — 픽짐피티 PickGymPT" },
      { name: "description", content: "원하는 PT 시간을 원하는 만큼 선택하세요. 비어있는 시간/5개 이상 선택 시 포인트도 적립돼요." },
    ],
  }),
  component: Booking,
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
  "일-7","일-8","일-9","일-10","일-11","일-12","일-13","일-14","일-15","일-16","일-17","일-18","일-19","일-20","일-21","일-22",
  "월-12","월-13","월-14",
]);

// Trainer's registered student phone numbers / emails (mirrors /students mock data)
const TRAINER_NAME = "박재현";
const TRAINER_STUDENT_PHONES: Set<string> = new Set([
  "01012345678", "01023456789", "01034567890", "01045678901", "01056789012",
  "01067890123", "01078901234", "01089012345", "01090123456", "01001234567",
]);
// Mock: emails of users who are registered as this trainer's students
const TRAINER_STUDENT_EMAILS: Set<string> = new Set([
  "kim.jiwon@kakao.com", "park.seoyun@kakao.com", "choi.yuna@kakao.com",
]);
const normalizePhone = (s: string) => s.replace(/\D/g, "");

function heatLevel(n: number, isMine: boolean) {
  if (isMine) return 5;
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const award = useServerFn(awardPoints);
  const fetchPts = useServerFn(getMyWeekPoints);

  const userRole = (user?.user_metadata as { role?: string } | undefined)?.role;
  // Trainer viewing their own booking page (preview/owner mode)
  const isOwnerTrainer = userRole === "trainer";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unavailable, setUnavailable] = useState(false);
  
  const [loginOpen, setLoginOpen] = useState(false);
  const [confirmUnavail, setConfirmUnavail] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ title: string; sub?: string } | null>(null);
  const [weekPoints, setWeekPoints] = useState<number>(0);

  // Trainer announcement (owner-editable)
  const [announcement, setAnnouncement] = useState<string>(
    "5월 25일(월)은 세미나로 휴무입니다. 해당 주는 화·수·금에 더 많은 시간대를 열어두었으니 미리 선택 부탁드려요!"
  );
  const [annOpen, setAnnOpen] = useState(false);
  const [annDraft, setAnnDraft] = useState("");

  // Trainer-student matching gate (only the schedule area is locked; profile is public)
  const [matchUnlocked, setMatchUnlocked] = useState(false);
  const [matchAsked, setMatchAsked] = useState(false);
  const [matchPhone, setMatchPhone] = useState("");
  const [matchError, setMatchError] = useState<string | null>(null);


  // Determine gate state based on auth + roster
  const isRegisteredStudent = !!user && (
    TRAINER_STUDENT_EMAILS.has(user.email ?? "") ||
    TRAINER_STUDENT_PHONES.has(normalizePhone((user.user_metadata as { phone?: string } | undefined)?.phone ?? ""))
  );
  const gateState: "loggedOut" | "registered" | "notRegistered" = !user ? "loggedOut" : isRegisteredStudent ? "registered" : "notRegistered";
  const effectiveUnlocked = matchUnlocked || gateState === "registered";

  const handleConfirmStudent = () => { setMatchAsked(true); setMatchError(null); };
  const handleNotStudent = () => {
    setMatchError("괜찮아요! 트레이너님께 등록 요청을 보내거나, 다른 트레이너의 페이지를 둘러볼 수 있어요.");
  };
  const submitMatchPhone = () => {
    const ok = TRAINER_STUDENT_PHONES.has(normalizePhone(matchPhone));
    if (ok) { setMatchUnlocked(true); setMatchError(null); }
    else setMatchError("앗, 입력하신 번호는 트레이너님의 회원 명단에 없어요. 트레이너님께 등록을 먼저 요청해주세요.");
  };

  useEffect(() => {
    if (user && !String(user.id).startsWith("virtual-")) {
      fetchPts().then((r) => setWeekPoints(r.total)).catch(() => {});
    }
  }, [user, fetchPts]);

  const requireAuth = (fn: () => void) => {
    if (!user) { setLoginOpen(true); return; }
    fn();
  };

  const toggle = (key: string) => {
    requireAuth(() => {
      if (unavailable || CLOSED.has(key)) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    });
  };

  const onUnavailableClick = () => requireAuth(() => unavailable ? setUnavailable(false) : setConfirmUnavail(true));

  const confirmUnavailable = () => {
    setUnavailable(true);
    setSelected(new Set());
    setConfirmUnavail(false);
  };

  const selectedList = useMemo(() => Array.from(selected), [selected]);
  const hasEmpty = useMemo(() => selectedList.some((k) => !DEMAND[k]), [selectedList]);
  const fivePlus = selectedList.length >= 5;

  const showPointToast = (amount: number, reason: string) => {
    setToast({ title: `+${amount}P 적립!`, sub: reason });
    setTimeout(() => setToast(null), 3000);
    setWeekPoints((p) => Math.min(10, p + amount));
  };

  const handleSubmit = () => requireAuth(async () => {
    setSubmitted(true);
    setToast({ title: unavailable ? "‘이번 주 PT 불가’로 전달했어요" : `${selectedList.length}개 시간이 트레이너에게 전달됐어요` });
    setTimeout(() => setToast(null), 2400);

    if (!unavailable && user && !String(user.id).startsWith("virtual-")) {
      try {
        if (hasEmpty) {
          const r = await award({ data: { reason: "empty_slot" } });
          if (r.awarded > 0) setTimeout(() => showPointToast(r.awarded, "비어있던 시간을 골라줬어요 ☕"), 1200);
        }
        if (fivePlus) {
          const r = await award({ data: { reason: "five_or_more" } });
          if (r.awarded > 0) setTimeout(() => showPointToast(r.awarded, "5개 이상 골라줬어요 ☕"), 1800);
        }
      } catch {}
    } else if (!unavailable && (hasEmpty || fivePlus)) {
      // virtual user: simulate point gain locally
      const gain = Math.min(10, (hasEmpty ? 10 : 0));
      if (gain > 0) setTimeout(() => showPointToast(gain, hasEmpty ? "비어있던 시간을 골라줬어요 ☕" : "5개 이상 골라줬어요 ☕"), 1200);
    }
  });

  return (
    <AppShell>
      {/* Trainer profile — restructured, no overlap */}
      <section className="rounded-2xl border border-border overflow-hidden bg-white">
        <div className="h-16 bg-gradient-to-br from-primary to-[#FF6FB1]" />
        <div className="px-5 sm:px-6 -mt-10 pb-5">
          <div className="flex items-start sm:items-end gap-4 flex-wrap">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-surface-muted ring-4 ring-white grid place-items-center text-[28px] font-black text-ink shadow-sm">박</div>
              <VerifiedBadge size={22} className="-bottom-1 -right-1" />
            </div>
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noreferrer"
              className="ml-auto mt-10 sm:mt-0 h-9 px-3 sm:px-3.5 rounded-full bg-ink text-white text-[12px] font-bold inline-flex items-center gap-1.5 hover:brightness-110 self-start sm:self-end order-2 sm:order-3"
            >
              <Instagram className="h-3.5 w-3.5" /> <span className="hidden sm:inline">인스타그램</span>
            </a>
            <div className="w-full sm:flex-1 sm:min-w-0 sm:pb-1.5 flex items-baseline gap-3 flex-wrap order-3 sm:order-2">
              <h1 className="text-[20px] sm:text-[22px] font-black text-ink leading-tight">박재현 트레이너</h1>
              <p className="text-[12px] font-bold text-ink-soft truncate">하이엔드 피트니스 · 강남점</p>
            </div>
          </div>
          <p className="mt-4 text-[13.5px] text-ink-soft leading-relaxed">
            안녕하세요, 8년차 퍼스널 트레이너 박재현입니다. 단기간의 결과보다는 <b className="text-ink">평생 가져갈 운동 습관</b>을 만드는 데 집중합니다.
            체형 분석 → 약점 보완 → 점진적 과부하의 3단계 프로세스로, 부상 없이 꾸준히 변화하는 몸을 만들어드려요.
          </p>
          <p className="mt-2 text-[13.5px] text-ink-soft leading-relaxed">
            지금까지 <b className="text-ink">320명+</b> 회원님의 다이어트, 체형교정, 근비대 목표를 함께 달성했습니다.
            첫 수업 전 1:1 상담에서 운동 경험과 목표를 충분히 이야기 나눈 뒤 맞춤 플랜을 설계해드리니 편하게 문의 주세요.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold"><Award className="h-3 w-3" /> 2024 NPC 보디빌딩 1위</span>
            <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full bg-muted text-ink text-[11px] font-bold"><Award className="h-3 w-3" /> NSCA-CPT</span>
            <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full bg-muted text-ink text-[11px] font-bold"><Award className="h-3 w-3" /> 생활스포츠지도사 2급</span>
            <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full bg-muted text-ink text-[11px] font-bold"><Award className="h-3 w-3" /> FMS Lv.2</span>
          </div>
        </div>
      </section>

      {/* Announcement */}
      <section className="mt-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5 flex gap-3">
        <div className="h-8 w-8 rounded-full bg-primary text-white grid place-items-center shrink-0">
          <Megaphone className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">트레이너 공지</p>
          <p className="mt-0.5 text-[13.5px] text-ink leading-relaxed">
            5월 25일(월)은 세미나로 휴무입니다. 해당 주는 화·수·금에 더 많은 시간대를 열어두었으니 미리 선택 부탁드려요!
          </p>
        </div>
      </section>

      {/* Gated booking area: blurred + locked until phone matches trainer's roster */}
      <div className="relative">
        <div className={!effectiveUnlocked ? "pointer-events-none select-none blur-sm opacity-60" : ""} aria-hidden={!effectiveUnlocked}>
      {/* Header */}
      <div className="mt-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">학생 예약 · 다음 주</p>
          <h2 className="mt-1.5 text-[24px] sm:text-[28px] font-black text-ink leading-[1.15] tracking-tight">
            가능한 시간을<br />원하는 만큼 골라주세요
          </h2>
          <p className="mt-2 text-[13.5px] text-ink-soft leading-relaxed">
            색이 진할수록 다른 학생들이 많이 선택한 시간이에요. 트레이너님이 모두 모아 가장 잘 맞는 시간으로 확정해 드려요.
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

      {/* Point reward banner */}
      <div className="mt-4 rounded-2xl border border-[oklch(0.92_0.10_70)] bg-[oklch(0.98_0.04_70)] p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-[oklch(0.85_0.15_70)] grid place-items-center shrink-0">
          <Coffee className="h-4.5 w-4.5 text-[oklch(0.30_0.15_50)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[13px] font-extrabold text-ink">
              <span className="text-[oklch(0.45_0.18_50)]">픽짐피티 포인트</span> · 이번 주 {weekPoints}/10P 적립
            </p>
            {weekPoints >= 10 && <span className="text-[10px] font-bold text-[oklch(0.45_0.18_50)]">이번 주 최대치 도달</span>}
          </div>
          <p className="mt-0.5 text-[12px] text-ink-soft leading-relaxed">
            <b className="text-ink">아무도 선택 안 한 시간</b>을 고르거나 <b className="text-ink">5개 이상</b>을 선택하면 +10P. 모아서 커피 한 잔 ☕
          </p>
          {!submitted && (hasEmpty || fivePlus) && weekPoints < 10 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hasEmpty && <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-white text-[oklch(0.45_0.18_50)] text-[11px] font-extrabold ring-1 ring-[oklch(0.85_0.15_70)]"><Sparkles className="h-3 w-3" /> 비어있는 시간 +10P 가능</span>}
              {fivePlus && <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-white text-[oklch(0.45_0.18_50)] text-[11px] font-extrabold ring-1 ring-[oklch(0.85_0.15_70)]"><Sparkles className="h-3 w-3" /> 5개 이상 +10P 가능</span>}
            </div>
          )}
        </div>
      </div>

      {/* Week label */}
      <div className="mt-4 rounded-2xl bg-surface-muted border border-border px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">조율 주차</p>
          <p className="text-[18px] font-black text-ink mt-0.5">다음 주 · 5.18 (월) – 5.24 (일)</p>
        </div>
        <span className="hidden sm:inline-flex chip bg-white text-ink-soft border border-border">트레이너 박재현</span>
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
          <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3" /> 닫힘</span>
        </div>
      </div>

      {/* Unified responsive timetable — 7 days × hours, larger touch cells on mobile */}
      <div className={`pb-32 ${unavailable ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="mt-4 rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-[36px_repeat(7,1fr)] sm:grid-cols-[44px_repeat(7,1fr)] bg-surface-muted border-b border-border">
            <div className="p-1.5 sm:p-2 text-[10px] text-muted-foreground font-bold text-center">시간</div>
            {DAYS.map((d) => (
              <div key={d} className="p-2 text-center text-[13px] sm:text-[13px] font-extrabold text-ink">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-[36px_repeat(7,1fr)] sm:grid-cols-[44px_repeat(7,1fr)]">
            {HOURS.map((h) => (
              <React.Fragment key={h}>
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
                      {closed ? <Lock className="absolute inset-0 m-auto h-3 w-3 text-muted-foreground/60" /> :
                        isMine ? <Check className="absolute inset-0 m-auto h-4 w-4 text-white" /> :
                        dem > 0 ? <span className={`absolute inset-0 grid place-items-center text-[10px] font-extrabold tabular-nums ${lvl >= 3 ? "text-white/80" : "text-ink/50"} sm:hidden`}>{dem}</span> : null}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-soft sm:hidden">셀을 탭해서 가능한 시간을 골라주세요. 가로로 한 화면에 보여요.</p>
      </div>
        </div>

        {/* Match gate overlay */}
        {!effectiveUnlocked && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-12">
            <div className="rounded-3xl bg-white shadow-pop border border-border p-6 sm:p-8 max-w-md w-[min(92%,420px)] text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              {gateState === "notRegistered" ? (
                <>
                  <h3 className="text-[18px] sm:text-[20px] font-black text-ink leading-tight">
                    회원님은 {TRAINER_NAME} 트레이너님의<br />등록 학생이 아니세요 ㅠㅠ
                  </h3>
                  <p className="mt-3 text-[12.5px] text-ink-soft leading-relaxed">
                    {TRAINER_NAME} 트레이너님께 PT를 받고 싶으시다면<br />아래 인스타그램으로 편하게 연락해보세요!
                  </p>
                  <a href="https://instagram.com/" target="_blank" rel="noreferrer" className="mt-4 h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-primary text-white text-[13px] font-extrabold shadow-pop hover:brightness-110">
                    <Instagram className="h-4 w-4" /> 트레이너님께 문의하기
                  </a>
                  <a href="mailto:support@pickgympt.com" className="mt-6 block text-[10.5px] text-ink-soft underline hover:text-ink">
                    저는 {TRAINER_NAME} 트레이너님의 학생이 맞는데 시간 선택이 안돼요
                  </a>
                </>
              ) : gateState === "loggedOut" && !matchAsked ? (
                <>
                  <h3 className="text-[20px] sm:text-[22px] font-black text-ink leading-tight">
                    {TRAINER_NAME} 트레이너님의<br />학생이신가요?
                  </h3>
                  <p className="mt-2 text-[12.5px] text-ink-soft">맞다면 로그인하고 시간을 선택해주세요.</p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button onClick={handleNotStudent} className="h-12 rounded-2xl bg-white border border-border text-ink text-[13px] font-extrabold hover:bg-muted">엇 아니에요...</button>
                    <button onClick={() => navigate({ to: "/login" })} className="h-12 rounded-2xl bg-primary text-white text-[13px] font-extrabold shadow-pop hover:brightness-110 inline-flex items-center justify-center gap-1.5">
                      <Check className="h-4 w-4" /> 맞아요!
                    </button>
                  </div>
                  {matchError && <p className="mt-4 text-[12px] text-ink-soft leading-relaxed">{matchError}</p>}
                </>
              ) : (
                <>
                  <h3 className="text-[18px] font-black text-ink leading-tight">트레이너에게 등록하신<br />전화번호를 입력해주세요</h3>
                  <p className="mt-2 text-[12px] text-ink-soft">트레이너님의 회원 명단과 일치하면 바로 시간을 고를 수 있어요.</p>
                  <input value={matchPhone} onChange={(e) => setMatchPhone(e.target.value)} placeholder="010-0000-0000" autoFocus
                    className="mt-4 h-12 w-full px-3.5 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[14px] font-semibold text-ink text-center tabular-nums" />
                  <button onClick={submitMatchPhone} disabled={normalizePhone(matchPhone).length < 10}
                    className="mt-3 h-12 w-full rounded-2xl bg-ink text-white text-[14px] font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-2">
                    확인하기 <ArrowRight className="h-4 w-4" />
                  </button>
                  {matchError && <p className="mt-3 text-[12px] text-destructive font-bold leading-relaxed">{matchError}</p>}
                  <button onClick={() => { setMatchAsked(false); setMatchError(null); setMatchPhone(""); }} className="mt-3 text-[11px] text-ink-soft underline hover:text-ink">이전으로</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating banner */}
      {effectiveUnlocked && (() => {
        const willEarn = !unavailable && !submitted && weekPoints < 10 && (hasEmpty || fivePlus);
        const earnMsg = hasEmpty
          ? "🎉 축하해요! 아무도 선택 안 한 시간을 골라주셔서 10포인트를 선물받습니다!"
          : "🎉 축하해요! 5개 이상 시간을 선택하셔서 10포인트를 선물받습니다!";
        return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-24px))]">
        {willEarn && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 w-[min(680px,calc(100vw-32px))]">
            <div className="rounded-full bg-primary text-white text-[12px] font-extrabold px-4 h-8 inline-flex items-center justify-center w-full shadow-pink whitespace-nowrap overflow-hidden">
              <span className="truncate">{earnMsg}</span>
            </div>
          </div>
        )}
        <div className={`rounded-2xl bg-ink text-white shadow-pink p-3 flex items-center gap-2.5 transition ${willEarn ? "ring-2 ring-primary" : ""}`}>
          <button onClick={onUnavailableClick} className={`h-11 px-3 rounded-xl text-[12px] font-bold inline-flex items-center gap-1 shrink-0 transition ${unavailable ? "bg-destructive text-white" : "bg-destructive/15 text-destructive hover:bg-destructive/25"}`}>
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
                    <button onClick={(e) => { e.stopPropagation(); setSelected((p) => { const n = new Set(p); n.delete(s); return n; }); }} className="opacity-70 hover:opacity-100"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSubmit} disabled={!unavailable && selectedList.length === 0} className="h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shrink-0 disabled:opacity-40 hover:brightness-110">
            {submitted ? "수정 제출" : "제출"} <Check className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-soft justify-center">
          <Info className="h-3 w-3" />
          <span>제출 시 로그인이 필요해요</span>
          <span className="mx-1">·</span>
          <Link to="/" className="font-semibold hover:text-primary">픽짐피티 소개</Link>
        </div>
      </div>
        );
      })()}

      {/* Login redirect modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-black">로그인하고 시간을 선택하세요</DialogTitle>
            <DialogDescription>1초 카카오 로그인 또는 이메일로 시작할 수 있어요.</DialogDescription>
          </DialogHeader>
          <button onClick={() => navigate({ to: "/login" })} className="w-full h-12 rounded-xl bg-ink text-white text-[14px] font-extrabold">
            로그인 / 회원가입 하러 가기
          </button>
        </DialogContent>
      </Dialog>

      {/* Unavailable confirm */}
      <Dialog open={confirmUnavail} onOpenChange={setConfirmUnavail}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-destructive/15 text-destructive grid place-items-center mb-2">
              <Ban className="h-5 w-5" />
            </div>
            <DialogTitle className="text-[18px] font-black">이번 주 PT 불가로 표시할까요?</DialogTitle>
            <DialogDescription>선택했던 시간이 모두 취소되고, 트레이너에게 “이번 주 불가”로 전달돼요.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setConfirmUnavail(false)} className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold">취소</button>
            <button onClick={confirmUnavailable} className="h-10 px-4 rounded-full bg-destructive text-white text-[12px] font-bold">불가로 표시</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toasts */}
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
