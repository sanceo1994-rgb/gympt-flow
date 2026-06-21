import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RightRail } from "@/components/sidebars/RightRail";
import logo from "@/assets/pickgympt-logo.png";
import { pickDisplayName } from "@/lib/display-name";
import { TrainerRankBadge } from "@/components/TrainerRankBadge";
import { useTrainerRank } from "@/hooks/use-trainer-rank";

export function MobileAccountHeader() {
  const { user, loading } = useAuth();
  const metadata = user?.user_metadata as { name?: string; avatar_url?: string } | undefined;
  const [name, setName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const trainerRank = useTrainerRank(trainerId);

  useEffect(() => {
    if (!user || String(user.id).startsWith("virtual-")) {
      setName(null);
      setAvatar(null);
      setTrainerId(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      supabase.from("trainers").select("id,name,avatar_url").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("profiles")
        .select("display_name,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle(),
    ])
      .then(([trainerResult, profileResult]) => {
        if (cancelled) return;
        setName(
          pickDisplayName(
            trainerResult.data?.name,
            profileResult.data?.display_name,
            metadata?.name,
            user.email?.split("@")[0],
          ) ?? "회원",
        );
        setAvatar(
          trainerResult.data?.avatar_url ??
            profileResult.data?.avatar_url ??
            metadata?.avatar_url ??
            null,
        );
        setTrainerId(trainerResult.data?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setName(pickDisplayName(metadata?.name, user.email?.split("@")[0]) ?? "회원");
      });
    return () => {
      cancelled = true;
    };
  }, [user, metadata?.name, metadata?.avatar_url]);

  return (
    <header className="min-[1720px]:hidden h-16 border-b border-border bg-white/95 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-40">
      <Link to="/" className="flex h-16 max-w-[52vw] items-center" aria-label="픽짐피티 홈">
        <img src={logo} alt="픽짐피티" className="h-[66px] max-w-full w-auto object-contain" />
      </Link>
      {loading ? (
        <div className="h-9 w-24 rounded-full bg-surface-muted animate-pulse" />
      ) : user ? (
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="h-10 pl-1 pr-2 rounded-full border border-border bg-white inline-flex items-center gap-2 shadow-sm"
              aria-label="내 메뉴 열기"
            >
              <span className="relative shrink-0">
                {avatar ? (
                  <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-primary/15 grid place-items-center text-[12px] font-black text-primary">
                    {(name ?? "회")[0]}
                  </span>
                )}
                {trainerRank && (
                  <TrainerRankBadge rank={trainerRank} className="!-left-1 !-top-1" size={15} />
                )}
              </span>
              <span className="max-w-20 truncate text-[12px] font-extrabold text-ink">
                {name ?? "회원"}
              </span>
              <Menu className="h-4 w-4 text-ink-soft" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] sm:!max-w-sm overflow-y-auto p-4">
            <SheetHeader className="sr-only">
              <SheetTitle>내 계정 메뉴</SheetTitle>
            </SheetHeader>
            <div className="pt-8">
              <RightRail mobileMenu />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Link
          to="/login"
          className="h-9 px-4 rounded-full bg-ink text-white inline-flex items-center text-[12px] font-bold"
        >
          로그인
        </Link>
      )}
    </header>
  );
}
