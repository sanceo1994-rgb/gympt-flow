import * as amplitude from "@amplitude/unified";

const AMPLITUDE_API_KEY = "5b5cc48cdc7ad73add2b6c8af697fec0";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

let initialization: Promise<void> | null = null;
let googleAnalyticsInitialization: Promise<void> | null = null;

type AnalyticsProperties = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

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
  if (!isAnalyticsEnabledForCurrentHost()) return Promise.resolve();

  if (!initialization) {
    initialization = Promise.all([
      amplitude.initAll(AMPLITUDE_API_KEY, {
        analytics: { autocapture: true },
        sessionReplay: {
          sampleRate: 1,
          privacyConfig: { defaultMaskLevel: "conservative" },
        },
      }),
      initializeGoogleAnalytics(),
    ]).then(() => undefined);
  }

  return initialization;
}

export async function trackClientEvent(eventName: string, eventProperties?: AnalyticsProperties) {
  if (typeof window === "undefined" || !isAnalyticsEnabledForCurrentHost()) return;

  await initializeAnalyticsClient();
  const properties = {
    ...eventProperties,
    ...getKoreanTimeProperties(),
  };

  amplitude.track(eventName, properties);
  trackGoogleAnalyticsEvent(eventName, properties);
}

export async function setClientUserId(userId?: string) {
  if (typeof window === "undefined" || !isAnalyticsEnabledForCurrentHost()) return;

  await initializeAnalyticsClient();
  amplitude.setUserId(userId);
  setGoogleAnalyticsUser(userId);
}

function initializeGoogleAnalytics() {
  if (!isAnalyticsEnabledForCurrentHost()) return Promise.resolve();
  if (!GA_MEASUREMENT_ID) return Promise.resolve();
  if (googleAnalyticsInitialization) return googleAnalyticsInitialization;

  googleAnalyticsInitialization = new Promise<void>((resolve) => {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag =
      window.gtag ??
      function gtag() {
        window.dataLayer?.push(arguments);
      };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-analytics-provider="google-analytics"][data-measurement-id="${GA_MEASUREMENT_ID}"]`,
    );

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    script.dataset.analyticsProvider = "google-analytics";
    script.dataset.measurementId = GA_MEASUREMENT_ID;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return googleAnalyticsInitialization;
}

function trackGoogleAnalyticsEvent(eventName: string, properties: AnalyticsProperties) {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  if (eventName === "페이지 조회") {
    window.gtag("event", "page_view", {
      page_title: typeof properties.page_name === "string" ? properties.page_name : document.title,
      page_path: typeof properties.path === "string" ? properties.path : window.location.pathname,
      ...toGoogleAnalyticsParams(properties),
    });
    return;
  }

  window.gtag("event", toGoogleAnalyticsEventName(eventName), toGoogleAnalyticsParams(properties));
}

function setGoogleAnalyticsUser(userId?: string) {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag("set", { user_id: userId || undefined });
}

function isAnalyticsEnabledForCurrentHost() {
  const hostname = window.location.hostname.toLowerCase();

  if (["localhost", "0.0.0.0", "::1"].includes(hostname)) return false;
  if (hostname.endsWith(".local")) return false;
  if (/^127\./.test(hostname)) return false;
  if (/^10\./.test(hostname)) return false;
  if (/^192\.168\./.test(hostname)) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return false;

  return true;
}

function toGoogleAnalyticsParams(properties: AnalyticsProperties) {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      toGoogleAnalyticsParamName(key),
      value ?? undefined,
    ]),
  );
}

function toGoogleAnalyticsEventName(eventName: string) {
  const normalized = eventName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return normalized || "custom_event";
}

function toGoogleAnalyticsParamName(paramName: string) {
  const normalized = paramName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return normalized || "param";
}
