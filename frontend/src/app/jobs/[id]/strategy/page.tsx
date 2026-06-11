"use client";

import { useParams } from "next/navigation";
import { ListChecks, Search } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobResults } from "@/hooks/use-jobs";

function Chips({ items, tone = "neutral" as const }: { items: string[]; tone?: "neutral" | "info" }) {
  if (items.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <Badge key={`${t}-${i}`} tone={tone}>
          {t}
        </Badge>
      ))}
    </div>
  );
}

export default function StrategyPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useJobResults(jobId);

  if (isError) return <ErrorState message="Could not load the content strategy." />;
  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  const strategy = data?.strategy ?? null;
  if (!strategy) {
    return (
      <EmptyState
        icon={<ListChecks className="h-6 w-6" />}
        title="Strategy not available yet"
        description="The content strategy appears once the strategy stage completes."
      />
    );
  }

  const totalWords = strategy.outline.reduce(
    (sum, s) => sum + (s.estimated_words ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{strategy.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Brief
            </h4>
            <p className="text-sm leading-relaxed">{strategy.brief}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Search className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Search intent
                </p>
                <p className="text-sm">{strategy.search_intent}</p>
              </div>
            </div>
            {strategy.tone_guidelines ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tone guidelines
                </p>
                <p className="text-sm">{strategy.tone_guidelines}</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keyword plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Primary
            </h4>
            <Chips items={strategy.keyword_plan.primary} tone="info" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Secondary
            </h4>
            <Chips items={strategy.keyword_plan.secondary} />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Long tail
            </h4>
            <Chips items={strategy.keyword_plan.long_tail} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Outline</CardTitle>
          <span className="text-sm text-muted-foreground">
            {strategy.outline.length} sections · ~{totalWords} words
          </span>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {strategy.outline.map((s, i) => (
              <li
                key={s.section_id}
                className="rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {s.heading}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    ~{s.estimated_words} words
                  </span>
                </div>
                {s.key_points.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                    {s.key_points.map((kp, j) => (
                      <li key={j}>{kp}</li>
                    ))}
                  </ul>
                ) : null}
                {s.target_keywords.length > 0 ? (
                  <div className="mt-2">
                    <Chips items={s.target_keywords} />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
