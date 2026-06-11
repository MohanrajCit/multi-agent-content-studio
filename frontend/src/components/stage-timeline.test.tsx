import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StageTimeline } from "@/components/stage-timeline";
import type { StageEvent } from "@/lib/types";

function ev(
  seq: number,
  stage: StageEvent["stage"],
  status: StageEvent["status"],
): StageEvent {
  return { seq, stage, status, detail: null, created_at: "2026-06-10T00:00:00Z" };
}

describe("StageTimeline", () => {
  it("renders all seven pipeline stages", () => {
    render(<StageTimeline events={[]} />);
    expect(screen.getByText("Validation")).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Quality Evaluation")).toBeInTheDocument();
  });

  it("reflects the latest status per stage", () => {
    const events: StageEvent[] = [
      ev(1, "GUARD", "RUNNING"),
      ev(2, "GUARD", "COMPLETED"),
      ev(3, "RESEARCH", "RUNNING"),
    ];
    render(<StageTimeline events={events} />);
    // GUARD completed, RESEARCH running, later stages pending.
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
  });
});
