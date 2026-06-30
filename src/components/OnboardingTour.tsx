import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

export type TourStep = {
  targetId: string;
  badge: string;
  title: string;
  description: string;
  icon: ReactNode;
  // True when the target only exists inside the mobile "메뉴" sheet (the
  // RightRail nav links) on screens under the 1720px ultra-wide breakpoint —
  // the tour opens that sheet for the step so the target exists in the DOM.
  inMobileMenu?: boolean;
};

const ULTRAWIDE_QUERY = "(min-width: 1720px)";
const PAD = 8;
const MARGIN = 16;

// Spotlight onboarding: dims + blurs everything except a rectangle around the
// real on-page target. Rendered through a portal straight into document.body
// (same as Radix's Sheet/Dialog) so it can never end up trapped behind a
// sibling component's own stacking context, and dims via four strips around
// the target rect rather than elevating the target's own z-index — elevating
// a deeply-nested target is unreliable (sticky/fixed ancestors create their
// own stacking contexts that a child z-index can't escape), whereas simply
// never painting anything over the target's rectangle always works.
export function OnboardingTour({
  steps,
  onFinish,
  finishLabel = "시작할게요",
}: {
  steps: TourStep[];
  onFinish: () => void;
  finishLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const usesMobileMenu =
    !!step.inMobileMenu && typeof window !== "undefined" && !window.matchMedia(ULTRAWIDE_QUERY).matches;

  useEffect(() => {
    let cancelled = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let activeEl: HTMLElement | null = null;

    if (usesMobileMenu) window.dispatchEvent(new Event("gympt-open-mobile-menu"));

    const update = () => {
      if (activeEl) setRect(activeEl.getBoundingClientRect());
    };

    const attach = (el: HTMLElement) => {
      activeEl = el;
      // scrollIntoView is a no-op on position:fixed elements (they're always
      // "in view" relative to the viewport) — scroll to top instead so the
      // explanation card has room around a fixed bottom/top bar.
      if (getComputedStyle(el).position === "fixed") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      update();
      settleTimer = setTimeout(update, 550);
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);
    };

    const existing = document.getElementById(step.targetId);
    if (existing) {
      attach(existing);
    } else {
      // The mobile sheet may still be loading auth/trainer data before it even
      // renders its trigger (let alone finishes the open animation), so the
      // target can take a while to exist — poll generously, and keep
      // re-dispatching the open event in case our first dispatch fired before
      // the header's listener was attached.
      let attempts = 0;
      pollTimer = setInterval(() => {
        attempts += 1;
        if (usesMobileMenu) window.dispatchEvent(new Event("gympt-open-mobile-menu"));
        const found = document.getElementById(step.targetId);
        if (found) {
          clearInterval(pollTimer);
          if (!cancelled) attach(found);
        } else if (attempts > 100) {
          clearInterval(pollTimer);
        }
      }, 80);
    }

    return () => {
      cancelled = true;
      if (settleTimer) clearTimeout(settleTimer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      setRect(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.targetId, usesMobileMenu]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [index, rect, step.description]);

  const finish = () => {
    window.dispatchEvent(new Event("gympt-close-mobile-menu"));
    onFinish();
  };

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 0;

  // The mobile nav sheet stacks several buttons close together — anchoring
  // the card to the bottom of the screen keeps it from covering the *other*
  // buttons sitting right next to the one being explained.
  let cardTop: number;
  if (usesMobileMenu) {
    cardTop = Math.max(MARGIN, viewportH - cardHeight - MARGIN);
  } else if (!rect) {
    cardTop = Math.max(MARGIN, (viewportH - cardHeight) / 2);
  } else {
    const spaceBelow = viewportH - rect.bottom - PAD * 2;
    const spaceAbove = rect.top - PAD * 2;
    if (spaceBelow >= cardHeight + MARGIN) cardTop = rect.bottom + PAD * 2;
    else if (spaceAbove >= cardHeight + MARGIN) cardTop = Math.max(MARGIN, rect.top - PAD * 2 - cardHeight);
    else cardTop = Math.max(MARGIN, Math.min(viewportH - cardHeight - MARGIN, rect.bottom + PAD * 2));
  }

  const stripClass = "fixed bg-ink/55 backdrop-blur-[3px] transition-all duration-300";

  return createPortal(
    <div className="fixed inset-0 z-[300]" style={{ pointerEvents: "none" }}>
      {rect ? (
        <>
          <div
            className={stripClass}
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD) }}
          />
          <div
            className={stripClass}
            style={{ top: rect.bottom + PAD, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className={stripClass}
            style={{
              top: rect.top - PAD,
              left: 0,
              width: Math.max(0, rect.left - PAD),
              height: rect.height + PAD * 2,
            }}
          />
          <div
            className={stripClass}
            style={{
              top: rect.top - PAD,
              left: rect.right + PAD,
              right: 0,
              height: rect.height + PAD * 2,
            }}
          />
          <div
            className="pointer-events-none fixed rounded-2xl ring-[3px] ring-primary shadow-[0_0_0_4px_rgba(255,78,151,0.18)] transition-all duration-300"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-ink/55 backdrop-blur-[3px]" />
      )}

      <button
        onClick={finish}
        aria-label="투어 닫기"
        style={{ pointerEvents: "auto" }}
        className="fixed right-4 top-4 z-[302] grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white hover:bg-black/50"
      >
        <X className="h-4.5 w-4.5" />
      </button>

      <div
        className="fixed z-[302] flex justify-center px-4"
        style={{ pointerEvents: "auto", left: 0, width: viewportW, top: cardTop }}
      >
        <div
          ref={cardRef}
          className="w-full max-w-sm max-h-[calc(100vh-32px)] overflow-y-auto rounded-3xl bg-white p-5 shadow-pop animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex h-6 items-center rounded-full bg-primary/10 px-2.5 text-[10.5px] font-extrabold text-primary">
              {step.badge}
            </span>
            <span className="text-[11px] font-bold text-ink-soft tabular-nums">
              {index + 1} / {steps.length}
            </span>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              {step.icon}
            </span>
            <div className="min-w-0">
              <h3 className="text-[16px] font-black leading-tight text-ink">{step.title}</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{step.description}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-7 bg-primary" : "w-3.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            {!isLast && (
              <button
                onClick={finish}
                className="h-11 flex-1 rounded-xl border border-border-strong bg-white text-[12.5px] font-bold text-ink-soft hover:bg-muted"
              >
                건너뛰기
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
              className="h-11 flex-[1.4] rounded-xl bg-primary text-[13px] font-extrabold text-white shadow-pop inline-flex items-center justify-center gap-1.5 hover:brightness-110"
            >
              {isLast ? (
                <>
                  <Check className="h-4 w-4" /> {finishLabel}
                </>
              ) : (
                "다음"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
