"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDraft } from "@/hooks/use-jobs";
import { countChanges, diffDrafts, type DiffStatus } from "@/lib/diff";
import type { DraftSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<DiffStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  unchanged: "neutral",
  added: "success",
  removed: "danger",
  changed: "warning",
};

export function CompareDialog({
  jobId,
  versions,
}: {
  jobId: string;
  versions: DraftSummary[];
}) {
  const sorted = [...versions].sort((a, b) => a.version - b.version);
  const defaultBase = sorted[0]?.version ?? 1;
  const defaultTarget = sorted[sorted.length - 1]?.version ?? defaultBase;

  const [open, setOpen] = useState(false);
  const [baseV, setBaseV] = useState(defaultBase);
  const [targetV, setTargetV] = useState(defaultTarget);

  const base = useDraft(jobId, open ? baseV : null);
  const target = useDraft(jobId, open ? targetV : null);

  const ready = base.data && target.data;
  const diffs = ready ? diffDrafts(base.data!, target.data!) : [];
  const changes = countChanges(diffs);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={versions.length < 2}>
          Compare versions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare draft versions</DialogTitle>
          <DialogDescription>
            Section-by-section diff between two versions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <VersionPicker
            label="Base"
            value={baseV}
            versions={sorted}
            onChange={setBaseV}
          />
          <span className="mt-5 text-muted-foreground">→</span>
          <VersionPicker
            label="Target"
            value={targetV}
            versions={sorted}
            onChange={setTargetV}
          />
          {ready ? (
            <span className="ml-auto mt-5 text-sm text-muted-foreground">
              {changes} changed
            </span>
          ) : null}
        </div>

        {!ready ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {diffs.map((d) => (
              <div
                key={d.section_id}
                className={cn(
                  "rounded-lg border p-3",
                  d.status === "changed" && "border-amber-300 bg-amber-50/40",
                  d.status === "added" && "border-emerald-300 bg-emerald-50/40",
                  d.status === "removed" && "border-red-300 bg-red-50/40",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">{d.heading}</p>
                  <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                </div>
                {d.status === "changed" ? (
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded bg-background p-2">
                      <p className="mb-1 font-semibold text-red-600">v{baseV}</p>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {d.base?.content}
                      </p>
                    </div>
                    <div className="rounded bg-background p-2">
                      <p className="mb-1 font-semibold text-emerald-600">v{targetV}</p>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {d.target?.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {(d.target ?? d.base)?.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VersionPicker({
  label,
  value,
  versions,
  onChange,
}: {
  label: string;
  value: number;
  versions: DraftSummary[];
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {versions.map((v) => (
            <SelectItem key={v.version} value={String(v.version)}>
              Version {v.version}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
