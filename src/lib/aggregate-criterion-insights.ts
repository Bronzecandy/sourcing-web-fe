import type { RubricBlock } from "@/types";

export function aggregateCriterionInsights(rubric: RubricBlock | undefined): {
  strengths: string[];
  weaknesses: string[];
} {
  if (!rubric) return { strengths: [], weaknesses: [] };

  const scored = rubric.criteria.filter(
    (c) => c.partId !== "red_flag" && c.score != null && typeof c.score === "number",
  );
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const strengthPool: string[] = [];
  const weaknessPool: string[] = [];

  for (const c of scored) {
    for (const s of c.strengths ?? []) {
      if (s.trim()) strengthPool.push(s.trim());
    }
  }
  for (const c of [...scored].reverse()) {
    for (const w of c.weaknesses ?? []) {
      if (w.trim()) weaknessPool.push(w.trim());
    }
  }

  const uniq = (arr: string[], max: number) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of arr) {
      const k = x.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
      if (out.length >= max) break;
    }
    return out;
  };

  return {
    strengths: uniq(strengthPool, 8),
    weaknesses: uniq(weaknessPool, 8),
  };
}
