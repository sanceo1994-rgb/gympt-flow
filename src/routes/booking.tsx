import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Check, Info, Lock, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "학생 예약 - PickGymPT" },
      { name: "description", content: "트레이너가 등록한 학생만 본인의 가능 시간을 제출할 수 있습니다." },
    ],
  }),
  component: Booking,
});

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i);

type Roster = {
  id: string;
  trainer_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
};

type Trainer = {
  id: string;
  name: string;
  gym: string | null;
  intro: string | null;
};

type Schedule = {
  id: string;
  week_start: string;
};

type Slot = {
  id: string;
  day_of_week: number;
  hour: number;
  is_closed: boolean;
  capacity: number;
};

function nextMonday() {
  const date = new Date();
  const day = date.getDay();
  const distance = ((8 - day) % 7) || 7;
  date.setDate(date.getDate() + distance);
  return date.toISOString().slice(0, 10);
}

function slotKey(day: number, hour: number) {
  return `${day}-${hour}`;
}

function Booking() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = user?.email?.toLowerCase() ?? "";
  const userRole = (user?.user_metadata as { role?: string } | undefined)?.role;
  const isTrainer = userRole === "trainer";

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setLoading(true);
      setError(null);
      setRoster(null);
      setTrainer(null);
      setSchedule(null);
      setSlots([]);
      setSelected(new Set());

      if (!user || !email) {
        setLoading(false);
        return;
      }

      if (isTrainer) {
        const { data: trainerRow, error: trainerError } = await supabase
          .from("trainers")
          .select("id,name,gym,intro")
          .eq("user_id", user.id)
          .maybeSingle();

        if (trainerError || !trainerRow) {
          setError("트레이너 프로필을 불러오지 못했습니다.");
          setLoading(false);
          return;
        }

        setTrainer(trainerRow);
        await loadSchedule(trainerRow.id);
        setLoading(false);
        return;
      }

      const { data: rosterRow, error: rosterError } = await supabase
        .from("student_rosters" as never)
        .select("id,trainer_id,student_name,student_email,student_phone")
        .eq("student_email", email)
        .maybeSingle();

      if (rosterError) {
        setError("학생 명단을 확인할 수 없습니다. 트레이너가 학생 관리에서 먼저 등록해야 합니다.");
        setLoading(false);
        return;
      }

      if (!rosterRow) {
        setLoading(false);
        return;
      }

      const normalizedRoster = rosterRow as unknown as Roster;
      setRoster(normalizedRoster);

      const { data: trainerRow, error: trainerError } = await supabase
        .from("trainers")
        .select("id,name,gym,intro")
        .eq("id", normalizedRoster.trainer_id)
        .maybeSingle();

      if (trainerError || !trainerRow) {
        setError("담당 트레이너 정보를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      setTrainer(trainerRow);
      await loadSchedule(trainerRow.id);
      setLoading(false);
    }

    async function loadSchedule(trainerId: string) {
      const weekStart = nextMonday();
      let scheduleRow: Schedule | null = null;

      const { data: existing } = await supabase
        .from("weekly_schedules")
        .select("id,week_start")
        .eq("trainer_id", trainerId)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existing) {
        scheduleRow = existing;
      } else if (isTrainer) {
        const { data: created, error: createError } = await supabase
          .from("weekly_schedules")
          .insert({ trainer_id: trainerId, week_start: weekStart })
          .select("id,week_start")
          .single();

        if (createError) {
          setError("예약 주차를 생성하지 못했습니다.");
          return;
        }
        scheduleRow = created;
      }

      if (!scheduleRow) return;

      setSchedule(scheduleRow);
      const { data: slotRows } = await supabase
        .from("time_slots")
        .select("id,day_of_week,hour,is_closed,capacity")
        .eq("schedule_id", scheduleRow.id);

      setSlots((slotRows ?? []) as Slot[]);
    }

    void load();
  }, [authLoading, email, isTrainer, user?.id]);

  const slotByKey = useMemo(() => {
    const map = new Map<string, Slot>();
    for (const slot of slots) map.set(slotKey(slot.day_of_week, slot.hour), slot);
    return map;
  }, [slots]);

  const canBook = !!user && (!!roster || isTrainer);

  const toggle = (day: number, hour: number) => {
    if (!canBook || isTrainer) return;
    const existingSlot = slotByKey.get(slotKey(day, hour));
    if (existingSlot?.is_closed) return;

    setSelected((prev) => {
      const next = new Set(prev);
      const key = slotKey(day, hour);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const submit = async () => {
    if (!user || !schedule || !roster || selected.size === 0) return;

    const selectedPairs = Array.from(selected).map((key) => {
      const [dayText, hourText] = key.split("-");
      return { day: Number(dayText), hour: Number(hourText) };
    });

    const missing = selectedPairs.filter(({ day, hour }) => !slotByKey.has(slotKey(day, hour)));
    if (missing.length > 0) {
      const { error: slotError } = await supabase.from("time_slots").insert(
        missing.map(({ day, hour }) => ({
          schedule_id: schedule.id,
          day_of_week: day,
          hour,
          capacity: 1,
          is_closed: false,
        })),
      );
      if (slotError) {
        setError("시간 슬롯 저장에 실패했습니다.");
        return;
      }
    }

    const { data: freshSlots, error: freshError } = await supabase
      .from("time_slots")
      .select("id,day_of_week,hour,is_closed,capacity")
      .eq("schedule_id", schedule.id);

    if (freshError) {
      setError("저장된 시간 슬롯을 다시 불러오지 못했습니다.");
      return;
    }

    const freshMap = new Map<string, Slot>();
    for (const slot of (freshSlots ?? []) as Slot[]) freshMap.set(slotKey(slot.day_of_week, slot.hour), slot);

    await supabase.from("student_selections").delete().eq("schedule_id", schedule.id).eq("student_user_id", user.id);

    const payload = selectedPairs.map(({ day, hour }) => ({
      schedule_id: schedule.id,
      slot_id: freshMap.get(slotKey(day, hour))?.id ?? null,
      student_user_id: user.id,
      student_name: roster.student_name,
      status: "selected" as const,
    }));

    const { error: selectionError } = await supabase.from("student_selections").insert(payload);
    if (selectionError) {
      setError("가능 시간 제출에 실패했습니다.");
      return;
    }

    setSlots((freshSlots ?? []) as Slot[]);
    setSubmitted(true);
  };

  return (
    <AppShell>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">학생 예약</p>
        <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-black text-ink leading-tight">
          {trainer ? `${trainer.name} 트레이너 예약` : "담당 트레이너 예약"}
        </h1>
        <p className="mt-2 text-[13.5px] text-ink-soft leading-relaxed">
          {trainer?.gym ? `${trainer.gym} · ` : ""}
          트레이너가 학생 관리에 등록한 계정만 다음 주 가능 시간을 제출할 수 있습니다.
        </p>
        {trainer?.intro && <p className="mt-3 text-[13px] text-ink-soft leading-relaxed">{trainer.intro}</p>}
      </section>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] font-bold text-destructive">
          {error}
        </div>
      )}

      {!loading && !user && (
        <div className="mt-4 rounded-2xl border border-border bg-white p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-[18px] font-black text-ink">로그인이 필요합니다</h2>
          <p className="mt-2 text-[13px] text-ink-soft">학생 계정으로 로그인하면 담당 트레이너 예약 화면이 열립니다.</p>
          <button onClick={() => navigate({ to: "/login" })} className="mt-5 h-11 px-5 rounded-full bg-primary text-white text-[13px] font-extrabold inline-flex items-center gap-1.5">
            <LogIn className="h-4 w-4" /> 로그인
          </button>
        </div>
      )}

      {!loading && user && !canBook && (
        <div className="mt-4 rounded-2xl border border-border bg-white p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-[18px] font-black text-ink">등록된 학생 명단에 없습니다</h2>
          <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">
            현재 로그인한 이메일 <b className="text-ink">{email}</b> 이 담당 트레이너의 학생 관리 목록에 등록되어야 예약할 수 있습니다.
          </p>
        </div>
      )}

      {canBook && (
        <>
          {isTrainer && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-[13px] font-bold text-primary inline-flex items-center gap-2">
              <Info className="h-4 w-4" /> 트레이너 계정은 예약 화면을 미리보기만 할 수 있습니다.
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-surface-muted border border-border px-5 py-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">조율 주차</p>
              <p className="mt-0.5 text-[18px] font-black text-ink">{schedule?.week_start ?? nextMonday()}</p>
            </div>
            {selected.size > 0 && !isTrainer && (
              <span className="inline-flex items-center h-7 px-3 rounded-full bg-ink text-white text-[12px] font-bold tabular-nums">
                {selected.size}개 선택
              </span>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-border overflow-hidden bg-white">
            <div className="grid grid-cols-[44px_repeat(7,1fr)] bg-surface-muted border-b border-border">
              <div className="p-2 text-[10px] text-muted-foreground font-bold text-center">시간</div>
              {DAY_LABELS.map((day) => (
                <div key={day} className="p-2 text-center text-[13px] font-extrabold text-ink">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-[44px_repeat(7,1fr)]">
              {HOURS.map((hour) => (
                <>
                  <div key={`h-${hour}`} className="border-b border-border bg-surface-muted/60 grid place-items-center text-[10px] font-bold text-muted-foreground tabular-nums">
                    {String(hour).padStart(2, "0")}
                  </div>
                  {DAY_LABELS.map((_, day) => {
                    const key = slotKey(day, hour);
                    const slot = slotByKey.get(key);
                    const closed = !!slot?.is_closed;
                    const picked = selected.has(key);
                    return (
                      <button
                        key={key}
                        disabled={closed || isTrainer}
                        onClick={() => toggle(day, hour)}
                        className={`relative h-12 border-b border-l border-border transition ${closed ? "bg-muted text-muted-foreground cursor-not-allowed" : "hover:ring-2 hover:ring-ink/30 hover:ring-inset"} ${picked ? "bg-primary text-white" : "bg-white"}`}
                      >
                        {closed ? <Lock className="absolute inset-0 m-auto h-3 w-3" /> : picked ? <Check className="absolute inset-0 m-auto h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          {!isTrainer && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-24px))]">
              <div className="rounded-2xl bg-ink text-white shadow-pink p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-extrabold leading-tight">
                    {submitted ? "가능 시간이 저장되었습니다." : selected.size === 0 ? "가능한 시간을 선택해주세요." : `${selected.size}개 시간을 제출할 수 있습니다.`}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-white/70 leading-snug">제출하면 Supabase의 student_selections 테이블에 저장됩니다.</p>
                </div>
                <button
                  onClick={() => void submit()}
                  disabled={selected.size === 0}
                  className="h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-1 shrink-0 disabled:opacity-40 hover:brightness-110"
                >
                  제출 <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
