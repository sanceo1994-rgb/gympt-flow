import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pickDisplayName } from "@/lib/display-name";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "카카오 로그인 — 픽짐피티" }] }),
  component: KakaoCallback,
});

function KakaoCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      // Implicit flow: Supabase Auth redirects back with the session in the
      // URL hash (#access_token=...), not a ?code= query param. Errors can
      // land in either spot depending on where the redirect chain broke.
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const providerError =
        queryParams.get("error_description") ||
        queryParams.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error");
      if (providerError) throw new Error(providerError);

      // supabase-js parses the hash and establishes the session during
      // client init; getSession() awaits that before returning.
      const { data: sessionResult, error } = await supabase.auth.getSession();
      if (error) throw error;
      const user = sessionResult.session?.user;
      if (!user) throw new Error("카카오에서 로그인 정보를 받지 못했습니다.");

      const [{ data: roles }, { data: trainer }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1),
        supabase.from("trainers").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      if (trainer || (roles ?? []).length > 0) {
        trackEvent("Authentication Completed", {
          method: "kakao",
          flow: "login",
          role: trainer ? "trainer" : (roles?.[0]?.role ?? "unknown"),
        });
        setComplete(true);
        setTimeout(() => navigate({ to: "/profile", replace: true }), 500);
        return;
      }

      const metadata = user.user_metadata ?? {};
      const pendingProfile = {
        name:
          pickDisplayName(metadata.name, metadata.full_name, metadata.nickname) ??
          user.email?.split("@")[0] ??
          "",
        email: user.email ?? "",
        phone: "",
        avatar: metadata.avatar_url || metadata.picture || "",
      };
      sessionStorage.setItem("gympt-kakao-onboarding", JSON.stringify(pendingProfile));
      window.location.replace("/login?oauth=kakao");
    }

    finishLogin().catch((error: unknown) => {
      if (cancelled) return;
      setErrorMessage(error instanceof Error ? error.message : "카카오 로그인에 실패했습니다.");
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-7 text-center shadow-sm">
        {errorMessage ? (
          <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[19px] font-black text-ink">카카오 로그인을 완료하지 못했어요</h1>
            <p className="mt-2 break-words text-[12.5px] leading-relaxed text-ink-soft">{errorMessage}</p>
            <button
              onClick={() => navigate({ to: "/login", replace: true })}
              className="mt-5 h-11 w-full rounded-xl bg-ink text-[13px] font-extrabold text-white"
            >
              로그인으로 돌아가기
            </button>
          </>
        ) : complete ? (
          <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Check className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[19px] font-black text-ink">로그인 완료</h1>
            <p className="mt-2 text-[12.5px] text-ink-soft">내 정보로 이동하고 있어요.</p>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-[19px] font-black text-ink">카카오 계정을 확인하고 있어요</h1>
            <p className="mt-2 text-[12.5px] text-ink-soft">창을 닫지 말고 잠시만 기다려주세요.</p>
          </>
        )}
      </div>
    </main>
  );
}
