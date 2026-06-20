import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Check,
  Pencil,
  CreditCard,
  Gift,
  Copy,
  Sparkles,
  CalendarClock,
  CalendarDays,
  Clock3,
  UsersRound,
  MessageSquare,
  Receipt,
  Zap,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { normalizeDisplayName, pickDisplayName } from "@/lib/display-name";
import { TrainerRankBadge } from "@/components/TrainerRankBadge";
import { useTrainerRank } from "@/hooks/use-trainer-rank";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "내 정보 — 픽짐피티" }] }),
  component: ProfilePage,
});

type WeeklySession = {
  id: string;
  scheduledAt: string;
  status: string;
  counterpart: string;
  gym?: string | null;
  note?: string | null;
};

type TrainerSessionRow = {
  id: string;
  scheduled_at: string;
  status: string;
  note: string | null;
  student_rosters: { student_name: string } | { student_name: string }[] | null;
};

type StudentSessionRow = {
  id: string;
  scheduled_at: string;
  status: string;
  note: string | null;
  trainers: { name: string; gym: string | null } | { name: string; gym: string | null }[] | null;
};

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function ProfilePage() {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as {
    name?: string;
    avatar_url?: string;
    role?: string;
    verified?: boolean;
  };
  const [role, setRole] = useState<"trainer" | "student">(
    (meta.role as "trainer" | "student" | undefined) ?? "student",
  );
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const trainerRank = useTrainerRank(trainerId);
  const isVerified = meta.verified !== false; // default true (first 100 trainers)

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("010-1234-5678");
  const [gym, setGym] = useState("하이엔드 피트니스 강남점");
  const [intro, setIntro] = useState(
    role === "trainer" ? "8년차 퍼스널 트레이너. 평생 가져갈 운동 습관을 만들어드려요." : "",
  );
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [assignedTrainer, setAssignedTrainer] = useState<{
    id: string;
    name: string;
    gym: string | null;
  } | null>(null);
  const [pendingRequests, setPendingRequests] = useState<
    { scheduleId: string; weekStart: string; responded: boolean }[]
  >([]);
  const [weeklySessions, setWeeklySessions] = useState<WeeklySession[]>([]);
  const [recentSession, setRecentSession] = useState<WeeklySession | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Trainer-only mock state
  const inviteCode = "PGPT-" + (name || "JAEHYUN").slice(0, 4).toUpperCase() + "-7K2";
  const invitedCount = 3;
  const bonusWeeks = invitedCount; // 1주 per invite

  // Subscription / 알림톡
  const [planOpen, setPlanOpen] = useState(false);
  const [alimOpen, setAlimOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<"basic" | "pro" | "premium">("pro");
  const [alimUsed] = useState(387);
  const [alimTotal, setAlimTotal] = useState(600);
  const [historyToast, setHistoryToast] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const PLANS = [
    {
      id: "basic" as const,
      name: "Basic",
      price: 19000,
      students: 20,
      alim: 300,
      perks: ["기본 일정 조율", "학생 20명까지"],
    },
    {
      id: "pro" as const,
      name: "Pro",
      price: 39000,
      students: 40,
      alim: 600,
      perks: ["인기 트레이너 노출", "학생 40명까지", "알림톡 600건"],
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: 79000,
      students: 100,
      alim: 1500,
      perks: ["전담 매니저", "학생 100명까지", "알림톡 1,500건"],
    },
  ];
  const ALIM_PACKS = [
    { qty: 100, price: 5000 },
    { qty: 500, price: 19000, badge: "인기" },
    { qty: 1000, price: 35000, badge: "최대 할인" },
  ];
  const PAYMENTS = [
    { date: "2026.05.10", method: "신한카드 ****7821", item: "Pro 월 구독", amount: 39000 },
    { date: "2026.04.10", method: "신한카드 ****7821", item: "Pro 월 구독", amount: 39000 },
    { date: "2026.03.28", method: "신한카드 ****7821", item: "알림톡 500건 추가", amount: 19000 },
    { date: "2026.03.10", method: "신한카드 ****7821", item: "Pro 월 구독", amount: 39000 },
    { date: "2026.02.10", method: "신한카드 ****7821", item: "Basic 월 구독", amount: 19000 },
  ];
  const plan = PLANS.find((p) => p.id === currentPlan)!;

  useEffect(() => {
    setName(meta.name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadProfile() {
      setSessionsLoading(true);
      const weekStart = new Date();
      const mondayDistance = (weekStart.getDay() + 6) % 7;
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - mondayDistance);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled && (roleRow?.role === "trainer" || roleRow?.role === "student")) {
        setRole(roleRow.role);
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("display_name,email")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled && profileRow) {
        setName(pickDisplayName(profileRow.display_name, meta.name, user.email?.split("@")[0]) ?? "");
        setEmail(profileRow.email ?? user.email ?? "");
      }

      const { data: trainerRow } = await supabase
        .from("trainers")
        .select("id,name,gym,intro")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled && trainerRow) {
        setTrainerId(trainerRow.id);
        setRole("trainer");
        setAssignedTrainer(null);
        setName(pickDisplayName(trainerRow.name, meta.name, user.email?.split("@")[0]) ?? "");
        setPhone("");
        setGym(trainerRow.gym ?? "");
        setIntro(trainerRow.intro ?? "");
        setRecentSession(null);
        const { data: sessions } = await supabase
          .from("pt_sessions")
          .select("id,scheduled_at,status,note,student_rosters(student_name)")
          .eq("trainer_id", trainerRow.id)
          .gte("scheduled_at", weekStart.toISOString())
          .lt("scheduled_at", weekEnd.toISOString())
          .order("scheduled_at", { ascending: true });
        if (!cancelled) {
          setWeeklySessions(
            ((sessions ?? []) as TrainerSessionRow[]).map((session) => ({
              id: session.id,
              scheduledAt: session.scheduled_at,
              status: session.status,
              counterpart:
                relationOne(session.student_rosters)?.student_name ?? "학생 이름 확인 필요",
              note: session.note,
            })),
          );
        }
      } else {
        let roster = (
          await supabase
            .from("student_rosters")
            .select("trainer_id")
            .eq("student_user_id", user.id)
            .limit(1)
            .maybeSingle()
        ).data;

        if (!roster && user.email) {
          roster = (
            await supabase
              .from("student_rosters")
              .select("trainer_id")
              .eq("student_email", user.email.toLowerCase())
              .limit(1)
              .maybeSingle()
          ).data;
        }

        if (roster) {
          const { data: assigned } = await supabase
            .from("trainers")
            .select("id,name,gym,user_id")
            .eq("id", roster.trainer_id)
            .maybeSingle();
          if (!cancelled) {
            setAssignedTrainer(
              assigned
                ? { ...assigned, name: pickDisplayName(assigned.name) ?? "트레이너" }
                : null,
            );
          }

          if (assigned?.user_id) {
            const { data: trainerProfile } = await supabase
              .from("trainer_profiles")
              .select("id")
              .eq("user_id", assigned.user_id)
              .maybeSingle();
            if (trainerProfile?.id) {
              const thisWeekMonday = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
              const { data: requestedSchedules } = await supabase
                .from("weekly_schedules")
                .select("id,week_start")
                .eq("trainer_id", trainerProfile.id)
                .not("request_sent_at", "is", null)
                .gte("week_start", thisWeekMonday)
                .order("week_start", { ascending: true });
              const scheduleIds = (requestedSchedules ?? []).map((s) => s.id);
              const { data: ownSelections } = scheduleIds.length
                ? await supabase
                    .from("student_selections")
                    .select("schedule_id")
                    .eq("student_user_id", user.id)
                    .in("schedule_id", scheduleIds)
                : { data: [] as { schedule_id: string }[] };
              const respondedIds = new Set((ownSelections ?? []).map((s) => s.schedule_id));
              if (!cancelled) {
                setPendingRequests(
                  (requestedSchedules ?? []).map((s) => ({
                    scheduleId: s.id,
                    weekStart: s.week_start,
                    responded: respondedIds.has(s.id),
                  })),
                );
              }
            }
          }
        } else if (!cancelled) {
          setAssignedTrainer(null);
          setPendingRequests([]);
        }

        const [{ data: sessions }, { data: recent }] = await Promise.all([
          supabase
            .from("pt_sessions")
            .select("id,scheduled_at,status,note,trainers(name,gym)")
            .eq("student_user_id", user.id)
            .eq("status", "scheduled")
            .gte("scheduled_at", new Date().toISOString())
            .order("scheduled_at", { ascending: true }),
          supabase
            .from("pt_sessions")
            .select("id,scheduled_at,status,note,trainers(name,gym)")
            .eq("student_user_id", user.id)
            .eq("status", "completed")
            .lte("scheduled_at", new Date().toISOString())
            .order("scheduled_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        if (!cancelled) {
          setWeeklySessions(
            ((sessions ?? []) as StudentSessionRow[]).map((session) => {
              const trainer = relationOne(session.trainers);
              return {
                id: session.id,
                scheduledAt: session.scheduled_at,
                status: session.status,
                counterpart: pickDisplayName(trainer?.name) ?? "트레이너",
                gym: trainer?.gym ?? null,
                note: session.note,
              };
            }),
          );
          const recentRow = recent as StudentSessionRow | null;
          const recentTrainer = relationOne(recentRow?.trainers ?? null);
          setRecentSession(
            recentRow
              ? {
                  id: recentRow.id,
                  scheduledAt: recentRow.scheduled_at,
                  status: recentRow.status,
                  counterpart: pickDisplayName(recentTrainer?.name) ?? "트레이너",
                  gym: recentTrainer?.gym ?? null,
                  note: recentRow.note,
                }
              : null,
          );
        }
      }
      if (!cancelled) setSessionsLoading(false);
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const save = async () => {
    const normalizedName = normalizeDisplayName(name);
    if (!normalizedName) {
      setHistoryToast("이름에 손상된 문자가 포함되어 있어요. 이름을 다시 입력해주세요.");
      setTimeout(() => setHistoryToast(null), 3000);
      return;
    }
    try {
      if (user) {
        await supabase.auth.updateUser({ data: { name: normalizedName, full_name: normalizedName } });
        await supabase.from("profiles").update({ display_name: normalizedName, email }).eq("id", user.id);

        if (role === "trainer") {
          await supabase
            .from("trainers")
            .upsert(
              {
                user_id: user.id,
                name: normalizedName,
                gym: gym || null,
                intro: intro || null,
              },
              { onConflict: "user_id" },
            );
        }
      } else {
        const cur = JSON.parse(localStorage.getItem("gympt-user") ?? "{}");
        localStorage.setItem("gympt-user", JSON.stringify({ ...cur, name: normalizedName, email }));
        window.dispatchEvent(new Event("gympt-auth"));
      }
      setName(normalizedName);
    } catch {}
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const copyInvite = () => {
    try {
      navigator.clipboard.writeText(inviteCode);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">계정</p>
          <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-tight">
            내 정보
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-soft">
            기본 정보와 {role === "trainer" ? "결제·초대 내역" : "프로필"}을 한눈에 확인해요.
          </p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="h-10 px-4 rounded-full bg-ink text-white text-[12px] font-extrabold inline-flex items-center gap-1.5 hover:brightness-110"
          >
            <Pencil className="h-3.5 w-3.5" /> 정보 수정
          </button>
        )}
      </div>

      <div className="mt-6 grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Avatar card */}
        <div className="rounded-2xl border border-border bg-white p-5 text-center">
          <div className="relative inline-block">
            {meta.avatar_url ? (
              <img
                src={meta.avatar_url}
                alt=""
                className="h-24 w-24 rounded-2xl object-cover mx-auto ring-2 ring-border"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-primary/15 grid place-items-center text-[32px] font-black text-primary mx-auto">
                {(name || "?")[0]}
              </div>
            )}
            {role === "trainer" && isVerified && (
              <VerifiedBadge size={48} className="!-bottom-[12px] !-right-[12px]" />
            )}
            {role === "trainer" && trainerRank && (
              <TrainerRankBadge rank={trainerRank} className="!-left-2 !-top-2" size={30} />
            )}
          </div>
          <p className="mt-3 text-[15px] font-extrabold text-ink">{name || "이름 없음"}</p>
          <span className="mt-1 inline-flex items-center px-2.5 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold">
            {role === "trainer" ? "트레이너" : "회원"}
          </span>
          {editMode && (
            <button className="mt-4 w-full h-10 rounded-xl bg-white border border-border-strong text-[12px] font-bold text-ink hover:bg-muted">
              사진 변경
            </button>
          )}
        </div>

        {/* Info / Form */}
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="이름" value={name} onChange={setName} editable={editMode} />
            <Field
              label="이메일"
              value={email}
              onChange={setEmail}
              type="email"
              editable={editMode}
            />
            <Field
              label="휴대폰"
              value={phone}
              onChange={setPhone}
              placeholder="010-0000-0000"
              editable={editMode}
            />
            {role === "trainer" && (
              <Field label="소속 헬스장" value={gym} onChange={setGym} editable={editMode} />
            )}
            {role === "student" && (
              <div className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  담당 트레이너
                </span>
                {assignedTrainer ? (
                  <div className="mt-1.5 flex h-11 items-center gap-2.5 rounded-xl border border-border bg-surface-muted px-3.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[11px] font-black text-primary ring-1 ring-border">
                      {assignedTrainer.name[0]}
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <Link
                        to="/booking"
                        search={{ trainer: assignedTrainer.id }}
                        className="font-extrabold text-[13px] text-ink hover:text-primary"
                      >
                        {assignedTrainer.name} 트레이너
                      </Link>
                      <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                        {assignedTrainer.gym || "소속 센터 준비 중"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1.5 flex h-11 items-center rounded-xl border border-border bg-surface-muted px-3.5 text-[12px] text-ink-soft">
                    연결된 담당 트레이너가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
          {role === "student" && pendingRequests.length > 0 && (
            <div className="mt-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                트레이너가 보낸 시간 선택 요청
              </span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {pendingRequests.map((req) => {
                  const d = new Date(`${req.weekStart}T00:00:00`);
                  const end = new Date(d);
                  end.setDate(end.getDate() + 6);
                  const fmt = (x: Date) => `${x.getMonth() + 1}.${x.getDate()}`;
                  return (
                    <Link
                      key={req.scheduleId}
                      to="/booking"
                      search={{ trainer: assignedTrainer?.id, week: req.weekStart }}
                      className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 hover:border-primary/40 hover:bg-primary/[0.04] transition"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white ring-1 ring-border">
                        <CalendarDays className="h-4 w-4 text-primary" />
                      </span>
                      <div className="leading-tight">
                        <p className="text-[12.5px] font-extrabold text-ink">
                          {fmt(d)} – {fmt(end)}
                        </p>
                        <span
                          className={`mt-0.5 inline-flex items-center px-2 h-5 rounded-full text-[10px] font-extrabold ${
                            req.responded
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {req.responded ? "응답 완료" : "응답 필요"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {role === "trainer" && <div className="mt-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              트레이너 소개
            </span>
            {editMode ? (
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={4}
                placeholder="전문 분야, 자격증, 운영 시간 등을 자유롭게 소개해주세요."
                className="mt-1.5 w-full px-3.5 py-3 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13.5px] text-ink resize-none"
              />
            ) : (
              <p className="mt-1.5 text-[13.5px] text-ink leading-relaxed min-h-[60px]">
                {intro || <span className="text-ink-soft">소개가 아직 없어요.</span>}
              </p>
            )}
          </div>}
          {editMode && (
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={save}
                className="h-11 px-5 rounded-full bg-primary text-white text-[13px] font-extrabold inline-flex items-center gap-1.5 hover:brightness-110 shadow-pop"
              >
                <Check className="h-4 w-4" /> 저장하기
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="h-11 px-4 rounded-full bg-white border border-border text-ink text-[13px] font-bold"
              >
                취소
              </button>
              {saved && <span className="text-[12px] font-bold text-primary">저장되었어요 ✓</span>}
            </div>
          )}
        </div>
      </div>

      <WeeklyScheduleSummary
        role={role}
        sessions={weeklySessions}
        recentSession={recentSession}
        loading={sessionsLoading}
      />

      {/* Trainer-only sections */}
      {role === "trainer" && (
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          {/* Unified Subscription card (현재구독 + 알림톡 + 결제내역) */}
          <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-9 w-9 rounded-xl bg-ink text-white grid place-items-center shrink-0">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    구독
                  </p>
                  <h3 className="text-[16px] font-black text-ink leading-tight truncate">
                    픽짐피티 {plan.name} · 월 {plan.price.toLocaleString()}원
                  </h3>
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center px-2 h-6 rounded-full bg-primary/10 text-primary text-[10.5px] font-extrabold">
                자동결제 · 신한 ****7821
              </span>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-muted border border-border p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-3">
                  현재 구독
                </p>
                <ul className="space-y-2.5">
                  <BillingRow
                    label="포함 한도"
                    value={`학생 ${plan.students}명 · 알림톡 ${plan.alim.toLocaleString()}건`}
                  />
                  <BillingRow label="다음 결제일" value="2026.06.10" />
                  <BillingRow
                    label="누적 결제"
                    value={`${PAYMENTS.reduce((s, p) => s + p.amount, 0).toLocaleString()}원`}
                  />
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setPlanOpen(true)}
                    className="h-9 px-3 rounded-full bg-primary text-white text-[11.5px] font-extrabold hover:brightness-110"
                  >
                    요금제 변경
                  </button>
                  <button className="h-9 px-3 rounded-full bg-white border border-border-strong text-[11.5px] font-bold text-ink hover:bg-muted">
                    결제 수단
                  </button>
                  <button className="h-9 px-3 rounded-full bg-white border border-border text-[11.5px] font-bold text-ink-soft hover:text-ink hover:bg-muted">
                    해지
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-surface-muted border border-border p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-6 w-6 rounded-md bg-[#FEE500] text-[#191600] grid place-items-center">
                      <MessageSquare className="h-3 w-3" />
                    </span>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      알림톡 잔여량
                    </p>
                  </div>
                  <button
                    onClick={() => setAlimOpen(true)}
                    className="h-7 px-2.5 rounded-full bg-ink text-white text-[10.5px] font-extrabold inline-flex items-center gap-1"
                  >
                    <Zap className="h-3 w-3" /> 충전
                  </button>
                </div>
                <p className="text-[20px] font-black text-ink leading-tight">
                  {(alimTotal - alimUsed).toLocaleString()}
                  <span className="text-[12px] text-ink-soft font-bold">건 남음</span>
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-ink-soft mb-1.5">
                    <span>이번 달 사용</span>
                    <span className="tabular-nums text-ink">
                      {alimUsed.toLocaleString()} / {alimTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white border border-border overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, (alimUsed / alimTotal) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-ink-soft leading-relaxed">
                    매월 1일 {plan.alim.toLocaleString()}건 자동 충전.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 h-10 px-3 rounded-xl bg-white border border-border hover:bg-muted transition"
              >
                <span className="inline-flex items-center gap-2 text-[12.5px] font-extrabold text-ink">
                  <Receipt className="h-4 w-4" /> 결제 내역 보기
                  <span className="text-[11px] font-bold text-ink-soft">({PAYMENTS.length}건)</span>
                </span>
                <span
                  className={`text-ink-soft text-[11px] font-bold transition-transform ${historyOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
              {historyOpen && (
                <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-white animate-in fade-in slide-in-from-top-1">
                  {PAYMENTS.map((p, i) => (
                    <li key={i} className="py-3 px-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold text-ink truncate">{p.item}</p>
                        <p className="text-[11.5px] text-ink-soft truncate">
                          {p.date} · {p.method}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-black text-ink tabular-nums">
                          {p.amount.toLocaleString()}원
                        </p>
                        <button className="text-[10.5px] text-ink-soft hover:text-ink underline underline-offset-2">
                          영수증
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Invite */}
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5 sm:p-6 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-primary text-white grid place-items-center">
                <Gift className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  트레이너 친구 초대
                </p>
                <h3 className="text-[16px] font-black text-ink leading-tight">
                  초대할 때마다 <span className="text-primary">+1주 무료</span>
                </h3>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] text-ink-soft leading-relaxed">
              동료 트레이너가 내 코드로 가입하고 첫 일정을 만들면 두 분 모두 1주일 무료가 적립돼요.
            </p>

            <div className="mt-4 rounded-xl bg-white border border-border p-3 flex items-center gap-2">
              <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                내 초대 코드
              </span>
              <code className="flex-1 text-[14px] font-black text-ink tabular-nums truncate">
                {inviteCode}
              </code>
              <button
                onClick={copyInvite}
                className="h-9 px-3 rounded-lg bg-ink text-white text-[11px] font-extrabold inline-flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> {copied ? "복사됨" : "복사"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <StatBox
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="내가 초대한 사람"
                value={`${invitedCount}명`}
              />
              <StatBox
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                label="받은 추가 시간"
                value={`+${bonusWeeks}주`}
                accent
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center pb-4 pt-10">
        <Link
          to="/account/delete"
          className="text-[10.5px] font-medium text-muted-foreground/70 underline underline-offset-4 hover:text-destructive"
        >
          회원 탈퇴
        </Link>
      </div>

      {/* Change plan dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>요금제 변경</DialogTitle>
            <DialogDescription>
              언제든 업/다운그레이드 할 수 있어요. 변경분은 일할 계산돼 다음 결제에 반영돼요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-3 gap-3 mt-2">
            {PLANS.map((p) => {
              const active = p.id === currentPlan;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentPlan(p.id);
                    setAlimTotal(p.alim);
                    setPlanOpen(false);
                    setHistoryToast(`${p.name} 요금제로 변경되었어요`);
                    setTimeout(() => setHistoryToast(null), 2200);
                  }}
                  className={`text-left rounded-2xl border p-4 transition ${active ? "border-primary bg-primary/[0.04] ring-2 ring-primary/30" : "border-border bg-white hover:border-ink"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-black text-ink">{p.name}</p>
                    {active && (
                      <span className="text-[10px] font-extrabold text-primary">현재</span>
                    )}
                  </div>
                  <p className="mt-2 text-[20px] font-black text-ink tabular-nums">
                    {p.price.toLocaleString()}
                    <span className="text-[12px] text-ink-soft font-bold">원/월</span>
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {p.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] text-ink">
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alimtalk top-up dialog */}
      <Dialog open={alimOpen} onOpenChange={setAlimOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>알림톡 추가 구매</DialogTitle>
            <DialogDescription>
              구독 한도와 별개로 즉시 충전돼요. 사용 기한은 12개월.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 mt-2">
            {ALIM_PACKS.map((pack) => (
              <button
                key={pack.qty}
                onClick={() => {
                  setAlimTotal((t) => t + pack.qty);
                  setAlimOpen(false);
                  setHistoryToast(`알림톡 ${pack.qty}건이 충전되었어요`);
                  setTimeout(() => setHistoryToast(null), 2200);
                }}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-white hover:border-ink p-4 transition"
              >
                <div className="text-left">
                  <p className="text-[14px] font-black text-ink flex items-center gap-2">
                    {pack.qty.toLocaleString()}건
                    {pack.badge && (
                      <span className="px-1.5 h-4 inline-flex items-center rounded-full bg-primary text-white text-[9.5px] font-extrabold">
                        {pack.badge}
                      </span>
                    )}
                  </p>
                  <p className="text-[11.5px] text-ink-soft mt-0.5">
                    건당 {Math.round(pack.price / pack.qty)}원
                  </p>
                </div>
                <p className="text-[16px] font-black text-ink tabular-nums">
                  {pack.price.toLocaleString()}원
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {historyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] bg-ink text-white text-[12.5px] font-bold px-4 h-11 rounded-full shadow-pop inline-flex items-center gap-2">
          <Check className="h-4 w-4 text-primary" /> {historyToast}
          <button
            onClick={() => setHistoryToast(null)}
            className="ml-1 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </AppShell>
  );
}

function WeeklyScheduleSummary({
  role,
  sessions,
  recentSession,
  loading,
}: {
  role: "trainer" | "student";
  sessions: WeeklySession[];
  recentSession: WeeklySession | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="mt-4 rounded-2xl border border-border bg-white p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      </section>
    );
  }

  return role === "trainer" ? (
    <TrainerWeeklySchedule sessions={sessions} />
  ) : (
    <StudentWeeklyInsight sessions={sessions} recentSession={recentSession} />
  );
}

function TrainerWeeklySchedule({ sessions }: { sessions: WeeklySession[] }) {
  const activeSessions = sessions.filter((session) => session.status !== "cancelled");
  const completedCount = activeSessions.filter((session) => session.status === "completed").length;
  const upcomingCount = activeSessions.filter((session) => session.status === "scheduled").length;
  const dayKeys = ["월", "화", "수", "목", "금", "토", "일"];
  const sessionByCell = new Map<string, WeeklySession[]>();
  const times = new Set<string>();

  activeSessions.forEach((session) => {
    const date = new Date(session.scheduledAt);
    const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    times.add(time);
    const key = `${day}-${time}`;
    sessionByCell.set(key, [...(sessionByCell.get(key) ?? []), session]);
  });

  const sortedTimes = [...times].sort();

  const now = Date.now();
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">이번 주</p>
            <h2 className="text-[16px] font-black text-ink">수업 운영 요약</h2>
          </div>
        </div>
        <Link
          to="/schedule"
          className="inline-flex h-9 items-center rounded-full border border-border-strong px-3.5 text-[11.5px] font-extrabold text-ink hover:bg-muted"
        >
          전체 일정 보기
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 p-5 sm:p-6">
        <ScheduleMetric label="확정" value={`${activeSessions.length}회`} icon={<CalendarClock className="h-3.5 w-3.5" />} />
        <ScheduleMetric label="완료" value={`${completedCount}회`} icon={<Check className="h-3.5 w-3.5" />} />
        <ScheduleMetric label="예정" value={`${upcomingCount}회`} icon={<Clock3 className="h-3.5 w-3.5" />} accent />
      </div>

      <div className="border-t border-border px-5 pb-6 pt-4 sm:px-6">
        <div className="mb-3 flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-ink" />
          <h3 className="text-[13px] font-black text-ink">확정된 이번 주 타임테이블</h3>
        </div>
        {sortedTimes.length ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[64px_repeat(7,minmax(76px,1fr))] bg-surface-muted">
                <div className="px-2 py-2.5 text-center text-[10px] font-bold text-ink-soft">시간</div>
                {dayKeys.map((day) => (
                  <div key={day} className="border-l border-border px-2 py-2.5 text-center text-[11px] font-black text-ink">{day}</div>
                ))}
              </div>
              {sortedTimes.map((time) => (
                <div key={time} className="grid min-h-14 grid-cols-[64px_repeat(7,minmax(76px,1fr))] border-t border-border">
                  <div className="grid place-items-center bg-surface-muted/60 text-[10.5px] font-bold text-ink-soft">{time}</div>
                  {dayKeys.map((day) => {
                    const cellSessions = sessionByCell.get(`${day}-${time}`) ?? [];
                    return (
                      <div key={day} className="flex flex-col justify-center gap-1 border-l border-border p-1.5">
                        {cellSessions.map((session) => (
                          <span
                            key={session.id}
                            className={`truncate rounded-md px-1.5 py-1 text-center text-[10.5px] font-extrabold ${new Date(session.scheduledAt).getTime() < now ? "bg-muted text-ink-soft" : "bg-primary/10 text-primary"}`}
                            title={`${session.counterpart} 회원`}
                          >
                            {session.counterpart}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-24 items-center justify-center gap-2 rounded-xl bg-surface-muted px-4 text-[12px] font-semibold text-ink-soft">
            <CalendarClock className="h-4 w-4" /> 이번 주에 확정된 수업이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}

function StudentWeeklyInsight({
  sessions,
  recentSession,
}: {
  sessions: WeeklySession[];
  recentSession: WeeklySession | null;
}) {
  const now = Date.now();
  const upcoming = sessions
    .filter((session) => session.status === "scheduled" && new Date(session.scheduledAt).getTime() >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const nextSession = upcoming[0] ?? null;
  const nextDate = nextSession ? new Date(nextSession.scheduledAt) : null;
  const recentDate = recentSession ? new Date(recentSession.scheduledAt) : null;
  const daysUntil = nextDate ? Math.max(0, Math.ceil((nextDate.getTime() - now) / 86_400_000)) : null;
  const intervalDays = nextDate && recentDate
    ? Math.max(0, Math.round((nextDate.getTime() - recentDate.getTime()) / 86_400_000))
    : null;
  const formatLong = (date: Date) =>
    new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
      <div className="relative overflow-hidden bg-ink px-5 py-6 text-white sm:px-7">
        <div className="absolute right-0 top-0 h-full w-40 bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10.5px] font-bold text-white/80">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> 다음 PT 일정
            </span>
            {nextDate ? (
              <>
                <h2 className="mt-3 max-w-xl text-[20px] font-black leading-snug sm:text-[23px]">
                  다음 PT는 <span className="text-primary">{formatLong(nextDate)}</span>에<br className="hidden sm:block" /> 예정되어 있어요.
                </h2>
                <p className="mt-2 text-[12.5px] text-white/65">
                  {nextSession?.counterpart} 트레이너{nextSession?.gym ? ` · ${nextSession.gym}` : ""}
                </p>
              </>
            ) : (
              <h2 className="mt-3 text-[20px] font-black">예정된 PT가 없어요.</h2>
            )}
          </div>
          {daysUntil !== null && (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-center text-[17px] font-black shadow-pop">
              D-{daysUntil}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        <div className="rounded-xl bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-ink-soft">
            <Clock3 className="h-4 w-4" /> 최근 PT
          </div>
          {recentDate ? (
            <>
              <p className="mt-2 text-[15px] font-black text-ink">{formatLong(recentDate)}</p>
              {intervalDays !== null && nextDate && (
                <p className="mt-1 text-[12px] font-extrabold text-primary">{intervalDays}일 만에 다시 PT를 해요!</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[13px] font-bold text-ink-soft">아직 완료된 PT 기록이 없습니다.</p>
          )}
        </div>

        <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-primary">
            <Sparkles className="h-4 w-4" /> 최근 운동 기록
          </div>
          {recentSession?.note?.trim() ? (
            <p className="mt-2 line-clamp-3 text-[13px] font-semibold leading-relaxed text-ink">
              {recentSession.note}
            </p>
          ) : (
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-ink-soft">
              트레이너가 운동 기록을 남기면 여기에 표시됩니다.
            </p>
          )}
        </div>
      </div>

      {upcoming.length > 1 && (
        <div className="border-t border-border px-5 py-4 sm:px-6">
          <p className="text-[11px] font-bold text-ink-soft">다른 예정된 일정</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {upcoming.slice(1).map((session) => (
              <span key={session.id} className="rounded-full bg-surface-muted px-3 py-1.5 text-[11.5px] font-bold text-ink">
                {formatLong(new Date(session.scheduledAt))}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border px-5 py-4 text-right sm:px-6">
        <Link to="/pt-history" className="text-[11.5px] font-extrabold text-primary hover:underline">
          전체 PT 내역 보기
        </Link>
      </div>
    </section>
  );
}

function ScheduleMetric({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl px-3 py-3 ${accent ? "bg-primary text-white" : "bg-surface-muted text-ink"}`}>
      <div className={`flex items-center gap-1 text-[10.5px] font-bold ${accent ? "text-white/80" : "text-ink-soft"}`}>
        {icon} {label}
      </div>
      <p className="mt-1 text-[18px] font-black tabular-nums">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  editable,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  editable: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</span>
      {editable ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1.5 h-11 w-full px-3.5 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[14px] font-semibold text-ink"
        />
      ) : (
        <p className="mt-1.5 h-11 px-3.5 rounded-xl bg-surface-muted border border-border flex items-center text-[14px] font-semibold text-ink">
          {value || <span className="text-ink-soft font-normal">—</span>}
        </p>
      )}
    </label>
  );
}

function BillingRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2 text-[13px]">
      <span className="text-ink-soft">{label}</span>
      <span className="font-extrabold text-ink tabular-nums">{value}</span>
    </li>
  );
}

function StatBox({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 ${accent ? "bg-primary text-white" : "bg-white border border-border"}`}
    >
      <div
        className={`flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider ${accent ? "text-white/80" : "text-ink-soft"}`}
      >
        {icon}
        {label}
      </div>
      <p
        className={`mt-1 text-[20px] font-black tabular-nums ${accent ? "text-white" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
}
