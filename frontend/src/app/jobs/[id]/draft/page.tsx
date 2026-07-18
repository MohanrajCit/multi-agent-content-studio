"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, History, Loader2, RotateCcw } from "lucide-react";

import { CompareDialog } from "@/components/compare-dialog";
import { RegenerateSectionDialog } from "@/components/regenerate-section-dialog";
import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDraft, useDrafts, useRestoreVersion } from "@/hooks/use-jobs";
import { ApiError } from "@/lib/api";
import { DRAFT_ORIGIN_LABEL, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function DraftEditorPage({ jobId }: { jobId: string }) {
  const drafts = useDrafts(jobId);
  const restore = useRestoreVersion(jobId);
  const [selected, setSelected] = useState<number | null>(null);

  // Default selection to the current version once the list loads.
  useEffect(() => {
    if (selected == null && drafts.data && drafts.data.length > 0) {
      const current = drafts.data.find((d) => d.is_current) ?? drafts.data[0];
      setSelected(current.version);
    }
  }, [drafts.data, selected]);

  const detail = useDraft(jobId, selected);

  async function handleRestore(version: number) {
    try {
      const draft = await restore.mutateAsync(version);
      toast.success(`Restored version ${version} as version ${draft.version}`);
      setSelected(draft.version);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not restore the version.";
      toast.error("Restore failed", { description: message });
    }
  }

  if (drafts.isError) {
    return <ErrorState message="Could not load drafts." />;
  }
  if (drafts.isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }
  if (!drafts.data || drafts.data.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="No draft yet"
        description="A draft appears once the writing stage completes."
      />
    );
  }

  const versions = [...drafts.data].sort((a, b) => b.version - a.version);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Draft viewer */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {detail.data?.title ?? "Draft"}
            </h2>
            {selected != null ? (
              <Badge tone="info">v{selected}</Badge>
            ) : null}
          </div>
          <CompareDialog jobId={jobId} versions={drafts.data} />
        </div>

        {detail.isLoading || selected == null ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : detail.data ? (
          <Card>
            <CardContent className="p-6">
              {detail.data.meta_description ? (
                <p className="mb-4 border-l-2 border-primary/30 pl-3 text-sm italic text-muted-foreground">
                  {detail.data.meta_description}
                </p>
              ) : null}
              <div className="space-y-6">
                {detail.data.sections.map((s) => (
                  <section key={s.section_id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">{s.heading}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {s.word_count} words
                        </span>
                        <RegenerateSectionDialog
                          jobId={jobId}
                          version={selected}
                          sectionId={s.section_id}
                          sectionHeading={s.heading}
                          onRegenerated={(v) => setSelected(v)}
                        />
                      </div>
                    </div>
                    <div className="prose-draft whitespace-pre-wrap text-sm leading-relaxed">
                      {s.content}
                    </div>
                    <Separator className="mt-4" />
                  </section>
                ))}
              </div>
              <p className="mt-4 text-right text-xs text-muted-foreground">
                {detail.data.word_count} words total
              </p>
            </CardContent>
          </Card>
        ) : (
          <ErrorState message="Could not load this version." />
        )}
      </div>

      {/* Version history */}
      <div>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <History className="h-4 w-4" />
            <CardTitle className="text-base">Version history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {versions.map((v) => {
              const active = v.version === selected;
              return (
                <div
                  key={v.version}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    active ? "border-primary bg-primary/5" : "hover:bg-accent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(v.version)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      v{v.version}
                      {v.is_current ? (
                        <Badge tone="success">current</Badge>
                      ) : null}
                    </span>
                    <Badge tone="neutral">
                      {DRAFT_ORIGIN_LABEL[v.origin] ?? v.origin}
                    </Badge>
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(v.created_at)} · {v.word_count} words
                    {v.parent_version != null ? ` · from v${v.parent_version}` : ""}
                  </p>
                  {v.regen_instruction ? (
                    <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
                      “{v.regen_instruction}”
                    </p>
                  ) : null}
                  {!v.is_current ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs"
                      onClick={() => handleRestore(v.version)}
                      disabled={restore.isPending}
                    >
                      {restore.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      Restore
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
