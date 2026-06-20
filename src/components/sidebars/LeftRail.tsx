import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, CalendarHeart, ChevronDown, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import logo from "@/assets/pickgympt-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/hooks/use-auth";
import { pickDisplayName } from "@/lib/display-name";
import { TrainerRankBadge } from "@/components/TrainerRankBadge";
import { rankTrainerRows } from "@/lib/trainer-ranking";

const FALLBACK_COLORS = ["#E23A8A", "#2563EB", "#16A34A", "#F59E0B", "#7C3AED"];
const LEGACY_THEME_BY_ID: Record<string, { theme_from: string; theme_to: string }> = {
  "0b8781ee-55af-489c-9737-a4b081f596f9": { theme_from: "#E23A8A", theme_to: "#FF8AC2" },
  "ab0645e2-8477-43da-8d6f-7ccc0bba078a": { theme_from: "#2563EB", theme_to: "#7DD3FC" },
  "cdec3cbd-c840-407a-a3a1-f8cb987d5359": { theme_from: "#16A34A", theme_to: "#86EFAC" },
  "95d63246-1b34-419e-97e3-2ae8d3e62bc3": { theme_from: "#F59E0B", theme_to: "#FDE68A" },
  "2d0fdf86-5a16-4b11-b2ca-4da63b8b075c": { theme_from: "#7C3AED", theme_to: "#C4B5FD" },
};

type SidebarTrainer = {
  id: string;
  name: string;
  gym: string | null;
  created_at: string;
  avatar_url?: string | null;
  theme_from?: string | null;
  theme_to?: string | null;
};

function gymLabel(gym: string | null) {
  return gym || "소속 센터 준비 중";
}

function trainerHref(id: string) {
  return `/booking?trainer=${id}`;
}

function rememberTrainer(trainer: SidebarTrainer) {
  sessionStorage.setItem("gympt-selected-trainer", JSON.stringify(trainer));
}

function TrainerAvatar({
  trainer,
  index,
  className,
}: {
  trainer: SidebarTrainer;
  index: number;
  className: string;
}) {
  const color = trainer.theme_from || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  if (trainer.avatar_url)
    return <img src={trainer.avatar_url} alt="" className={`${className} object-cover`} />;
  return (
    <div
      className={`${className} grid place-items-center font-black text-white`}
      style={{ backgroundColor: color }}
    >
      {trainer.name.charAt(0)}
    </div>
  );
}

