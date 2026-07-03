import { runCompareAI, triggerAnalysis } from "@/services/api";
import type { AnalysisProgressUpdate } from "@/lib/analysis-stream";
import { DEFAULT_REVIEW_WINDOW } from "@/types/review-window";
import type { SavedGameComparison } from "@/types";

export type MissingAnalysisEntry = { appId: number; gameName?: string };

function scaleStepProgress(stepIndex: number, stepCount: number, innerPercent: number): number {
  const slice = 100 / stepCount;
  return Math.min(99, Math.round(stepIndex * slice + (innerPercent / 100) * slice));
}

/** Phân tích lần lượt các game thiếu, rồi chạy so sánh AI. */
export async function runAnalyzeMissingThenCompare(
  appIds: number[],
  missing: MissingAnalysisEntry[],
  onProgress: (p: AnalysisProgressUpdate) => void,
): Promise<SavedGameComparison> {
  const stepCount = missing.length + 1;

  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];
    const label = m.gameName ?? `game #${m.appId}`;
    onProgress({
      type: "progress",
      phase: "analyze",
      message: `Đang phân tích ${label} (${i + 1}/${missing.length})…`,
      percent: scaleStepProgress(i, stepCount, 0),
    });

    await triggerAnalysis(m.appId, DEFAULT_REVIEW_WINDOW, (p) => {
      onProgress({
        ...p,
        phase: "analyze",
        message: p.message || `Đang phân tích ${label}…`,
        percent: scaleStepProgress(i, stepCount, p.percent),
      });
    });
  }

  onProgress({
    type: "progress",
    phase: "compare",
    message: "Đang so sánh AI…",
    percent: scaleStepProgress(missing.length, stepCount, 0),
  });

  return runCompareAI(appIds, (p) => {
    onProgress({
      ...p,
      phase: "compare",
      percent: scaleStepProgress(missing.length, stepCount, p.percent),
    });
  });
}
