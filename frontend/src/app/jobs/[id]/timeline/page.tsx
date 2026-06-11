"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
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
import { useJobEvents } from "@/hooks/use-job-events";
import { STAGE_LABEL, formatDateTime, isActive } from "@/lib/format";
import type { StageEvent } from "@/lib/types";

export default function TimelinePage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { data: job } = useJob(jobId);
  const live = job ? isActive(job.status) : false;

  const { data: status, isLoading, isError } = useJobStatus(jobId, { live });
  const { events: sseEvents, connected, done } = useJobEvents(jobId, true);

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
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Pipeline progress</CardTitle>
          <StreamIndicator connected={connected} done={done} live={live} />
        </CardHeader>
        <CardContent>
          {isLoading && merged.length === 0 ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <StageTimeline events={merged} />
          )}

          {job?.status === "DONE" ? (
            <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
              <Button asChild size="sm">
                <Link href={`/jobs/${jobId}/draft`}>
                  <FileText className="h-4 w-4" /> View draft
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/jobs/${jobId}/quality`}>
                  Quality scorecard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event log</CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Job status</span>
              <JobStatusBadge status={status.status} />
            </div>
          ) : null}
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {log.map((e) => (
                <li key={e.seq} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{STAGE_LABEL[e.stage]}</p>
                    <p className="text-xs text-muted-foreground">
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
      <span className="flex items-center gap-1.5 text-xs font-medium text-sky-600">
        <Radio className="h-3.5 w-3.5 animate-pulse" /> streaming
      </span>
    );
  }
  if (live) {
    return <span className="text-xs text-muted-foreground">connecting…</span>;
  }
  return <span className="text-xs text-muted-foreground">complete</span>;
}
