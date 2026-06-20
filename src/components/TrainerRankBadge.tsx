import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrainerRankBadge({
  rank,
  className,
  size = 22,
}: {
  rank: 1 | 2 | 3;
  className?: string;
  size?: number;
}) {
  const tone =
    rank === 1
      ? "bg-amber-400 text-amber-950"
      : rank === 2
        ? "bg-slate-300 text-slate-700"
        : "bg-orange-300 text-orange-900";

  return (
    <span
      title={`인기 트레이너 ${rank}위`}
      className={cn(
        "absolute z-10 grid place-items-center rounded-full ring-2 ring-white shadow-sm",
        tone,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Medal style={{ width: size * 0.58, height: size * 0.58 }} strokeWidth={2.6} />
      <span className="sr-only">인기 트레이너 {rank}위</span>
    </span>
  );
}
