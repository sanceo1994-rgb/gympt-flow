import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import React, { useEffect, useMemo, useState } from "react";
import {
  Send,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Ban,
  Lock,
  Users,
  MailCheck,
  CalendarCheck,
  Pencil,
  MessageCircle,
  X,
  Activity,
  ChevronUp,
  ChevronDown,
  UserRoundSearch,
  Inbox,
  OctagonAlert,
  UserX,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { maximizeScheduleAssignments, type MatchingSlot } from "@/lib/maximize-schedule";
import { pickDisplayName } from "@/lib/display-name";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/schedule")({
  validateSearch: (search: Record<string, unknown>): { week?: number } => {
    const week = Number(search.week);
    return Number.isFinite(week) ? { week } : {};
  },
  head: () => ({
    meta: [
      { title: "트레이너 일정 조율 — 픽짐피티 PickGymPT" },
      {
        name: "description",
        content:
          "달력으로 학생 응답을 한눈에 확인하고, 안되는 시간만 닫으면 AI가 최적 시간표를 만들어드려요.",
      },
    ],
  }),
  component: Schedule,
});

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i);

const PICKS: Record<string, string[]> = {
  "월-19": ["김지원", "한승호", "최유나", "이도현"],
  "월-20": ["김지원", "한승호", "박서윤", "최유나", "정수민"],
  "화-7": ["박서윤", "정수민"],
  "화-19": ["김지원", "한승호", "최유나"],
  "수-9": ["최유나", "정수민"],
  "수-19": ["김지원", "한승호", "최유나", "이도현", "박서윤"],
  "수-20": ["김지원", "한승호", "박서윤"],
  "목-7": ["박서윤"],
  "목-19": ["김지원", "이도현"],
  "금-19": ["김지원", "한승호", "최유나", "이도현", "박서윤"],
  "금-20": ["김지원", "한승호", "박서윤", "최유나"],
  "토-9": ["최유나", "정수민"],
  "토-11": ["정수민", "박서윤", "이도현"],
};

function heatLevel(n: number) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

function getWeekLabel(offset: number) {
  const base = new Date();
  const mondayDistance = (base.getDay() + 6) % 7;
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - mondayDistance + offset * 7);
  const end = new Date(base);
  end.setDate(end.getDate() + 6);
  const f = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
  return `${f(base)} – ${f(end)}`;
}

