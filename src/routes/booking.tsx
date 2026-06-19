import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DemoBanner } from "@/components/DemoBanner";
import { Check, Ban, Info, X, Lock, Instagram, Megaphone, Award, Coffee, Sparkles } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
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

const DEFAULT_TRAINER_ID = "0b8781ee-55af-489c-9737-a4b081f596f9";
const LEGACY_TRAINER_THEMES: Record<string, { from: string; to: string }> = {
  [DEFAULT_TRAINER_ID]: { from: "#E23A8A", to: "#FF8AC2" },
  "ab0645e2-8477-43da-8d6f-7ccc0bba078a": { from: "#2563EB", to: "#7DD3FC" },
  "cdec3cbd-c840-407a-a3a1-f8cb987d5359": { from: "#16A34A", to: "#86EFAC" },
  "95d63246-1b34-419e-97e3-2ae8d3e62bc3": { from: "#F59E0B", to: "#FDE68A" },
  "2d0fdf86-5a16-4b11-b2ca-4da63b8b075c": { from: "#7C3AED", to: "#C4B5FD" },
};

const TRAINER_SPECS: Record<string, string[]> = {
  [DEFAULT_TRAINER_ID]: ["2024 NPC 보디빌딩 1위", "NSCA-CPT", "생활스포츠지도사 2급", "FMS Lv.2"],
  "ab0645e2-8477-43da-8d6f-7ccc0bba078a": ["여성 체형교정", "초보자 근력 루틴", "생활스포츠지도사 2급", "FMS Lv.1"],
  "cdec3cbd-c840-407a-a3a1-f8cb987d5359": ["근비대 전문", "체력 향상", "NSCA-CPT", "운동기록 코칭"],
  "95d63246-1b34-419e-97e3-2ae8d3e62bc3": ["재활 PT", "코어 안정화", "필라테스 기반", "자세 분석"],
  "2d0fdf86-5a16-4b11-b2ca-4da63b8b075c": ["다이어트 전문", "바디프로필", "식단 코칭", "체성분 관리"],
};

type StudentRosterMatch = {
  id: string;
  trainer_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  status?: string | null;
};

type BookingTrainer = {
  id: string;
  user_id: string;
  name: string;
  gym: string | null;
  intro: string | null;
  instagram_url?: string | null;
  theme_from?: string | null;
  theme_to?: string | null;
};

function requestedTrainerId() {
  if (typeof window === "undefined") return DEFAULT_TRAINER_ID;
  return new URLSearchParams(window.location.search).get("trainer") || DEFAULT_TRAINER_ID;
}

function cachedTrainer(): BookingTrainer | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(sessionStorage.getItem("gympt-selected-trainer") || "null") as Partial<BookingTrainer> | null;
    if (!value?.id || value.id !== requestedTrainerId() || !value.name) return null;
    return {
      id: value.id,
      user_id: value.user_id || "",
      name: value.name,
      gym: value.gym || null,
      intro: value.intro || null,
      instagram_url: value.instagram_url || null,
      theme_from: value.theme_from || "#FF4E97",
      theme_to: value.theme_to || "#FF6FB1",
    };
  } catch {
    return null;
  }
}

