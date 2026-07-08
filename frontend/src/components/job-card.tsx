import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/status-badge";
import { isActive, relativeTime, scoreBand } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";

const TONE_TEXT: Record<string, string> = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-red-600",
};

export const JobCard = React.memo(function JobCard({ job }: { job: Job }) {
  const active = isActive(job.status);
  const score = job.publish_score;

  return (
    <Link href={`/jobs/${job.id}/timeline`} className="group block">
      <Card className="transition-colors group-hover:border-primary/40 group-hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <JobStatusBadge status={job.status} />
              {active ? (
                <span className="flex items-center gap-1 text-xs text-sky-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                  live
                </span>
              ) : null}
            </div>
            <p className="truncate font-medium" title={job.topic}>
              {job.topic}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {job.audience} · {job.platform} · {relativeTime(job.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  score == null ? "text-muted-foreground" : TONE_TEXT[scoreBand(score)],
                )}
              >
                {score == null ? "—" : Math.round(score)}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                readiness
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});
