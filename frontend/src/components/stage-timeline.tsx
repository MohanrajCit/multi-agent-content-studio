"use client";

import React from "react";
import { Check, CircleDashed, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RunStatus, StageEvent, StageName } from "@/lib/types";

type StageState = "pending" | "running" | "completed" | "failed";

function deriveStageStates(
  events: StageEvent[],
): Record<StageName, { state: StageState; at: string | null; detail: string | null }> {
  const out = {} as Record<
    StageName,
    { state: StageState; at: string | null; detail: string | null }
  >;
  for (const { stage } of PIPELINE_STAGES) {
    out[stage] = { state: "pending", at: null, detail: null };
  }
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
    const map: Record<RunStatus, StageState | null> = {
      RUNNING: "running",
      COMPLETED: "completed",
      FAILED: "failed",
      PENDING: "pending",
      SKIPPED: "completed",
    };
    const next = map[e.status];
    if (next && out[e.stage]) {
      out[e.stage] = { state: next, at: e.created_at, detail: e.detail };
    }
  }
  return out;
}

const ICON: Record<StageState, React.ReactNode> = {
  pending: <CircleDashed className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-sky-500" />,
  completed: <Check className="h-4 w-4 text-emerald-500" />,
  failed: <X className="h-4 w-4 text-red-500" />,
};

const TONE: Record<StageState, "neutral" | "info" | "success" | "danger"> = {
  pending: "neutral",
  running: "info",
  completed: "success",
  failed: "danger",
};

export function StageTimeline({ events }: { events: StageEvent[] }) {
  const states = React.useMemo(() => deriveStageStates(events), [events]);

  return (
    <ol className="relative space-y-1">
      {PIPELINE_STAGES.map(({ stage, label }, idx) => {
        const s = states[stage];
        const isLast = idx === PIPELINE_STAGES.length - 1;
        return (
          <li key={stage} className="relative flex gap-4 pb-2">
            {!isLast ? (
              <span
                className={cn(
                  "absolute left-[15px] top-8 h-full w-px",
                  s.state === "completed" ? "bg-emerald-300" : "bg-border",
                )}
              />
            ) : null}
            <div
              className={cn(
                "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background",
                s.state === "running" && "border-sky-300",
                s.state === "completed" && "border-emerald-300",
                s.state === "failed" && "border-red-300",
              )}
            >
              {ICON[s.state]}
            </div>
            <div className="flex flex-1 items-start justify-between gap-3 pt-1">
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    s.state === "pending" && "text-muted-foreground",
                  )}
                >
                  {label}
                </p>
                {s.detail ? (
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {s.at ? (
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {formatDateTime(s.at)}
                  </span>
                ) : null}
                <Badge tone={TONE[s.state]}>
                  {s.state[0].toUpperCase() + s.state.slice(1)}
                </Badge>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
