"use client";

import Link from "next/link";
import { Activity, CheckCircle2, Gauge, Inbox, PlusCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { JobCard } from "@/components/job-card";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobs } from "@/hooks/use-jobs";
import { isActive } from "@/lib/format";

export default function DashboardPage() {
  const { data: jobs, isLoading, isError } = useJobs();

  const active = (jobs ?? []).filter((j) => isActive(j.status));
  const recent = (jobs ?? []).filter((j) => !isActive(j.status)).slice(0, 8);
  const scored = (jobs ?? []).filter((j) => j.publish_score != null);
  const avgScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, j) => sum + (j.publish_score ?? 0), 0) /
            scored.length,
        )
      : null;
  const doneCount = (jobs ?? []).filter((j) => j.status === "DONE").length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Monitor active runs and review publish readiness across content jobs."
        action={
          <Button asChild>
            <Link href="/new">
              <PlusCircle className="h-4 w-4" /> New Content Job
            </Link>
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Active jobs"
          value={isLoading ? null : active.length}
        />
        <StatCard
          icon={<Inbox className="h-4 w-4" />}
          label="Total jobs"
          value={isLoading ? null : (jobs ?? []).length}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Completed"
          value={isLoading ? null : doneCount}
        />
        <StatCard
          icon={<Gauge className="h-4 w-4" />}
          label="Avg. readiness"
          value={isLoading ? null : (avgScore ?? "—")}
        />
      </div>

      {isError ? (
        <ErrorState message="Could not load jobs. Is the API running?" />
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          Active jobs
          {active.length > 0 ? (
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-sky-500" />
          ) : null}
        </h2>
        {isLoading ? (
          <ListSkeleton />
        ) : active.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="No active jobs"
            description="Kick off a new content job to see the pipeline run live."
            action={
              <Button asChild variant="outline">
                <Link href="/new">Create a job</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {active.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent jobs</h2>
          <Link
            href="/history"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </div>
        {isLoading ? (
          <ListSkeleton />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="No completed jobs yet"
            description="Finished jobs and their publish-readiness scores appear here."
          />
        ) : (
          <div className="grid gap-3">
            {recent.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        {value == null ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className="text-3xl font-bold tabular-nums">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
      ))}
    </div>
  );
}
