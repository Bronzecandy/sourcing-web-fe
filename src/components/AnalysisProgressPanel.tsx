import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { AnalysisProgressUpdate } from "@/lib/analysis-stream";
import { formatAnalysisProgress } from "@/lib/analysis-progress-labels";
import { cn } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";

export type AnalysisProgressState = {
  percent: number;
  currentMessage: string;
  phaseLabel: string;
  logs: { id: number; message: string; percent: number }[];
};

export const INITIAL_ANALYSIS_PROGRESS: AnalysisProgressState = {
  percent: 0,
  currentMessage: "",
  phaseLabel: "",
  logs: [],
};

export function appendProgressFromStream(
  prev: AnalysisProgressState,
  update: AnalysisProgressUpdate,
  t: (vi: string, en: string) => string,
): AnalysisProgressState {
  const formatted = formatAnalysisProgress(update, t);
  const pct = Math.max(prev.percent, Math.min(100, update.percent));

  // Heartbeat / bước tải DB: cập nhật tiêu đề + %, không spam khung Chi tiết.
  if (formatted.skipLog) {
    return {
      percent: pct,
      currentMessage: formatted.title || prev.currentMessage,
      phaseLabel: formatted.phaseLabel || prev.phaseLabel,
      logs: prev.logs,
    };
  }

  const logText = formatted.logLine || formatted.title;
  const last = prev.logs[prev.logs.length - 1];
  if (last?.message === logText && last.percent === pct) {
    return {
      percent: pct,
      currentMessage: formatted.title,
      phaseLabel: formatted.phaseLabel,
      logs: prev.logs,
    };
  }

  const entry = { id: Date.now() + Math.random(), message: logText, percent: pct };
  const logs = [...prev.logs, entry].slice(-8);
  return {
    percent: pct,
    currentMessage: formatted.title,
    phaseLabel: formatted.phaseLabel,
    logs,
  };
}

export default function AnalysisProgressPanel({
  progress,
  className,
}: {
  progress: AnalysisProgressState;
  className?: string;
}) {
  const { t } = useUiCopy();
  const logScrollRef = useRef<HTMLDivElement>(null);

  // Chỉ cuộn trong khung NHẬT KÝ — không dùng scrollIntoView (kéo cả trang xuống).
  useEffect(() => {
    const el = logScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [progress.logs.length]);

  const pct = Math.max(0, Math.min(100, progress.percent));

  return (
    <div
      className={cn(
        "rounded-xl border border-violet-500/25 bg-violet-500/5 px-4 py-4 text-left space-y-3",
        className,
      )}
    >
      <div className="space-y-1">
        {progress.phaseLabel ? (
          <p className="text-[10px] font-medium uppercase tracking-wide text-violet-600/90 dark:text-violet-300/90">
            {progress.phaseLabel}
          </p>
        ) : null}
        <div className="flex items-center gap-2 text-sm font-medium text-violet-900 dark:text-violet-100">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {progress.currentMessage || t("Đang phân tích…", "Analyzing…")}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{t("Tiến trình", "Progress")}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {progress.logs.length > 0 && (
        <div
          ref={logScrollRef}
          className="max-h-36 overflow-y-auto overscroll-contain rounded-lg border border-border/60 bg-background/80 px-2.5 py-2 space-y-1.5"
        >
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("Chi tiết", "Details")}
          </p>
          {progress.logs.map((line) => (
            <p
              key={line.id}
              className={cn(
                "text-xs leading-snug",
                line.id === progress.logs[progress.logs.length - 1]?.id
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              <span className="tabular-nums text-[10px] text-muted-foreground mr-1.5">
                {line.percent}%
              </span>
              {line.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
