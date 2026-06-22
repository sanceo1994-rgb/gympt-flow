import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { initializeAnalytics, setAnalyticsUser, trackEvent } from "@/lib/analytics";

const PAGE_NAMES: Record<string, string> = {
  "/": "홈",
  "/login": "로그인·회원가입",
  "/signup-email": "이메일 회원가입",
  "/auth/callback": "로그인 처리",
  "/schedule": "트레이너 일정 조율",
  "/booking": "회원 예약",
  "/students": "회원 관리",
  "/profile": "내 정보",
  "/pt-history": "PT 내역",
  "/pricing": "요금제",
  "/team": "팀 관리",
  "/account/delete": "회원 탈퇴",
  "/demo/trainer": "트레이너 화면 체험",
  "/demo/student": "회원 화면 체험",
};

function getPageName(pathname: string) {
  return PAGE_NAMES[pathname] ?? "기타 페이지";
}

export function AnalyticsProvider() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const role = (user?.user_metadata as { role?: string } | undefined)?.role ?? "unknown";

  useEffect(() => {
    void initializeAnalytics();
  }, []);

  useEffect(() => {
    if (loading) return;
    setAnalyticsUser(user?.id);
  }, [loading, user?.id]);

  useEffect(() => {
    if (loading) return;
    trackEvent("페이지 조회", {
      page_name: getPageName(location.pathname),
      path: location.pathname,
      authenticated: Boolean(user),
      role,
    });
  }, [loading, location.pathname, role, user?.id]);

  return null;
}
