import { cn } from "@/lib/utils";
import verifiedMuscle from "@/assets/verified-muscle.png";

/**
 * 픽짐피티 첫 100 트레이너 인증 배지.
 * 12갈래 꽃/별 모양의 외곽선 안에 근육 아이콘이 들어가요.
 */
export function VerifiedBadge({ className }: { className?: string }) {
  // 12-point flower-ish star polygon (alternating outer/inner radii) on a viewBox of 100x100
  const points = (() => {
    const cx = 50, cy = 50;
    const spikes = 12;
    const outer = 48;
    const inner = 36;
    const arr: string[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      arr.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return arr.join(" ");
  })();

  return (
    <span
      title="픽짐피티 첫 100 트레이너 인증"
      className={cn(
        "absolute -bottom-[10%] -right-[10%] grid h-[51%] w-[51%] place-items-center drop-shadow text-primary",
        className,
      )}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <polygon
          points={points}
          fill="currentColor"
          stroke="white"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </svg>
      <img
        src={verifiedMuscle}
        alt=""
        aria-hidden="true"
        className="relative object-contain"
        style={{ height: "62%", width: "62%" }}
      />
    </span>
  );
}