export function LeftRail() {
  const { user } = useAuth();
  const [bizOpen, setBizOpen] = useState(false);
  const [trainers, setTrainers] = useState<SidebarTrainer[]>([]);
  const [myTrainer, setMyTrainer] = useState<SidebarTrainer | null>(null);

  const loadTrainers = useCallback(async () => {
    const { data, error } = await supabase
      .from("trainers")
      .select("id,name,gym,created_at,avatar_url,theme_from,theme_to")
      .order("created_at", { ascending: false });

    if (!error) {
      setTrainers(
        (data ?? []).flatMap((trainer) => {
          const name = pickDisplayName(trainer.name);
          return name ? [{ ...trainer, name }] : [];
        }) as SidebarTrainer[],
      );
      return;
    }

    const { data: legacyData } = await supabase
      .from("trainers")
      .select("id,name,gym,created_at")
      .order("created_at", { ascending: false });
    const compatibleRows = (legacyData ?? []).map((trainer) => ({
      ...trainer,
      ...LEGACY_THEME_BY_ID[trainer.id],
    }));
    setTrainers(
      compatibleRows.flatMap((trainer) => {
        const name = pickDisplayName(trainer.name);
        return name ? [{ ...trainer, name }] : [];
      }) as SidebarTrainer[],
    );
  }, []);

  useEffect(() => {
    void loadTrainers();

    const channel = supabase
      .channel("left-rail-trainers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trainers" },
        () => void loadTrainers(),
      )
      .subscribe();
    const refresh = () => void loadTrainers();
    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, [loadTrainers]);

  useEffect(() => {
    if (
      !user ||
      !trainers.length ||
      (user.user_metadata as { role?: string } | undefined)?.role === "trainer"
    ) {
      setMyTrainer(null);
      return;
    }

    let cancelled = false;
    const loadMyTrainer = async () => {
      let roster = (
        await supabase
          .from("student_rosters" as never)
          .select("trainer_id")
          .eq("student_user_id", user.id)
          .limit(1)
          .maybeSingle()
      ).data as { trainer_id: string } | null;

      if (!roster && user.email) {
        roster = (
          await supabase
            .from("student_rosters" as never)
            .select("trainer_id")
            .eq("student_email", user.email.toLowerCase())
            .limit(1)
            .maybeSingle()
        ).data as { trainer_id: string } | null;
      }

      if (!cancelled)
        setMyTrainer(
          roster ? (trainers.find((trainer) => trainer.id === roster.trainer_id) ?? null) : null,
        );
    };
    void loadMyTrainer();
    return () => {
      cancelled = true;
    };
  }, [trainers, user]);

  const newest = useMemo(() => trainers.slice(0, 3), [trainers]);
  const ranked = useMemo(() => rankTrainerRows(trainers).slice(0, 5), [trainers]);
  const rankById = useMemo(
    () => new Map(ranked.slice(0, 3).map((trainer, index) => [trainer.id, (index + 1) as 1 | 2 | 3])),
    [ranked],
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
      <div className="flex min-h-full flex-col">
        <Link to="/" className="block px-4 -mt-2 -mb-1">
          <div className="flex items-center justify-center">
            <img
              src={logo}
              alt="픽짐피티"
              className="h-20 xl:h-24 w-auto origin-center object-contain scale-150"
            />
          </div>
          <p className="-mt-4 origin-center scale-150 text-center text-[13px] font-black text-ink leading-none tracking-tight">
            PT 일정 조율, <span className="text-primary">50배</span> 빠르게.
          </p>
        </Link>

        <div className="mt-12 space-y-2.5">
          <div className="rounded-2xl bg-white border border-border p-3.5">
            <span className="inline-flex items-center px-2 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-widest">
              AD
            </span>
            <p className="mt-1.5 text-[15px] font-extrabold text-ink leading-tight">
              픽짐피티 Pro
              <br />첫 달 50% 할인
            </p>
            <p className="mt-1 text-[11.5px] text-ink-soft leading-relaxed">
              학생 40명과 알림톡 600건을 포함해요.
            </p>
            <Link
              to="/pricing"
              className="mt-2.5 inline-flex h-8 items-center px-4 rounded-full bg-ink text-white text-[11.5px] font-bold w-full justify-center"
            >
              요금제 보기
            </Link>
          </div>

          <section className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="px-3.5 pb-3 pt-3.5">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  트레이너 랭킹
                </h2>
              </div>

              {myTrainer && (
                <a
                  href={trainerHref(myTrainer.id)}
                  onClick={() => rememberTrainer(myTrainer)}
                  className="mt-3 block rounded-[16px] border-2 border-ink/70 bg-transparent p-3 transition hover:border-ink"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-primary px-2 py-1 text-[9px] font-black text-white">
                      나의 트레이너
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                      <CalendarHeart className="h-3 w-3" /> 예약 화면
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative shrink-0">
                      <TrainerAvatar
                        trainer={myTrainer}
                        index={0}
                        className="h-12 w-12 rounded-full ring-2 ring-white"
                      />
                      {rankById.get(myTrainer.id) && (
                        <TrainerRankBadge
                          rank={rankById.get(myTrainer.id)!}
                          className="!-left-1.5 !-top-1.5"
                          size={20}
                        />
                      )}
                      <VerifiedBadge size={16} className="!-bottom-0.5 !-right-0.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-black text-ink">
                        {myTrainer.name} 트레이너
                      </p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {gymLabel(myTrainer.gym)}
                      </p>
                    </div>
                  </div>
                </a>
              )}

              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  신규 트레이너
                </p>
                <span className="text-[10px] text-muted-foreground">최근 가입</span>
              </div>
              {newest.length ? (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {newest.map((trainer, index) => (
                    <a
                      key={trainer.id}
                      href={trainerHref(trainer.id)}
                      onClick={() => rememberTrainer(trainer)}
                      className="group min-w-0 rounded-[13px] bg-[#F7F7F9] px-1 py-2 text-center transition hover:bg-primary/[0.05]"
                    >
                      <div className="relative mx-auto w-fit">
                        <TrainerAvatar
                          trainer={trainer}
                          index={index}
                          className="h-10 w-10 rounded-full ring-1 ring-black/[0.04]"
                        />
                        <span className="absolute -left-1 -top-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[7px] font-black text-amber-800 ring-2 ring-[#F7F7F9]">
                          NEW
                        </span>
                        {rankById.get(trainer.id) && (
                          <TrainerRankBadge
                            rank={rankById.get(trainer.id)!}
                            className="!-right-1 !-top-1"
                            size={17}
                          />
                        )}
                        {index === 0 && (
                          <VerifiedBadge size={15} className="!-bottom-0.5 !-right-0.5" />
                        )}
                      </div>
                      <p className="mt-1.5 truncate text-[13px] font-semibold leading-tight text-ink">
                        {trainer.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {gymLabel(trainer.gym)}
                      </p>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="mt-2 h-[70px] animate-pulse rounded-xl bg-surface-muted" />
              )}
            </div>

            <div className="h-px bg-border/80" />

            <div className="px-3 pb-2.5 pt-3">
              <div className="flex items-center justify-between px-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  인기 트레이너 TOP 5
                </p>
              </div>

              {ranked.length ? (
                <>
                  <a
                    href={trainerHref(ranked[0].id)}
                    onClick={() => rememberTrainer(ranked[0])}
                    className="mt-2 flex items-center gap-2 rounded-[14px] border border-primary/10 bg-[#FFF1F8] p-2 transition hover:border-primary/25"
                  >
                    <div className="relative shrink-0">
                      <TrainerAvatar
                        trainer={ranked[0]}
                        index={0}
                        className="h-10 w-10 rounded-full ring-2 ring-white"
                      />
                      <span className="absolute -left-1.5 -top-1.5">
                        <TrainerRankBadge rank={1} className="static ring-[#FFF1F8]" size={20} />
                      </span>
                      <VerifiedBadge size={15} className="!-bottom-0.5 !-right-0.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                        {ranked[0].name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {gymLabel(ranked[0].gym)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black text-ink">1위</p>
                      <p className="mt-0.5 inline-flex items-center text-[11px] font-bold text-primary">
                        <ArrowUp className="h-3 w-3" />
                        12.4%
                      </p>
                    </div>
                  </a>
                  <ol className="mt-1">
                    {ranked.slice(1).map((trainer, index) => {
                      const trend = [8.1, 4.6, -1.8, 2.2][index];
                      const isUp = trend >= 0;
                      return (
                        <li key={trainer.id}>
                          <a
                            href={trainerHref(trainer.id)}
                            onClick={() => rememberTrainer(trainer)}
                            className="grid grid-cols-[24px_32px_1fr_auto] items-center gap-2 rounded-xl px-1 py-2 transition hover:bg-muted/70"
                          >
                            <span className="grid h-6 w-6 place-items-center rounded-md bg-muted text-[11px] font-black text-ink-soft">
                              {index + 2}
                            </span>
                            <div className="relative">
                              <TrainerAvatar
                                trainer={trainer}
                                index={index + 1}
                                className="h-8 w-8 rounded-full"
                              />
                              {index < 2 && (
                                <span className="absolute -left-1.5 -top-1.5">
                                  <TrainerRankBadge
                                    rank={(index + 2) as 2 | 3}
                                    className="static"
                                    size={20}
                                  />
                                </span>
                              )}
                              {index === 0 && (
                                <VerifiedBadge size={13} className="!-bottom-0.5 !-right-0.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                                {trainer.name}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {gymLabel(trainer.gym)}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center text-[11px] font-bold tabular-nums ${isUp ? "text-primary" : "text-muted-foreground"}`}
                            >
                              {isUp ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )}
                              {Math.abs(trend)}%
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </>
              ) : (
                <div className="mt-2 h-28 animate-pulse rounded-xl bg-surface-muted" />
              )}
            </div>
          </section>
        </div>

        <div className="mt-auto px-2 pt-4 pb-7 text-[10.5px] text-ink-soft">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-ink">
              이용약관
            </Link>
            <span className="text-border">·</span>
            <Link to="/" className="hover:text-ink">
              개인정보처리방침
            </Link>
            <span className="text-border">·</span>
            <Link to="/" className="hover:text-ink">
              광고/협업 문의
            </Link>
          </div>
          <button
            onClick={() => setBizOpen((value) => !value)}
            className="mt-2 mx-auto flex items-center gap-1 text-[10.5px] text-ink-soft hover:text-ink"
          >
            사업자정보 보기{" "}
            <ChevronDown className={`h-3 w-3 transition ${bizOpen ? "rotate-180" : ""}`} />
          </button>
          {bizOpen && (
            <div className="mt-2 rounded-lg bg-white border border-border p-3 leading-relaxed text-[10.5px]">
              <p>
                <b className="text-ink">상호</b> 와이낫스피릿 주식회사
              </p>
              <p>
                <b className="text-ink">대표</b> 김산
              </p>
              <p>
                <b className="text-ink">사업자등록번호</b> 596-81-03128
              </p>
              <p>
                <b className="text-ink">주소</b> 서울시 마포구 서강대길 22, 2층 4호
              </p>
              <p>
                <b className="text-ink">고객센터</b> pickgympt@gmail.com
              </p>
              <p className="mt-1.5 text-ink-soft/70">© 2026 PickGymPT</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
