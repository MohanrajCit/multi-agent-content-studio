"use client";

import Link from "next/link";
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

const TONE_TEXT: Record<string, string> = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-red-600",
};

export default function HistoryPage() {
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
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-56 pl-8"
            />
          </div>
        }
      />

      {isError ? (
        <ErrorState message="Could not load job history." />
      ) : isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="h-6 w-6" />}
          title={q ? "No matching jobs" : "No jobs yet"}
          description={
            q ? "Try a different search term." : "Create a content job to get started."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead className="hidden md:table-cell">Audience</TableHead>
                <TableHead className="hidden sm:table-cell">Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Readiness</TableHead>
                <TableHead className="hidden lg:table-cell text-right">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job) => (
                <TableRow key={job.id} className="cursor-pointer">
                  <TableCell className="max-w-[280px]">
                    <Link
                      href={`/jobs/${job.id}/timeline`}
                      className="font-medium hover:underline"
                    >
                      <span className="line-clamp-1">{job.topic}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    <span className="line-clamp-1">{job.audience}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
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
                          ? "text-muted-foreground"
                          : TONE_TEXT[scoreBand(job.publish_score)],
                      )}
                    >
                      {job.publish_score == null
                        ? "—"
                        : Math.round(job.publish_score)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-muted-foreground">
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
