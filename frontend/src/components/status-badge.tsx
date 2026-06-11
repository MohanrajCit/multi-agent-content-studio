import { Badge } from "@/components/ui/badge";
import { JOB_STATUS_META, RUN_STATUS_META } from "@/lib/format";
import type { JobStatus, RunStatus } from "@/lib/types";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const meta = JOB_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const meta = RUN_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
