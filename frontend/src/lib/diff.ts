import type { DraftDetail, DraftSection } from "./types";

export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

export interface SectionDiff {
  section_id: string;
  heading: string;
  status: DiffStatus;
  base: DraftSection | null;
  target: DraftSection | null;
}

/**
 * Compare two draft versions section-by-section (keyed by section_id).
 * `base` is the older/left version, `target` the newer/right version.
 */
export function diffDrafts(
  base: DraftDetail,
  target: DraftDetail,
): SectionDiff[] {
  const baseById = new Map(base.sections.map((s) => [s.section_id, s]));
  const targetById = new Map(target.sections.map((s) => [s.section_id, s]));
  const ids: string[] = [];
  for (const s of base.sections) ids.push(s.section_id);
  for (const s of target.sections) {
    if (!baseById.has(s.section_id)) ids.push(s.section_id);
  }

  return ids.map((id) => {
    const b = baseById.get(id) ?? null;
    const t = targetById.get(id) ?? null;
    let status: DiffStatus;
    if (b && !t) status = "removed";
    else if (!b && t) status = "added";
    else if (b && t) status = b.content === t.content ? "unchanged" : "changed";
    else status = "unchanged";
    return {
      section_id: id,
      heading: t?.heading ?? b?.heading ?? id,
      status,
      base: b,
      target: t,
    };
  });
}

export function countChanges(diffs: SectionDiff[]): number {
  return diffs.filter((d) => d.status !== "unchanged").length;
}
