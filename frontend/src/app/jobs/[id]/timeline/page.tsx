"use client";

import { useMemo } from "react";
import { Radio, ArrowRight, FileText } from "lucide-react";

import { StageTimeline } from "@/components/stage-timeline";
import { JobStatusBadge, RunStatusBadge } from "@/components/status-badge";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useJob, useJobStatus } from "@/hooks/use-jobs";
import { useSharedJobEvents } from "@/hooks/use-job-events";
import { STAGE_LABEL, formatDateTime, isActive } from "@/lib/format";
import type { StageEvent } from "@/lib/types";
import { useAppNavigation } from "@/app/providers";

interface TimelinePageProps {
  jobId: string;
}

export default function TimelinePage({ jobId }: TimelinePageProps) {
  const { navigate } = useAppNavigation();
  const { data: job } = useJob(jobId);
  const live = job ? isActive(job.status) : false;

  const { data: status, isLoading, isError } = useJobStatus(jobId, { live });
  const { events: sseEvents, connected, done } = useSharedJobEvents();

  // Merge authoritative (polled) + streamed events, de-duped by seq.
  const merged = useMemo<StageEvent[]>(() => {
    const bySeq = new Map<number, StageEvent>();
    for (const e of status?.events ?? []) bySeq.set(e.seq, e);
    for (const e of sseEvents) bySeq.set(e.seq, e);
    return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
  }, [status?.events, sseEvents]);

  const log = [...merged].sort((a, b) => b.seq - a.seq).slice(0, 12);

  if (isError) {
    return <ErrorState message="Could not load the workflow timeline." />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="border-slate-900 bg-[#070b13]">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-white">Pipeline progress</CardTitle>
          <StreamIndicator connected={connected} done={done} live={live} />
        </CardHeader>
        <CardContent>
          {isLoading && merged.length === 0 ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full bg-slate-900" />
              ))}
            </div>
          ) : (
            <StageTimeline events={merged} />
          )}

          {job?.status === "DONE" ? (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-900 pt-4">
              <Button onClick={() => navigate("job-detail", jobId, "draft")} size="sm" className="bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold">
                <FileText className="h-4 w-4 mr-1.5" /> View draft
              </Button>
              <Button onClick={() => navigate("job-detail", jobId, "quality")} size="sm" variant="outline" className="border-slate-800 bg-[#090f1a]/50 text-slate-300 hover:bg-slate-900">
                Quality scorecard <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-900 bg-[#070b13]">
        <CardHeader>
          <CardTitle className="text-base text-white">Event log</CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-slate-400">Job status</span>
              <JobStatusBadge status={status.status} />
            </div>
          ) : null}
          {log.length === 0 ? (
            <p className="text-sm text-slate-500">No events yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {log.map((e) => (
                <li key={e.seq} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-200">{STAGE_LABEL[e.stage]}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(e.created_at)}
                    </p>
                  </div>
                  <RunStatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StreamIndicator({
  connected,
  done,
  live,
}: {
  connected: boolean;
  done: boolean;
  live: boolean;
}) {
  if (connected && !done) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-500">
        <Radio className="h-3.5 w-3.5 animate-pulse" /> streaming
      </span>
    );
  }
  if (live) {
    return <span className="text-xs text-slate-500">connecting…</span>;
  }
  return <span className="text-xs text-slate-500">complete</span>;
}
