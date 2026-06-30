import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Check,
  Ban,
  Info,
  X,
  Lock,
  Instagram,
  Megaphone,
  Award,
  Coffee,
  Sparkles,
  Camera,
  CalendarClock,
  Clock3,
  CalendarOff,
  Crown,
} from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pickDisplayName } from "@/lib/display-name";
import { TrainerRankBadge } from "@/components/TrainerRankBadge";
import { useTrainerRank } from "@/hooks/use-trainer-rank";
import { trackEvent } from "@/lib/analytics";
import { OnboardingTour, type TourStep } from "@/components/OnboardingTour";
import { planById } from "@/lib/subscription-plans";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "학생 예약 — 픽짐피티 PickGymPT" },
      {
        name: "description",
        content:
          "원하는 PT 시간을 원하는 만큼 선택하세요. 비어있는 시간/5개 이상 선택 시 포인트도 적립돼요.",
      },
    ],
  }),
  component: Booking,
});

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

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
  "ab0645e2-8477-43da-8d6f-7ccc0bba078a": [
    "여성 체형교정",
    "초보자 근력 루틴",
    "생활스포츠지도사 2급",
    "FMS Lv.1",
  ],
  "cdec3cbd-c840-407a-a3a1-f8cb987d5359": ["근비대 전문", "체력 향상", "NSCA-CPT", "운동기록 코칭"],
  "95d63246-1b34-419e-97e3-2ae8d3e62bc3": ["재활 PT", "코어 안정화", "필라테스 기반", "자세 분석"],
  "2d0fdf86-5a16-4b11-b2ca-4da63b8b075c": [
    "다이어트 전문",
    "바디프로필",
    "식단 코칭",
    "체성분 관리",
  ],
};

const BOOKING_TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-gallery-button",
    badge: "STEP 1 · 대표 사진",
    title: "첫인상은 대표 사진에서 시작돼요",
    description:
      "여기서 대표 사진을 등록하면 학생들이 보는 예약 페이지 상단에 바로 노출돼요. 트레이너님만의 분위기를 보여주세요.",
    icon: <Camera className="h-5 w-5" />,
  },
  {
    targetId: "tour-announcement-button",
    badge: "STEP 2 · 공지",
    title: "휴무·이벤트는 공지로 알려주세요",
    description:
      "여기서 공지를 등록하면 이 페이지를 보는 모든 학생에게 바로 전달돼요. 휴무 안내나 이벤트 소식을 올려보세요.",
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    targetId: "tour-booking-preview",
    badge: "STEP 3 · 학생 예약",
    title: "학생들은 이 화면에서 시간을 골라요",
    description:
      "아래 시간표가 학생들이 실제로 보는 화면이에요. 학생이 가능한 시간을 고르면 색이 진해지고, 트레이너님은 빠른 일정조율에서 한 번에 확인할 수 있어요.",
    icon: <CalendarClock className="h-5 w-5" />,
  },
];

type StudentRosterMatch = {
  id: string;
  trainer_id: string;
  student_name: string;
  student_email: string | null;
  student_phone: string | null;
  status?: string | null;
};

type BookingTrainer = {
  id: string;
  user_id: string;
  name: string;
  gym: string | null;
  intro: string | null;
  avatar_url?: string | null;
  instagram_url?: string | null;
  theme_from?: string | null;
  theme_to?: string | null;
  gallery_urls?: string[] | null;
  onboarding_seen?: string[] | null;
  subscription_plan?: string | null;
};

function requestedTrainerId() {
  if (typeof window === "undefined") return DEFAULT_TRAINER_ID;
  return new URLSearchParams(window.location.search).get("trainer") || DEFAULT_TRAINER_ID;
}

function requestedWeekStart() {
  if (typeof window === "undefined") return nextWeekStart();
  const fromUrl = new URLSearchParams(window.location.search).get("week");
  return normalizeWeekStartParam(fromUrl);
}

function formatLocalISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function normalizeWeekStartParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return nextWeekStart();
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return nextWeekStart();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return formatLocalISODate(date);
}

function cachedTrainer(): BookingTrainer | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(
      sessionStorage.getItem("gympt-selected-trainer") || "null",
    ) as Partial<BookingTrainer> | null;
    const cachedName = pickDisplayName(value?.name);
    if (!value?.id || value.id !== requestedTrainerId() || !cachedName) return null;
    return {
      id: value.id,
      user_id: value.user_id || "",
      name: cachedName,
      gym: value.gym || null,
      intro: value.intro || null,
      avatar_url: value.avatar_url || null,
      instagram_url: value.instagram_url || null,
      theme_from: value.theme_from || "#FF4E97",
      theme_to: value.theme_to || "#FF6FB1",
    };
  } catch {
    return null;
  }
}

