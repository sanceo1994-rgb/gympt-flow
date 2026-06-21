import * as amplitude from "@amplitude/unified";

const AMPLITUDE_API_KEY = "5b5cc48cdc7ad73add2b6c8af697fec0";

let initialization: Promise<void> | null = null;

export function initializeAnalyticsClient() {
  if (typeof window === "undefined") return Promise.resolve();

  if (!initialization) {
    initialization = amplitude.initAll(AMPLITUDE_API_KEY, {
      analytics: { autocapture: true },
      sessionReplay: {
        sampleRate: 1,
        privacyConfig: { defaultMaskLevel: "conservative" },
      },
    });
  }

  return initialization;
}

export async function trackClientEvent(
  eventName: string,
  eventProperties?: Record<string, string | number | boolean | null>,
) {
  await initializeAnalyticsClient();
  amplitude.track(eventName, eventProperties);
}

export async function setClientUserId(userId?: string) {
  await initializeAnalyticsClient();
  amplitude.setUserId(userId);
}

