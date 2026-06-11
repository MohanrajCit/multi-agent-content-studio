import { describe, expect, it } from "vitest";

import { countChanges, diffDrafts } from "@/lib/diff";
import type { DraftDetail, DraftSection } from "@/lib/types";

function section(id: string, content: string): DraftSection {
  return { section_id: id, heading: id, content, word_count: content.split(" ").length };
}

function draft(version: number, sections: DraftSection[]): DraftDetail {
  return {
    version,
    origin: "PIPELINE",
    parent_version: null,
    is_current: true,
    title: "T",
    word_count: 0,
    regen_section_id: null,
    regen_instruction: null,
    created_at: "2026-06-10T00:00:00Z",
    meta_description: "",
    sections,
  };
}

describe("diffDrafts", () => {
  it("marks unchanged sections", () => {
    const base = draft(1, [section("intro", "hello world")]);
    const target = draft(2, [section("intro", "hello world")]);
    const diffs = diffDrafts(base, target);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe("unchanged");
    expect(countChanges(diffs)).toBe(0);
  });

  it("detects changed content", () => {
    const base = draft(1, [section("intro", "old intro")]);
    const target = draft(2, [section("intro", "brand new intro")]);
    const diffs = diffDrafts(base, target);
    expect(diffs[0].status).toBe("changed");
    expect(diffs[0].base?.content).toBe("old intro");
    expect(diffs[0].target?.content).toBe("brand new intro");
    expect(countChanges(diffs)).toBe(1);
  });

  it("detects added and removed sections", () => {
    const base = draft(1, [section("intro", "a"), section("body", "b")]);
    const target = draft(2, [section("intro", "a"), section("cta", "c")]);
    const diffs = diffDrafts(base, target);
    const byId = Object.fromEntries(diffs.map((d) => [d.section_id, d.status]));
    expect(byId.intro).toBe("unchanged");
    expect(byId.body).toBe("removed");
    expect(byId.cta).toBe("added");
    expect(countChanges(diffs)).toBe(2);
  });

  it("preserves base section order then appends new target sections", () => {
    const base = draft(1, [section("a", "1"), section("b", "2")]);
    const target = draft(2, [section("b", "2"), section("c", "3")]);
    const diffs = diffDrafts(base, target);
    expect(diffs.map((d) => d.section_id)).toEqual(["a", "b", "c"]);
  });
});
