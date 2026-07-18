"use client";

import { Gauge } from "lucide-react";

import { ScoreBar } from "@/components/score-bar";
import { ScoreRing } from "@/components/score-ring";
import { EmptyState, ErrorState } from "@/components/states";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobResults } from "@/hooks/use-jobs";
import type { DimensionScore, EvaluationReport } from "@/lib/types";

const DIMENSIONS: { key: keyof EvaluationReport; label: string }[] = [
  { key: "seo", label: "SEO" },
  { key: "readability", label: "Readability" },
  { key: "structure", label: "Structure" },
  { key: "trustworthiness", label: "Trustworthiness" },
  { key: "audience_match", label: "Audience match" },
];

export default function QualityPage({ jobId }: { jobId: string }) {
  const { data, isLoading, isError } = useJobResults(jobId);

  if (isError) return <ErrorState message="Could not load the quality scorecard." />;
  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  const evaluation = data?.evaluation ?? null;
  if (!evaluation) {
    return (
      <EmptyState
        icon={<Gauge className="h-6 w-6" />}
        title="Not evaluated yet"
        description="The quality scorecard appears once the evaluation stage completes."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publish readiness</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <ScoreRing value={evaluation.publish_readiness} label="Weighted score" />
          {evaluation.summary ? (
            <p className="text-center text-sm text-muted-foreground">
              {evaluation.summary}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dimension scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DIMENSIONS.map(({ key, label }) => {
              const dim = evaluation[key] as DimensionScore;
              return <ScoreBar key={key} label={label} value={dim.score} />;
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {DIMENSIONS.map(({ key, label }) => {
            const dim = evaluation[key] as DimensionScore;
            return (
              <Card key={key}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">{label}</CardTitle>
                  <span className="text-lg font-bold tabular-nums">
                    {Math.round(dim.score)}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dim.rationale ? (
                    <p className="text-sm text-muted-foreground">{dim.rationale}</p>
                  ) : null}
                  {dim.suggestions.length > 0 ? (
                    <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                      {dim.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