function heatLevel(n: number, isMine: boolean) {
  if (isMine) return 5;
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

function Booking() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const award = useServerFn(awardPoints);
  const fetchPts = useServerFn(getMyWeekPoints);

  const userRole = (user?.user_metadata as { role?: string } | undefined)?.role;
  const isTrainerRole = userRole === "trainer";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unavailable, setUnavailable] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);
  const [confirmUnavail, setConfirmUnavail] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editConfirm, setEditConfirm] = useState(false);
  const [toast, setToast] = useState<{ title: string; sub?: string } | null>(null);
  const [weekPoints, setWeekPoints] = useState<number>(0);

  // Trainer announcement (owner-editable)
  const [announcement, setAnnouncement] = useState<string>(
    "5월 25일(월)은 세미나로 휴무입니다. 해당 주는 화·수·금에 더 많은 시간대를 열어두었으니 미리 선택 부탁드려요!"
  );
  const [annOpen, setAnnOpen] = useState(false);
  const [annDraft, setAnnDraft] = useState("");

  // Trainer-student matching gate (only the schedule area is locked; profile is public)
  const [rosterLoading, setRosterLoading] = useState(true);
  const [registeredRoster, setRegisteredRoster] = useState<StudentRosterMatch | null>(null);
  const [trainerRecord, setTrainerRecord] = useState<BookingTrainer | null>(() => cachedTrainer());
  const [pageTrainerId, setPageTrainerId] = useState<string>(() => requestedTrainerId());
  const [matchError, setMatchError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function loadRosterGate() {
      setRosterLoading(true);
      setRegisteredRoster(null);
      setMatchError(null);

      const urlTrainerId =
        typeof window === "undefined"
          ? DEFAULT_TRAINER_ID
          : new URLSearchParams(window.location.search).get("trainer") || DEFAULT_TRAINER_ID;
      const hasExplicitTrainer = typeof window !== "undefined" && !!new URLSearchParams(window.location.search).get("trainer");
      let currentTrainerId = urlTrainerId;

      if (isTrainerRole && user && !String(user.id).startsWith("virtual-") && !hasExplicitTrainer) {
        const { data: ownTrainer } = await supabase
          .from("trainers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (ownTrainer?.id) currentTrainerId = ownTrainer.id;
      }

      if (!cancelled) setPageTrainerId(currentTrainerId);

      const { data: themedTrainer, error: themedTrainerError } = await supabase
        .from("trainers")
        .select("id,user_id,name,gym,intro,instagram_url,theme_from,theme_to")
        .eq("id", currentTrainerId)
        .maybeSingle();

      let pageTrainer = themedTrainer as BookingTrainer | null;
      if (themedTrainerError) {
        const { data: legacyTrainer } = await supabase
          .from("trainers")
          .select("id,user_id,name,gym,intro,instagram_url")
          .eq("id", currentTrainerId)
          .maybeSingle();
        const legacyTheme = LEGACY_TRAINER_THEMES[currentTrainerId];
        pageTrainer = legacyTrainer
          ? { ...legacyTrainer, theme_from: legacyTheme?.from, theme_to: legacyTheme?.to }
          : null;
      }

      if (!cancelled) setTrainerRecord(pageTrainer);

      if (!user || String(user.id).startsWith("virtual-")) {
        setRosterLoading(false);
        return;
      }

      const email = user.email?.toLowerCase();
      if (!email) {
        setRosterLoading(false);
        return;
      }

      const { data: roster, error: rosterError } = await supabase
        .from("student_rosters" as never)
        .select("id,trainer_id,student_name,student_email,student_phone,status")
        .eq("student_email", email)
        .eq("trainer_id", currentTrainerId)
        .maybeSingle();

      if (cancelled) return;

      if (rosterError) {
        setMatchError("학생 등록 여부를 확인하지 못했어요. 잠시 후 다시 시도해주세요.");
        setRosterLoading(false);
        return;
      }

      const matchedRoster = roster as unknown as StudentRosterMatch | null;
      setRegisteredRoster(matchedRoster);

      if (!cancelled) setRosterLoading(false);
    }

    void loadRosterGate();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, user?.email, isTrainerRole]);

  // Determine gate state based on auth + roster
  const isOwnerTrainer = isTrainerRole && !!user && trainerRecord?.user_id === user.id;
  const isRegisteredStudent = !!registeredRoster;
  const gateState: "loggedOut" | "registered" | "notRegistered" | "owner" = isOwnerTrainer ? "owner" : !user ? "loggedOut" : isRegisteredStudent ? "registered" : "notRegistered";
  const effectiveUnlocked = !rosterLoading && (gateState === "registered" || gateState === "owner");
  const showGateOverlay = !authLoading && !rosterLoading && !effectiveUnlocked;
  const displayTrainerName = trainerRecord?.name || "";
  const displayTrainerInitial = displayTrainerName.charAt(0);
  const displayTrainerGym = trainerRecord?.gym || "소속 센터 준비 중";
  const displayTrainerIntro = trainerRecord?.intro;
  const displayInstagramUrl = trainerRecord?.instagram_url || "https://instagram.com/";
  const trainerTheme = {
    from: trainerRecord?.theme_from || "#FF4E97",
    to: trainerRecord?.theme_to || "#FF6FB1",
  };
  const displayTrainerSpecs = TRAINER_SPECS[pageTrainerId] ?? ["생활스포츠지도사 2급", "체형 분석", "1:1 맞춤 PT", "식단 코칭"];


  const handleNotStudent = () => {
    setMatchError("괜찮아요! 트레이너님께 등록 요청을 보내거나, 다른 트레이너의 페이지를 둘러볼 수 있어요.");
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
    // 팝업 확인 즉시 제출 처리
    setSubmitted(true);
    setToast({ title: "‘이번 주 PT 불가’로 전달했어요" });
    setTimeout(() => setToast(null), 2400);
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

  if (!trainerRecord) {
    return (
      <AppShell>
        <div className="overflow-hidden rounded-2xl border border-border bg-white" aria-label="트레이너 정보를 불러오는 중">
          <div className="h-16 animate-pulse bg-surface-muted" />
          <div className="space-y-3 px-6 py-5">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-surface-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <DemoBanner role="student" />
      {/* Trainer profile — restructured, no overlap */}
      <section className="rounded-2xl border border-border overflow-hidden bg-white">
        <div className="h-16" style={{ background: `linear-gradient(135deg, ${trainerTheme.from}, ${trainerTheme.to})` }} />
        <div className="px-5 sm:px-6 -mt-10 pb-5">
          <div className="flex items-start sm:items-end gap-4 flex-wrap">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-surface-muted ring-4 ring-white grid place-items-center text-[28px] font-black text-ink shadow-sm">{displayTrainerInitial}</div>
              <VerifiedBadge size={44} className="!-bottom-[11px] !-right-[11px]" />
            </div>
            <a
              href={displayInstagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="인스타그램"
              className="ml-auto mt-10 sm:mt-0 h-9 w-9 rounded-full text-white grid place-items-center hover:brightness-110 self-start sm:self-end order-2 sm:order-3 shadow-sm"
              style={{ background: "radial-gradient(circle at 30% 110%, #FED373 0%, #F15245 35%, #D92E7F 60%, #9B36B7 85%, #515ECF 100%)" }}
            >
              <Instagram className="h-4 w-4" />
            </a>
            <div className="w-full sm:flex-1 sm:min-w-0 sm:pb-1.5 flex items-baseline gap-3 flex-wrap order-3 sm:order-2">
              <h1 className="text-[20px] sm:text-[22px] font-black text-ink leading-tight">{displayTrainerName} 트레이너</h1>
              <p className="text-[12px] font-bold text-ink-soft truncate">{displayTrainerGym}</p>
            </div>
          </div>
          <p className="mt-4 text-[13.5px] text-ink-soft leading-relaxed">
            안녕하세요, 8년차 퍼스널 트레이너 {displayTrainerName}입니다. {displayTrainerIntro ? `${displayTrainerIntro} ` : ""}단기간의 결과보다는 <b className="text-ink">평생 가져갈 운동 습관</b>을 만드는 데 집중합니다.
            체형 분석 → 약점 보완 → 점진적 과부하의 3단계 프로세스로, 부상 없이 꾸준히 변화하는 몸을 만들어드려요.
          </p>
          <p className="mt-2 text-[13.5px] text-ink-soft leading-relaxed">
            지금까지 <b className="text-ink">320명+</b> 회원님의 다이어트, 체형교정, 근비대 목표를 함께 달성했습니다.
            첫 수업 전 1:1 상담에서 운동 경험과 목표를 충분히 이야기 나눈 뒤 맞춤 플랜을 설계해드리니 편하게 문의 주세요.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {displayTrainerSpecs.map((spec, index) => (
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

      {/* Announcement */}
      <section className="mt-3 rounded-2xl border-2 border-border-strong bg-white p-4 sm:p-5 flex gap-3">
        <div className="h-9 w-9 rounded-full bg-[oklch(0.95_0.08_240)] text-[oklch(0.45_0.18_240)] grid place-items-center shrink-0 border border-[oklch(0.80_0.10_240)]">
          <Megaphone className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">트레이너 공지</p>
            {isOwnerTrainer && (
              <button
                onClick={() => { setAnnDraft(announcement); setAnnOpen(true); }}
                className="h-7 px-3 rounded-full bg-ink text-white text-[11px] font-extrabold inline-flex items-center gap-1 hover:brightness-110"
              >
                <Megaphone className="h-3 w-3" /> 공지 등록 / 수정
              </button>
            )}
          </div>
          <p className="mt-0.5 text-[13.5px] text-ink leading-relaxed whitespace-pre-wrap">
            {announcement || "(아직 등록된 공지가 없어요)"}
          </p>
        </div>
      </section>


      {/* Gated booking area: blurred + locked until phone matches trainer's roster */}
      <div className="relative">
        <div className={showGateOverlay ? "pointer-events-none select-none blur-sm opacity-60" : ""} aria-hidden={showGateOverlay}>
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
      <div className="mt-4 rounded-2xl border-2 border-border-strong bg-white p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-[oklch(0.95_0.08_75)] border border-[oklch(0.80_0.12_75)] grid place-items-center shrink-0">
          <Coffee className="h-4.5 w-4.5 text-[oklch(0.50_0.15_55)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[13px] font-extrabold text-ink">
              <span className="text-ink-soft">픽짐피티 포인트</span> · 이번 주 {weekPoints}/10P 적립
            </p>
            {weekPoints >= 10 && <span className="text-[10px] font-bold text-ink-soft">이번 주 최대치 도달</span>}
          </div>
          <p className="mt-0.5 text-[12px] text-ink-soft leading-relaxed">
            <b className="text-ink">아무도 선택 안 한 시간</b>을 고르거나 <b className="text-ink">5개 이상</b>을 선택하면 +10P. 모아서 커피 한 잔 ☕
          </p>
          {!submitted && (hasEmpty || fivePlus) && weekPoints < 10 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hasEmpty && <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-surface-muted text-ink text-[11px] font-extrabold ring-1 ring-border"><Sparkles className="h-3 w-3" /> 비어있는 시간 +10P 가능</span>}
              {fivePlus && <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-surface-muted text-ink text-[11px] font-extrabold ring-1 ring-border"><Sparkles className="h-3 w-3" /> 5개 이상 +10P 가능</span>}
            </div>
          )}
        </div>
      </div>

      {/* Week label */}
      <div className="mt-4 rounded-2xl bg-surface-muted border border-border px-5 py-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">조율 주차</p>
          <p className="mt-0.5 whitespace-nowrap">
            <span className="text-[18px] font-black text-ink">다음 주</span>
            <span className="text-[13px] font-medium text-ink-soft ml-1.5">· 5.18 (월) – 5.24 (일)</span>
          </p>
        </div>
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
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-primary" /> 내 선택</span>
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
        {showGateOverlay && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-12">
            <div className="rounded-3xl bg-white shadow-pop border border-border p-6 sm:p-8 max-w-md w-[min(92%,420px)] text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              {gateState === "notRegistered" ? (
                <>
                  <h3 className="text-[18px] sm:text-[20px] font-black text-ink leading-tight">
                    회원님은 {displayTrainerName} 트레이너님의<br />등록 학생이 아니세요 ㅠㅠ
                  </h3>
                  <p className="mt-3 text-[12.5px] text-ink-soft leading-relaxed">
                    {displayTrainerName} 트레이너님께 PT를 받고 싶으시다면<br />아래 인스타그램으로 편하게 연락해보세요!
                  </p>
                  <a href={displayInstagramUrl} target="_blank" rel="noreferrer" className="mt-4 h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-primary text-white text-[13px] font-extrabold shadow-pop hover:brightness-110">
                    <Instagram className="h-4 w-4" /> 트레이너님께 문의하기
                  </a>
                  <a href="mailto:support@pickgympt.com" className="mt-6 block text-[10.5px] text-ink-soft underline hover:text-ink">
                    저는 {displayTrainerName} 트레이너님의 학생이 맞는데 시간 선택이 안돼요
                  </a>
                </>
              ) : gateState === "loggedOut" ? (
                <>
                  <h3 className="text-[20px] sm:text-[22px] font-black text-ink leading-tight">
                    {displayTrainerName} 트레이너님의<br />학생이신가요?
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
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Owner (trainer) preview bar — disables submission */}
      {isOwnerTrainer && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-24px))]">
          <div className="rounded-2xl bg-ink text-white shadow-pink p-3 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/20 text-primary grid place-items-center shrink-0">
              <Lock className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold leading-tight">👀 내 예약 페이지 미리보기</p>
              <p className="mt-0.5 text-[11.5px] text-white/70 leading-snug">
                트레이너 본인은 시간을 제출할 수 없어요. 학생이 보는 화면을 그대로 확인 중이에요.
              </p>
            </div>
            <button disabled className="h-11 px-4 rounded-xl bg-white/10 text-white/40 text-[13px] font-bold inline-flex items-center gap-1 shrink-0 cursor-not-allowed">
              제출 불가 <Lock className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating banner (student) */}
      {effectiveUnlocked && !isOwnerTrainer && (() => {
        const willEarn = !unavailable && !submitted && weekPoints < 10 && (hasEmpty || fivePlus);
        const earnMsg = hasEmpty
          ? "🎉 축하해요! 아무도 선택 안 한 시간을 골라주셔서 10포인트를 선물받습니다!"
          : "🎉 축하해요! 5개 이상 시간을 선택하셔서 10포인트를 선물받습니다!";
        return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-24px))]">
        {willEarn && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 w-[min(680px,calc(100vw-32px))]">
            <div className="rounded-full bg-emerald-500 text-white text-[12px] font-extrabold px-4 h-8 inline-flex items-center justify-center w-full shadow-pop whitespace-nowrap overflow-hidden">
              <span className="truncate">{earnMsg}</span>
            </div>
          </div>
        )}
        <div className={`rounded-2xl bg-ink text-white shadow-pink p-3 flex items-center gap-2.5 transition ${willEarn ? "ring-2 ring-emerald-500" : ""}`}>
          <div className={`flex-1 min-w-0 flex items-center gap-2.5 transition ${submitted ? "opacity-55 pointer-events-none" : ""}`}>
            <button onClick={onUnavailableClick} className={`h-11 px-3 rounded-xl text-[12px] font-bold inline-flex items-center gap-1 shrink-0 transition ${unavailable ? "bg-destructive text-white" : "bg-destructive/15 text-destructive hover:bg-destructive/25"}`}>
              <Ban className="h-3.5 w-3.5" /> {unavailable ? "PT 불가 ON" : "PT 불가"}
            </button>

            <div className="flex-1 min-w-0">
              {submitted ? (
                <p className="text-[12.5px] font-semibold text-white/90 inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  {unavailable
                    ? "‘이번 주 PT 불가’로 트레이너에게 전달됐어요"
                    : `${selectedList.length}개 시간이 트레이너에게 전달됐어요`}
                </p>
              ) : unavailable ? (
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
          </div>

          <button
            onClick={() => {
              if (submitted) setEditConfirm(true);
              else handleSubmit();
            }}
            disabled={!submitted && !unavailable && selectedList.length === 0}
            className="h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shrink-0 disabled:opacity-40 hover:brightness-110"
          >
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

      {/* Trainer announcement editor */}
      <Dialog open={annOpen} onOpenChange={setAnnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" /> 트레이너 공지 등록
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-ink-soft leading-relaxed">
              공지는 <b className="text-ink">한 개만 고정</b>돼요. 새 공지를 등록하면 <b className="text-destructive">기존 공지는 사라지고 새 공지로 대체</b>됩니다.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={annDraft}
            onChange={(e) => setAnnDraft(e.target.value)}
            rows={5}
            placeholder="예) 이번 주 토요일은 휴무입니다. 평일 저녁 시간대를 추가로 열어두었어요."
            className="w-full px-3 py-2.5 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13.5px] text-ink leading-relaxed resize-none"
          />
          <DialogFooter>
            <button onClick={() => setAnnOpen(false)} className="h-10 px-4 rounded-xl bg-white border border-border-strong text-ink text-[12.5px] font-bold">취소</button>
            <button
              onClick={() => { setAnnouncement(annDraft.trim()); setAnnOpen(false); setToast({ title: "공지가 등록됐어요", sub: "학생들에게 즉시 노출됩니다" }); setTimeout(() => setToast(null), 2400); }}
              disabled={!annDraft.trim()}
              className="h-10 px-4 rounded-xl bg-primary text-white text-[12.5px] font-extrabold disabled:opacity-40 shadow-pop"
            >
              새 공지 등록 (기존 공지 대체)
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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

      {/* Edit (modify submission) confirm */}
      <Dialog open={editConfirm} onOpenChange={setEditConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center mb-2">
              <Check className="h-5 w-5" />
            </div>
            <DialogTitle className="text-[18px] font-black">시간을 수정하시겠어요?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {unavailable ? (
                <>현재 <b className="text-ink">‘이번 주 PT 불가’</b>로 전달된 상태예요. 수정하면 다시 시간을 선택하거나 PT 불가를 재설정할 수 있어요.</>
              ) : (
                <>이미 선택해 보낸 시간은 <b className="text-ink">{selectedList.length}개</b>예요. 수정하면 다시 시간을 고르거나 PT 불가로 바꿀 수 있고, 변경 후 다시 제출하면 트레이너에게 새 응답으로 전달돼요.</>
              )}
            </DialogDescription>
          </DialogHeader>
          {!unavailable && selectedList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {selectedList.map((s) => (
                <span key={s} className="inline-flex items-center h-7 px-2.5 rounded-full bg-surface-muted border border-border text-ink text-[12px] font-bold">
                  {s.replace("-", " ")}시
                </span>
              ))}
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setEditConfirm(false)} className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold">취소</button>
            <button
              onClick={() => { setSubmitted(false); setEditConfirm(false); }}
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
