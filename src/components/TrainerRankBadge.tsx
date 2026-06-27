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
        "absolute -left-[6%] -top-[6%] z-10 grid h-[30%] w-[30%] place-items-center overflow-visible rounded-full bg-black ring-[2px] ring-white shadow-sm",
        className,
      )}
    >
      <img src={medal} alt="" aria-hidden="true" className="h-[58%] w-[58%] object-contain" />
      <span className="sr-only">인기 트레이너 {rank}위</span>
    </span>
  );
}
