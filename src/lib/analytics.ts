import { createClientOnlyFn } from "@tanstack/react-start";

export type AnalyticsProperties = Record<string, string | number | boolean | null>;

// The Amplitude SDK only runs in the browser. analytics.client.ts is a
// **/*.client.* module, so Vite's import-protection plugin statically
// forbids importing it from server-evaluated code — a `typeof window`
// runtime guard doesn't satisfy that build-time check. createClientOnlyFn
// marks the whole closure (including the dynamic import) as client-only so
// it's stripped from the server bundle instead of breaking SSR entirely.
export const initializeAnalytics = createClientOnlyFn(() => {
  return import("./analytics.client").then((analytics) => analytics.initializeAnalyticsClient());
});

export const trackEvent = createClientOnlyFn(
  (eventName: string, eventProperties?: AnalyticsProperties) => {
    void import("./analytics.client").then((analytics) =>
      analytics.trackClientEvent(eventName, eventProperties),
    );
  },
);

export const setAnalyticsUser = createClientOnlyFn((userId?: string) => {
  void import("./analytics.client").then((analytics) => analytics.setClientUserId(userId));
});
