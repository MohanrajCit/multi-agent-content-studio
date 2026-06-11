import { cn } from "@/lib/utils";
import { scoreBand } from "@/lib/format";

const TONE_STROKE: Record<string, string> = {
  success: "stroke-emerald-500",
  warning: "stroke-amber-500",
  danger: "stroke-red-500",
  info: "stroke-sky-500",
  neutral: "stroke-slate-400",
};

interface ScoreRingProps {
  /** 0-100 */
  value: number | null | undefined;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

/** Circular publish-readiness gauge. */
export function ScoreRing({
  value,
  size = 132,
  strokeWidth = 12,
  label = "Publish readiness",
  className,
}: ScoreRingProps) {
  const v = value == null ? null : Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = v == null ? circumference : circumference * (1 - v / 100);
  const tone = v == null ? "neutral" : scoreBand(v);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="fill-none stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("fill-none transition-all duration-700", TONE_STROKE[tone])}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">
            {v == null ? "—" : Math.round(v)}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
