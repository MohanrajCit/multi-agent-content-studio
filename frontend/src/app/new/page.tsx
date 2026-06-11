"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateJob } from "@/hooks/use-jobs";
import { ApiError } from "@/lib/api";
import type { JobCreateRequest } from "@/lib/types";

const TONES = [
  "Professional",
  "Conversational",
  "Authoritative",
  "Friendly",
  "Technical",
  "Playful",
];

const PLATFORMS = [
  "Blog",
  "LinkedIn",
  "Twitter/X",
  "Newsletter",
  "Documentation",
  "Landing page",
];

const EMPTY: JobCreateRequest = {
  topic: "",
  audience: "",
  goal: "",
  tone: "Professional",
  platform: "Blog",
};

export default function NewJobPage() {
  const router = useRouter();
  const createJob = useCreateJob();
  const [form, setForm] = useState<JobCreateRequest>(EMPTY);

  const update = (key: keyof JobCreateRequest, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit =
    form.topic.trim() &&
    form.audience.trim() &&
    form.goal.trim() &&
    form.tone.trim() &&
    form.platform.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const job = await createJob.mutateAsync({
        topic: form.topic.trim(),
        audience: form.audience.trim(),
        goal: form.goal.trim(),
        tone: form.tone.trim(),
        platform: form.platform.trim(),
      });
      if (job.status === "REJECTED") {
        toast.warning("Request rejected by the guard", {
          description: job.rejection_reason ?? "The request did not pass validation.",
        });
      } else {
        toast.success("Content job created");
      }
      router.push(`/jobs/${job.id}/timeline`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not create the job.";
      toast.error("Failed to create job", { description: message });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New Content Job"
        description="Describe the content you want. The multi-agent pipeline handles the rest."
      />

      <Card>
        <CardHeader>
          <CardTitle>Content brief</CardTitle>
          <CardDescription>
            All fields are required and feed the Guard, Research, Strategy, Writer,
            and Evaluator agents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Topic" htmlFor="topic">
              <Textarea
                id="topic"
                placeholder="e.g. How AI agents are transforming content marketing in 2026"
                value={form.topic}
                onChange={(e) => update("topic", e.target.value)}
                required
              />
            </Field>

            <Field label="Audience" htmlFor="audience">
              <Input
                id="audience"
                placeholder="e.g. B2B SaaS founders and marketing leads"
                value={form.audience}
                onChange={(e) => update("audience", e.target.value)}
                required
              />
            </Field>

            <Field label="Goal" htmlFor="goal">
              <Input
                id="goal"
                placeholder="e.g. Educate and drive trial sign-ups"
                value={form.goal}
                onChange={(e) => update("goal", e.target.value)}
                required
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Tone" htmlFor="tone">
                <Select
                  value={form.tone}
                  onValueChange={(v) => update("tone", v)}
                >
                  <SelectTrigger id="tone">
                    <SelectValue placeholder="Select a tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Platform" htmlFor="platform">
                <Select
                  value={form.platform}
                  onValueChange={(v) => update("platform", v)}
                >
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={!canSubmit || createJob.isPending}
              >
                {createJob.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Running pipeline…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate content
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
