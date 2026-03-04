import { cn } from "@/lib/utils";
import { RANK_LABELS, RANK_COLORS } from "@/lib/utils";

interface RankBadgeProps {
  rank: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function RankBadge({ rank, className, size = "md" }: RankBadgeProps) {
  const label = RANK_LABELS[rank] ?? rank;
  const colorClass = RANK_COLORS[rank] ?? "rank-vip";

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 rounded",
    md: "text-xs px-2 py-1 rounded-md font-medium",
    lg: "text-sm px-3 py-1.5 rounded-lg font-semibold",
  };

  return (
    <span className={cn(colorClass, sizeClasses[size], "inline-block", className)}>
      {label}
    </span>
  );
}
