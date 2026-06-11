"use client";

import { useParams } from "next/navigation";
import { Lightbulb, Search, Swords, Target } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useJobResults } from "@/hooks/use-jobs";

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <Badge key={`${t}-${i}`} tone="neutral">
          {t}
        </Badge>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

export default function ResearchPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useJobResults(jobId);

  if (isError) return <ErrorState message="Could not load research insights." />;
  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  const research = data?.research ?? null;
  const competitor = data?.competitor ?? null;
  const gaps = data?.gaps ?? null;

  if (!research && !competitor && !gaps) {
    return (
      <EmptyState
        icon={<Search className="h-6 w-6" />}
        title="Research not available yet"
        description="Insights appear once the research and competitor stages complete."
      />
    );
  }

  return (
    <Tabs defaultValue="research">
      <TabsList>
        <TabsTrigger value="research">
          <Search className="mr-1.5 h-4 w-4" /> Research
        </TabsTrigger>
        <TabsTrigger value="competitor">
          <Swords className="mr-1.5 h-4 w-4" /> Competitors
        </TabsTrigger>
        <TabsTrigger value="gaps">
          <Lightbulb className="mr-1.5 h-4 w-4" /> Content Gaps
        </TabsTrigger>
      </TabsList>

      {/* Research */}
      <TabsContent value="research" className="space-y-4">
        {!research ? (
          <EmptyState title="No research report" />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Executive summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">{research.summary}</p>
                <Section title="Primary keywords">
                  <Chips items={research.primary_keywords} />
                </Section>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trends</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {research.trends.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None found.</p>
                  ) : (
                    research.trends.map((t, i) => (
                      <div key={i} className="border-l-2 border-primary/30 pl-3">
                        <p className="text-sm font-medium">{t.term}</p>
                        {t.rationale ? (
                          <p className="text-xs text-muted-foreground">
                            {t.rationale}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">People also ask</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {research.people_also_ask.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None found.</p>
                  ) : (
                    research.people_also_ask.map((p, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium">{p.question}</p>
                        {p.intent ? (
                          <p className="text-xs text-muted-foreground">
                            Intent: {p.intent}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {research.related_searches.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related searches</CardTitle>
                </CardHeader>
                <CardContent>
                  <Chips items={research.related_searches} />
                </CardContent>
              </Card>
            ) : null}

            {research.sources.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {research.sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-md border p-2 text-sm hover:bg-accent"
                    >
                      <p className="font-medium text-primary">{s.title}</p>
                      {s.snippet ? (
                        <p className="text-xs text-muted-foreground">{s.snippet}</p>
                      ) : null}
                    </a>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </TabsContent>

      {/* Competitors */}
      <TabsContent value="competitor" className="space-y-4">
        {!competitor ? (
          <EmptyState title="No competitor analysis" />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Competitive landscape</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">{competitor.summary}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Section title="Table-stakes topics">
                    <Chips items={competitor.commonly_covered_topics} />
                  </Section>
                  <Section title="Differentiation opportunities">
                    <Chips items={competitor.differentiation_opportunities} />
                  </Section>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {competitor.competitors.map((c, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {c.title || c.url}
                    </CardTitle>
                    <CardDescription className="truncate">{c.url}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {c.topics_covered.length > 0 ? (
                      <Section title="Topics covered">
                        <Chips items={c.topics_covered} />
                      </Section>
                    ) : null}
                    {c.strengths.length > 0 ? (
                      <Section title="Strengths">
                        <ul className="list-disc pl-4 text-sm text-muted-foreground">
                          {c.strengths.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      </Section>
                    ) : null}
                    {c.weaknesses.length > 0 ? (
                      <Section title="Weaknesses">
                        <ul className="list-disc pl-4 text-sm text-muted-foreground">
                          {c.weaknesses.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      </Section>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </TabsContent>

      {/* Gaps */}
      <TabsContent value="gaps" className="space-y-4">
        {!gaps ? (
          <EmptyState title="No content gap report" />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gap analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">{gaps.summary}</p>
                {gaps.recommended_focus ? (
                  <div className="flex items-start gap-2 rounded-md bg-primary/5 p-3">
                    <Target className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Recommended focus
                      </p>
                      <p className="text-sm">{gaps.recommended_focus}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-3">
              {gaps.missing_topics.map((g, i) => (
                <Card key={i}>
                  <CardContent className="flex items-start justify-between gap-4 p-4">
                    <div className="space-y-1">
                      <p className="font-medium">{g.topic}</p>
                      <p className="text-sm text-muted-foreground">
                        {g.opportunity}
                      </p>
                      {g.suggested_angle ? (
                        <p className="text-xs text-muted-foreground">
                          Angle: {g.suggested_angle}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      tone={g.priority >= 4 ? "danger" : g.priority >= 3 ? "warning" : "neutral"}
                    >
                      P{g.priority}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
