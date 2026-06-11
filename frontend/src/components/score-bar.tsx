import { Progress } from "@/components/ui/progress";
import { scoreBand } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE_BAR: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

interface ScoreBarProps {
  label: string;
  value: number;
  className?: string;
}

/** Labeled 0-100 dimension score with a color-coded bar. */
export function ScoreBar({ label, value, className }: ScoreBarProps) {
  const tone = scoreBand(value);
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(value)}
        </span>
      </div>
      <Progress value={value} indicatorClassName={TONE_BAR[tone]} />
    </div>
  );
}
