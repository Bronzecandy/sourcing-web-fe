import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";

export type AnalysisProgressState = {
  percent: number;
  currentMessage: string;
  logs: { id: number; message: string; percent: number }[];
};

export const INITIAL_ANALYSIS_PROGRESS: AnalysisProgressState = {
  percent: 0,
  currentMessage: "",
  logs: [],
};

export function appendProgressLog(
  prev: AnalysisProgressState,
  message: string,
  percent: number,
): AnalysisProgressState {
  const pct = Math.max(prev.percent, Math.min(100, percent));
  const entry = { id: Date.now() + Math.random(), message, percent: pct };
  const logs = [...prev.logs, entry].slice(-12);
  return { percent: pct, currentMessage: message, logs };
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
      <div className="flex items-center gap-2 text-sm font-medium text-violet-900 dark:text-violet-100">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        {progress.currentMessage || t("Đang phân tích…", "Analyzing…")}
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
            {t("Nhật ký", "Log")}
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
