import type { JobStatus, RunStatus, StageName } from "./types";

export const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set<JobStatus>([
  "DONE",
  "REJECTED",
  "FAILED",
]);

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function isActive(status: JobStatus): boolean {
  return !isTerminal(status);
}

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const JOB_STATUS_META: Record<JobStatus, { label: string; tone: Tone }> = {
  QUEUED: { label: "Queued", tone: "neutral" },
  VALIDATING: { label: "Validating", tone: "info" },
  RESEARCHING: { label: "Researching", tone: "info" },
  STRATEGIZING: { label: "Strategizing", tone: "info" },
  WRITING: { label: "Writing", tone: "info" },
  EVALUATING: { label: "Evaluating", tone: "info" },
  DONE: { label: "Done", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  FAILED: { label: "Failed", tone: "danger" },
};

export const RUN_STATUS_META: Record<RunStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "neutral" },
  RUNNING: { label: "Running", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  SKIPPED: { label: "Skipped", tone: "neutral" },
};

// Ordered pipeline stages with human labels (drives the timeline scaffold).
export const PIPELINE_STAGES: { stage: StageName; label: string }[] = [
  { stage: "GUARD", label: "Validation" },
  { stage: "RESEARCH", label: "Research" },
  { stage: "COMPETITOR", label: "Competitor Analysis" },
  { stage: "GAP", label: "Content Gaps" },
  { stage: "STRATEGY", label: "Strategy" },
  { stage: "WRITER", label: "Drafting" },
  { stage: "EVALUATOR", label: "Quality Evaluation" },
];

export const STAGE_LABEL: Record<StageName, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.stage, s.label]),
) as Record<StageName, string>;

export const DRAFT_ORIGIN_LABEL: Record<string, string> = {
  PIPELINE: "Pipeline",
  SECTION_REGEN: "Section regen",
  MANUAL_EDIT: "Restored",
};

/** 0-100 score → qualitative band used for color coding. */
export function scoreBand(score: number): Tone {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return iso;
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
