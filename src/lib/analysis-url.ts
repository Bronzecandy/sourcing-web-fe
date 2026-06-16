import type { AiAnalysis } from "@/types";

/** Shareable path for an AI analysis detail page (inside the app router). */
export function analysisDetailPath(
  a: Pick<AiAnalysis, "analysisId" | "appId" | "analyzedAt" | "analyzedByUserId">,
): string {
  if (a.analysisId) {
    return `/ai-analysis/a/${encodeURIComponent(a.analysisId)}`;
  }
  const params = new URLSearchParams({
    appId: String(a.appId),
    at: a.analyzedAt,
  });
  if (a.analyzedByUserId) params.set("by", a.analyzedByUserId);
  return `/ai-analysis/a/lookup?${params.toString()}`;
}

export function analysisDetailUrl(
  a: Pick<AiAnalysis, "analysisId" | "appId" | "analyzedAt" | "analyzedByUserId">,
): string {
  if (typeof window === "undefined") return analysisDetailPath(a);
  return `${window.location.origin}${analysisDetailPath(a)}`;
}
