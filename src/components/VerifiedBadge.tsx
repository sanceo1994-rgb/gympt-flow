import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pink verified check badge — awarded to the first 100 trainer signups.
 * Use as an absolute-positioned overlay on a profile avatar.
 */
export function VerifiedBadge({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <span
      title="픽짐피티 첫 100 트레이너 인증"
      className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full bg-primary text-white ring-2 ring-white grid place-items-center shadow",
        className,
      )}
      style={{ height: size, width: size }}
    >
      <Check className="h-[10px] w-[10px]" strokeWidth={4} />
    </span>
  );
}
