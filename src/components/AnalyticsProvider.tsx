import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { initializeAnalytics, setAnalyticsUser, trackEvent } from "@/lib/analytics";

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
    trackEvent("Route Viewed", {
      path: location.pathname,
      authenticated: Boolean(user),
      role,
    });
  }, [loading, location.pathname, role, user?.id]);

  return null;
}
