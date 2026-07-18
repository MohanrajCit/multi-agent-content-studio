"use client";

import { useMemo, useState } from "react";
import { History as HistoryIcon, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { JobStatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/states";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJobs } from "@/hooks/use-jobs";
import { formatDateTime, scoreBand } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppNavigation } from "@/app/providers";

const TONE_TEXT: Record<string, string> = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-red-600",
};

export default function HistoryPage() {
  const { navigate } = useAppNavigation();
  const { data: jobs, isLoading, isError } = useJobs();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = jobs ?? [];
    if (!term) return list;
    return list.filter(
      (j) =>
        j.topic.toLowerCase().includes(term) ||
        j.audience.toLowerCase().includes(term) ||
        j.platform.toLowerCase().includes(term),
    );
  }, [jobs, q]);

  return (
    <div>
      <PageHeader
        title="History"
        description="Every content job, newest first."
        action={
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search jobs…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-56 pl-8 border-slate-800 bg-[#070b13] text-white focus:border-orange-500/50"
            />
          </div>
        }
      />

      {isError ? (
        <ErrorState message="Could not load job history." />
      ) : isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl bg-slate-900" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="h-6 w-6 text-slate-600" />}
          title={q ? "No matching jobs" : "No jobs yet"}
          description={
            q ? "Try a different search term." : "Create a content job to get started."
          }
        />
      ) : (
        <div className="rounded-xl border border-slate-900 bg-[#070b13]">
          <Table>
            <TableHeader className="border-b border-slate-900">
              <TableRow className="hover:bg-transparent border-b border-slate-900">
                <TableHead className="text-slate-400">Topic</TableHead>
                <TableHead className="hidden md:table-cell text-slate-400">Audience</TableHead>
                <TableHead className="hidden sm:table-cell text-slate-400">Platform</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-right text-slate-400">Readiness</TableHead>
                <TableHead className="hidden lg:table-cell text-right text-slate-400">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job) => (
                <TableRow 
                  key={job.id} 
                  className="cursor-pointer border-b border-slate-900/60 hover:bg-slate-900/20"
                  onClick={() => navigate("job-detail", job.id, "timeline")}
                >
                  <TableCell className="max-w-[280px]">
                    <span className="font-medium text-slate-200 hover:underline line-clamp-1">
                      {job.topic}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-400">
                    <span className="line-clamp-1">{job.audience}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-slate-400">
                    {job.platform}
                  </TableCell>
                  <TableCell>
                    <JobStatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        job.publish_score == null
                          ? "text-slate-500"
                          : TONE_TEXT[scoreBand(job.publish_score)],
                      )}
                    >
                      {job.publish_score == null
                        ? "—"
                        : Math.round(job.publish_score)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-slate-500">
                    {formatDateTime(job.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
