import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type ElementType } from "react";

type Variant = "fade-up" | "fade" | "slide-left" | "slide-right" | "scale" | "zoom";

type Props = {
  children: ReactNode;
  variant?: Variant;
  delay?: number; // ms
  duration?: number; // ms
  className?: string;
  as?: ElementType;
  once?: boolean;
  threshold?: number;
  style?: CSSProperties;
};

const VARIANTS: Record<Variant, { from: CSSProperties; to: CSSProperties }> = {
  "fade-up": {
    from: { opacity: 0, transform: "translate3d(0,28px,0)" },
    to: { opacity: 1, transform: "translate3d(0,0,0)" },
  },
  fade: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  "slide-left": {
    from: { opacity: 0, transform: "translate3d(-40px,0,0)" },
    to: { opacity: 1, transform: "translate3d(0,0,0)" },
  },
  "slide-right": {
    from: { opacity: 0, transform: "translate3d(40px,0,0)" },
    to: { opacity: 1, transform: "translate3d(0,0,0)" },
  },
  scale: {
    from: { opacity: 0, transform: "scale(0.96) translate3d(0,16px,0)" },
    to: { opacity: 1, transform: "scale(1) translate3d(0,0,0)" },
  },
  zoom: {
    from: { opacity: 0, transform: "scale(0.85)" },
    to: { opacity: 1, transform: "scale(1)" },
  },
};

export function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 700,
  className,
  as: Tag = "div",
  once = true,
  threshold = 0.15,
  style,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            if (once) io.unobserve(e.target);
          } else if (!once) {
            setShown(false);
          }
        });
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);

  const v = VARIANTS[variant];
  const merged: CSSProperties = {
    ...(shown ? v.to : v.from),
    transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    willChange: "opacity, transform",
    ...style,
  };

  const Comp = Tag as any;
  return (
    <Comp ref={ref as any} className={className} style={merged}>
      {children}
    </Comp>
  );
}
