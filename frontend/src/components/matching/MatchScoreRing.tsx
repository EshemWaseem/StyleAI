// components/matching/MatchScoreRing.tsx
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}

export function MatchScoreRing({ score, size = 60, label, className }: Props) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;

  const tone =
    score >= 80 ? "text-emerald-500"
    : score >= 60 ? "text-blue-500"
    : score >= 40 ? "text-amber-500"
    : "text-muted-foreground";

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={4}
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className={cn("transition-all", tone)}
          style={{ stroke: "currentColor" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={cn("font-display text-sm font-medium tabular-nums", tone)}>
          {Math.round(score)}
        </span>
      </div>
      {label && (
        <span className="absolute -bottom-5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}