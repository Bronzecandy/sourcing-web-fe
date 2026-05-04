import { translateTextsViToEn } from "@/services/api";
import type { AiAnalysis, SentimentBreakdown } from "@/types";

/** Primary score: weighted rubric when present; falls back to legacy sentimentScore. */
export function mainAnalysisScore(a: Pick<AiAnalysis, "rubric" | "sentimentScore">): number {
  const w = a.rubric?.aggregate?.weightedScore;
  return typeof w === "number" ? w : a.sentimentScore;
}

export function getSummaryBullets(a: Pick<AiAnalysis, "summaryBullets" | "summary">): string[] {
  if (a.summaryBullets?.length) return [...a.summaryBullets];
  const s = (a.summary ?? "").trim();
  if (!s) return [];
  const lines = s
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*·]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const parts = s.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [s];
}

export function getRecentTrendBullets(a: Pick<AiAnalysis, "recentTrendBullets" | "recentTrend">): string[] {
  if (a.recentTrendBullets?.length) return [...a.recentTrendBullets];
  const s = (a.recentTrend ?? "").trim();
  if (!s) return [];
  const lines = s
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*·]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const parts = s.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [s];
}

export async function localizeAnalysisToEn(a: AiAnalysis): Promise<AiAnalysis> {
  const summaryBullets = getSummaryBullets(a);
  const trendBullets = getRecentTrendBullets(a);

  const rubricTexts: string[] = [];
  const rubricCritIdx: Array<{ i: number; field: "reasoning"; j?: number } | { i: number; field: "strengths"; j: number } | { i: number; field: "weaknesses"; j: number }> = [];
  if (a.rubric?.criteria?.length) {
    for (let i = 0; i < a.rubric.criteria.length; i++) {
      const c = a.rubric.criteria[i]!;
      const sts = c.strengths ?? [];
      for (let j = 0; j < sts.length; j++) {
        rubricTexts.push(sts[j]!);
        rubricCritIdx.push({ i, field: "strengths", j });
      }
      const wks = c.weaknesses ?? [];
      for (let j = 0; j < wks.length; j++) {
        rubricTexts.push(wks[j]!);
        rubricCritIdx.push({ i, field: "weaknesses", j });
      }
      if (c.reasoning?.trim()) {
        rubricTexts.push(c.reasoning);
        rubricCritIdx.push({ i, field: "reasoning" });
      }
    }
  }

  const flat: string[] = [...summaryBullets, ...trendBullets];

  const bd = a.sentimentBreakdown;
  if (bd) {
    flat.push(
      bd.ratingDistribution.reasoning,
      bd.textSentiment.reasoning,
      bd.issueSeverity.reasoning,
      bd.trendMomentum.reasoning,
      bd.formula,
    );
  }

  flat.push(...rubricTexts);

  const tr = await translateTextsViToEn(flat);
  let k = 0;
  const nextSummary = summaryBullets.map(() => tr[k++] ?? "");
  const nextTrend = trendBullets.map(() => tr[k++] ?? "");

  let sentimentBreakdown: SentimentBreakdown | undefined;
  if (bd) {
    sentimentBreakdown = {
      ratingDistribution: { ...bd.ratingDistribution, reasoning: tr[k++] ?? "" },
      textSentiment: { ...bd.textSentiment, reasoning: tr[k++] ?? "" },
      issueSeverity: { ...bd.issueSeverity, reasoning: tr[k++] ?? "" },
      trendMomentum: { ...bd.trendMomentum, reasoning: tr[k++] ?? "" },
      formula: tr[k++] ?? bd.formula,
    };
  }

  const rubricTr = tr.slice(k);
  let rk = 0;
  const nextCriteria =
    a.rubric?.criteria?.map((c) => ({ ...c })) ?? [];

  for (const ref of rubricCritIdx) {
    const text = rubricTr[rk++] ?? "";
    const crit = nextCriteria[ref.i];
    if (!crit) continue;
    if (ref.field === "reasoning") crit.reasoning = text;
    else if (ref.field === "strengths") {
      const arr = [...(crit.strengths ?? [])];
      arr[ref.j] = text;
      crit.strengths = arr;
    } else {
      const arr = [...(crit.weaknesses ?? [])];
      arr[ref.j] = text;
      crit.weaknesses = arr;
    }
  }

  const nextRubric =
    a.rubric && nextCriteria.length === a.rubric.criteria.length
      ? { ...a.rubric, criteria: nextCriteria }
      : a.rubric;

  return {
    ...a,
    summaryBullets: nextSummary,
    summary: nextSummary.join("\n"),
    recentTrendBullets: nextTrend.length ? nextTrend : undefined,
    recentTrend: nextTrend.join("\n"),
    strengths: [],
    weaknesses: [],
    sentimentBreakdown,
    rubric: nextRubric,
  };
}
