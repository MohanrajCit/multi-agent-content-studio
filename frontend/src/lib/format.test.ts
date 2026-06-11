import { describe, expect, it } from "vitest";

import {
  JOB_STATUS_META,
  isActive,
  isTerminal,
  scoreBand,
} from "@/lib/format";
import type { JobStatus } from "@/lib/types";

describe("status helpers", () => {
  it("classifies terminal vs active statuses", () => {
    expect(isTerminal("DONE")).toBe(true);
    expect(isTerminal("REJECTED")).toBe(true);
    expect(isTerminal("FAILED")).toBe(true);
    expect(isTerminal("RESEARCHING")).toBe(false);
    expect(isActive("WRITING")).toBe(true);
    expect(isActive("DONE")).toBe(false);
  });

  it("has metadata for every job status", () => {
    const statuses: JobStatus[] = [
      "QUEUED",
      "VALIDATING",
      "RESEARCHING",
      "STRATEGIZING",
      "WRITING",
      "EVALUATING",
      "DONE",
      "REJECTED",
      "FAILED",
    ];
    for (const s of statuses) {
      expect(JOB_STATUS_META[s]).toBeDefined();
      expect(JOB_STATUS_META[s].label.length).toBeGreaterThan(0);
    }
  });
});

describe("scoreBand", () => {
  it("bands scores into success/warning/danger", () => {
    expect(scoreBand(95)).toBe("success");
    expect(scoreBand(80)).toBe("success");
    expect(scoreBand(70)).toBe("warning");
    expect(scoreBand(60)).toBe("warning");
    expect(scoreBand(40)).toBe("danger");
  });
});