function nextWeekStart() {
  const monday = new Date();
  const mondayDistance = (monday.getDay() + 6) % 7;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - mondayDistance + 7);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function currentPointWeekStartISO(date = new Date()) {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

type BookingSchedule = {
  id: string;
  requestSentAt: string | null;
  slotIds: Record<string, string>;
  slotKeyById: Record<string, string>;
  closedKeys: Set<string>;
};

async function ensureBookingSchedule(
  trainerUserId: string,
  weekStart: string,
  { createIfMissing = false }: { createIfMissing?: boolean } = {},
): Promise<BookingSchedule | null> {
  // weekly_schedules.trainer_id references trainer_profiles(id), a separate
  // per-trainer mirror row keyed by the trainer's auth user id. A student can't
  // create that row (only the trainer can, on their own /schedule visit), so if
  // it doesn't exist yet there's nothing to write picks against — bail quietly.
  const scheduleTrainer = (
    await supabase
      .from("trainer_profiles" as never)
      .select("id,booking_start_hour,booking_end_hour")
      .eq("user_id", trainerUserId)
      .maybeSingle()
  ).data as { id: string; booking_start_hour: number | null; booking_end_hour: number | null } | null;
  if (!scheduleTrainer) return null;

  let schedule = (
    await supabase
      .from("weekly_schedules" as never)
      .select("id,request_sent_at")
      .eq("trainer_id", scheduleTrainer.id)
      .eq("week_start", weekStart)
      .maybeSingle()
  ).data as { id: string; request_sent_at: string | null } | null;

  if (!schedule && createIfMissing) {
    const { data: created } = await supabase
      .from("weekly_schedules" as never)
      .upsert({ trainer_id: scheduleTrainer.id, week_start: weekStart } as never, {
        onConflict: "trainer_id,week_start",
      })
      .select("id,request_sent_at")
      .maybeSingle();
    schedule = created as { id: string; request_sent_at: string | null } | null;
  }
  if (!schedule) return null;

  const { data: existingSlots } = await supabase
    .from("time_slots" as never)
    .select("id")
    .eq("schedule_id", schedule.id)
    .limit(1);
  if (!existingSlots || existingSlots.length === 0) {
    const startHour = scheduleTrainer.booking_start_hour ?? 6;
    const endHour = scheduleTrainer.booking_end_hour ?? 22;
    const { data: defaultClosedRows } = await supabase
      .from("trainer_default_closed_slots" as never)
      .select("day_of_week,hour")
      .eq("trainer_profile_id", scheduleTrainer.id);
    const defaultClosedSet = new Set(
      ((defaultClosedRows ?? []) as unknown as { day_of_week: number; hour: number }[]).map(
        (row) => `${row.day_of_week}-${row.hour}`,
      ),
    );
    const grid: {
      schedule_id: string;
      day_of_week: number;
      hour: number;
      capacity: number;
      is_closed: boolean;
    }[] = [];
    for (let day = 0; day < 7; day++) {
      for (const hour of HOURS)
        grid.push({
          schedule_id: schedule.id,
          day_of_week: day,
          hour,
          capacity: 1,
          is_closed: hour < startHour || hour >= endHour || defaultClosedSet.has(`${day}-${hour}`),
        });
    }
    await supabase.from("time_slots" as never).upsert(grid as never, {
      onConflict: "schedule_id,day_of_week,hour",
      ignoreDuplicates: true,
    });
  }

  const { data: slots } = await supabase
    .from("time_slots" as never)
    .select("id,day_of_week,hour,is_closed")
    .eq("schedule_id", schedule.id);
  const slotIds: Record<string, string> = {};
  const slotKeyById: Record<string, string> = {};
  const closedKeys = new Set<string>();
  for (const slot of (slots ?? []) as unknown as {
    id: string;
    day_of_week: number;
    hour: number;
    is_closed: boolean;
  }[]) {
    const key = `${DAYS[slot.day_of_week]}-${slot.hour}`;
    slotIds[key] = slot.id;
    slotKeyById[slot.id] = key;
    if (slot.is_closed) closedKeys.add(key);
  }
  return { id: schedule.id, requestSentAt: schedule.request_sent_at, slotIds, slotKeyById, closedKeys };
}

// Saturday (index 5) is blue, Sunday (index 6) is red, weekdays use the default ink color.
function dayHeaderColor(i: number) {
  if (i === 5) return "text-blue-600";
  if (i === 6) return "text-red-600";
  return "";
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
    "5월 25일(월)은 세미나로 휴무입니다. 해당 주는 화·수·금에 더 많은 시간대를 열어두었으니 미리 선택 부탁드려요!",
  );
  const [annOpen, setAnnOpen] = useState(false);
  const [annDraft, setAnnDraft] = useState("");

  // Trainer-student matching gate (only the schedule area is locked; profile is public)
  const [rosterLoading, setRosterLoading] = useState(true);
  const [registeredRoster, setRegisteredRoster] = useState<StudentRosterMatch | null>(null);
  const [bookingSchedule, setBookingSchedule] = useState<BookingSchedule | null>(null);
  const [demand, setDemand] = useState<Record<string, number>>({});
  const [trainerRecord, setTrainerRecord] = useState<BookingTrainer | null>(() => cachedTrainer());
  const [pageTrainerId, setPageTrainerId] = useState<string>(() => requestedTrainerId());
  const trainerRank = useTrainerRank(pageTrainerId);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryManagerOpen, setGalleryManagerOpen] = useState(false);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const MAX_GALLERY_PHOTOS = 5;
  const locationSearch = useLocation({ select: (loc) => loc.searchStr });

  // Trainer-only: operating hours + recurring default-closed slots
  const [trainerProfileId, setTrainerProfileId] = useState<string | null>(null);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [bookingStartHour, setBookingStartHour] = useState(6);
  const [bookingEndHour, setBookingEndHour] = useState(22);
  const [hoursDraft, setHoursDraft] = useState({ start: 6, end: 22 });
  const [hoursSaving, setHoursSaving] = useState(false);
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [defaultClosedOpen, setDefaultClosedOpen] = useState(false);
  const [defaultClosedSlots, setDefaultClosedSlots] = useState<Set<string>>(new Set());
  const [defaultClosedSaving, setDefaultClosedSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rawWeek = params.get("week");
    const normalizedWeek = normalizeWeekStartParam(rawWeek);
    if (!rawWeek) return;
    if (rawWeek === normalizedWeek) return;
    params.set("week", normalizedWeek);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [locationSearch]);

  const weekDates = useMemo(() => {
    const monday = new Date(`${requestedWeekStart()}T00:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [locationSearch]);
  const weekRangeLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.getMonth() + 1}.${start.getDate()} (${DAYS[start.getDay()]}) - ${
      end.getMonth() + 1
    }.${end.getDate()} (${DAYS[end.getDay()]})`;
  }, [weekDates]);

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
      const hasExplicitTrainer =
        typeof window !== "undefined" &&
        !!new URLSearchParams(window.location.search).get("trainer");
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
        .select("id,user_id,name,gym,intro,avatar_url,instagram_url,theme_from,theme_to,gallery_urls,onboarding_seen,subscription_plan")
        .eq("id", currentTrainerId)
        .maybeSingle();

      let pageTrainer = themedTrainer as BookingTrainer | null;
      if (themedTrainerError) {
        const { data: legacyTrainer } = await supabase
          .from("trainers")
          .select("id,user_id,name,gym,intro,avatar_url,instagram_url")
          .eq("id", currentTrainerId)
          .maybeSingle();
        const legacyTheme = LEGACY_TRAINER_THEMES[currentTrainerId];
        pageTrainer = legacyTrainer
          ? { ...legacyTrainer, theme_from: legacyTheme?.from, theme_to: legacyTheme?.to }
          : null;
      }

      if (!cancelled) {
        setTrainerRecord(
          pageTrainer
            ? { ...pageTrainer, name: pickDisplayName(pageTrainer.name) ?? "트레이너" }
            : null,
        );
      }

      if (!user || String(user.id).startsWith("virtual-")) {
        setRosterLoading(false);
        return;
      }

      const rosterSelect = "id,trainer_id,student_name,student_email,student_phone,status";
      let rosterResult = await supabase
        .from("student_rosters" as never)
        .select(rosterSelect)
        .eq("student_user_id", user.id)
        .eq("trainer_id", currentTrainerId)
        .maybeSingle();

      if (!rosterResult.data && user.email) {
        rosterResult = await supabase
          .from("student_rosters" as never)
          .select(rosterSelect)
          .eq("student_email", user.email.toLowerCase())
          .eq("trainer_id", currentTrainerId)
          .maybeSingle();
      }

      const { data: roster, error: rosterError } = rosterResult;

      if (cancelled) return;

      if (rosterError) {
        setMatchError("학생 등록 여부를 확인하지 못했어요. 잠시 후 다시 시도해주세요.");
        setRosterLoading(false);
        return;
      }

      const matchedRoster = roster as unknown as StudentRosterMatch | null;
      setRegisteredRoster(matchedRoster);

      const isOwner = isTrainerRole && pageTrainer?.user_id === user.id;
      if ((matchedRoster || isOwner) && pageTrainer?.user_id) {
        const ensured = await ensureBookingSchedule(pageTrainer.user_id, requestedWeekStart(), {
          createIfMissing: isOwner,
        });
        if (cancelled) return;

        if (matchedRoster && !ensured?.requestSentAt) {
          setBookingSchedule(null);
          setDemand({});
          setSelected(new Set());
          setUnavailable(false);
          setSubmitted(false);
          setMatchError(
            "이 주차는 아직 트레이너가 시간 선택 요청을 보내지 않았어요. 받은 링크의 주차를 확인해 주세요.",
          );
          setRosterLoading(false);
          return;
        }

        if (matchedRoster && ensured?.requestSentAt) {
          const { data: recipient } = await supabase
            .from("schedule_request_recipients" as never)
            .select("id")
            .eq("schedule_id", ensured.id)
            .eq("student_user_id", user.id)
            .maybeSingle();
          if (cancelled) return;
          if (!recipient) {
            setBookingSchedule(null);
            setDemand({});
            setSelected(new Set());
            setUnavailable(false);
            setSubmitted(false);
            setMatchError(
              "이 주차 시간 선택 요청 대상이 아니에요. 트레이너가 새 요청을 보내면 선택할 수 있어요.",
            );
            setRosterLoading(false);
            return;
          }
        }

        setBookingSchedule(ensured);

        if (ensured) {
          // student_selections RLS only allows reading your own rows (or the
          // trainer reading everything) — neither lets a student see how many
          // *other* students picked a slot, so the heatmap counts come from a
          // security-definer RPC that exposes only aggregate counts, not who
          // picked what.
          const [{ data: demandRows }, { data: ownSelections }] = await Promise.all([
            supabase.rpc("get_schedule_demand" as never, { p_schedule_id: ensured.id } as never),
            supabase
              .from("student_selections" as never)
              .select("slot_id,status")
              .eq("schedule_id", ensured.id)
              .eq("student_user_id", user.id),
          ]);
          if (cancelled) return;

          const demandMap: Record<string, number> = {};
          for (const row of (demandRows ?? []) as unknown as { slot_id: string; picks: number }[]) {
            const key = ensured.slotKeyById[row.slot_id];
            if (key) demandMap[key] = row.picks;
          }
          setDemand(demandMap);

          if (matchedRoster) {
            const myKeys = new Set<string>();
            let myUnavailable = false;
            for (const sel of (ownSelections ?? []) as unknown as {
              slot_id: string | null;
              status: string;
            }[]) {
              if (sel.status === "unavailable") {
                myUnavailable = true;
                continue;
              }
              const key = sel.slot_id ? ensured.slotKeyById[sel.slot_id] : undefined;
              if (key) myKeys.add(key);
            }
            setSelected(myKeys);
            setUnavailable(myUnavailable);
            setSubmitted(myKeys.size > 0 || myUnavailable);
          }
        }
      } else if (!cancelled) {
        setBookingSchedule(null);
        setDemand({});
      }

      if (!cancelled) setRosterLoading(false);
    }

    void loadRosterGate();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, user?.email, isTrainerRole, locationSearch]);

  // Determine gate state based on auth + roster
  const isOwnerTrainer = isTrainerRole && !!user && trainerRecord?.user_id === user.id;
  const isRegisteredStudent = !!registeredRoster;
  const gateState: "loggedOut" | "registered" | "notRegistered" | "owner" = isOwnerTrainer
    ? "owner"
    : !user
      ? "loggedOut"
      : isRegisteredStudent
        ? "registered"
        : "notRegistered";
  const effectiveUnlocked =
    !rosterLoading && (gateState === "owner" || (gateState === "registered" && !!bookingSchedule));
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
  const galleryPhotos = (trainerRecord?.gallery_urls ?? []).filter(Boolean);
  const displayTrainerSpecs = TRAINER_SPECS[pageTrainerId] ?? [
    "생활스포츠지도사 2급",
    "체형 분석",
    "1:1 맞춤 PT",
    "식단 코칭",
  ];

  const handleNotStudent = () => {
    setMatchError(
      "괜찮아요! 트레이너님께 등록 요청을 보내거나, 다른 트레이너의 페이지를 둘러볼 수 있어요.",
    );
  };

  // Loaded for every viewer (not just the owner) so the timetable's visual
  // open/closed boundaries always match the trainer's saved settings — the
  // owner's edit affordances (trainerProfileId, default-closed editing) only
  // matter when isOwnerTrainer is also true.
  useEffect(() => {
    const trainerUserId = trainerRecord?.user_id;
    if (!trainerUserId) {
      setTrainerProfileId(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("trainer_profiles" as never)
      .select("id,booking_start_hour,booking_end_hour")
      .eq("user_id", trainerUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const profile = data as { id: string; booking_start_hour: number; booking_end_hour: number } | null;
        if (!profile) return;
        setTrainerProfileId(profile.id);
        setBookingStartHour(profile.booking_start_hour);
        setBookingEndHour(profile.booking_end_hour);
        setHoursDraft({ start: profile.booking_start_hour, end: profile.booking_end_hour });
        return supabase
          .from("trainer_default_closed_slots" as never)
          .select("day_of_week,hour")
          .eq("trainer_profile_id", profile.id)
          .then(({ data: rows }) => {
            if (cancelled) return;
            const set = new Set(
              ((rows ?? []) as unknown as { day_of_week: number; hour: number }[]).map(
                (row) => `${row.day_of_week}-${row.hour}`,
              ),
            );
            setDefaultClosedSlots(set);
          });
      });
    return () => {
      cancelled = true;
    };
  }, [trainerRecord?.user_id]);

  const trainerPlan = planById(trainerRecord?.subscription_plan);
  const hasDefaultClosedAccess = trainerPlan.displayOrder >= 30; // Basic and above

  const saveBookingHours = async () => {
    if (!user || !trainerProfileId) return;
    if (hoursDraft.start >= hoursDraft.end) {
      setToast({ title: "시작 시간은 끝 시간보다 빨라야 해요." });
      setTimeout(() => setToast(null), 2400);
      return;
    }
    setHoursSaving(true);
    try {
      const { error } = await supabase
        .from("trainer_profiles" as never)
        .update({ booking_start_hour: hoursDraft.start, booking_end_hour: hoursDraft.end } as never)
        .eq("id", trainerProfileId);
      if (error) throw error;
      setBookingStartHour(hoursDraft.start);
      setBookingEndHour(hoursDraft.end);
      setHoursOpen(false);
      setToast({ title: "운영 시간을 저장했어요.", sub: "다음에 새로 보내는 요청부터 적용돼요." });
      setTimeout(() => setToast(null), 2800);
    } catch {
      setToast({ title: "저장에 실패했어요. 다시 시도해주세요." });
      setTimeout(() => setToast(null), 2400);
    } finally {
      setHoursSaving(false);
    }
  };

  const toggleDefaultClosedSlot = async (day: number, hour: number) => {
    if (!trainerProfileId) return;
    const key = `${day}-${hour}`;
    const isClosed = defaultClosedSlots.has(key);
    setDefaultClosedSaving(true);
    try {
      if (isClosed) {
        const { error } = await supabase
          .from("trainer_default_closed_slots" as never)
          .delete()
          .eq("trainer_profile_id", trainerProfileId)
          .eq("day_of_week", day)
          .eq("hour", hour);
        if (error) throw error;
        setDefaultClosedSlots((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        const { error } = await supabase.from("trainer_default_closed_slots" as never).insert({
          trainer_profile_id: trainerProfileId,
          day_of_week: day,
          hour,
        } as never);
        if (error) throw error;
        setDefaultClosedSlots((prev) => new Set(prev).add(key));
      }
    } catch {
      setToast({ title: "저장에 실패했어요. 다시 시도해주세요." });
      setTimeout(() => setToast(null), 2400);
    } finally {
      setDefaultClosedSaving(false);
    }
  };

  useEffect(() => {
    if (!user || String(user.id).startsWith("virtual-")) {
      setWeekPoints(0);
      return;
    }

    let cancelled = false;
    const weekStart = currentPointWeekStartISO();
    supabase
      .from("points" as never)
      .select("amount")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setWeekPoints(0);
          return;
        }
        const rows = (data ?? []) as unknown as { amount: number }[];
        setWeekPoints(Math.min(10, rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)));
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const requireAuth = (fn: () => void) => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    fn();
  };

  const toggle = (key: string) => {
    requireAuth(() => {
      if (bookingSchedule?.closedKeys.has(key)) return;
      if (submitted) {
        setEditConfirm(true);
        return;
      }
      if (unavailable) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    });
  };

  const onUnavailableClick = () =>
    requireAuth(() => (unavailable ? setUnavailable(false) : setConfirmUnavail(true)));

  const handleGalleryFile = async (file: File) => {
    if (!user || String(user.id).startsWith("virtual-") || !trainerRecord) return;
    if (!file.type.startsWith("image/")) {
      setToast({ title: "이미지 파일만 업로드할 수 있어요." });
      setTimeout(() => setToast(null), 2400);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ title: "5MB 이하의 이미지만 업로드할 수 있어요." });
      setTimeout(() => setToast(null), 2400);
      return;
    }
    const currentUrls = trainerRecord.gallery_urls ?? [];
    if (currentUrls.length >= MAX_GALLERY_PHOTOS) {
      setToast({ title: `대표 사진은 최대 ${MAX_GALLERY_PHOTOS}장까지 등록할 수 있어요.` });
      setTimeout(() => setToast(null), 2400);
      return;
    }
    setGalleryUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/gallery/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const nextUrls = [...currentUrls, publicUrlData.publicUrl];
      const { error: updateError } = await supabase
        .from("trainers")
        .update({ gallery_urls: nextUrls })
        .eq("user_id", user.id);
      if (updateError) throw updateError;
      setTrainerRecord((prev) => (prev ? { ...prev, gallery_urls: nextUrls } : prev));
      setToast({ title: "대표 사진을 추가했어요." });
    } catch {
      setToast({ title: "사진 업로드에 실패했어요. 다시 시도해주세요." });
    } finally {
      setGalleryUploading(false);
      setTimeout(() => setToast(null), 2400);
    }
  };

  const removeGalleryPhoto = async (url: string) => {
    if (!user || !trainerRecord) return;
    const nextUrls = (trainerRecord.gallery_urls ?? []).filter((u) => u !== url);
    const { error } = await supabase.from("trainers").update({ gallery_urls: nextUrls }).eq("user_id", user.id);
    if (error) {
      setToast({ title: "삭제에 실패했어요. 다시 시도해주세요." });
      setTimeout(() => setToast(null), 2400);
      return;
    }
    setTrainerRecord((prev) => (prev ? { ...prev, gallery_urls: nextUrls } : prev));
  };

  const finishBookingTour = () => {
    if (!user) return;
    setTrainerRecord((prev) =>
      prev ? { ...prev, onboarding_seen: [...(prev.onboarding_seen ?? []), "booking"] } : prev,
    );
    // .then() (not "void") is what actually fires this lazy request.
    supabase
      .rpc("mark_onboarding_seen" as never, { p_user_id: user.id, p_key: "booking" } as never)
      .then(({ error }) => {
        if (error) console.error("[onboarding] mark_onboarding_seen failed", error.message);
      });
  };

  const persistSelections = async (markUnavailable: boolean, picks: string[]) => {
    if (!user || String(user.id).startsWith("virtual-") || !registeredRoster || !bookingSchedule)
      return;
    try {
      await supabase
        .from("student_selections" as never)
        .delete()
        .eq("schedule_id", bookingSchedule.id)
        .eq("student_user_id", user.id);
      if (markUnavailable) {
        await supabase.from("student_selections" as never).insert({
          schedule_id: bookingSchedule.id,
          student_user_id: user.id,
          student_name: registeredRoster.student_name,
          status: "unavailable",
        } as never);
      } else if (picks.length) {
        const rows = picks
          .map((key) => bookingSchedule.slotIds[key])
          .filter((slotId): slotId is string => !!slotId)
          .map((slotId) => ({
            schedule_id: bookingSchedule.id,
            slot_id: slotId,
            student_user_id: user.id,
            student_name: registeredRoster.student_name,
            status: "selected",
          }));
        if (rows.length) await supabase.from("student_selections" as never).insert(rows as never);
      }
    } catch {}
  };

  const confirmUnavailable = () => {
    setUnavailable(true);
    setSelected(new Set());
    setConfirmUnavail(false);
    void persistSelections(true, []);
    // 팝업 확인 즉시 제출 처리
    setSubmitted(true);
    trackEvent("Booking Availability Submitted", {
      unavailable: true,
      selected_slot_count: 0,
    });
    setToast({ title: "‘이번 주 PT 불가’로 전달했어요" });
    setTimeout(() => setToast(null), 2400);
  };

  const selectedList = useMemo(() => Array.from(selected), [selected]);
  const hasEmpty = useMemo(() => selectedList.some((k) => !demand[k]), [selectedList, demand]);
  const fivePlus = selectedList.length >= 5;

  const showPointToast = (amount: number, reason: string, nextTotal?: number) => {
    setToast({ title: `+${amount}P 적립!`, sub: reason });
    setTimeout(() => setToast(null), 3000);
    if (typeof nextTotal === "number") setWeekPoints(nextTotal);
    else setWeekPoints((p) => Math.min(10, p + amount));
  };

  const awardPointReason = async (
    reason: "empty_slot" | "five_or_more",
    label: string,
    delay: number,
  ) => {
    if (!user || String(user.id).startsWith("virtual-")) return;
    try {
      const weekStart = currentPointWeekStartISO();
      const { data: existingRows, error: existingError } = await supabase
        .from("points" as never)
        .select("amount,reason")
        .eq("user_id", user.id)
        .eq("week_start", weekStart);
      if (existingError) throw existingError;

      const existing = (existingRows ?? []) as unknown as { amount: number; reason: string }[];
      const currentTotal = existing.reduce((sum, row) => sum + (row.amount ?? 0), 0);
      if (currentTotal >= 10 || existing.some((row) => row.reason === reason)) {
        setWeekPoints(Math.min(10, currentTotal));
        return;
      }

      const amount = Math.min(10 - currentTotal, 10);
      if (amount <= 0) return;

      const { error: insertError } = await supabase.from("points" as never).insert({
        user_id: user.id,
        amount,
        reason,
        week_start: weekStart,
      } as never);
      if (insertError) throw insertError;

      const { data: refreshedRows, error: refreshError } = await supabase
        .from("points" as never)
        .select("amount")
        .eq("user_id", user.id)
        .eq("week_start", weekStart);
      if (refreshError) throw refreshError;

      const refreshedTotal = ((refreshedRows ?? []) as unknown as { amount: number }[]).reduce(
        (sum, row) => sum + (row.amount ?? 0),
        0,
      );
      const nextTotal = Math.min(10, refreshedTotal);
      setWeekPoints(nextTotal);
      if (refreshedTotal > currentTotal) {
        setTimeout(() => showPointToast(amount, label, nextTotal), delay);
      }
    } catch {
      setToast({ title: "포인트 저장에 실패했어요", sub: "잠시 후 다시 시도해주세요." });
      setTimeout(() => setToast(null), 2600);
    }
  };

  const handleSubmit = () =>
    requireAuth(async () => {
      setSubmitted(true);
      setToast({
        title: unavailable
          ? "‘이번 주 PT 불가’로 전달했어요"
          : `${selectedList.length}개 시간이 트레이너에게 전달됐어요`,
      });
      setTimeout(() => setToast(null), 2400);

      void persistSelections(unavailable, selectedList);
      trackEvent("Booking Availability Submitted", {
        unavailable,
        selected_slot_count: selectedList.length,
      });

      if (!unavailable && user && !String(user.id).startsWith("virtual-")) {
        if (hasEmpty) {
          void awardPointReason("empty_slot", "\ube44\uc5b4\uc788\ub358 \uc2dc\uac04\uc744 \uace8\ub77c\uc92c\uc5b4\uc694", 1200);
        } else if (fivePlus) {
          void awardPointReason("five_or_more", "5\uac1c \uc774\uc0c1 \uace8\ub77c\uc92c\uc5b4\uc694", 1800);
        }
      } else if (!unavailable && (hasEmpty || fivePlus)) {
        // virtual user: simulate point gain locally
        const gain = Math.min(10, hasEmpty ? 10 : 0);
        if (gain > 0)
          setTimeout(
            () =>
              showPointToast(
                gain,
                hasEmpty ? "비어있던 시간을 골라줬어요 ☕" : "5개 이상 골라줬어요 ☕",
              ),
            1200,
          );
      }
    });

  if (!trainerRecord) {
    return (
      <AppShell>
        <div
          className="overflow-hidden rounded-2xl border border-border bg-white"
          aria-label="트레이너 정보를 불러오는 중"
        >
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
      {/* Trainer profile — restructured, no overlap */}
      <section className="relative rounded-2xl border border-border overflow-hidden bg-white">
        {galleryPhotos.length > 0 ? (
          <>
            {/* Mobile: first photo only */}
            <div className="h-56 sm:hidden">
              <img src={galleryPhotos[0]} alt="" className="h-full w-full object-cover" />
            </div>
            {/* Desktop/wide: multiple photos side by side */}
            <div className="hidden h-72 sm:flex sm:gap-0.5">
              {galleryPhotos.slice(0, 4).map((url, i) => (
                <div key={i} className="flex-1 min-w-0 overflow-hidden">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div
            className="h-16"
            style={{
              background: `linear-gradient(135deg, ${trainerTheme.from}, ${trainerTheme.to})`,
            }}
          />
        )}
        {isOwnerTrainer && (
          <div className="absolute right-3 top-3 z-10">
            <button
              id="tour-gallery-button"
              onClick={() => setGalleryManagerOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/55 px-3 text-[11.5px] font-extrabold text-white hover:bg-black/75"
            >
              <Camera className="h-3.5 w-3.5" /> 대표 사진 관리
            </button>
          </div>
        )}
        <div className="px-5 sm:px-6 -mt-10 pb-5">
          <div className="flex items-start sm:items-end gap-4 flex-wrap">
            <div className="relative shrink-0">
              {trainerRecord?.avatar_url ? (
                <img
                  src={trainerRecord.avatar_url}
                  alt=""
                  className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white shadow-sm"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-surface-muted ring-4 ring-white grid place-items-center text-[28px] font-black text-ink shadow-sm">
                  {displayTrainerInitial}
                </div>
              )}
              {trainerRank && (
                <TrainerRankBadge rank={trainerRank} />
              )}
              <VerifiedBadge />
            </div>
            <a
              href={displayInstagramUrl}
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
              <h1 className="text-[20px] sm:text-[22px] font-black text-ink leading-tight">
                {displayTrainerName} 트레이너
              </h1>
              <p className="text-[12px] font-bold text-ink-soft truncate">{displayTrainerGym}</p>
            </div>
          </div>
          <p className="mt-4 text-[13.5px] text-ink-soft leading-relaxed">
            안녕하세요, 8년차 퍼스널 트레이너 {displayTrainerName}입니다.{" "}
            {displayTrainerIntro ? `${displayTrainerIntro} ` : ""}단기간의 결과보다는{" "}
            <b className="text-ink">평생 가져갈 운동 습관</b>을 만드는 데 집중합니다. 체형 분석 →
            약점 보완 → 점진적 과부하의 3단계 프로세스로, 부상 없이 꾸준히 변화하는 몸을
            만들어드려요.
          </p>
          <p className="mt-2 text-[13.5px] text-ink-soft leading-relaxed">
            지금까지 <b className="text-ink">320명+</b> 회원님의 다이어트, 체형교정, 근비대 목표를
            함께 달성했습니다. 첫 수업 전 1:1 상담에서 운동 경험과 목표를 충분히 이야기 나눈 뒤 맞춤
            플랜을 설계해드리니 편하게 문의 주세요.
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
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              트레이너 공지
            </p>
            {isOwnerTrainer && (
              <button
                id="tour-announcement-button"
                onClick={() => {
                  setAnnDraft(announcement);
                  setAnnOpen(true);
                }}
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
        <div
          className={showGateOverlay ? "pointer-events-none select-none blur-sm opacity-60" : ""}
          aria-hidden={showGateOverlay}
        >
          {/* Header */}
          <div id="tour-booking-preview" className="mt-6 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                학생 예약 · 다음 주
              </p>
              <h2 className="mt-1.5 text-[24px] sm:text-[28px] font-black text-ink leading-[1.15] tracking-tight">
                가능한 시간을
                <br />
                원하는 만큼 골라주세요
              </h2>
              <p className="mt-2 text-[13.5px] text-ink-soft leading-relaxed">
                색이 진할수록 다른 학생들이 많이 선택한 시간이에요. 트레이너님이 모두 모아 가장 잘
                맞는 시간으로 확정해 드려요.
              </p>
            </div>
            {isOwnerTrainer ? (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <button
                  onClick={() => {
                    setHoursDraft({ start: bookingStartHour, end: bookingEndHour });
                    setHoursOpen(true);
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-extrabold text-white shadow-sm hover:brightness-110"
                >
                  <Clock3 className="h-4 w-4 text-primary" /> 첫/마지막 시간 설정
                </button>
                <button
                  onClick={() => (hasDefaultClosedAccess ? setDefaultClosedOpen(true) : setUpgradePromptOpen(true))}
                  className={`relative inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-extrabold shadow-sm ${
                    hasDefaultClosedAccess
                      ? "bg-primary text-white hover:brightness-110"
                      : "border-2 border-dashed border-border-strong bg-surface-muted text-muted-foreground opacity-80 hover:opacity-100"
                  }`}
                >
                  {hasDefaultClosedAccess ? (
                    <CalendarOff className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  특정 시간 고정 닫기
                  {!hasDefaultClosedAccess && (
                    <span className="ml-0.5 inline-flex h-5 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-black text-amber-700">
                      <Crown className="h-3 w-3" /> Basic+
                    </span>
                  )}
                </button>
              </div>
            ) : submitted ? (
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
                  <span className="text-ink-soft">픽짐피티 포인트</span> · 이번 주 {weekPoints}/10P
                  적립
                </p>
                {weekPoints >= 10 && (
                  <span className="text-[10px] font-bold text-ink-soft">이번 주 최대치 도달</span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-ink-soft leading-relaxed">
                <b className="text-ink">아무도 선택 안 한 시간</b>을 고르거나{" "}
                <b className="text-ink">5개 이상</b>을 선택하면 +10P. 모아서 커피 한 잔 ☕
              </p>
              {!submitted && (hasEmpty || fivePlus) && weekPoints < 10 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hasEmpty && (
                    <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-surface-muted text-ink text-[11px] font-extrabold ring-1 ring-border">
                      <Sparkles className="h-3 w-3" /> 비어있는 시간 +10P 가능
                    </span>
                  )}
                  {fivePlus && (
                    <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-surface-muted text-ink text-[11px] font-extrabold ring-1 ring-border">
                      <Sparkles className="h-3 w-3" /> 5개 이상 +10P 가능
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Week label */}
          <div className="mt-4 rounded-2xl bg-surface-muted border border-border px-5 py-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                {"\uc870\uc728 \uc8fc\ucc28"}
              </p>
              <p className="mt-0.5 whitespace-nowrap">
                <span className="text-[18px] font-black text-ink">{"\ub2e4\uc74c \uc8fc"}</span>
                <span className="ml-1.5 text-[13px] font-medium text-ink-soft">
                  {"\u00b7"} {weekRangeLabel}
                </span>
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
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-5 rounded-sm bg-primary" /> 내 선택
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> 닫힘
              </span>
            </div>
          </div>

          {/* Unified responsive timetable — 7 days × hours, larger touch cells on mobile */}
          <div className={`pb-32 -mx-5 sm:mx-0 ${unavailable ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="mt-4 overflow-hidden rounded-none border-y border-x-0 border-border sm:rounded-2xl sm:border-x">
              <div className="grid grid-cols-[32px_repeat(7,minmax(0,1fr))] bg-surface-muted border-b border-border sm:grid-cols-[44px_repeat(7,1fr)]">
                <div className="p-1.5 sm:p-2 text-[10px] text-muted-foreground font-bold text-center">
                  시간
                </div>
                {DAYS.map((d, i) => (
                  <div key={d} className="p-2 text-center text-[13px] sm:text-[13px] leading-tight">
                    <p className={`font-extrabold ${dayHeaderColor(i)}`}>{d}</p>
                    <p
                      className={`text-[9px] font-bold opacity-70 tabular-nums ${dayHeaderColor(i) || "text-ink-soft"}`}
                    >
                      {weekDates[i].getMonth() + 1}/{weekDates[i].getDate()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[32px_repeat(7,minmax(0,1fr))] sm:grid-cols-[44px_repeat(7,1fr)]">
                {HOURS.map((h) => (
                  <React.Fragment key={h}>
                    <div className="border-b border-border bg-surface-muted/60 grid place-items-center text-[10px] font-bold text-muted-foreground tabular-nums">
                      {String(h).padStart(2, "0")}
                    </div>
                    {DAYS.map((d, dayIndex) => {
                      const key = `${d}-${h}`;
                      const outsideHours = h < bookingStartHour || h >= bookingEndHour;
                      const closed =
                        outsideHours ||
                        defaultClosedSlots.has(`${dayIndex}-${h}`) ||
                        (bookingSchedule?.closedKeys.has(key) ?? false);
                      const isMine = selected.has(key);
                      const dem = demand[key] ?? 0;
                      const lvl = heatLevel(dem, isMine);
                      return (
                        <button
                          key={key}
                          disabled={closed}
                          onClick={() => toggle(key)}
                          className={`relative h-12 sm:h-10 border-b border-l border-border transition group
                        ${closed ? "bg-muted text-muted-foreground/60 cursor-not-allowed" : `heat-${lvl} ${submitted ? "cursor-not-allowed opacity-80" : "active:scale-[0.97] hover:ring-2 hover:ring-ink/40 hover:ring-inset"}`}
                        ${!closed && isMine ? "ring-2 ring-ink ring-inset z-10" : ""}
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
                  </React.Fragment>
                ))}
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-ink-soft sm:hidden">
              셀을 탭해서 가능한 시간을 골라주세요. 가로로 한 화면에 보여요.
            </p>
          </div>
        </div>

        {/* Match gate overlay */}
        {showGateOverlay && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-12">
            <div className="rounded-3xl bg-white shadow-pop border border-border p-6 sm:p-8 max-w-md w-[min(92%,420px)] text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              {gateState === "registered" && !bookingSchedule ? (
                <>
                  <h3 className="text-[18px] sm:text-[20px] font-black text-ink leading-tight">
                    아직 열린 조율 주차가 아니에요
                  </h3>
                  <p className="mt-3 text-[12.5px] text-ink-soft leading-relaxed">
                    {weekRangeLabel} 주차는 {displayTrainerName} 트레이너가 아직 시간 선택 요청을 보내지 않았어요.
                    받은 링크의 주차를 다시 확인해 주세요.
                  </p>
                  {matchError && (
                    <p className="mt-3 rounded-2xl bg-surface-muted px-4 py-3 text-[12px] font-semibold leading-relaxed text-ink-soft">
                      {matchError}
                    </p>
                  )}
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/profile" })}
                      className="h-11 rounded-2xl border border-border bg-white text-[13px] font-extrabold text-ink hover:bg-muted"
                    >
                      내 정보로 가기
                    </button>
                    <a
                      href={displayInstagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-primary text-[13px] font-extrabold text-white shadow-pop hover:brightness-110"
                    >
                      <Instagram className="h-4 w-4" /> 트레이너에게 문의
                    </a>
                  </div>
                </>
              ) : gateState === "notRegistered" ? (
                <>
                  <h3 className="text-[18px] sm:text-[20px] font-black text-ink leading-tight">
                    회원님은 {displayTrainerName} 트레이너님의
                    <br />
                    등록 학생이 아니세요 ㅠㅠ
                  </h3>
                  <p className="mt-3 text-[12.5px] text-ink-soft leading-relaxed">
                    {displayTrainerName} 트레이너님께 PT를 받고 싶으시다면
                    <br />
                    아래 인스타그램으로 편하게 연락해보세요!
                  </p>
                  <a
                    href={displayInstagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-primary text-white text-[13px] font-extrabold shadow-pop hover:brightness-110"
                  >
                    <Instagram className="h-4 w-4" /> 트레이너님께 문의하기
                  </a>
                  <a
                    href="mailto:support@pickgympt.com"
                    className="mt-6 block text-[10.5px] text-ink-soft underline hover:text-ink"
                  >
                    저는 {displayTrainerName} 트레이너님의 학생이 맞는데 시간 선택이 안돼요
                  </a>
                </>
              ) : gateState === "loggedOut" ? (
                <>
                  <h3 className="text-[20px] sm:text-[22px] font-black text-ink leading-tight">
                    {displayTrainerName} 트레이너님의
                    <br />
                    학생이신가요?
                  </h3>
                  <p className="mt-2 text-[12.5px] text-ink-soft">
                    맞다면 로그인하고 시간을 선택해주세요.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      onClick={handleNotStudent}
                      className="h-12 rounded-2xl bg-white border border-border text-ink text-[13px] font-extrabold hover:bg-muted"
                    >
                      엇 아니에요...
                    </button>
                    <button
                      onClick={() => navigate({ to: "/login" })}
                      className="h-12 rounded-2xl bg-primary text-white text-[13px] font-extrabold shadow-pop hover:brightness-110 inline-flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> 맞아요!
                    </button>
                  </div>
                  {matchError && (
                    <p className="mt-4 text-[12px] text-ink-soft leading-relaxed">{matchError}</p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="h-32" aria-hidden="true" />

      {/* Owner (trainer) preview bar — disables submission */}
      {isOwnerTrainer && (
        <div data-bottom-floating className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-24px))]">
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
            <button
              disabled
              className="h-11 px-4 rounded-xl bg-white/10 text-white/40 text-[13px] font-bold inline-flex items-center gap-1 shrink-0 cursor-not-allowed"
            >
              제출 불가 <Lock className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating banner (student) */}
      {effectiveUnlocked &&
        !isOwnerTrainer &&
        (() => {
          const willEarn = !unavailable && !submitted && weekPoints < 10 && (hasEmpty || fivePlus);
          const earnMsg = hasEmpty
            ? "🎉 축하해요! 아무도 선택 안 한 시간을 골라주셔서 10포인트를 선물받습니다!"
            : "🎉 축하해요! 5개 이상 시간을 선택하셔서 10포인트를 선물받습니다!";
          return (
            <div data-bottom-floating className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-24px))]">
              {willEarn && (
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 w-[min(680px,calc(100vw-32px))]">
                  <div className="rounded-full bg-emerald-500 text-white text-[12px] font-extrabold px-4 h-8 inline-flex items-center justify-center w-full shadow-pop whitespace-nowrap overflow-hidden">
                    <span className="truncate">{earnMsg}</span>
                  </div>
                </div>
              )}
              <div
                className={`rounded-2xl bg-ink text-white shadow-pink p-3 flex items-center gap-2.5 transition ${willEarn ? "ring-2 ring-emerald-500" : ""}`}
              >
                <div
                  className={`flex-1 min-w-0 flex items-center gap-2.5 transition ${submitted ? "opacity-55 pointer-events-none" : ""}`}
                >
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
                        {unavailable
                          ? "‘이번 주 PT 불가’로 트레이너에게 전달됐어요"
                          : `${selectedList.length}개 시간이 트레이너에게 전달됐어요`}
                      </p>
                    ) : unavailable ? (
                      <p className="text-[13px] font-semibold">
                        이번 주는 PT가 어려워요. 트레이너에게 자동으로 전달됩니다.
                      </p>
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
                <Link to="/" className="font-semibold hover:text-primary">
                  픽짐피티 소개
                </Link>
              </div>
            </div>
          );
        })()}

      {/* Trainer announcement editor */}
      <Dialog open={annOpen} onOpenChange={setAnnOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" /> 트레이너 공지 등록
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-ink-soft leading-relaxed">
              공지는 <b className="text-ink">한 개만 고정</b>돼요. 새 공지를 등록하면{" "}
              <b className="text-destructive">기존 공지는 사라지고 새 공지로 대체</b>됩니다.
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
            <button
              onClick={() => setAnnOpen(false)}
              className="h-10 px-4 rounded-xl bg-white border border-border-strong text-ink text-[12.5px] font-bold"
            >
              취소
            </button>
            <button
              onClick={() => {
                setAnnouncement(annDraft.trim());
                setAnnOpen(false);
                setToast({ title: "공지가 등록됐어요", sub: "학생들에게 즉시 노출됩니다" });
                setTimeout(() => setToast(null), 2400);
              }}
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
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              로그인하고 시간을 선택하세요
            </DialogTitle>
            <DialogDescription>1초 카카오 로그인 또는 이메일로 시작할 수 있어요.</DialogDescription>
          </DialogHeader>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="w-full h-12 rounded-xl bg-ink text-white text-[14px] font-extrabold"
          >
            로그인 / 회원가입 하러 가기
          </button>
        </DialogContent>
      </Dialog>

      {/* Unavailable confirm */}
      <Dialog open={confirmUnavail} onOpenChange={setConfirmUnavail}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <div className="mb-3 grid h-28 w-28 place-items-center rounded-[28px] bg-destructive/10 text-destructive [&>svg]:h-10 [&>svg]:w-10">
              <Ban className="h-5 w-5" />
            </div>
            <DialogTitle>
              이번 주 PT 불가로 표시할까요?
            </DialogTitle>
            <DialogDescription>
              선택했던 시간이 모두 취소되고, 트레이너에게 “이번 주 불가”로 전달돼요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmUnavail(false)}
              className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold"
            >
              취소
            </button>
            <button
              onClick={confirmUnavailable}
              className="h-10 px-4 rounded-full bg-destructive text-white text-[12px] font-bold"
            >
              불가로 표시
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit (modify submission) confirm */}
      <Dialog open={editConfirm} onOpenChange={setEditConfirm}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <div className="mb-3 grid h-28 w-28 place-items-center rounded-[28px] bg-primary/10 text-primary [&>svg]:h-10 [&>svg]:w-10">
              <Check className="h-5 w-5" />
            </div>
            <DialogTitle>시간을 수정하시겠어요?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {unavailable ? (
                <>
                  현재 <b className="text-ink">‘이번 주 PT 불가’</b>로 전달된 상태예요. 수정하면
                  다시 시간을 선택하거나 PT 불가를 재설정할 수 있어요.
                </>
              ) : (
                <>
                  이미 선택해 보낸 시간은 <b className="text-ink">{selectedList.length}개</b>예요.
                  수정하면 다시 시간을 고르거나 PT 불가로 바꿀 수 있고, 변경 후 다시 제출하면
                  트레이너에게 새 응답으로 전달돼요.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {!unavailable && selectedList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {selectedList.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center h-7 px-2.5 rounded-full bg-surface-muted border border-border text-ink text-[12px] font-bold"
                >
                  {s.replace("-", " ")}시
                </span>
              ))}
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setEditConfirm(false)}
              className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold"
            >
              취소
            </button>
            <button
              onClick={() => {
                if (unavailable) {
                  setUnavailable(false);
                  setSelected(new Set());
                }
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

      <Dialog open={galleryManagerOpen} onOpenChange={setGalleryManagerOpen}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>대표 사진 관리</DialogTitle>
            <DialogDescription className="leading-relaxed">
              예약 페이지 상단에 보여지는 사진이에요. PC에서는 여러 장, 모바일에서는 첫 사진만
              보여요. (최대 {MAX_GALLERY_PHOTOS}장)
            </DialogDescription>
          </DialogHeader>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleGalleryFile(file);
              e.target.value = "";
            }}
          />
          {galleryPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {galleryPhotos.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeGalleryPhoto(url)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="사진 삭제"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setGalleryManagerOpen(false)}
              className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold"
            >
              닫기
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={galleryUploading || galleryPhotos.length >= MAX_GALLERY_PHOTOS}
              className="h-10 px-4 rounded-full bg-primary text-white text-[12px] font-extrabold shadow-pop disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <Camera className="h-3.5 w-3.5" /> {galleryUploading ? "업로드 중..." : "사진 추가"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 첫/마지막 시간 설정 — available to every plan */}
      <Dialog open={hoursOpen} onOpenChange={setHoursOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>첫/마지막 시간 설정</DialogTitle>
            <DialogDescription>
              설정한 시간 바깥은 학생들의 시간표에서 항상 닫혀있어요. 새로 보내는 요청부터 적용돼요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">
                시작 시간
              </span>
              <select
                value={hoursDraft.start}
                onChange={(e) => setHoursDraft((p) => ({ ...p, start: Number(e.target.value) }))}
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-[14px] font-bold text-ink outline-none focus:border-ink focus:bg-white"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">
                마지막 시간
              </span>
              <select
                value={hoursDraft.end}
                onChange={(e) => setHoursDraft((p) => ({ ...p, end: Number(e.target.value) }))}
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-[14px] font-bold text-ink outline-none focus:border-ink focus:bg-white"
              >
                {[...HOURS, 24].map((h) => (
                  <option key={h} value={h}>
                    {h === 24 ? "24:00" : `${String(h).padStart(2, "0")}:00`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DialogFooter>
            <button
              onClick={() => setHoursOpen(false)}
              className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold"
            >
              취소
            </button>
            <button
              onClick={saveBookingHours}
              disabled={hoursSaving}
              className="h-10 px-4 rounded-full bg-primary text-white text-[12px] font-extrabold shadow-pop disabled:opacity-40"
            >
              {hoursSaving ? "저장 중..." : "저장"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upsell prompt for plans below Basic */}
      <Dialog open={upgradePromptOpen} onOpenChange={setUpgradePromptOpen}>
        <DialogContent className="max-w-[420px] text-center">
          <DialogHeader>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-600">
              <Crown className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Basic 요금제부터 사용할 수 있어요</DialogTitle>
            <DialogDescription>
              특정 시간 고정 닫기를 설정하면 매주 시간 요청을 보낼 때마다 똑같은 시간을 다시 막을 필요가
              없어져요. Basic 요금제 이상에서 사용할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setUpgradePromptOpen(false)}
              className="h-10 px-4 rounded-full bg-white border border-border text-[12px] font-bold"
            >
              닫기
            </button>
            <Link
              to="/pricing"
              onClick={() => setUpgradePromptOpen(false)}
              className="h-10 px-4 rounded-full bg-primary text-white text-[12px] font-extrabold shadow-pop inline-flex items-center justify-center"
            >
              요금제 보기
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 특정 시간 고정 닫기 — Basic plan and above, styled like the trainer's
          manual schedule-adjustment panel on /schedule. */}
      <Sheet open={defaultClosedOpen} onOpenChange={setDefaultClosedOpen}>
        <SheetContent side="right" className="w-[88vw] sm:!max-w-[50vw] overflow-y-auto">
          <SheetHeader>
            <span className="inline-flex w-fit chip bg-primary/10 text-primary">
              <CalendarOff className="h-3 w-3" /> 고정 닫기
            </span>
            <SheetTitle className="text-[20px] font-black leading-tight">특정 시간 고정 닫기</SheetTitle>
            <SheetDescription>
              매주 자동으로 닫혀있을 시간을 골라주세요. 학생들에게 새로 시간 선택 요청을 보낼 때마다 이
              시간들은 따로 막지 않아도 돼요.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[40px_repeat(7,1fr)] bg-surface-muted border-b border-border">
              <div className="p-1.5 text-[10px] text-muted-foreground font-bold text-center">시간</div>
              {DAYS.map((d) => (
                <div key={d} className="p-1.5 text-center text-[12px] font-bold text-ink">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[40px_repeat(7,1fr)] max-h-[480px] overflow-y-auto">
              {HOURS.map((h) => (
                <React.Fragment key={h}>
                  <div className="border-b border-border bg-surface-muted/60 grid place-items-center text-[10px] font-bold text-muted-foreground tabular-nums">
                    {String(h).padStart(2, "0")}
                  </div>
                  {DAYS.map((_, dayIndex) => {
                    const key = `${dayIndex}-${h}`;
                    const isOutsideHours = h < bookingStartHour || h >= bookingEndHour;
                    const isClosed = defaultClosedSlots.has(key);
                    return (
                      <button
                        key={key}
                        disabled={isOutsideHours || defaultClosedSaving}
                        onClick={() => toggleDefaultClosedSlot(dayIndex, h)}
                        className={`relative h-10 border-b border-l border-border transition ${
                          isOutsideHours
                            ? "bg-muted text-muted-foreground/40 cursor-not-allowed"
                            : isClosed
                              ? "bg-destructive/15 hover:bg-destructive/25"
                              : "hover:ring-2 hover:ring-ink/30 hover:ring-inset"
                        }`}
                      >
                        {!isOutsideHours && isClosed && (
                          <Lock className="absolute inset-0 m-auto h-3 w-3 text-destructive" />
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[12px] text-ink-soft leading-relaxed">
            회색 칸은 첫/마지막 시간 설정 바깥이라 항상 닫혀있어요. 빨간 칸을 눌러 매주 고정으로 닫을
            시간을 추가하거나 해제할 수 있어요.
          </p>
        </SheetContent>
      </Sheet>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl bg-ink text-white px-4 py-3 shadow-pop flex items-center gap-2.5 min-w-[280px]">
            <span className="h-8 w-8 rounded-full bg-primary grid place-items-center">
              {toast.title.startsWith("+") ? (
                <Coffee className="h-4 w-4 text-white" />
              ) : (
                <Check className="h-4 w-4 text-white" />
              )}
            </span>
            <div>
              <p className="text-[13px] font-extrabold leading-tight">{toast.title}</p>
              {toast.sub && <p className="text-[11px] text-white/60 mt-0.5">{toast.sub}</p>}
            </div>
          </div>
        </div>
      )}

      {isOwnerTrainer && !(trainerRecord?.onboarding_seen ?? []).includes("booking") && (
        <OnboardingTour steps={BOOKING_TOUR_STEPS} finishLabel="확인" onFinish={finishBookingTour} />
      )}
    </AppShell>
  );
}
