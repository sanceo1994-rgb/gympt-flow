import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MapPin,
  Trophy,
  Megaphone,
  ChevronRight,
  LogOut,
  Calendar,
  Users,
  User,
  CalendarHeart,
  Copy,
  Check,
  Share2,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pickDisplayName } from "@/lib/display-name";
import { TrainerRankBadge } from "@/components/TrainerRankBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTrainerRank } from "@/hooks/use-trainer-rank";
import { trackEvent } from "@/lib/analytics";
import { TrainerRankingSection } from "@/components/sidebars/TrainerRankingSection";

type AppAd = {
  id: string;
  audience: "all" | "student" | "trainer";
  placement: string;
  label: string;
  title: string;
  description: string;
  cta_label: string;
  cta_href: string;
  tone: "dark" | "primary" | "light";
  action: "link" | "copy_invite";
};

function currentWeekStartISO() {
  const monday = new Date();
  const mondayDistance = (monday.getDay() + 6) % 7;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - mondayDistance);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(
    monday.getDate(),
  ).padStart(2, "0")}`;
}

export function RightRail({ mobileMenu = false }: { mobileMenu?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const metaRole = (user?.user_metadata as { role?: string } | undefined)?.role as
    | "trainer"
    | "student"
    | undefined;
  const [dbRole, setDbRole] = useState<"trainer" | "student" | undefined>();
  const [dbName, setDbName] = useState<string | undefined>();
  const [dbTrainerId, setDbTrainerId] = useState<string | null>(null);
  const ownTrainerRank = useTrainerRank(dbTrainerId);
  const [roleResolved, setRoleResolved] = useState(false);
  const role = dbRole ?? metaRole;
  const name =
    pickDisplayName(
      dbName,
      (user?.user_metadata as { name?: string; full_name?: string } | undefined)?.name,
      (user?.user_metadata as { full_name?: string } | undefined)?.full_name,
      user?.email?.split("@")[0],
    ) ?? "회원";
  const avatar = (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url;

  const [toast, setToast] = useState<string | null>(null);
  const [ads, setAds] = useState<AppAd[]>([]);
  const [studentPoints, setStudentPoints] = useState({ week: 0, total: 0 });

  useEffect(() => {
    if (!user || String(user.id).startsWith("virtual-")) {
      setDbRole(undefined);
      setDbName(undefined);
      setDbTrainerId(null);
      setRoleResolved(true);
      return;
    }

    let cancelled = false;
    setRoleResolved(false);
    Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("trainers").select("id,name").eq("user_id", user.id).maybeSingle(),
    ])
      .then(([rolesResult, trainerResult]) => {
        if (cancelled) return;
        const roles = rolesResult.data ?? [];
        setDbName(trainerResult.data?.name ?? undefined);
        setDbTrainerId(trainerResult.data?.id ?? null);
        if (trainerResult.data || roles.some((row) => row.role === "trainer")) setDbRole("trainer");
        else if (roles.some((row) => row.role === "student")) setDbRole("student");
        else setDbRole(metaRole);
        setRoleResolved(true);
      })
      .catch(() => {
        if (!cancelled) setRoleResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, metaRole]);

  useEffect(() => {
    if (!user || role !== "student" || String(user.id).startsWith("virtual-")) {
      setStudentPoints({ week: 0, total: 0 });
      return;
    }

    let cancelled = false;
    const weekStart = currentWeekStartISO();
    supabase
      .from("points" as never)
      .select("amount,week_start")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as unknown as { amount: number; week_start: string }[];
        setStudentPoints({
          total: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
          week: rows
            .filter((row) => row.week_start === weekStart)
            .reduce((sum, row) => sum + (row.amount ?? 0), 0),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, role]);

  useEffect(() => {
    if (!mobileMenu || !roleResolved) return;
    let cancelled = false;
    const fallbackAds: AppAd[] = [
      {
        id: "trainer-pro",
        audience: "trainer",
        placement: "mobile_menu",
        label: "AD",
        title: "픽짐피티 Pro\n첫 달 50% 할인",
        description: "학생 40명과 알림톡 600건을 포함해요.",
        cta_label: "요금제 보기",
        cta_href: "/pricing",
        tone: "light",
        action: "link",
      },
      {
        id: "trainer-invite",
        audience: "trainer",
        placement: "mobile_menu",
        label: "EVENT",
        title: "동료쌤 초대 +\nBasic 14일 무료",
        description: "초대한 쌤이 첫 일정을 만들면 두 분 모두 14일 무료.",
        cta_label: "트레이너 초대 링크 복사",
        cta_href: "",
        tone: "primary",
        action: "copy_invite",
      },
    ];

    supabase
      .from("app_ads" as never)
      .select("id,audience,placement,label,title,description,cta_label,cta_href,tone,action")
      .eq("is_active", true)
      .eq("placement", "mobile_menu")
      .order("priority", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        const rows = error ? fallbackAds : ((data ?? []) as unknown as AppAd[]);
        setAds(rows.filter((ad) => ad.audience === "all" || ad.audience === role));
      });

    return () => {
      cancelled = true;
    };
  }, [mobileMenu, role, roleResolved]);
  const fireToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    try {
      localStorage.removeItem("gympt-user");
      localStorage.removeItem("gympt-users");
      window.dispatchEvent(new Event("gympt-auth"));
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
    window.location.replace("/");
  };

  const copyInvite = async () => {
    const code = (name || "PGPT").slice(0, 4).toUpperCase().padEnd(4, "X");
    const origin = typeof window !== "undefined" ? window.location.origin : "https://pickgympt.app";
    const link = `${origin}/login?invite=${code}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    try {
      await navigator.clipboard.writeText(link);
      trackEvent("Referral Link Copied", { source: "right_rail" });
      fireToast("초대 링크 복사 완료! 카톡으로 동료에게 공유해보세요 💌");
    } catch {
      fireToast("복사에 실패했어요. 다시 시도해주세요");
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
      {/* Top floating toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[80] w-[min(520px,calc(100vw-24px))] animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl bg-ink text-white shadow-pop px-4 py-3 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-primary grid place-items-center shrink-0">
              <Share2 className="h-4 w-4 text-white" />
            </span>
            <p className="text-[13px] font-extrabold leading-snug flex-1">{toast}</p>
            <Check className="h-4 w-4 text-primary shrink-0" />
          </div>
        </div>
      )}

      {/* User card */}
      {authLoading || (!!user && !roleResolved) ? (
        <div
          className="rounded-2xl bg-white border border-border p-3.5"
          aria-label="회원 정보를 불러오는 중"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-full bg-surface-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
          <div className="mt-3 h-9 animate-pulse rounded-xl bg-surface-muted" />
        </div>
      ) : user ? (
        <div className="rounded-2xl bg-white border border-border p-3.5">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/15 grid place-items-center text-[16px] font-black text-primary">
                  {name[0]}
                </div>
              )}
              {role === "trainer" && ownTrainerRank && (
                <TrainerRankBadge rank={ownTrainerRank} />
              )}
              {role === "trainer" && (
                <VerifiedBadge />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-extrabold text-ink truncate">{name}님 안녕하세요!</p>
              <p className="text-[11px] font-bold text-ink-soft mt-0.5">
                {role === "trainer" ? "트레이너" : "회원"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="로그아웃"
              className="h-7 w-7 rounded-full grid place-items-center text-ink-soft hover:bg-muted hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {role === "trainer" ? (
              <>
                <Link
                  id={mobileMenu ? "tour-nav-students-mobile" : "tour-nav-students"}
                  to="/students"
                  className="rounded-xl bg-surface-muted hover:bg-muted px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-ink"
                >
                  <Users className="h-3.5 w-3.5 text-primary" /> 학생 관리
                </Link>
                <Link
                  id={mobileMenu ? "tour-nav-booking-mobile" : "tour-nav-booking"}
                  to="/booking"
                  className="rounded-xl bg-surface-muted hover:bg-muted px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-ink"
                >
                  <CalendarHeart className="h-3.5 w-3.5 text-primary" /> 내 예약화면
                </Link>
                <Link
                  id={mobileMenu ? "tour-nav-schedule-mobile" : "tour-nav-schedule"}
                  to="/schedule"
                  className="rounded-xl bg-primary hover:brightness-110 px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-white shadow-sm"
                >
                  <Zap className="h-3.5 w-3.5 text-white" /> 빠른 일정조율
                </Link>
                <Link
                  id={mobileMenu ? "tour-nav-profile-mobile" : "tour-nav-profile"}
                  to="/profile"
                  className="rounded-xl bg-surface-muted hover:bg-muted px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-ink"
                >
                  <User className="h-3.5 w-3.5 text-ink-soft" /> 내 정보
                </Link>
              </>
            ) : (
              <>
                <div className="col-span-2 rounded-xl bg-ink px-3 py-2 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold">
                      <Trophy className="h-3.5 w-3.5 text-primary" /> 내 포인트
                    </span>
                    <span className="text-[12px] font-black tabular-nums">
                      {studentPoints.total}P
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10.5px] font-bold text-white/60">
                    이번 주 {studentPoints.week}P 적립
                  </p>
                </div>
                <Link
                  to="/pt-history"
                  className="rounded-xl bg-surface-muted hover:bg-muted px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-ink"
                >
                  <Calendar className="h-3.5 w-3.5 text-primary" /> PT 내역
                </Link>
                <Link
                  to="/profile"
                  className="rounded-xl bg-surface-muted hover:bg-muted px-2.5 py-2 flex items-center gap-1.5 text-[12px] font-bold text-ink"
                >
                  <User className="h-3.5 w-3.5 text-ink-soft" /> 내 정보
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-border p-3.5">
          <p className="text-[14px] font-extrabold text-ink">픽짐피티에 오신 걸 환영해요</p>
          <p className="mt-1 text-[12px] text-ink-soft">
            로그인하면 PT 일정과 내역을 한 번에 관리할 수 있어요.
          </p>
          <Link
            to="/login"
            className="mt-3 inline-flex h-9 items-center gap-1 px-4 rounded-full bg-ink text-white text-[12px] font-bold"
          >
            로그인 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {mobileMenu ? (
        <TrainerRankingSection />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                인기 헬스장 TOP 5
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground">실시간</span>
          </div>
          <ol className="mt-3 space-y-2.5 text-[13px]">
            {[
              ["에이블짐 당산역점", "영등포구"],
              ["센터원웰니스", "중구"],
              ["어반필드 영등포KT점", "영등포구"],
              ["장교휘트니스센터", "중구"],
              ["베럴짐 헬스앤피티 여의도점", "영등포구"],
            ].map(([name, area], i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span
                  className={`h-6 w-6 rounded-md grid place-items-center text-[11px] font-black ${i === 0 ? "bg-primary text-white" : "bg-muted text-ink-soft"}`}
                >
                  {i + 1}
                </span>
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink leading-tight truncate">{name}</p>
                  <p className="text-[11px] text-muted-foreground">{area}</p>
                </div>
                <span className="text-[10px] font-black text-primary">HOT</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {mobileMenu
        ? ads.map((ad) => {
            const toneClass =
              ad.tone === "primary"
                ? "border-primary/30 bg-primary/[0.05]"
                : ad.tone === "dark"
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-white";
            const labelClass =
              ad.tone === "dark"
                ? "bg-white/10 text-white"
                : ad.tone === "primary"
                  ? "bg-ink text-white"
                  : "bg-primary/10 text-primary";
            const titleClass = ad.tone === "dark" ? "text-white" : "text-ink";
            const bodyClass = ad.tone === "dark" ? "text-white/65" : "text-ink-soft";
            return (
              <div key={ad.id} className={`rounded-2xl border p-3.5 ${toneClass}`}>
                <span
                  className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-black tracking-widest ${labelClass}`}
                >
                  {ad.label}
                </span>
                <p className={`mt-2 whitespace-pre-line text-[15px] font-extrabold leading-tight ${titleClass}`}>
                  {ad.title}
                </p>
                <p className={`mt-1.5 text-[12px] leading-relaxed ${bodyClass}`}>
                  {ad.description}
                </p>
                {ad.action === "copy_invite" ? (
                  <button
                    onClick={copyInvite}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-[12px] font-bold text-white hover:brightness-110"
                  >
                    <Copy className="h-3.5 w-3.5" /> {ad.cta_label}
                  </button>
                ) : (
                  <Link
                    to={ad.cta_href || "/pricing"}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-full bg-ink px-4 text-[12px] font-bold text-white"
                  >
                    {ad.cta_label}
                  </Link>
                )}
              </div>
            );
          })
        : role === "trainer" && (
            <div className="rounded-2xl bg-white border border-border p-3.5">
              <span className="inline-flex items-center px-2 h-5 rounded-full bg-ink text-white text-[10px] font-black tracking-widest">
                EVENT
              </span>
              <p className="mt-3 text-[15px] font-extrabold text-ink leading-tight">
                동료쌤 초대 +<br />
                Basic 14일 무료
              </p>
              <p className="mt-2 text-[12px] text-ink-soft leading-relaxed">
                초대한 쌤이 첫 일정을 만들면 두 분 모두 14일 무료.
              </p>
              <button
                onClick={copyInvite}
                className="mt-4 inline-flex h-9 items-center gap-1.5 px-4 rounded-full bg-primary text-white text-[12px] font-bold w-full justify-center hover:brightness-110"
              >
                <Copy className="h-3.5 w-3.5" /> 트레이너 초대 링크 복사
              </button>
            </div>
          )}

      {/* Notice */}
      {!mobileMenu && (
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">공지</p>
          </div>
          <ul className="mt-2.5 space-y-2 text-[13px]">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
              <p className="text-ink leading-snug">12월 알림톡 정책 변경 안내</p>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