function getWeekDates(offset: number) {
  const monday = new Date();
  const mondayDistance = (monday.getDay() + 6) % 7;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - mondayDistance + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Saturday (index 5) is blue, Sunday (index 6) is red, weekdays use the default ink color.
function dayHeaderColor(i: number, dark?: boolean) {
  if (i === 5) return dark ? "text-blue-300" : "text-blue-600";
  if (i === 6) return dark ? "text-red-300" : "text-red-600";
  return "";
}

function DayHeaderLabel({
  day,
  date,
  i,
  dark,
  className,
}: {
  day: string;
  date: Date;
  i: number;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={`text-center leading-tight ${dayHeaderColor(i, dark)} ${className ?? ""}`}>
      <p className="font-extrabold">{day}</p>
      <p className="text-[9px] font-bold opacity-70 tabular-nums">
        {date.getMonth() + 1}/{date.getDate()}
      </p>
    </div>
  );
}

function formatMessageSentAt(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function StudentNameBadge({
  name,
  avatarUrl,
  compact = false,
  tone = "dark",
}: {
  name: string;
  avatarUrl?: string | null;
  compact?: boolean;
  tone?: "dark" | "light" | "heat";
}) {
  const colors =
    tone === "light"
      ? "border-black/10 bg-white/85 text-ink"
      : tone === "heat"
        ? "border-white/40 bg-black/15 text-white"
        : "border-primary/40 bg-primary/20 text-white";
  // Font size scales continuously with viewport width (via clamp) instead of
  // stepping at a couple of breakpoints, so the name never wraps to a second
  // line or gets ellipsized at in-between widths — it just keeps shrinking.
  const fontSize = compact ? "clamp(6.5px, 1.7vw, 12px)" : "clamp(8px, 2.1vw, 14px)";
  const padX = compact ? "clamp(2px, 0.5vw, 8px)" : "clamp(4px, 0.7vw, 10px)";
  const gap = compact ? "clamp(1px, 0.3vw, 4px)" : "clamp(2px, 0.4vw, 6px)";
  const avatarSizing = compact ? "h-3.5 w-3.5 sm:h-5 sm:w-5" : "h-5 w-5";

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center whitespace-nowrap rounded-full border font-extrabold leading-tight ${colors}`}
      style={{ fontSize, paddingInline: padX, paddingBlock: "2px", gap }}
      title={name}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className={`${avatarSizing} shrink-0 rounded-full object-cover`}
        />
      ) : (
        <span
          className={`${avatarSizing} grid shrink-0 place-items-center rounded-full ${tone === "light" ? "bg-primary/10 text-primary" : "bg-white/20 text-white"} text-[7px] font-black sm:text-[9px]`}
        >
          {name[0]}
        </span>
      )}
      {/* Full name, never ellipsized or wrapped — the font shrinks instead. */}
      <span className="min-w-0 whitespace-nowrap">{name}</span>
    </span>
  );
}

const WEEK_LABELS = ["이번 주", "다음 주", "다다음 주", "3주 뒤", "4주 뒤"];

type Status = "응답완료" | "응답대기" | "불가" | "미가입";
type Student = {
  name: string;
  avatarUrl?: string | null;
  status: Status;
  picks: string[];
  lastPT: string;
  remaining: number;
  total: number;
  joinedAt: string;
  studentUserId?: string | null;
  rosterId?: string;
};

const AI_RESULT_INIT = [
  { day: "월", hour: "19:00", name: "김지원" },
  { day: "월", hour: "20:00", name: "한승호" },
  { day: "화", hour: "07:00", name: "박서윤" },
  { day: "수", hour: "09:00", name: "최유나" },
  { day: "수", hour: "19:00", name: "이도현" },
  { day: "금", hour: "20:00", name: "정수민" },
];

type ActivityItem =
  // 학생이 시간/불가 응답을 "제출"한 단위(같은 배치의 created_at)당 1건. 같은 학생이
  // 이전에 제출한 적이 있으면 isEdit=true로 "수정 제출"임을 구분해서 보여준다.
  | { kind: "pick"; who: string; count: number; isEdit: boolean; when: string }
  | { kind: "unavailable"; who: string; isEdit: boolean; when: string }
  // 트레이너가 전체/개별로 확정 알림을 보낸 시점.
  | { kind: "confirm"; count: number; when: string }
  // 트레이너가 가장 처음 이번 주 가능 시간 요청을 발송한 시점.
  | { kind: "request"; count: number; when: string }
  // 트레이너가 아직 미확정인 학생을 수동으로 처음 배정·확정한 경우.
  | { kind: "manual"; who: string; day: string; hour: number; when: string }
  // 이미 확정돼 있던 학생을 다른 시간으로 옮긴 경우(확정된 일정 변경).
  | {
      kind: "reschedule";
      who: string;
      fromDay: string;
      fromHour: number;
      toDay: string;
      toHour: number;
      when: string;
    }
  // 트레이너가 확정된(아직 지나지 않은) 일정을 완전히 취소한 경우.
  | { kind: "cancel_confirmed"; who: string; day: string; hour: number; when: string }
  // 실제 시작 시각이 지난 확정 PT — pt_sessions에서 파생, 메모 버튼 제공.
  | {
      kind: "completed";
      who: string;
      sessionNo: number;
      remaining: number;
      sessionId: string;
      when: string;
    }
  // 당일(시작 시각이 지난) PT를 회원 사정으로 취소 처리한 경우 — pt_sessions에서 파생.
  | { kind: "cancelled"; who: string; sessionNo: number; when: string };

const BODY_GROUPS: { name: string; items: string[] }[] = [
  { name: "가슴", items: ["벤치프레스", "인클라인 벤치", "체스트프레스", "딥스", "케이블 플라이"] },
  { name: "등", items: ["데드리프트", "랫풀다운", "바벨로우", "시티드로우", "풀업"] },
  { name: "하체", items: ["스쿼트", "레그프레스", "런지", "레그익스텐션", "레그컬"] },
  {
    name: "어깨",
    items: ["오버헤드프레스", "사이드 레터럴", "프론트 레이즈", "리어 델트", "쉬러그"],
  },
  { name: "이두", items: ["바벨컬", "덤벨컬", "해머컬", "프리처컬"] },
  { name: "삼두", items: ["케이블 푸쉬다운", "라잉 익스텐션", "딥스", "오버헤드 익스텐션"] },
  { name: "코어", items: ["플랭크", "행잉 레그레이즈", "케이블 크런치", "러시안 트위스트"] },
];

function parsePick(s: string): { day: string; hour: number } | null {
  const m = s.match(/(\S+)\s+(\d{1,2})시/);
  if (!m) return null;
  return { day: m[1], hour: parseInt(m[2], 10) };
}

type Assignment = { name: string; day: string; hour: number; method: "auto" | "manual" };

function Schedule() {
  const { week: initialWeek = 1 } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "student" | "signed-out" | "error">("checking");
  const [trainerName, setTrainerName] = useState("");
  const [dbStudents, setDbStudents] = useState<Student[]>([]);
  const [dbPicks, setDbPicks] = useState<Record<string, string[]>>({});
  const [dbAiResult, setDbAiResult] = useState<Array<{ day: string; hour: string; name: string }>>(
    [],
  );
  const [dbUnassigned, setDbUnassigned] = useState<Array<{ name: string; reason: string }>>([]);
  const [dbActivity, setDbActivity] = useState<ActivityItem[]>([]);
  const [slotIds, setSlotIds] = useState<Record<string, string>>({});
  const STUDENTS = dbStudents;
  const PICKS = dbPicks;
  const AI_RESULT_INIT = dbAiResult;
  const AI_UNASSIGNED = dbUnassigned;
  const ACTIVITY_LOG = dbActivity;
  const [weekOffset, setWeekOffset] = useState(initialWeek);
  const [closed, setClosed] = useState<Set<string>>(
    new Set([
      "일-7",
      "일-8",
      "일-9",
      "일-10",
      "일-11",
      "일-12",
      "일-13",
      "일-14",
      "일-15",
      "일-16",
      "일-17",
      "일-18",
      "일-19",
      "일-20",
      "일-21",
      "일-22",
    ]),
  );
  const [editing, setEditing] = useState<Student | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingMove, setPendingMove] = useState<{ day: string; hour: number } | null>(null);
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);
  const [sendToast, setSendToast] = useState<string | null>(null);
  const [notifyConfirm, setNotifyConfirm] = useState<{
    name: string;
    scope: "individual" | "remind";
  } | null>(null);
  const [inviteIntent, setInviteIntent] = useState(false);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [requestSentAt, setRequestSentAt] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [confirmedStudentNames, setConfirmedStudentNames] = useState<Set<string>>(new Set());
  const [confirmedMessageAtByName, setConfirmedMessageAtByName] = useState<Record<string, string>>(
    {},
  );
  const [confirmedSummary, setConfirmedSummary] = useState<{
    count: number;
    responded: number;
    total: number;
  } | null>(null);

  // Right-side panel for "요청 보내기" / "확정 알림"
  const [panel, setPanel] = useState<null | "invite" | "confirm">(null);
  const [panelWeek, setPanelWeek] = useState(1);
  const [panelSelected, setPanelSelected] = useState<Set<string>>(new Set());

  // Pending-close cells for floating confirm bar
  const [pendingClose, setPendingClose] = useState<Set<string>>(new Set());
  const [closeEditMode, setCloseEditMode] = useState(false);
  const [slotDetail, setSlotDetail] = useState<{ label: string; names: string[] } | null>(null);

  // Memo panel state
  const [memoFor, setMemoFor] = useState<{
    name: string;
    sessionNo: number;
    sessionId: string;
  } | null>(null);
  const [memoGroup, setMemoGroup] = useState<string | null>(null);
  const [memoExercises, setMemoExercises] = useState<Set<string>>(new Set());
  const [memoText, setMemoText] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAccessState("signed-out");
      setDbStudents([]);
      setDbPicks({});
      setDbAiResult([]);
      setDbUnassigned([]);
      setDbActivity([]);
      setScheduleId(null);
      setRequestSentAt(null);
      setConfirmedAt(null);
      setConfirmedStudentNames(new Set());
      setConfirmedMessageAtByName({});
      setConfirmedSummary(null);
      return;
    }

    if (String(user.id).startsWith("virtual-")) {
      const virtualRole = (user.user_metadata as { role?: string } | undefined)?.role;
      setAccessState(virtualRole === "trainer" ? "allowed" : "student");
      return;
    }

    let cancelled = false;
    setAccessState("checking");
    const userId = user.id;
    const targetMonday = new Date();
    const mondayDistance = (targetMonday.getDay() + 6) % 7;
    targetMonday.setHours(0, 0, 0, 0);
    targetMonday.setDate(targetMonday.getDate() - mondayDistance + weekOffset * 7);
    const weekStart = `${targetMonday.getFullYear()}-${String(targetMonday.getMonth() + 1).padStart(2, "0")}-${String(targetMonday.getDate()).padStart(2, "0")}`;

    async function loadSchedule() {
      const { data: trainer, error: trainerError } = await supabase
        .from("trainers")
        .select("id,name,gym,intro,avatar_url,instagram_url")
        .eq("user_id", userId)
        .maybeSingle();
      if (trainerError) {
        if (!cancelled) setAccessState("error");
        return;
      }
      if (!trainer) {
        if (!cancelled) setAccessState("student");
        return;
      }
      if (!cancelled) setAccessState("allowed");
      if (trainer && !cancelled) setTrainerName(pickDisplayName(trainer.name) ?? "");
      if (trainer && !cancelled) setTrainerId(trainer.id);
      if (cancelled) return;

      const [{ data: rosters }, { data: sessions }] = await Promise.all([
        supabase
          .from("student_rosters")
          .select("id,student_name,status,remaining_sessions,total_sessions,created_at,student_user_id")
          .eq("trainer_id", trainer.id)
          .order("created_at"),
        supabase
          .from("pt_sessions")
          .select("id,roster_id,scheduled_at,status,note,updated_at")
          .eq("trainer_id", trainer.id)
          .order("scheduled_at", { ascending: false }),
      ]);
      const activeRosters = (rosters ?? []).filter((roster) => roster.remaining_sessions > 0);
      const studentUserIds = activeRosters.flatMap((roster) =>
        roster.student_user_id ? [roster.student_user_id] : [],
      );
      const { data: studentProfiles } = studentUserIds.length
        ? await supabase.from("profiles").select("id,avatar_url").in("id", studentUserIds)
        : { data: [] as { id: string; avatar_url: string | null }[] };
      const avatarByUserId = new Map(
        (studentProfiles ?? []).map((profile) => [profile.id, profile.avatar_url]),
      );

      // Nothing in this app ever flips pt_sessions.status to "completed" — a
      // confirmed session is "done" purely once its scheduled_at has passed
      // (unless the trainer explicitly marked it cancelled). Both "최근 PT"
      // and the activity feed's 완료/당일 취소 entries are derived from that
      // same rule, on the trainer-wide `sessions` list (not scoped to the
      // currently-viewed week).
      const now = Date.now();
      const rosterById = new Map((rosters ?? []).map((roster) => [roster.id, roster]));
      const latestCompleted = new Map<string, string>();
      for (const session of sessions ?? []) {
        if (session.status === "cancelled") continue;
        if (new Date(session.scheduled_at).getTime() > now) continue;
        if (!latestCompleted.has(session.roster_id)) {
          latestCompleted.set(
            session.roster_id,
            new Date(session.scheduled_at).toLocaleDateString("ko-KR", {
              month: "numeric",
              day: "numeric",
              weekday: "short",
            }),
          );
        }
      }

      const sessionsByRoster = new Map<string, NonNullable<typeof sessions>>();
      for (const session of sessions ?? []) {
        const list = sessionsByRoster.get(session.roster_id) ?? [];
        list.push(session);
        sessionsByRoster.set(session.roster_id, list);
      }
      const sessionActivityItems: { ts: number; item: ActivityItem }[] = [];
      for (const [rosterId, list] of sessionsByRoster) {
        const roster = rosterById.get(rosterId);
        if (!roster) continue;
        const chronological = [...list].sort(
          (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
        );
        let sessionNo = 0;
        for (const session of chronological) {
          const scheduledTs = new Date(session.scheduled_at).getTime();
          if (session.status === "cancelled") {
            sessionActivityItems.push({
              ts: new Date(session.updated_at).getTime(),
              item: {
                kind: "cancelled",
                who: roster.student_name,
                sessionNo: sessionNo + 1,
                when: new Date(session.updated_at).toLocaleString("ko-KR"),
              },
            });
            continue;
          }
          if (scheduledTs > now) continue;
          sessionNo += 1;
          sessionActivityItems.push({
            ts: scheduledTs,
            item: {
              kind: "completed",
              who: roster.student_name,
              sessionNo,
              remaining: roster.remaining_sessions,
              sessionId: session.id,
              when: new Date(session.scheduled_at).toLocaleString("ko-KR"),
            },
          });
        }
      }

      // weekly_schedules.trainer_id actually references trainer_profiles(id), a
      // separate per-trainer mirror row that most trainers don't have yet — not
      // trainers(id). Create it on first visit, then lazily create the week's
      // schedule + its full time-slot grid too, since nothing else in the app does.
      let { data: scheduleTrainer } = await supabase
        .from("trainer_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!scheduleTrainer) {
        const { data: createdProfile } = await supabase
          .from("trainer_profiles")
          .upsert(
            {
              user_id: userId,
              display_name: trainer.name,
              gym_name: trainer.gym,
              intro: trainer.intro,
              avatar_url: trainer.avatar_url,
              instagram_url: trainer.instagram_url,
            },
            { onConflict: "user_id" },
          )
          .select("id")
          .maybeSingle();
        scheduleTrainer = createdProfile ?? null;
      }
      if (cancelled) return;
      if (!scheduleTrainer) return;

      let schedule = (
        await supabase
          .from("weekly_schedules")
          .select("id,request_sent_at,confirmed_at")
          .eq("trainer_id", scheduleTrainer.id)
          .eq("week_start", weekStart)
          .maybeSingle()
      ).data;
      if (!schedule) {
        const { data: created } = await supabase
          .from("weekly_schedules")
          .upsert(
            { trainer_id: scheduleTrainer.id, week_start: weekStart },
            { onConflict: "trainer_id,week_start" },
          )
          .select("id,request_sent_at,confirmed_at")
          .maybeSingle();
        schedule = created ?? null;
      }
      if (cancelled) return;
      setScheduleId(schedule?.id ?? null);
      setRequestSentAt(schedule?.request_sent_at ?? null);
      setConfirmedAt(schedule?.confirmed_at ?? null);
      setConfirmedSummary(null);

      if (!schedule) {
        setDbStudents(
          activeRosters.map((roster) => ({
            name: roster.student_name,
            avatarUrl: roster.student_user_id
              ? (avatarByUserId.get(roster.student_user_id) ?? null)
              : null,
            status: roster.student_user_id ? "응답대기" : "미가입",
            picks: [],
            lastPT: latestCompleted.get(roster.id) || "기록 없음",
            remaining: roster.remaining_sessions,
            total: roster.total_sessions,
            joinedAt: new Date(roster.created_at).toLocaleDateString("ko-KR"),
            studentUserId: roster.student_user_id,
            rosterId: roster.id,
          })),
        );
        setDbPicks({});
        setDbAiResult([]);
        setDbUnassigned([]);
        setDbActivity(
          sessionActivityItems
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 20)
            .map((entry) => entry.item),
        );
        setConfirmedStudentNames(new Set());
        setConfirmedMessageAtByName({});
        return;
      }

      const { data: existingSlots } = await supabase
        .from("time_slots")
        .select("id")
        .eq("schedule_id", schedule.id)
        .limit(1);
      if (!existingSlots || existingSlots.length === 0) {
        const grid = [];
        for (let day = 0; day < 7; day++) {
          for (const hour of HOURS)
            grid.push({
              schedule_id: schedule.id,
              day_of_week: day,
              hour,
              capacity: 1,
              is_closed: day === 6,
            });
        }
        await supabase
          .from("time_slots")
          .upsert(grid, { onConflict: "schedule_id,day_of_week,hour", ignoreDuplicates: true });
      }
      if (cancelled) return;

      const [{ data: slots }, { data: selections }, { data: activityRows }] = await Promise.all([
        supabase
          .from("time_slots")
          .select("id,day_of_week,hour,capacity,is_closed")
          .eq("schedule_id", schedule.id),
        supabase
          .from("student_selections")
          .select("id,slot_id,student_user_id,student_name,status,assigned_method,created_at")
          .eq("schedule_id", schedule.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("schedule_activity_log")
          .select("id,kind,who,day,hour,from_day,from_hour,count,created_at")
          .eq("schedule_id", schedule.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (cancelled) return;

      const slotById = new Map((slots ?? []).map((slot) => [slot.id, slot]));
      const ids: Record<string, string> = {};
      const closedKeys = new Set<string>();
      for (const slot of slots ?? []) {
        const key = `${DAYS[slot.day_of_week]}-${slot.hour}`;
        ids[key] = slot.id;
        if (slot.is_closed) closedKeys.add(key);
      }

      const selectionsByName = new Map<string, typeof selections>();
      const pickMap: Record<string, string[]> = {};
      for (const selection of selections ?? []) {
        const list = selectionsByName.get(selection.student_name) ?? [];
        list.push(selection);
        selectionsByName.set(selection.student_name, list);
        const slot = selection.slot_id ? slotById.get(selection.slot_id) : null;
        if (slot && selection.status !== "unavailable") {
          const key = `${DAYS[slot.day_of_week]}-${slot.hour}`;
          pickMap[key] = [...(pickMap[key] ?? []), selection.student_name];
        }
      }

      const students = activeRosters.map((roster) => {
        const own = selectionsByName.get(roster.student_name) ?? [];
        const unavailable = own.some((selection) => selection.status === "unavailable");
        const picks = own.flatMap((selection) => {
          const slot = selection.slot_id ? slotById.get(selection.slot_id) : null;
          return slot ? [`${DAYS[slot.day_of_week]} ${String(slot.hour).padStart(2, "0")}시`] : [];
        });
        return {
          name: roster.student_name,
          avatarUrl: roster.student_user_id
            ? (avatarByUserId.get(roster.student_user_id) ?? null)
            : null,
          status: !roster.student_user_id
            ? ("미가입" as const)
            : unavailable
              ? ("불가" as const)
              : picks.length
                ? ("응답완료" as const)
                : ("응답대기" as const),
          picks,
          lastPT: latestCompleted.get(roster.id) || "기록 없음",
          remaining: roster.remaining_sessions,
          total: roster.total_sessions,
          joinedAt: new Date(roster.created_at).toLocaleDateString("ko-KR"),
          studentUserId: roster.student_user_id,
          rosterId: roster.id,
        };
      });

      const matchingSlots: MatchingSlot[] = (slots ?? []).map((slot) => ({
        id: `${DAYS[slot.day_of_week]}-${slot.hour}`,
        day: DAYS[slot.day_of_week],
        hour: slot.hour,
        capacity: slot.capacity,
        isClosed: slot.is_closed,
      }));
      const matching = maximizeScheduleAssignments(
        students
          .filter((student) => student.status === "응답완료")
          .map((student) => ({
            id: student.name,
            name: student.name,
            preferredSlotIds: student.picks.flatMap((pick) => {
              const parsed = parsePick(pick);
              return parsed ? [`${parsed.day}-${parsed.hour}`] : [];
            }),
          })),
        matchingSlots,
      );
      const result: typeof AI_RESULT_INIT = matching.assignments.map((assignment) => ({
        day: assignment.day,
        hour: `${String(assignment.hour).padStart(2, "0")}:00`,
        name: assignment.studentName,
      }));

      setSlotIds(ids);
      setClosed(closedKeys);
      setDbStudents(students);
      setDbPicks(pickMap);
      setDbAiResult(result);
      setDbUnassigned(
        matching.unassigned.map((student) => ({
          name: student.studentName,
          reason: student.reason,
        })),
      );
      // Persisted confirmations (auto or manual) win over a freshly-recomputed AI
      // guess for that student — otherwise a manual move (or an earlier bulk
      // confirm) would silently revert on the next reload/week-tick.
      const confirmedByName = new Map<string, Assignment>();
      for (const selection of selections ?? []) {
        if (selection.status !== "confirmed" || !selection.slot_id) continue;
        const slot = slotById.get(selection.slot_id);
        if (!slot) continue;
        confirmedByName.set(selection.student_name, {
          name: selection.student_name,
          day: DAYS[slot.day_of_week],
          hour: slot.hour,
          method: selection.assigned_method === "manual" ? "manual" : "auto",
        });
      }
      // Students with no linked auth account never get a student_selections
      // row (confirm_weekly_schedule requires student_user_id), so their
      // manual assignment lives only in pt_sessions. Without this, this view
      // would show them as unassigned after every reload — and worse, the
      // next manual move for them would have no "previous slot" to clear,
      // leaving the old pt_sessions row behind as an orphan (the trainer and
      // student-side timetables would then disagree).
      const weekEndDate = new Date(targetMonday);
      weekEndDate.setDate(weekEndDate.getDate() + 7);
      for (const session of sessions ?? []) {
        if (session.status !== "scheduled") continue;
        const roster = rosterById.get(session.roster_id);
        if (!roster || roster.student_user_id) continue;
        const scheduledAt = new Date(session.scheduled_at);
        if (scheduledAt < targetMonday || scheduledAt >= weekEndDate) continue;
        confirmedByName.set(roster.student_name, {
          name: roster.student_name,
          day: DAYS[(scheduledAt.getDay() + 6) % 7],
          hour: scheduledAt.getHours(),
          method: "manual",
        });
      }
      setConfirmedStudentNames(new Set(confirmedByName.keys()));
      const messageTimes: Record<string, string> = {};
      for (const row of activityRows ?? []) {
        if (
          (row.kind === "confirm" || row.kind === "manual" || row.kind === "reschedule") &&
          row.who &&
          !messageTimes[row.who]
        ) {
          messageTimes[row.who] = row.created_at;
        }
      }
      setConfirmedMessageAtByName(messageTimes);
      const mergedAssignments: Assignment[] = [
        ...result
          .filter((item) => !confirmedByName.has(item.name))
          .map((item) => ({
            name: item.name,
            day: item.day,
            hour: parseInt(item.hour, 10),
            method: "auto" as const,
          })),
        ...confirmedByName.values(),
      ];
      setAssignments(mergedAssignments);
      setPanelSelected(new Set(students.map((student) => student.name)));

      // A single "제출" can insert several student_selections rows (one per
      // picked slot) in one statement, so they all share the exact same
      // created_at — group on (name, created_at) to log it as one entry, and
      // flag anything after a student's earliest batch as a "수정 제출".
      const selectionRows = selections ?? [];
      const batches = new Map<string, typeof selectionRows>();
      for (const row of selectionRows) {
        const key = `${row.student_name}__${row.created_at}`;
        const list = batches.get(key) ?? [];
        list.push(row);
        batches.set(key, list);
      }
      const earliestByStudent = new Map<string, number>();
      for (const row of selectionRows) {
        const ts = new Date(row.created_at).getTime();
        const prev = earliestByStudent.get(row.student_name);
        if (prev === undefined || ts < prev) earliestByStudent.set(row.student_name, ts);
      }
      const pickItems = [...batches.values()].map((rows) => {
        const first = rows[0];
        const ts = new Date(first.created_at).getTime();
        const isEdit = ts > (earliestByStudent.get(first.student_name) ?? ts);
        const when = new Date(first.created_at).toLocaleString("ko-KR");
        const item: ActivityItem = rows.some((row) => row.status === "unavailable")
          ? { kind: "unavailable", who: first.student_name, isEdit, when }
          : { kind: "pick", who: first.student_name, count: rows.length, isEdit, when };
        return { ts, item };
      });
      const logItems = (activityRows ?? [])
        .filter((row) => row.kind !== "confirm" || !row.who)
        .map((row) => {
          const when = new Date(row.created_at).toLocaleString("ko-KR");
          let item: ActivityItem;
          if (row.kind === "manual") {
            item = { kind: "manual", who: row.who ?? "", day: row.day ?? "", hour: row.hour ?? 0, when };
          } else if (row.kind === "reschedule") {
            item = {
              kind: "reschedule",
              who: row.who ?? "",
              fromDay: row.from_day ?? "",
              fromHour: row.from_hour ?? 0,
              toDay: row.day ?? "",
              toHour: row.hour ?? 0,
              when,
            };
          } else if (row.kind === "request") {
            item = { kind: "request", count: row.count ?? 0, when };
          } else if (row.kind === "cancel_confirmed") {
            item = {
              kind: "cancel_confirmed",
              who: row.who ?? "",
              day: row.day ?? "",
              hour: row.hour ?? 0,
              when,
            };
          } else {
            item = { kind: "confirm", count: row.count ?? 0, when };
          }
          return { ts: new Date(row.created_at).getTime(), item };
        });
      setDbActivity(
        [...pickItems, ...logItems, ...sessionActivityItems]
          .sort((a, b) => b.ts - a.ts)
          .slice(0, 20)
          .map((entry) => entry.item),
      );
    }

    void loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, weekOffset]);

  const resetMemo = () => {
    setMemoFor(null);
    setMemoGroup(null);
    setMemoExercises(new Set());
    setMemoText("");
  };
  const toggleExercise = (e: string) =>
    setMemoExercises((p) => {
      const n = new Set(p);
      n.has(e) ? n.delete(e) : n.add(e);
      return n;
    });

  const submitMemo = async (sameDayCancel = false) => {
    if (!memoFor) return;
    const { name, sessionNo, sessionId } = memoFor;
    if (sameDayCancel) {
      const { error } = await supabase
        .from("pt_sessions")
        .update({ status: "cancelled", note: memoText || null })
        .eq("id", sessionId);
      if (error) {
        console.error("same-day cancel failed", error);
        fireToast("취소 기록에 실패했어요. 다시 시도해주세요.");
        resetMemo();
        return;
      }
      setDbActivity((prev) => [
        { kind: "cancelled", who: name, sessionNo, when: "방금" },
        ...prev.filter(
          (item) => !(item.kind === "completed" && item.sessionId === sessionId),
        ),
      ]);
      fireToast(`${name}님 ${sessionNo}회차 — 회원 사정으로 당일 취소 기록 ✓`);
    } else {
      const parts = [memoGroup, ...memoExercises].filter(Boolean).join(" · ");
      const { error } = await supabase
        .from("pt_sessions")
        .update({ note: parts || memoText || null })
        .eq("id", sessionId);
      if (error) console.error("memo save failed", error);
      fireToast(`${name}님 ${sessionNo}회차 메모 저장 ✓ (${parts || "메모만"})`);
    }
    resetMemo();
  };

  // Activity feed pagination
  const ACT_PAGE = 4;
  const [actPage, setActPage] = useState(0);
  const actMaxPage = Math.max(0, Math.ceil(ACTIVITY_LOG.length / ACT_PAGE) - 1);

  const fireToast = (t: string) => {
    setSendToast(t);
    setTimeout(() => setSendToast(null), 2400);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setActiveName(s.name);
  };

  // Cell click toggles pending-close membership (XOR with current closed)
  const toggleCellPending = (key: string) => {
    if (requestSentAt != null && !closeEditMode) return;
    setPendingClose((p) => {
      const n = new Set(p);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const closeDay = (d: string) => {
    if (requestSentAt != null && !closeEditMode) return;
    setPendingClose((p) => {
      const n = new Set(p);
      HOURS.forEach((h) => {
        const k = `${d}-${h}`;
        if (n.has(k)) n.delete(k);
        else n.add(k);
      });
      return n;
    });
  };

  const closeHour = (h: number) => {
    if (requestSentAt != null && !closeEditMode) return;
    setPendingClose((p) => {
      const n = new Set(p);
      DAYS.forEach((d) => {
        const k = `${d}-${h}`;
        if (n.has(k)) n.delete(k);
        else n.add(k);
      });
      return n;
    });
  };

  const applyPending = async () => {
    // Count from a plain read of `closed`/`pendingClose` rather than inside the
    // setClosed updater — React may invoke that updater more than once (e.g.
    // StrictMode), which silently double-counted toClose/toOpen while the
    // resulting Set itself stayed correct, so only the toast number was wrong.
    let toClose = 0,
      toOpen = 0;
    pendingClose.forEach((k) => {
      if (closed.has(k)) toOpen++;
      else toClose++;
    });

    setClosed((prev) => {
      const n = new Set(prev);
      pendingClose.forEach((k) => {
        if (n.has(k)) n.delete(k);
        else n.add(k);
      });
      return n;
    });
    setPendingClose(new Set());
    if (requestSentAt != null) setCloseEditMode(false);
    await Promise.all(
      Array.from(pendingClose).map((key) => {
        const slotId = slotIds[key];
        if (!slotId) return Promise.resolve();
        return supabase
          .from("time_slots")
          .update({ is_closed: !closed.has(key) })
          .eq("id", slotId);
      }),
    );
    const parts: string[] = [];
    if (toClose) parts.push(`${toClose}개 시간을 닫았어요`);
    if (toOpen) parts.push(`${toOpen}개 시간을 다시 열었어요`);
    fireToast(parts.join(" · ") || "변경사항 저장됨");
  };

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const stats = useMemo(() => {
    const total = STUDENTS.length;
    const responded = STUDENTS.filter(
      (s) => s.status === "응답완료" || s.status === "불가",
    ).length;
    const unavailable = STUDENTS.filter((s) => s.status === "불가").length;
    const assignable = AI_RESULT_INIT.length;
    return { total, responded, unavailable, assignable };
  }, [STUDENTS, AI_RESULT_INIT]);

  const togglePanelStudent = (name: string) => {
    setPanelSelected((p) => {
      const n = new Set(p);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };

  const sendRequest = async () => {
    const count = panelSelected.size;
    const all = count === STUDENTS.length;
    setPanel(null);
    if (!scheduleId) {
      fireToast("일정을 불러오는 중이에요. 잠시 후 다시 시도해주세요.");
      return;
    }
    const { error } = await supabase.rpc("mark_schedule_requested", {
      p_schedule_id: scheduleId,
    });
    if (error) {
      fireToast("요청 발송에 실패했어요. 다시 시도해주세요.");
      return;
    }
    setRequestSentAt((prev) => prev ?? new Date().toISOString());
    if (trainerId) {
      await supabase.from("schedule_activity_log").insert({
        schedule_id: scheduleId,
        trainer_id: trainerId,
        kind: "request",
        count,
      });
    }
    setDbActivity((prev) => [{ kind: "request", count, when: "방금" }, ...prev]);
    trackEvent("Schedule Request Sent", {
      recipient_count: count,
      week_offset: panelWeek,
      all_students: all,
    });
    fireToast(
      all
        ? `전원에게 ${WEEK_LABELS[panelWeek]} 응답 요청 발송 ✓`
        : `${count}명에게 ${WEEK_LABELS[panelWeek]} 응답 요청 발송 ✓`,
    );
  };

  const sendConfirm = async () => {
    setPanel(null);
    if (!scheduleId) {
      fireToast("일정을 불러오는 중이에요. 잠시 후 다시 시도해주세요.");
      return;
    }
    const studentByName = new Map(STUDENTS.map((s) => [s.name, s]));
    const payload = assignments
      .filter((a) => panelSelected.has(a.name))
      .map((a) => {
        const slotId = slotIds[`${a.day}-${a.hour}`];
        const studentUserId = studentByName.get(a.name)?.studentUserId;
        if (!slotId || !studentUserId) return null;
        return {
          slot_id: slotId,
          student_user_id: studentUserId,
          student_name: a.name,
          method: a.method,
        };
      })
      .filter(
        (
          row,
        ): row is {
          slot_id: string;
          student_user_id: string;
          student_name: string;
          method: "auto" | "manual";
        } => !!row,
      );

    if (payload.length === 0) {
      fireToast("확정할 배정이 없어요. 학생 응답을 먼저 확인해주세요.");
      return;
    }

    const { error } = await supabase.rpc("confirm_weekly_schedule", {
      p_schedule_id: scheduleId,
      p_assignments: payload,
    });
    if (error) {
      console.error("confirm_weekly_schedule failed", error);
      fireToast("확정에 실패했어요. 다시 시도해주세요.");
      return;
    }
    const { data: confirmedSchedule } = await supabase
      .from("weekly_schedules")
      .select("confirmed_at")
      .eq("id", scheduleId)
      .maybeSingle();
    const confirmedTimestamp = confirmedSchedule?.confirmed_at ?? new Date().toISOString();
    setConfirmedAt(confirmedTimestamp);
    setConfirmedStudentNames((previous) => {
      const next = new Set(previous);
      payload.forEach((row) => next.add(row.student_name));
      return next;
    });
    setConfirmedSummary({ count: payload.length, responded: stats.responded, total: stats.total });
    if (trainerId) {
      const { data: confirmationLogs, error: logError } = await supabase
        .from("schedule_activity_log")
        .insert([
          {
            schedule_id: scheduleId,
            trainer_id: trainerId,
            kind: "confirm",
            count: payload.length,
          },
          ...payload.map((row) => ({
            schedule_id: scheduleId,
            trainer_id: trainerId,
            kind: "confirm" as const,
            who: row.student_name,
            count: 1,
          })),
        ])
        .select("who,created_at");
      if (logError) console.error("schedule_activity_log insert (confirm) failed", logError);
      const nextTimes: Record<string, string> = {};
      for (const log of confirmationLogs ?? []) {
        if (log.who) nextTimes[log.who] = log.created_at;
      }
      setConfirmedMessageAtByName((previous) => ({
        ...previous,
        ...Object.fromEntries(
          payload.map((row) => [
            row.student_name,
            nextTimes[row.student_name] ?? confirmedTimestamp,
          ]),
        ),
      }));
    }
    setDbActivity((prev) => [
      { kind: "confirm", count: payload.length, when: "방금" },
      ...prev,
    ]);
    trackEvent("Schedule Confirmed", {
      student_count: payload.length,
      responded_count: stats.responded,
      total_students: stats.total,
      saved_minutes: payload.length * 15,
    });
    fireToast(
      `${payload.length}명 일정 확정 · 약 ${payload.length * 15}분을 절약했어요`,
    );
  };

  const pendingResponders = STUDENTS.filter((s) => s.status === "응답대기");
  const halfPending = pendingResponders;
  const respondedCount = STUDENTS.filter((student) => student.status === "응답완료").length;
  const studentByName = useMemo(
    () => new Map(STUDENTS.map((student) => [student.name, student])),
    [STUDENTS],
  );
  const confirmedCount = confirmedSummary?.count ?? confirmedStudentNames.size;
  const savedMinutes = confirmedCount * 15;
  const assignmentRate =
    respondedCount > 0 ? Math.round((AI_RESULT_INIT.length / respondedCount) * 100) : 0;

  const activitySlice = ACTIVITY_LOG.slice(actPage * ACT_PAGE, actPage * ACT_PAGE + ACT_PAGE);
  const accountName =
    pickDisplayName(
      (user?.user_metadata as { name?: string; full_name?: string } | undefined)?.name,
      (user?.user_metadata as { full_name?: string } | undefined)?.full_name,
      user?.email?.split("@")[0],
    ) ?? "담당";
  const displayTrainerName = trainerName || accountName;

  if (authLoading || accessState === "checking") {
    return (
      <AppShell>
        <div className="grid min-h-[70vh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (accessState !== "allowed") {
    const isStudent = accessState === "student";
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 text-center">
          <img
            src="/schedule-access-error.png"
            alt="요청한 페이지를 찾지 못해 난감해하는 픽짐피티 캐릭터"
            className="h-auto w-full max-w-[320px] object-contain"
          />
          <h1 className="mt-2 text-[22px] font-black leading-tight text-ink sm:text-[26px]">
            {isStudent ? "학생은 별도의 예약 페이지가 없습니다!" : accessState === "signed-out" ? "로그인이 필요한 페이지입니다!" : "페이지를 불러오지 못했습니다!"}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            {isStudent ? "담당 트레이너의 예약 화면에서 가능한 시간을 선택해주세요." : "이전 화면으로 돌아가 다시 시도해주세요."}
          </p>
          <button
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else window.location.href = "/profile";
            }}
            className="mt-6 inline-flex h-12 min-w-36 items-center justify-center rounded-full bg-primary px-6 text-[13px] font-extrabold text-white shadow-pop hover:brightness-105"
          >
            돌아가기
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            트레이너 일정 조율
          </p>
          <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-[1.15] tracking-tight">
            {displayTrainerName} 트레이너님!
            <br />
            저희가 시간을 조율해드릴게요
          </h1>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="mt-6 grid grid-cols-3 gap-1.5 sm:gap-3">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="관리 회원"
          value={stats.total}
          suffix="명"
        />
        <KpiCard
          icon={<MailCheck className="h-4 w-4" />}
          label="응답 완료"
          value={stats.responded}
          suffix={`/${stats.total}명`}
          detail={`이번 주 불가 ${stats.unavailable}명`}
          accent
        />
        <KpiCard
          icon={<CalendarCheck className="h-4 w-4" />}
          label="배정 가능"
          value={stats.assignable}
          suffix="명 (겹침 없음)"
        />
      </div>

      {/* Week selector */}
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-surface-muted border border-border px-3 py-2">
        <button
          onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
          disabled={weekOffset <= 0}
          className="h-9 w-9 rounded-xl grid place-items-center text-ink-soft hover:bg-white disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5 overflow-x-auto">
          {[0, 1, 2, 3, 4].map((o) => {
            const active = weekOffset === o;
            return (
              <button
                key={o}
                onClick={() => setWeekOffset(o)}
                className={`shrink-0 h-9 px-3.5 rounded-xl text-[12px] font-bold transition ${
                  active ? "bg-ink text-white" : "text-ink-soft hover:bg-white"
                }`}
              >
                {WEEK_LABELS[o]}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setWeekOffset((o) => Math.min(4, o + 1))}
          disabled={weekOffset >= 4}
          className="h-9 w-9 rounded-xl grid place-items-center text-ink-soft hover:bg-white disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-[12px] font-bold text-ink tabular-nums">
        {getWeekLabel(weekOffset)}
      </p>

      {/* Pending responses (left half) + Activity feed (right half) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-white overflow-hidden">
          {requestSentAt == null ? (
            <>
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-surface-muted">
                <UserRoundSearch className="h-4 w-4 shrink-0 text-ink" />
                <span className="text-[13px] font-black text-ink">아직 응답하지 않은 회원</span>
              </div>
              <div className="px-5 py-8 flex flex-col items-center justify-center gap-1.5 text-center">
                <p className="text-[12px] text-muted-foreground leading-relaxed inline-flex items-start gap-1.5 justify-center">
                  <OctagonAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <span>
                    아직 요청을 보내지 않았어요.
                    <br />먼저 요청을 보내야 학생들의 응답 현황을 볼 수 있어요.
                  </span>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-surface-muted">
                <div className="flex items-center gap-2">
                  <UserRoundSearch className="h-4 w-4 shrink-0 text-ink" />
                  <span className="text-[13px] font-black text-ink">아직 응답하지 않은 회원</span>
                  <span className="text-[12px] font-bold text-destructive tabular-nums">
                    {halfPending.length}명
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPanel("invite");
                    setPanelWeek(weekOffset);
                    setPanelSelected(new Set(halfPending.map((s) => s.name)));
                  }}
                  className="h-9 px-3.5 rounded-full bg-[#FEE500] text-[#191600] text-[12px] font-extrabold inline-flex items-center gap-1.5 hover:brightness-95"
                >
                  <MessageCircle className="h-3.5 w-3.5 fill-[#191600]" /> 전체 카톡 재알림
                </button>
              </div>
              <ul className="divide-y divide-border">
                {halfPending.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-surface-muted grid place-items-center font-black text-[12px] text-ink shrink-0">
                        {s.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-ink">{s.name}</p>
                        <p className="text-[11px] text-ink-soft">
                          최근 PT {s.lastPT} · 잔여{" "}
                          <span className={s.remaining <= 5 ? "text-destructive font-bold" : ""}>
                            {s.remaining}회
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifyConfirm({ name: s.name, scope: "remind" })}
                      className="h-8 px-3 rounded-full bg-[#FEE500] text-[#191600] text-[11px] font-extrabold inline-flex items-center gap-1 hover:brightness-95 shrink-0"
                    >
                      <MessageCircle className="h-3 w-3 fill-[#191600]" /> 재알림
                    </button>
                  </li>
                ))}
                {halfPending.length === 0 && (
                  <li className="px-5 py-7 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                    <UserRoundSearch className="h-4 w-4 text-muted-foreground" /> 응답 대기 중인
                    회원이 없습니다.
                  </li>
                )}
              </ul>
            </>
          )}
        </div>

        {/* Activity feed (paginated) */}
        <div className="rounded-2xl border border-border bg-white overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-surface-muted">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-ink" />
              <span className="text-[13px] font-black text-ink">최근 활동</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-ink-soft tabular-nums">
                {actPage + 1}/{actMaxPage + 1}
              </span>
              <button
                onClick={() => setActPage((p) => Math.max(0, p - 1))}
                disabled={actPage <= 0}
                className="h-7 w-7 rounded-lg grid place-items-center bg-white border border-border text-ink-soft hover:bg-muted disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setActPage((p) => Math.min(actMaxPage, p + 1))}
                disabled={actPage >= actMaxPage}
                className="h-7 w-7 rounded-lg grid place-items-center bg-white border border-border text-ink-soft hover:bg-muted disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <ul className="divide-y divide-border flex-1">
            {activitySlice.map((a, i) => (
              <li
                key={`${actPage}-${i}`}
                className="px-5 py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  {a.kind === "pick" && (
                    <p className="text-[12.5px] text-ink leading-snug">
                      <b className="font-extrabold">{a.who}</b>님이{" "}
                      <b className="text-blue-600">가능 시간 {a.count}개를 선택</b>했습니다
                      {a.isEdit && <span className="text-ink-soft"> (수정 제출)</span>}
                    </p>
                  )}
                  {a.kind === "unavailable" && (
                    <p className="text-[12.5px] text-ink leading-snug">
                      <b className="font-extrabold">{a.who}</b>님이{" "}
                      <b className="text-destructive">이번 주 PT 불가</b>로 응답했습니다
                      {a.isEdit && <span className="text-ink-soft"> (수정 제출)</span>}
                    </p>
                  )}
                  {a.kind === "confirm" && (
                    <p className="text-[12.5px] text-ink leading-snug">
                      학생 {a.count}명에게{" "}
                      <b className="text-emerald-600 font-extrabold">확정 알림</b>을 보냈습니다
                    </p>
                  )}
                  {a.kind === "request" && (
                    <p className="text-[12.5px] text-ink leading-snug">
                      학생 {a.count}명에게{" "}
                      <b className="text-violet-600 font-extrabold">이번 주 가능 시간 요청</b>을
                      보냈습니다
                    </p>
                  )}
                  {a.kind === "manual" && (
                    <p className="text-[12.5px] text-ink leading-snug">
                      <b className="font-extrabold">{a.who}</b>님의 일정을{" "}
                      <b className="text-orange-600 font-extrabold">수동 조정 및 확정</b>
                      <span className="text-ink-soft">
                        {" "}
                        ({a.day} {String(a.hour).padStart(2, "0")}:00)
                      </span>
                    </p>
                  )}
                  {a.kind === "reschedule" && (
                    <p className="text-[12.5px] text-ink leading-snug">
                      <b className="font-extrabold">{a.who}</b>님의{" "}
                      <b className="text-orange-600 font-extrabold">확정된 일정을 변경</b>
                      <span className="text-ink-soft">
                        {" "}
                        ({a.fromDay} {String(a.fromHour).padStart(2, "0")}:00 → {a.toDay}{" "}
                        {String(a.toHour).padStart(2, "0")}:00)
                      </span>
                    </p>
                  )}
                  {a.kind === "cancel_confirmed" && (
                    <p className="text-[12.5px] text-ink leading-snug">
                      <b className="font-extrabold">{a.who}</b>님의{" "}
                      <b className="text-destructive">확정된 일정을 취소</b>했습니다
                      <span className="text-ink-soft">
                        {" "}
                        ({a.day} {String(a.hour).padStart(2, "0")}:00)
                      </span>
                    </p>
                  )}
                  {a.kind === "completed" && (
                    <p className="text-[12.5px] text-ink leading-snug">
                      <b className="font-extrabold">{a.who}</b>님의{" "}
                      <b className="text-primary">{a.sessionNo}번째</b> PT 수업이 종료되었습니다{" "}
                      <span className="text-ink-soft">(남은 횟수: {a.remaining}회)</span>
                    </p>
                  )}
                  {a.kind === "cancelled" && (
                    <p className="text-[12.5px] text-ink leading-snug">
                      <b className="font-extrabold">{a.who}</b>님이{" "}
                      <b className="text-destructive">{a.sessionNo}회차 PT를 당일 취소</b>했습니다
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-ink-soft">{a.when}</p>
                </div>
                {a.kind === "completed" && (
                  <button
                    onClick={() =>
                      setMemoFor({ name: a.who, sessionNo: a.sessionNo, sessionId: a.sessionId })
                    }
                    className="shrink-0 h-8 px-3 rounded-full bg-ink text-white text-[11px] font-extrabold hover:brightness-110"
                  >
                    메모 남기기
                  </button>
                )}
              </li>
            ))}
            {activitySlice.length === 0 && (
              <li className="px-5 py-7 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                <Inbox className="h-4 w-4 text-muted-foreground" /> 아직 표시할 최근 활동이
                없습니다.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* PickGymPT recommended schedule */}
      <div className="mt-4 rounded-2xl bg-ink text-white p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="chip bg-white/10 text-white">
              <Sparkles className="h-3 w-3" /> 픽짐피티 추천 최적 시간표
            </span>
            <h3 className="mt-2 text-[20px] sm:text-[22px] font-black leading-tight">
              학생 {respondedCount}명 중{" "}
              <span className="text-primary">{AI_RESULT_INIT.length}명 자동 배정</span>
              <span className="text-white/60 font-bold text-[14px]">
                {" "}
                · 배정률 {assignmentRate}%
              </span>
            </h3>
          </div>
        </div>

        {AI_UNASSIGNED.length > 0 && (
          <div className="relative mt-4 rounded-xl bg-destructive/15 border border-destructive/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Ban className="h-3.5 w-3.5 text-[#FF8A8A]" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#FFB4B4]">
                조율 불가 · {AI_UNASSIGNED.length}명
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AI_UNASSIGNED.map((u) => (
                <span
                  key={u.name}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2.5 h-7 rounded-full bg-white/10 text-white text-[11px] font-bold"
                >
                  <span className="h-5 w-5 rounded-full bg-white/20 grid place-items-center text-[10px]">
                    {u.name[0]}
                  </span>
                  {u.name}
                  <span className="text-white/50 font-medium">· {u.reason}</span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/60">
              아래 ‘학생 응답’에서 일정 조정으로 직접 배정해 주세요.
            </p>
          </div>
        )}

        <div className="relative mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {assignments.map((a, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/5 border border-white/10 px-2 py-2.5 sm:px-3 flex items-center justify-between gap-1.5 min-w-0"
            >
              <div className="min-w-0">
                <p
                  className="font-bold uppercase tracking-wider text-white/50 whitespace-nowrap"
                  style={{ fontSize: "clamp(8px, 2vw, 10px)" }}
                >
                  {a.day}요일
                  {a.method === "manual" && (
                    <span className="ml-1 text-red-400 font-extrabold">· 수동</span>
                  )}
                </p>
                <p className="text-[15px] font-black tabular-nums whitespace-nowrap">
                  {String(a.hour).padStart(2, "0")}:00
                </p>
              </div>
              <StudentNameBadge
                name={a.name}
                avatarUrl={studentByName.get(a.name)?.avatarUrl}
              />
            </div>
          ))}
        </div>

        <div className="relative -mx-5 mt-3 overflow-hidden border-y border-white/10 bg-white/[0.03] sm:mx-0 sm:rounded-xl sm:border-x">
          <div className="grid grid-cols-[30px_repeat(7,minmax(0,1fr))] bg-white/5 border-b border-white/10 sm:grid-cols-[36px_repeat(7,minmax(0,1fr))]">
            <div className="p-1.5 text-[12px] text-white/50 font-bold text-center">시간</div>
            {DAYS.map((d, i) => (
              <div key={d} className="p-1.5 text-[13px] text-white/90">
                <DayHeaderLabel day={d} date={weekDates[i]} i={i} dark />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[30px_repeat(7,minmax(0,1fr))] sm:grid-cols-[36px_repeat(7,minmax(0,1fr))]">
            {HOURS.map((h) => {
              const hasAny = DAYS.some((d) => assignments.some((a) => a.day === d && a.hour === h));
              if (!hasAny) return null;
              return (
                <React.Fragment key={h}>
                  <div className="border-b border-white/10 bg-white/5 grid place-items-center text-[12px] font-bold text-white/50 tabular-nums">
                    {String(h).padStart(2, "0")}
                  </div>
                  {DAYS.map((d) => {
                    const a = assignments.find((x) => x.day === d && x.hour === h);
                    return (
                      <div
                        key={`${d}-${h}`}
                        className="grid min-h-9 min-w-0 place-items-center border-b border-l border-white/10 px-0.5 py-1 text-[10px] font-extrabold"
                      >
                        {a ? (
                          <StudentNameBadge
                            name={a.name}
                            avatarUrl={studentByName.get(a.name)?.avatarUrl}
                            compact
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {stats.unavailable > 0 && (
          <div className="relative mt-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Ban className="h-3.5 w-3.5 text-[#FFB4B4] shrink-0" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#FFB4B4]">
                이번 주 불가 · {stats.unavailable}명
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STUDENTS.filter((student) => student.status === "불가").map((student) => (
                <span
                  key={student.name}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2.5 h-7 rounded-full bg-white/10 text-white text-[11px] font-bold"
                >
                  <span className="h-5 w-5 rounded-full bg-white/20 grid place-items-center text-[10px]">
                    {student.name[0]}
                  </span>
                  {student.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1 — Calendar */}
      <section id="schedule-demand-grid" className="mt-8">
        <SectionHeader
          index="01"
          title="학생 선택 현황 + 안되는 시간 닫기"
          subtitle={
            requestSentAt == null
              ? "요청 전에는 셀을 눌러 안되는 시간을 자유롭게 닫을 수 있어요."
              : closeEditMode
                ? "시간 막기 모드입니다. 변경할 셀을 고른 뒤 하단에서 저장하세요."
                : "학생 이름이 모인 셀을 누르면 선택한 회원 전체를 확인할 수 있어요."
          }
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-soft">
          <div className="flex items-center gap-2">
            <span>0명</span>
            <span className="h-3 w-5 rounded-sm border border-border heat-0" />
            <span className="h-3 w-5 rounded-sm heat-1" />
            <span className="h-3 w-5 rounded-sm heat-2" />
            <span className="h-3 w-5 rounded-sm heat-3" />
            <span className="h-3 w-5 rounded-sm heat-4" />
            <span>4+ 명</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> 닫힌 시간
            </span>
          </div>
        </div>

        <div
          className={`-mx-5 mt-3 overflow-hidden rounded-none border-x-0 border-border sm:mx-0 sm:rounded-2xl sm:border-x ${pendingClose.size > 0 ? "pb-28" : ""}`}
        >
          <div className="grid grid-cols-[26px_repeat(7,minmax(0,1fr))] bg-surface-muted border-b border-border sm:grid-cols-[44px_repeat(7,minmax(0,1fr))]">
            <div className="p-1 text-[12px] text-muted-foreground font-bold text-center sm:p-2">
              시간
            </div>
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => closeDay(d)}
                disabled={requestSentAt != null && !closeEditMode}
                className="p-1 text-[15px] transition enabled:hover:bg-white disabled:cursor-default sm:p-2"
                title="이 요일 전체 닫기/열기 토글"
              >
                <DayHeaderLabel day={d} date={weekDates[i]} i={i} />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[26px_repeat(7,minmax(0,1fr))] sm:grid-cols-[44px_repeat(7,minmax(0,1fr))]">
            {HOURS.map((h) => (
              <React.Fragment key={h}>
                <button
                  onClick={() => closeHour(h)}
                  disabled={requestSentAt != null && !closeEditMode}
                  className="border-b border-border bg-surface-muted/60 grid place-items-center text-[12px] font-bold text-muted-foreground tabular-nums transition enabled:hover:bg-white disabled:cursor-default"
                  title="이 시간 전체 닫기/열기 토글"
                >
                  {String(h).padStart(2, "0")}
                </button>
                {DAYS.map((d) => {
                  const key = `${d}-${h}`;
                  const picks = PICKS[key] ?? [];
                  const isClosed = closed.has(key);
                  const isPending = pendingClose.has(key);
                  const lvl = heatLevel(picks.length);
                  const willBeClosed = isClosed !== isPending; // XOR
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (requestSentAt != null && !closeEditMode) {
                          if (picks.length > 0) setSlotDetail({ label: `${d}요일 ${String(h).padStart(2, "0")}시`, names: picks });
                          return;
                        }
                        toggleCellPending(key);
                      }}
                      title={picks.length ? picks.join(", ") : "선택한 학생 없음"}
                      className={`relative min-h-[56px] border-b border-l border-border transition group
                        ${willBeClosed && !isPending ? "bg-muted text-muted-foreground/50" : ""}
                        ${!willBeClosed ? `heat-${lvl}` : ""}
                        ${isPending ? "ring-2 ring-ink-soft/60 ring-inset bg-ink-soft/10" : ""}
                        ${(requestSentAt == null || closeEditMode) ? "hover:ring-2 hover:ring-ink/40 hover:ring-inset" : picks.length > 0 ? "cursor-pointer hover:brightness-[0.98]" : "cursor-default"}
                      `}
                    >
                      {willBeClosed && !isPending ? (
                        <Lock className="absolute inset-0 m-auto h-3.5 w-3.5" />
                      ) : picks.length > 0 ? (
                        <span className="flex min-h-[56px] flex-wrap content-center items-center justify-center gap-0.5 p-0.5 sm:gap-1 sm:p-1">
                          {picks.slice(0, 2).map((name, index) => (
                            <span key={name} className={index === 1 ? "hidden min-w-0 max-w-full sm:block" : "min-w-0 max-w-full"}>
                              <StudentNameBadge
                                name={name}
                                avatarUrl={studentByName.get(name)?.avatarUrl}
                                compact
                                tone={lvl >= 4 ? "heat" : "light"}
                              />
                            </span>
                          ))}
                          {picks.length > 1 && (
                            <span
                              className={`text-[9px] font-extrabold leading-tight sm:hidden ${lvl >= 4 ? "text-white" : "text-ink"}`}
                            >
                              +{picks.length - 1}명
                            </span>
                          )}
                          {picks.length > 2 && (
                            <span
                              className={`hidden text-[11px] font-extrabold leading-tight sm:inline ${lvl >= 4 ? "text-white" : "text-ink"}`}
                            >
                              +{picks.length - 2}명
                            </span>
                          )}
                        </span>
                      ) : null}
                      {isPending && (
                        <span className="absolute top-1 right-1 h-4 px-1 rounded bg-ink-soft text-white text-[8px] font-extrabold grid place-items-center">
                          {isClosed ? "열기" : "닫기"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — Student responses */}
      <section className="mt-10">
        <SectionHeader
          index="02"
          title="학생 응답"
          subtitle={`${stats.responded} / ${stats.total}명 응답 완료`}
        />

        {/* Desktop table */}
        <div className="mt-4 rounded-2xl border border-border overflow-x-auto hidden md:block">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="bg-surface-muted">
              <tr className="text-[11px] font-bold uppercase text-ink-soft">
                <th className="px-4 py-3 text-left">
                  학생{" "}
                  <span className="text-muted-foreground/70 normal-case font-bold">(등록일)</span>
                </th>
                <th className="px-2 py-3 text-center">최근 PT</th>
                <th className="px-2 py-3 text-center">남은 횟수</th>
                <th className="px-2 py-3 text-center">상태</th>
                <th className="px-2 py-3 text-center">선택한 시간</th>
                <th className="px-2 py-3 text-center whitespace-nowrap">
                  최종 확정 시간 / 확정 방식
                </th>
                <th className="px-2 py-3 text-center whitespace-nowrap">확정 메시지 발송 시간</th>
                <th className="px-2 py-3 text-center whitespace-nowrap">수동 일정 조정</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s) => (
                <tr
                  key={s.name}
                  className={`border-t border-border align-middle ${
                    s.status === "미가입" ? "bg-surface-muted/60 text-muted-foreground" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-surface-muted grid place-items-center font-black text-[12px] text-ink shrink-0">
                        {s.name[0]}
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="font-bold text-ink text-[13px]">{s.name}</p>
                        <p className="text-[10.5px] text-muted-foreground/70 font-bold mt-0.5 tabular-nums">
                          {s.joinedAt}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center text-ink-soft tabular-nums whitespace-nowrap">
                    {s.lastPT}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums whitespace-nowrap">
                    <span
                      className={`font-extrabold ${s.remaining <= 5 ? "text-destructive" : "text-ink"}`}
                    >
                      {s.remaining}
                    </span>
                    <span className="text-muted-foreground"> / {s.total}회</span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <StatusBadge s={s.status} />
                  </td>
                  <td className="px-2 py-3 text-ink-soft">
                    {s.picks.length === 0 ? (
                      <div className="text-center text-muted-foreground">—</div>
                    ) : (
                      <div className="grid grid-cols-5 gap-1 justify-center">
                        {s.picks.map((p) => (
                          <span
                            key={p}
                            style={{ backgroundColor: "#F1F1F4", color: "#171A1F" }}
                            className="inline-flex items-center justify-center px-1.5 h-6 rounded-full text-[11px] font-bold whitespace-nowrap truncate"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center whitespace-nowrap">
                    {(() => {
                      const a = assignments.find((x) => x.name === s.name);
                      if (!a) return <span className="text-muted-foreground">—</span>;
                      const method =
                        a.method === "manual"
                          ? { bg: "#FFF3E0", fg: "#F57C00", label: "수동" }
                          : { bg: "#EEF2FF", fg: "#4F46E5", label: "자동" };
                      return (
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            style={{ color: "#111827" }}
                            className="font-extrabold text-[12px] tabular-nums"
                          >
                            {a.day} {String(a.hour).padStart(2, "0")}:00
                          </span>
                          <span
                            style={{ backgroundColor: method.bg, color: method.fg }}
                            className="chip text-[10px] font-extrabold"
                          >
                            {method.label}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-3 text-center text-ink-soft tabular-nums whitespace-nowrap">
                    {(() => {
                      const sentAt = formatMessageSentAt(confirmedMessageAtByName[s.name]);
                      if (!sentAt || !confirmedStudentNames.has(s.name)) {
                        return <span className="text-muted-foreground">—</span>;
                      }
                      return sentAt;
                    })()}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button
                      onClick={() => openEdit(s)}
                      className="h-8 w-8 rounded-full bg-ink text-white inline-flex items-center justify-center hover:brightness-110"
                      title="수동 일정 조정"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="mt-4 grid gap-2 md:hidden">
          {STUDENTS.map((s) => (
            <div
              key={s.name}
              className={`rounded-xl border border-border p-3 ${
                s.status === "미가입" ? "bg-surface-muted/60 text-muted-foreground" : "bg-white"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {s.avatarUrl ? (
                  <img
                    src={s.avatarUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-surface-muted grid place-items-center font-black text-[12px] text-ink shrink-0">
                    {s.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-ink text-[13.5px] truncate">{s.name}</p>
                    <StatusBadge s={s.status} />
                  </div>
                  <p className="text-[10.5px] text-muted-foreground/80 tabular-nums mt-0.5">
                    등록 {s.joinedAt} · 최근 PT {s.lastPT}
                  </p>
                  <p className="text-[12px] tabular-nums mt-1">
                    <span
                      className={`font-extrabold ${s.remaining <= 5 ? "text-destructive" : "text-ink"}`}
                    >
                      {s.remaining}
                    </span>
                    <span className="text-muted-foreground"> / {s.total}회</span>
                  </p>
                  {s.picks.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.picks.map((p) => (
                        <span
                          key={p}
                          style={{ backgroundColor: "#F1F1F4", color: "#171A1F" }}
                          className="inline-flex items-center px-1.5 h-5 rounded-full text-[10.5px] font-bold whitespace-nowrap"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const a = assignments.find((x) => x.name === s.name);
                    if (!a) return null;
                    const method =
                      a.method === "manual"
                        ? { bg: "#FFF3E0", fg: "#F57C00", label: "수동" }
                        : { bg: "#EEF2FF", fg: "#4F46E5", label: "자동" };
                    return (
                      <p className="mt-1.5 text-[11px] font-bold" style={{ color: "#111827" }}>
                        최종 확정 {a.day} {String(a.hour).padStart(2, "0")}:00{" "}
                        <span
                          style={{ backgroundColor: method.bg, color: method.fg }}
                          className="chip text-[10px] ml-1 font-extrabold"
                        >
                          {method.label}
                        </span>
                      </p>
                    );
                  })()}
                  {confirmedStudentNames.has(s.name) &&
                    confirmedMessageAtByName[s.name] && (
                      <p className="mt-1 text-[10.5px] font-bold text-emerald-700 tabular-nums">
                        확정 메시지 {formatMessageSentAt(confirmedMessageAtByName[s.name])}
                      </p>
                    )}
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(s)}
                      className="flex-1 h-8 rounded-full bg-ink text-white text-[11px] font-extrabold inline-flex items-center justify-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> 일정 조정
                    </button>
                    <button
                      onClick={() => setNotifyConfirm({ name: s.name, scope: "individual" })}
                      className="h-8 px-3 rounded-full bg-[#FEE500] text-[#191600] text-[11px] font-extrabold inline-flex items-center gap-1"
                    >
                      <MessageCircle className="h-3 w-3 fill-[#191600]" /> 카톡
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Edit panel — right-side Sheet (notion-like) */}
      <Sheet
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) {
            setEditing(null);
            setActiveName(null);
            setPendingMove(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:!max-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <span className="inline-flex w-fit chip bg-primary/10 text-primary">
              <Pencil className="h-3 w-3" /> 일정 조정
            </span>
            <SheetTitle className="text-[20px] font-black leading-tight">
              픽짐피티 추천 최적 시간표 · 수동 조정
            </SheetTitle>
            <SheetDescription>
              배정된 회원을 클릭한 뒤, 옮기고 싶은 칸을 누르세요.{" "}
              <b className="text-primary">파란색</b>은 선택된 회원이 희망한 시간이에요.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            {(() => {
              const active = STUDENTS.find((s) => s.name === activeName);
              const wishSet = new Set(
                (active?.picks ?? [])
                  .map(parsePick)
                  .filter(Boolean)
                  .map((p) => `${p!.day}-${p!.hour}`),
              );
              const cellByKey = new Map(assignments.map((a) => [`${a.day}-${a.hour}`, a]));
              return (
                <>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="grid grid-cols-[40px_repeat(7,1fr)] bg-surface-muted border-b border-border">
                      <div className="p-1.5 text-[10px] text-muted-foreground font-bold text-center">
                        시간
                      </div>
                      {DAYS.map((d, i) => (
                        <div key={d} className="p-1.5 text-[12px] text-ink">
                          <DayHeaderLabel day={d} date={weekDates[i]} i={i} />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-[40px_repeat(7,1fr)] max-h-[420px] overflow-y-auto">
                      {HOURS.map((h) => (
                        <React.Fragment key={h}>
                          <div className="border-b border-border bg-surface-muted/60 grid place-items-center text-[10px] font-bold text-muted-foreground tabular-nums">
                            {String(h).padStart(2, "0")}
                          </div>
                          {DAYS.map((d) => {
                            const key = `${d}-${h}`;
                            const isClosed = closed.has(key);
                            const cell = cellByKey.get(key);
                            const isWish = wishSet.has(key);
                            const isMine = cell?.name === activeName;
                            return (
                              <button
                                key={key}
                                disabled={isClosed}
                                onClick={() => {
                                  if (!activeName) return;
                                  if (cell && cell.name === activeName) return;
                                  setPendingMove({ day: d, hour: h });
                                }}
                                className={`relative h-10 border-b border-l border-border text-[10px] font-bold transition
                                  ${isClosed ? "bg-muted text-muted-foreground/50 cursor-not-allowed" : ""}
                                  ${!isClosed && isWish ? "bg-[oklch(0.93_0.08_240)] text-[oklch(0.30_0.16_245)]" : ""}
                                  ${!isClosed && isMine ? "bg-primary text-white" : ""}
                                  ${!isClosed && !isMine ? "hover:ring-2 hover:ring-ink/30 hover:ring-inset" : ""}
                                `}
                              >
                                {isClosed ? (
                                  <Lock className="absolute inset-0 m-auto h-3 w-3" />
                                ) : cell ? (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveName(cell.name);
                                    }}
                                    className="absolute inset-0 grid place-items-center px-1 truncate cursor-pointer"
                                  >
                                    {cell.name}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-ink-soft">조정 대상:</span>
                    {assignments.map((a) => (
                      <span
                        key={a.name}
                        className={`inline-flex items-center rounded-full text-[11px] font-extrabold transition ${
                          activeName === a.name
                            ? "bg-primary text-white"
                            : "bg-muted text-ink hover:bg-ink/10"
                        }`}
                      >
                        <button
                          onClick={() => setActiveName(a.name)}
                          className="px-2.5 h-7 inline-flex items-center"
                        >
                          {a.name}
                        </button>
                        {confirmedStudentNames.has(a.name) && (
                          <button
                            onClick={() => setPendingCancel(a.name)}
                            title="확정된 일정 취소"
                            className={`h-7 w-7 -ml-1 rounded-full inline-flex items-center justify-center ${
                              activeName === a.name ? "hover:bg-white/20" : "hover:bg-ink/10"
                            }`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {activeName && (
                    <div className="rounded-xl bg-ink text-white px-4 py-3 flex items-center justify-between gap-3">
                      <div className="text-[13px] font-bold">
                        <b className="text-primary">{activeName}</b>님을 어디로 옮길까요?
                      </div>
                      <span className="text-[11px] text-white/60">옮길 칸을 클릭</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm move */}
      <Dialog open={!!pendingMove} onOpenChange={(v) => !v && setPendingMove(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {activeName}님을 {pendingMove?.day}요일{" "}
              {String(pendingMove?.hour ?? 0).padStart(2, "0")}:00로 옮길까요?
            </DialogTitle>
            <DialogDescription>
              해당 시간에 다른 회원이 배정되어 있다면 자동으로 비웁니다. 확정하면 즉시 학생에게
              카카오톡 알림이 발송돼요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setPendingMove(null)}
              className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold"
            >
              취소
            </button>
            <button
              onClick={async () => {
                if (!activeName || !pendingMove || !scheduleId) return;
                const movedName = activeName;
                const movedDay = pendingMove.day;
                const movedHour = pendingMove.hour;
                // A student who already received a confirmation message is being
                // re-pointed at a new time ("확정된 일정 변경"), not assigned for
                // the first time ("수동 조정 및 확정") — log these as distinct
                // activity kinds so the feed reads correctly.
                const wasAlreadyConfirmed = confirmedStudentNames.has(movedName);
                const previousAssignment = assignments.find((a) => a.name === movedName);
                const slotId = slotIds[`${movedDay}-${movedHour}`];
                const movedStudent = STUDENTS.find((s) => s.name === movedName);
                const studentUserId = movedStudent?.studentUserId;
                const rosterId = movedStudent?.rosterId;
                if (!slotId || (!studentUserId && !rosterId)) {
                  setPendingMove(null);
                  fireToast("이 학생의 시간은 아직 저장할 수 없어요.");
                  return;
                }

                if (studentUserId) {
                  const { error } = await supabase.rpc("confirm_weekly_schedule", {
                    p_schedule_id: scheduleId,
                    p_assignments: [
                      {
                        slot_id: slotId,
                        student_user_id: studentUserId,
                        student_name: movedName,
                        method: "manual",
                      },
                    ],
                    p_mark_week_confirmed: false,
                  });
                  if (error) {
                    console.error("manual move confirm failed", error);
                    setPendingMove(null);
                    fireToast("저장에 실패했어요. 다시 시도해주세요.");
                    return;
                  }
                } else if (rosterId && trainerId) {
                  // No linked auth account yet — confirm_weekly_schedule (and
                  // student_selections) require student_user_id. This RPC
                  // mirrors it for unregistered rosters: it evicts whoever
                  // else holds the destination slot and clears this roster's
                  // own previous slot by looking at pt_sessions directly
                  // (not client state), so it can't drift the way the old
                  // client-side delete+upsert did.
                  const { error } = await supabase.rpc("assign_unregistered_roster", {
                    p_schedule_id: scheduleId,
                    p_roster_id: rosterId,
                    p_slot_id: slotId,
                  });
                  if (error) {
                    console.error("manual move (unregistered student) failed", error);
                    setPendingMove(null);
                    fireToast("저장에 실패했어요. 다시 시도해주세요.");
                    return;
                  }
                } else {
                  setPendingMove(null);
                  fireToast("이 학생의 시간은 아직 저장할 수 없어요.");
                  return;
                }

                setAssignments((prev) => {
                  const filtered = prev.filter(
                    (a) => a.name !== movedName && !(a.day === movedDay && a.hour === movedHour),
                  );
                  return [
                    ...filtered,
                    { name: movedName, day: movedDay, hour: movedHour, method: "manual" as const },
                  ];
                });
                const isReschedule = wasAlreadyConfirmed && !!previousAssignment;
                if (trainerId) {
                  const { data: manualLog, error: logError } = await supabase
                    .from("schedule_activity_log")
                    .insert(
                      isReschedule
                        ? {
                            schedule_id: scheduleId,
                            trainer_id: trainerId,
                            kind: "reschedule",
                            who: movedName,
                            day: movedDay,
                            hour: movedHour,
                            from_day: previousAssignment!.day,
                            from_hour: previousAssignment!.hour,
                          }
                        : {
                            schedule_id: scheduleId,
                            trainer_id: trainerId,
                            kind: "manual",
                            who: movedName,
                            day: movedDay,
                            hour: movedHour,
                          },
                    )
                    .select("created_at")
                    .maybeSingle();
                  if (logError) console.error("schedule_activity_log insert (manual move) failed", logError);
                  setConfirmedMessageAtByName((previous) => ({
                    ...previous,
                    [movedName]: manualLog?.created_at ?? new Date().toISOString(),
                  }));
                  setConfirmedStudentNames((previous) => new Set(previous).add(movedName));
                }
                setDbActivity((prev) => [
                  isReschedule
                    ? {
                        kind: "reschedule",
                        who: movedName,
                        fromDay: previousAssignment!.day,
                        fromHour: previousAssignment!.hour,
                        toDay: movedDay,
                        toHour: movedHour,
                        when: "방금",
                      }
                    : { kind: "manual", who: movedName, day: movedDay, hour: movedHour, when: "방금" },
                  ...prev,
                ]);
                setPendingMove(null);
                setEditing(null);
                setActiveName(null);
                fireToast(
                  `${movedName}님께 ${movedDay}요일 ${movedHour}시 PT 확정 알림을 보냈습니다`,
                );
              }}
              className="h-10 px-4 rounded-full bg-primary text-white text-[12px] font-bold inline-flex items-center gap-1.5"
            >
              시간 확정 및{" "}
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#FEE500]">
                <MessageCircle className="h-3 w-3 fill-[#191600] text-[#191600]" />
              </span>{" "}
              알림 보내기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm cancel of an already-confirmed assignment */}
      <Dialog open={!!pendingCancel} onOpenChange={(v) => !v && setPendingCancel(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{pendingCancel}님의 확정된 일정을 취소할까요?</DialogTitle>
            <DialogDescription>
              취소하면 이 학생은 이번 주 미배정 상태로 돌아가요. 기존에 선택했던 가능 시간은
              그대로 남아있어 다시 배정할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setPendingCancel(null)}
              className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold"
            >
              닫기
            </button>
            <button
              onClick={async () => {
                const name = pendingCancel;
                if (!name || !scheduleId) return;
                const cancelled = assignments.find((a) => a.name === name);
                const cancelledStudent = STUDENTS.find((s) => s.name === name);
                const studentUserId = cancelledStudent?.studentUserId;
                const rosterId = cancelledStudent?.rosterId;
                if (!cancelled || (!studentUserId && !rosterId)) {
                  setPendingCancel(null);
                  return;
                }
                if (studentUserId) {
                  const { error } = await supabase.rpc("cancel_confirmed_assignment", {
                    p_schedule_id: scheduleId,
                    p_student_user_id: studentUserId,
                  });
                  if (error) {
                    console.error("cancel_confirmed_assignment failed", error);
                    setPendingCancel(null);
                    fireToast("취소에 실패했어요. 다시 시도해주세요.");
                    return;
                  }
                } else if (rosterId) {
                  // Unregistered student — no student_selections row exists for
                  // them in the first place, so just clear their pt_sessions
                  // row(s) for this week directly.
                  const { error } = await supabase.rpc("cancel_unregistered_roster_assignment", {
                    p_schedule_id: scheduleId,
                    p_roster_id: rosterId,
                  });
                  if (error) {
                    console.error("cancel unregistered assignment failed", error);
                    setPendingCancel(null);
                    fireToast("취소에 실패했어요. 다시 시도해주세요.");
                    return;
                  }
                }
                setAssignments((prev) => prev.filter((a) => a.name !== name));
                setConfirmedStudentNames((previous) => {
                  const next = new Set(previous);
                  next.delete(name);
                  return next;
                });
                if (trainerId) {
                  await supabase.from("schedule_activity_log").insert({
                    schedule_id: scheduleId,
                    trainer_id: trainerId,
                    kind: "cancel_confirmed",
                    who: name,
                    day: cancelled.day,
                    hour: cancelled.hour,
                  });
                }
                setDbActivity((prev) => [
                  { kind: "cancel_confirmed", who: name, day: cancelled.day, hour: cancelled.hour, when: "방금" },
                  ...prev,
                ]);
                if (activeName === name) setActiveName(null);
                setPendingCancel(null);
                fireToast(`${name}님의 확정된 일정을 취소했어요`);
              }}
              className="h-10 px-4 rounded-full bg-destructive text-white text-[12px] font-bold"
            >
              확정 취소
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Memo panel — body-part picker + note */}
      <Sheet open={!!memoFor} onOpenChange={(v) => !v && resetMemo()}>
        <SheetContent side="right" className="w-full sm:!max-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <span className="inline-flex w-fit chip bg-primary/10 text-primary">
              <Pencil className="h-3 w-3" /> 수업 메모
            </span>
            <SheetTitle className="text-[20px] font-black leading-tight">
              {memoFor?.name}님 · {memoFor?.sessionNo}회차 메모
            </SheetTitle>
            <SheetDescription>
              저장하면 학생의 PT 기록 테이블에 부위와 메모가 반영돼요.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5">
            <p className="text-[11px] font-extrabold uppercase text-ink-soft tracking-wider mb-2">
              대부위
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BODY_GROUPS.map((g) => (
                <button
                  key={g.name}
                  onClick={() => {
                    setMemoGroup(g.name);
                    setMemoExercises(new Set());
                  }}
                  className={`h-10 px-4 rounded-xl text-[13px] font-extrabold transition ${memoGroup === g.name ? "bg-ink text-white" : "bg-muted text-ink hover:bg-ink/10"}`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {memoGroup && (
            <div className="mt-5">
              <p className="text-[11px] font-extrabold uppercase text-ink-soft tracking-wider mb-2">
                {memoGroup} 세부 운동
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BODY_GROUPS.find((g) => g.name === memoGroup)!.items.map((ex) => {
                  const on = memoExercises.has(ex);
                  return (
                    <button
                      key={ex}
                      onClick={() => toggleExercise(ex)}
                      className={`h-14 px-3 rounded-2xl text-[13px] font-extrabold border-2 transition ${on ? "bg-primary text-white border-primary shadow-pop" : "bg-white border-border text-ink hover:border-ink/40"}`}
                    >
                      {ex}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5">
            <p className="text-[11px] font-extrabold uppercase text-ink-soft tracking-wider mb-2">
              간단 메모
            </p>
            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="예) 스쿼트 100kg 도전 / 폼 안정 / 다음 회차 데드 예정"
              className="w-full min-h-[120px] p-3.5 rounded-xl bg-surface-muted border border-border focus:bg-white focus:border-ink outline-none text-[13px] text-ink resize-y"
            />
          </div>

          <div className="mt-6 sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t border-border space-y-2">
            <button
              onClick={() => submitMemo(false)}
              className="w-full h-12 rounded-full bg-primary text-white text-[14px] font-extrabold inline-flex items-center justify-center gap-1.5 shadow-pop hover:brightness-110"
            >
              <Check className="h-4 w-4" /> 메모 저장
            </button>
            <button
              onClick={() => submitMemo(true)}
              className="w-full text-center text-[12px] text-destructive font-bold underline hover:opacity-80"
            >
              회원 사정으로 당일 취소
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Right-side panel — invite or confirm */}
      <Sheet open={!!panel} onOpenChange={(v) => !v && setPanel(null)}>
        <SheetContent side="right" className="w-full sm:!max-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <span className="inline-flex w-fit chip bg-primary/10 text-primary">
              {panel === "invite" ? (
                <>
                  <Send className="h-3 w-3" /> 응답 요청
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" /> 확정 알림
                </>
              )}
            </span>
            <SheetTitle className="text-[20px] font-black leading-tight">
              {panel === "invite"
                ? `학생들에게 ${WEEK_LABELS[panelWeek]} 가능 시간 선택을 요청할까요?`
                : `학생들에게 ${WEEK_LABELS[panelWeek]} 확정 일정을 알릴까요?`}
            </SheetTitle>
            <SheetDescription>선택한 회원에게만 카카오톡으로 발송됩니다.</SheetDescription>
          </SheetHeader>

          <div className="mt-5">
            <p className="text-[11px] font-extrabold uppercase text-ink-soft tracking-wider mb-2">
              대상 주차
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4].map((o) => (
                <button
                  key={o}
                  onClick={() => setPanelWeek(o)}
                  className={`h-9 px-3 rounded-full text-[12px] font-bold transition ${panelWeek === o ? "bg-ink text-white" : "bg-muted text-ink-soft hover:bg-ink/10"}`}
                >
                  {WEEK_LABELS[o]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-extrabold uppercase text-ink-soft tracking-wider">
                대상 회원 ({panelSelected.size}/{STUDENTS.length})
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPanelSelected(new Set(STUDENTS.map((s) => s.name)))}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  전체 선택
                </button>
                <span className="text-ink-soft">·</span>
                <button
                  onClick={() => setPanelSelected(new Set())}
                  className="text-[11px] font-bold text-ink-soft hover:underline"
                >
                  전체 해제
                </button>
              </div>
            </div>
            <ul className="rounded-xl border border-border divide-y divide-border max-h-[40vh] overflow-y-auto">
              {STUDENTS.map((s) => {
                const checked = panelSelected.has(s.name);
                return (
                  <li key={s.name}>
                    <button
                      onClick={() => togglePanelStudent(s.name)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 ${checked ? "bg-primary/[0.04]" : ""}`}
                    >
                      <span
                        className={`h-5 w-5 rounded-md border-2 grid place-items-center shrink-0 transition ${checked ? "bg-primary border-primary" : "border-border bg-white"}`}
                      >
                        {checked && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <div className="h-8 w-8 rounded-full bg-surface-muted grid place-items-center font-black text-[12px] text-ink shrink-0">
                        {s.name[0]}
                      </div>
                      <div className="flex-1 min-w-0 leading-tight">
                        <p className="text-[13px] font-bold text-ink">{s.name}</p>
                        <p className="text-[11px] text-ink-soft">
                          최근 PT {s.lastPT} · 잔여{" "}
                          <span className={s.remaining <= 5 ? "text-destructive font-bold" : ""}>
                            {s.remaining}회
                          </span>{" "}
                          · 등록 {s.joinedAt}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-6 sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t border-border">
            <button
              onClick={() => void (panel === "invite" ? sendRequest() : sendConfirm())}
              disabled={panelSelected.size === 0}
              className="w-full h-12 rounded-full bg-primary text-white text-[14px] font-extrabold inline-flex items-center justify-center gap-1.5 shadow-pop hover:brightness-110 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              {panelSelected.size === 0
                ? "회원을 선택해주세요"
                : panelSelected.size === STUDENTS.length
                  ? `전원에게 ${panel === "invite" ? "요청" : "확정 알림"} 보내기`
                  : `${panelSelected.size}명에게 ${panel === "invite" ? "요청" : "확정 알림"} 보내기`}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="h-32" aria-hidden="true" />

      {/* Floating invite bar — primary CTA, hidden when pendingClose bar overlays it */}
      {pendingClose.size === 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(720px,calc(100vw-24px))]">
          {confirmedAt != null ? (
            <div
              className="flex flex-wrap items-center gap-[14px] rounded-[18px] px-[18px] py-[15px]"
              style={{ background: "#0e6b46", border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 16px 40px -22px rgba(8,52,34,.7)" }}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0e6b46" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.2 4.2L19 7" />
                </svg>
              </span>
              <p className="min-w-[160px] flex-1 text-[16px] font-bold leading-tight tracking-tight text-white">
                {WEEK_LABELS[weekOffset]} 일정 확정이 완료됐어요
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <span className="inline-flex h-[34px] items-center gap-2 rounded-[11px] pl-1.5 pr-3.5 text-[13px] font-semibold tracking-tight" style={{ background: "rgba(255,255,255,.13)", color: "rgba(255,255,255,.92)" }}>
                  <ToastPeopleIcon />
                  {confirmedSummary?.responded ?? stats.responded}/{confirmedSummary?.total ?? stats.total}명 응답
                </span>
                <span className="inline-flex h-[34px] items-center gap-2 rounded-[11px] pl-1.5 pr-3.5 text-[13px] font-semibold tracking-tight" style={{ background: "rgba(255,255,255,.13)", color: "rgba(255,255,255,.92)" }}>
                  <ToastCalendarIcon />
                  {confirmedCount}명 확정
                </span>
                <span className="inline-flex h-[34px] items-center gap-2 rounded-[11px] pl-1.5 pr-3.5 text-[13px] font-bold tracking-tight text-white">
                  <ToastClockIcon />약 {savedMinutes}분 절약
                </span>
              </div>
              <p className="basis-full pl-[54px] text-[12.5px] font-medium leading-[1.5] tracking-tight" style={{ color: "rgba(255,255,255,.62)" }}>
                확정 후 새롭게 변경된 사항은 ‘02 학생 응답’에서 수동 일정 조정 후 개별 통지로
                직접 안내해주세요.
              </p>
            </div>
          ) : requestSentAt != null ? (
            <div
              className="flex flex-wrap items-center gap-[14px] rounded-[18px] px-4 py-[15px]"
              style={{ background: "#b46213", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 16px 42px -20px rgba(120,66,8,.7)" }}
            >
              <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px]" style={{ background: "rgba(255,255,255,.14)" }}>
                <ToastHourglassIcon />
              </span>
              <div className="min-w-0 flex-1">
                <span className="inline-flex h-[21px] items-center gap-1.5 rounded-[7px] px-2.5" style={{ background: "rgba(255,255,255,.16)" }}>
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ background: "#ffd54a" }} />
                  <span className="text-[11px] font-extrabold tracking-wide" style={{ color: "#ffe9bf" }}>
                    진행 중 · 응답 받는 중
                  </span>
                </span>
                <p className="mt-[7px] text-[16px] font-bold leading-tight tracking-tight text-white">
                  {WEEK_LABELS[weekOffset]} 응답 현황 · {STUDENTS.length}명에게 알림 발송됨
                </p>
                <p className="mt-1 text-[12.5px] font-medium leading-[1.5] tracking-tight tabular-nums" style={{ color: "rgba(255,255,255,.72)" }}>
                  {STUDENTS.filter((s) => s.status !== "응답대기").length}명 시간 선택 완료 ·{" "}
                  {AI_RESULT_INIT.length}명 자동 배정됨 ·{" "}
                  <span className="font-bold" style={{ color: "#ffdf9e" }}>
                    {pendingResponders.length}명 응답 대기
                  </span>
                </p>
              </div>
              <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                <button
                  onClick={() => {
                    if (closeEditMode) {
                      setPendingClose(new Set());
                      setCloseEditMode(false);
                      return;
                    }
                    setCloseEditMode(true);
                    requestAnimationFrame(() =>
                      document.getElementById("schedule-demand-grid")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      }),
                    );
                  }}
                  className="inline-flex h-[42px] flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-[14px] font-bold text-white sm:flex-initial"
                  style={{ background: "rgba(255,255,255,.16)" }}
                >
                  <Lock className="h-3.5 w-3.5" /> {closeEditMode ? "막기 종료" : "시간 막기"}
                </button>
                <button
                  onClick={() => {
                    setPanel("confirm");
                    setPanelWeek(weekOffset);
                    setPanelSelected(new Set(STUDENTS.map((s) => s.name)));
                  }}
                  className="inline-flex h-[42px] flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-[18px] text-[14px] font-bold sm:flex-initial"
                  style={{ color: "#b46213" }}
                >
                  <Check className="h-3.5 w-3.5" /> 확정 알림 보내기
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-wrap items-center gap-[14px] rounded-[18px] px-4 py-[15px]"
              style={{ background: "#1f54e6", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 16px 42px -20px rgba(20,52,150,.75)" }}
            >
              <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px]" style={{ background: "rgba(255,255,255,.14)" }}>
                <ToastBellIcon />
              </span>
              <div className="min-w-0 flex-1">
                <span className="inline-flex h-[21px] items-center gap-1.5 rounded-[7px] px-2" style={{ background: "#ffd54a" }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#1f54e6" }} />
                  <span className="text-[11px] font-extrabold tracking-wide" style={{ color: "#1a2e6e" }}>
                    STEP 1 · 먼저 할 일
                  </span>
                </span>
                <p className="mt-[7px] text-[16px] font-bold leading-tight tracking-tight text-white">
                  학생들에게 시간 선택을 먼저 요청하세요
                </p>
                <p className="mt-1 text-[12.5px] font-medium leading-[1.5] tracking-tight" style={{ color: "rgba(255,255,255,.72)" }}>
                  응답이 모여야 {WEEK_LABELS[weekOffset]} 일정을 확정할 수 있어요.
                </p>
              </div>
              <button
                onClick={() => setInviteIntent(true)}
                className="inline-flex h-[42px] w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-[18px] text-[14px] font-bold sm:w-auto"
                style={{ color: "#1f54e6" }}
              >
                시간 선택 요청
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1f54e6" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M12 5.5l6.5 6.5L12 18.5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pre-send check: did the trainer close unavailable times first? */}
      <Dialog open={inviteIntent} onOpenChange={(v) => !v && setInviteIntent(false)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <div className="mb-3 grid h-28 w-28 place-items-center rounded-[28px] bg-primary/10 [&>svg]:h-10 [&>svg]:w-10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>
              잠깐! 안되는 시간을 먼저 닫으셨나요?
            </DialogTitle>
            <DialogDescription>
              트레이너님이 어려운 시간을 먼저 막아두면 학생도 빈틈없이 가능 시간만 골라줘서 조율이
              훨씬 빨라져요. 지금 바로 {WEEK_LABELS[weekOffset]} 요청을 보낼까요?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setInviteIntent(false)}
              className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold"
            >
              시간 먼저 닫을게요
            </button>
            <button
              onClick={() => {
                setInviteIntent(false);
                setPanel("invite");
                setPanelWeek(weekOffset);
                setPanelSelected(new Set(STUDENTS.map((s) => s.name)));
              }}
              className="h-10 px-4 rounded-full bg-primary text-white text-[12px] font-extrabold inline-flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" /> 네, 요청 보낼게요
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating bar for pending close changes */}
      {pendingClose.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-24px))]">
          <div className="rounded-2xl bg-ink text-white shadow-pink p-3 flex items-center gap-2.5">
            <span className="h-11 w-11 rounded-xl bg-primary/20 text-primary grid place-items-center shrink-0">
              <Lock className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold">시간 변경 {pendingClose.size}개 대기 중</p>
              <p className="text-[11px] text-white/60">
                ‘시간 막기’를 누르면 해당 셀이 닫혀 학생이 선택할 수 없어요.
              </p>
            </div>
            <button
              onClick={() => {
                setPendingClose(new Set());
                if (requestSentAt != null) setCloseEditMode(false);
              }}
              className="h-11 px-3 rounded-xl bg-white/10 text-white text-[12px] font-bold inline-flex items-center gap-1 shrink-0 hover:bg-white/15"
            >
              <X className="h-3.5 w-3.5" /> 취소
            </button>
            <button
              onClick={applyPending}
              className="h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shrink-0 hover:brightness-110"
            >
              <Check className="h-4 w-4" /> 시간 막기
            </button>
          </div>
        </div>
      )}

      <Dialog open={!!slotDetail} onOpenChange={(open) => !open && setSlotDetail(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <div className="mb-3 grid h-28 w-28 place-items-center rounded-[28px] bg-primary/10 text-primary [&>svg]:h-10 [&>svg]:w-10">
              <Users />
            </div>
            <DialogTitle>{slotDetail?.label} 선택 회원</DialogTitle>
            <DialogDescription>
              이 시간에 가능하다고 응답한 회원은 {slotDetail?.names.length ?? 0}명입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slotDetail?.names.map((name) => (
              <div
                key={name}
                className="flex min-h-12 items-center gap-2 rounded-2xl bg-surface-muted px-3 text-left"
              >
                {studentByName.get(name)?.avatarUrl ? (
                  <img
                    src={studentByName.get(name)?.avatarUrl ?? ""}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[12px] font-black text-primary ring-1 ring-border">
                    {name[0]}
                  </span>
                )}
                <span className="truncate text-[14px] font-extrabold text-ink">{name}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notify confirmation */}
      <Dialog open={!!notifyConfirm} onOpenChange={(v) => !v && setNotifyConfirm(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <div className="mb-3 grid h-28 w-28 place-items-center rounded-[28px] bg-[#FEE500]/25 [&>svg]:h-10 [&>svg]:w-10">
              <MessageCircle className="h-5 w-5 fill-[#191600] text-[#191600]" />
            </div>
            <DialogTitle>
              {notifyConfirm?.name}님께 카카오톡을 보낼까요?
            </DialogTitle>
            <DialogDescription>
              {notifyConfirm?.scope === "remind"
                ? "이번 주 가능 시간 응답을 다시 한 번 요청합니다."
                : "확정된 일정 / 안내 메시지를 개별로 한 번 더 발송합니다."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setNotifyConfirm(null)}
              className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold"
            >
              취소
            </button>
            <button
              onClick={async () => {
                const n = notifyConfirm!;
                if (n.scope === "individual" && scheduleId && trainerId) {
                  const { data: log } = await supabase
                    .from("schedule_activity_log")
                    .insert({
                      schedule_id: scheduleId,
                      trainer_id: trainerId,
                      kind: "confirm",
                      who: n.name,
                      count: 1,
                    })
                    .select("created_at")
                    .maybeSingle();
                  setConfirmedMessageAtByName((previous) => ({
                    ...previous,
                    [n.name]: log?.created_at ?? new Date().toISOString(),
                  }));
                  setConfirmedStudentNames((previous) => new Set(previous).add(n.name));
                }
                fireToast(`${n.name}님에게 카카오톡을 보냈어요 ✓`);
                setNotifyConfirm(null);
              }}
              className="h-10 px-4 rounded-full bg-[#FEE500] text-[#191600] text-[12px] font-extrabold inline-flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" /> 보내기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send toast (top floating) */}
      {sendToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl bg-ink text-white px-4 py-3 shadow-pop flex items-center gap-2.5 min-w-[280px]">
            <span className="h-8 w-8 rounded-full bg-primary grid place-items-center">
              <Check className="h-4 w-4" />
            </span>
            <p className="text-[13px] font-extrabold">{sendToast}</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  suffix,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl sm:rounded-2xl border p-2.5 sm:p-4 ${accent ? "bg-ink text-white border-ink" : "bg-white border-border"}`}
    >
      <div
        className={`flex items-center gap-1 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider truncate ${accent ? "text-primary" : "text-ink-soft"}`}
      >
        <span className="hidden sm:inline-flex shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 sm:mt-2 flex min-w-0 flex-wrap items-baseline gap-0.5 sm:gap-1">
        <span className="text-[17px] sm:text-[28px] font-black tabular-nums leading-none">
          {value}
        </span>
        {suffix && (
          <span
            className={`truncate text-[9.5px] sm:text-[12px] font-bold ${accent ? "text-white/70" : "text-ink-soft"}`}
          >
            {suffix}
          </span>
        )}
        {detail && (
          <span
            className={`hidden sm:inline ml-1 text-[10px] font-semibold ${accent ? "text-white/55" : "text-muted-foreground"}`}
          >
            · {detail}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] font-black tabular-nums text-primary tracking-widest">
          {index}
        </span>
        <h2 className="text-[18px] sm:text-[20px] font-black text-ink leading-tight">{title}</h2>
      </div>
      {subtitle && <p className="text-[12px] text-ink-soft">{subtitle}</p>}
    </div>
  );
}

function ToastPeopleIcon() {
  return (
    <span className="relative shrink-0 h-[30px] w-[30px]" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,.35))" }}>
      <span className="absolute left-0 top-3 h-[11px] w-[14px] rounded-[7px_7px_4px_4px]" style={{ background: "linear-gradient(160deg, #9be7c4, #3fc78a)" }} />
      <span className="absolute left-[1px] top-[5px] h-[9px] w-[9px] rounded-full" style={{ background: "linear-gradient(160deg, #b6f0d6, #45c98c)" }} />
      <span
        className="absolute left-2 top-[14px] h-[13px] w-5 rounded-[10px_10px_5px_5px]"
        style={{ background: "linear-gradient(160deg, #8fc2ff, #3f86f2)", boxShadow: "inset 0 1.5px 1px rgba(255,255,255,.5)" }}
      />
      <span
        className="absolute left-[11.5px] top-[3px] h-[13px] w-[13px] rounded-full"
        style={{ background: "linear-gradient(160deg, #a9d2ff, #4a8df4)", boxShadow: "inset 0 1.5px 1px rgba(255,255,255,.55)" }}
      />
    </span>
  );
}

function ToastCalendarIcon() {
  return (
    <span className="relative shrink-0 h-[30px] w-[30px]" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,.35))" }}>
      <span
        className="absolute left-[3px] top-[6px] h-[21px] w-6 rounded-lg"
        style={{ background: "linear-gradient(160deg, #b9aaff, #7a5cf0)", boxShadow: "inset 0 -3px 5px rgba(70,40,150,.4)" }}
      />
      <span className="absolute left-[3px] top-[6px] h-2 w-6 rounded-t-lg" style={{ background: "linear-gradient(160deg, #6f54e0, #5a40c8)" }} />
      <span className="absolute left-[6px] top-4 h-[9px] w-[18px] rounded-[3px]" style={{ background: "linear-gradient(160deg, #ffffff, #eef0fb)" }} />
      <span className="absolute left-[9px] top-[17px] h-2 w-3 flex items-center justify-center">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="#2ec27a" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 4.2l2.6 2.6L10.5 1.2" />
        </svg>
      </span>
      <span className="absolute left-[9px] top-[2px] h-[6px] w-[3.5px] rounded-sm" style={{ background: "linear-gradient(180deg, #f0f1f6, #c7c9d6)" }} />
      <span className="absolute left-[18px] top-[2px] h-[6px] w-[3.5px] rounded-sm" style={{ background: "linear-gradient(180deg, #f0f1f6, #c7c9d6)" }} />
    </span>
  );
}

function ToastClockIcon() {
  return (
    <span className="relative shrink-0 h-[30px] w-[30px]" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,.35))" }}>
      <span
        className="absolute left-[2px] top-[2px] h-[26px] w-[26px] rounded-full"
        style={{ background: "linear-gradient(160deg, #ffd79a, #f59e1f)", boxShadow: "inset 0 -3px 6px rgba(150,80,0,.4), inset 0 2px 2px rgba(255,255,255,.55)" }}
      />
      <span className="absolute left-[6px] top-[6px] h-[18px] w-[18px] rounded-full" style={{ background: "linear-gradient(160deg, #fff7e6, #ffe6bd)" }} />
      <span className="absolute left-[14.2px] top-[9px] h-[7px] w-[1.8px] rounded-sm" style={{ background: "#c47a08" }} />
      <span className="absolute left-[15px] top-[14px] h-[1.8px] w-[6px] rounded-sm" style={{ background: "#c47a08" }} />
      <span
        className="absolute left-[18px] top-[17px] h-[11px] w-[11px] rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #79e6a8, #25b46c)", boxShadow: "inset 0 1px 1px rgba(255,255,255,.5)" }}
      >
        <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2v7M3 6l3 3 3-3" />
        </svg>
      </span>
    </span>
  );
}

function ToastBellIcon() {
  return (
    <span className="relative shrink-0 h-[30px] w-[30px]" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,.3))" }}>
      <span
        className="absolute left-[5px] top-1 h-[18px] w-5 rounded-[11px_11px_6px_6px]"
        style={{ background: "linear-gradient(160deg, #ffd98e, #f7ab1f)", boxShadow: "inset 0 -3px 5px rgba(160,90,0,.4), inset 0 2px 1.5px rgba(255,255,255,.6)" }}
      />
      <span className="absolute left-1 top-[18px] h-1.5 w-[22px] rounded-md" style={{ background: "linear-gradient(160deg, #ffcf7a, #ef9e12)" }} />
      <span className="absolute left-[12.5px] top-[1px] h-[5px] w-[5px] rounded-full" style={{ background: "linear-gradient(160deg, #ffe3a6, #f3a417)" }} />
      <span className="absolute left-3 top-[23px] h-[6px] w-[6px] rounded-full" style={{ background: "linear-gradient(160deg, #ffe3a6, #ef9e12)" }} />
      <span
        className="absolute left-[19px] top-0 h-[11px] w-[11px] rounded-full"
        style={{ background: "linear-gradient(160deg, #ff8d8d, #f0463f)", boxShadow: "inset 0 1px 1px rgba(255,255,255,.5)" }}
      />
    </span>
  );
}

function ToastHourglassIcon() {
  return (
    <span className="relative shrink-0 h-[30px] w-[30px] animate-hourglass-flip" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,.3))" }}>
      <span
        className="absolute left-[7px] top-1 h-[22px] w-4"
        style={{
          clipPath: "polygon(0 0, 100% 0, 58% 50%, 100% 100%, 0 100%, 42% 50%)",
          background: "linear-gradient(160deg, #fff5de, #ffe6b3)",
          boxShadow: "inset 0 2px 1px rgba(255,255,255,.6)",
        }}
      />
      <span
        className="absolute left-[9px] top-[7px] h-2 w-3"
        style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", background: "linear-gradient(160deg, #ffbf57, #f59e1f)" }}
      />
      <span
        className="absolute left-[11px] top-[18px] h-[6px] w-2"
        style={{ clipPath: "polygon(50% 0, 0 100%, 100% 100%)", background: "linear-gradient(160deg, #ffbf57, #f08f10)" }}
      />
      <span className="absolute left-[14.4px] top-[14px] h-1 w-[1.6px] rounded-sm" style={{ background: "#f59e1f" }} />
      <span className="absolute left-[5px] top-[2.5px] h-1 w-5 rounded-sm" style={{ background: "linear-gradient(160deg, #ffd98e, #e9920f)" }} />
      <span className="absolute left-[5px] top-[23.5px] h-1 w-5 rounded-sm" style={{ background: "linear-gradient(160deg, #ffd98e, #e9920f)" }} />
    </span>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const map: Record<Status, { bg: string; fg: string }> = {
    응답완료: { bg: "#E6F9F1", fg: "#009B72" },
    응답대기: { bg: "#F2F3F5", fg: "#5F6673" },
    불가: { bg: "#FFE8EA", fg: "#E53945" },
    미가입: { bg: "#EFEAFB", fg: "#7C5BD6" },
  };
  const icon =
    s === "불가" ? <Ban className="h-3 w-3" /> : s === "미가입" ? <UserX className="h-3 w-3" /> : null;
  return (
    <span
      style={{ backgroundColor: map[s].bg, color: map[s].fg }}
      className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-bold"
    >
      {icon}
      {s}
    </span>
  );
}
