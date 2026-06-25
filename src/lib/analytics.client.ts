import * as amplitude from "@amplitude/unified";

const AMPLITUDE_API_KEY = "5b5cc48cdc7ad73add2b6c8af697fec0";

let initialization: Promise<void> | null = null;

function getKoreanTimeProperties() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return {
    event_timezone: "Asia/Seoul",
    event_time_kst: formatter.format(now),
  };
}

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
  amplitude.track(eventName, {
    ...eventProperties,
    ...getKoreanTimeProperties(),
  });
}

export async function setClientUserId(userId?: string) {
  await initializeAnalyticsClient();
  amplitude.setUserId(userId);
}
