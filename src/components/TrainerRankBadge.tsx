import { cn } from "@/lib/utils";
import goldMedal from "@/assets/rank-medal-gold.png";
import silverMedal from "@/assets/rank-medal-silver.png";
import bronzeMedal from "@/assets/rank-medal-bronze.png";

export function TrainerRankBadge({
  rank,
  className,
}: {
  rank: 1 | 2 | 3;
  className?: string;
}) {
  const medal = rank === 1 ? goldMedal : rank === 2 ? silverMedal : bronzeMedal;

  return (
    <span
      title={`인기 트레이너 ${rank}위`}
      className={cn(
        "absolute -left-[10%] -top-[10%] z-10 grid h-[38%] w-[38%] place-items-center overflow-hidden rounded-full bg-black ring-[2px] ring-white shadow-sm",
        className,
      )}
    >
      <img
        src={medal}
        alt=""
        aria-hidden="true"
        className="h-[68%] w-[68%] object-contain"
      />
      <span className="sr-only">인기 트레이너 {rank}위</span>
    </span>
  );
}
