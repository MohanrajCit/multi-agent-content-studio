"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRegenerateSection } from "@/hooks/use-jobs";
import { ApiError } from "@/lib/api";

export function RegenerateSectionDialog({
  jobId,
  version,
  sectionId,
  sectionHeading,
  onRegenerated,
}: {
  jobId: string;
  version: number;
  sectionId: string;
  sectionHeading: string;
  onRegenerated?: (newVersion: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const regenerate = useRegenerateSection(jobId);

  async function handleSubmit() {
    if (!instruction.trim()) return;
    try {
      const draft = await regenerate.mutateAsync({
        version,
        body: { section_id: sectionId, instruction: instruction.trim() },
      });
      toast.success(`Section regenerated — version ${draft.version}`);
      setOpen(false);
      setInstruction("");
      onRegenerated?.(draft.version);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not regenerate the section.";
      toast.error("Regeneration failed", { description: message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Wand2 className="h-4 w-4" /> Regenerate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate “{sectionHeading}”</DialogTitle>
          <DialogDescription>
            Describe how to rewrite this section. A new draft version is created;
            other sections are preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="instruction">Instruction</Label>
          <Textarea
            id="instruction"
            placeholder="e.g. Make it punchier and add a concrete example"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={regenerate.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!instruction.trim() || regenerate.isPending}
          >
            {regenerate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Regenerating…
              </>
            ) : (
              "Regenerate section"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
