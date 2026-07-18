"use client";

import { ArrowLeft } from "lucide-react";

import { JobStatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useJob } from "@/hooks/use-jobs";
import { isActive } from "@/lib/format";
import { useAppNavigation } from "@/app/providers";

export function JobHeaderBar({ jobId }: { jobId: string }) {
  const { navigate } = useAppNavigation();
  const { data: job, isLoading } = useJob(jobId);

  return (
    <div className="mb-4 space-y-3">
      <button
        onClick={() => navigate("dashboard")}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-white transition-colors focus:outline-none"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </button>

      {isLoading ? (
        <Skeleton className="h-8 w-2/3 bg-slate-900" />
      ) : job ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-white" title={job.topic}>
              {job.topic}
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {job.audience} · {job.tone} · {job.platform}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isActive(job.status) ? (
              <span className="flex items-center gap-1 text-xs text-sky-550">
                <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                live
              </span>
            ) : null}
            <JobStatusBadge status={job.status} />
          </div>
        </div>
      ) : (
        <h1 className="text-xl font-bold text-white">Job {jobId}</h1>
      )}

      {job?.status === "REJECTED" && job.rejection_reason ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Rejected by guard: {job.rejection_reason}
        </div>
      ) : null}
    </div>
  );
}
