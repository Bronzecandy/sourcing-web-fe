import type { AiAnalysis, RubricBlock } from "@/types";

export function hasActiveRedFlags(
  glance: AiAnalysis["redFlagAtAGlance"],
  checklist: AiAnalysis["redFlagsChecklist"],
  rubric?: RubricBlock,
): boolean {
  if (glance?.blockedByHardGate) return true;
  if (glance?.riskLevel === "critical" || glance?.riskLevel === "high") return true;
  if (checklist) {
    if (checklist.politics === true) return true;
    if (checklist.religion === true) return true;
    if (checklist.casino === true) return true;
    if (checklist.violenceConcern === true) return true;
    if (checklist.sexualConcern === true) return true;
  }
  if (rubric?.aggregate.redFlagHardGate) return true;
  const rfRows = rubric?.criteria.filter((c) => c.partId === "red_flag") ?? [];
  if (rfRows.some((c) => c.flagPresent === true)) return true;
  return false;
}
