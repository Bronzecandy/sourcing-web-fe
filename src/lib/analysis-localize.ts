import { translateTextsViToEn } from "@/services/api";
import type { AiAnalysis, SentimentBreakdown } from "@/types";

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
  const flat: string[] = [
    ...summaryBullets,
    ...trendBullets,
    ...a.strengths.map((x) => x.point),
    ...a.weaknesses.map((x) => x.point),
  ];

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

  const tr = await translateTextsViToEn(flat);
  let k = 0;
  const nextSummary = summaryBullets.map(() => tr[k++] ?? "");
  const nextTrend = trendBullets.map(() => tr[k++] ?? "");
  const nextStrengths = a.strengths.map((it) => ({ ...it, point: tr[k++] ?? it.point }));
  const nextWeaknesses = a.weaknesses.map((it) => ({ ...it, point: tr[k++] ?? it.point }));

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

  return {
    ...a,
    summaryBullets: nextSummary,
    summary: nextSummary.join("\n"),
    recentTrendBullets: nextTrend.length ? nextTrend : undefined,
    recentTrend: nextTrend.join("\n"),
    strengths: nextStrengths,
    weaknesses: nextWeaknesses,
    sentimentBreakdown,
  };
}
