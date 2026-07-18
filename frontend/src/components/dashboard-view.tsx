"use client";

import Link from "next/link";
import { Activity, CheckCircle2, Gauge, Inbox, PlusCircle, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { JobCard } from "@/components/job-card";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobs } from "@/hooks/use-jobs";
import { isActive } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppNavigation } from "@/app/providers";

export function DashboardView() {
  const { navigate } = useAppNavigation();
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
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Monitor active pipeline runs and content publishing readiness."
        action={
          <Button 
            onClick={() => navigate("new")}
            className="bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold shadow-[0_4px_12px_rgba(249,115,22,0.2)]"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Content Job
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-4.5 w-4.5 text-orange-500" />}
          label="Active jobs"
          value={isLoading ? null : active.length}
          glowColor="rgba(249,115,22,0.15)"
        />
        <StatCard
          icon={<Inbox className="h-4.5 w-4.5 text-blue-500" />}
          label="Total jobs"
          value={isLoading ? null : (jobs ?? []).length}
          glowColor="rgba(59,130,246,0.15)"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />}
          label="Completed"
          value={isLoading ? null : doneCount}
          glowColor="rgba(16,185,129,0.15)"
        />
        <StatCard
          icon={<Gauge className="h-4.5 w-4.5 text-violet-500" />}
          label="Avg. readiness"
          value={isLoading ? null : avgScore != null ? `${avgScore}%` : "—"}
          glowColor="rgba(139,92,246,0.15)"
        />
      </div>

      {isError ? (
        <ErrorState message="Could not load jobs. Is the API running?" />
      ) : null}

      <div className="grid gap-6 md:grid-cols-5">
        {/* Active Jobs Section (takes 3 cols) */}
        <section className="md:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-md font-bold tracking-tight text-white">
              Active Pipelines
              {active.length > 0 ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              ) : null}
            </h2>
          </div>
          {isLoading ? (
            <ListSkeleton />
          ) : active.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-6 w-6 text-slate-600" />}
              title="No active pipelines"
              description="Kick off a content intelligence job to view live routing execution."
              action={
                <Button 
                  onClick={() => navigate("new")} 
                  variant="outline" 
                  className="border-slate-800 bg-[#090f1a]/50 text-slate-300 hover:bg-slate-900"
                >
                  Create a job
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

        {/* Recent Jobs Section (takes 2 cols) */}
        <section className="md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-md font-bold tracking-tight text-white">Recent Runs</h2>
            <button
              onClick={() => navigate("history")}
              className="text-xs font-semibold text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-1 focus:outline-none"
            >
              View history
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {isLoading ? (
            <ListSkeleton />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6 text-slate-600" />}
              title="No finished jobs"
              description="Completed pipelines and metrics will list here."
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
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  glowColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | null;
  glowColor: string;
}) {
  return (
    <Card className="border-slate-900 bg-[#070b13] hover:border-slate-800/80 transition-all duration-300 group relative overflow-hidden">
      {/* Subtle Glow Overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 10% 10%, ${glowColor} 0%, transparent 55%)`
        }}
      />
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </span>
          {value == null ? (
            <Skeleton className="h-9 w-16 bg-slate-900" />
          ) : (
            <p className="text-3xl font-extrabold tracking-tight text-white tabular-nums">{value}</p>
          )}
        </div>
        <div className="h-10 w-10 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[76px] w-full rounded-xl bg-slate-900" />
      ))}
    </div>
  );
}
