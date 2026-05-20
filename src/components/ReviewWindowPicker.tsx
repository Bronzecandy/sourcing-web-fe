import { useState } from "react";
import { CalendarRange } from "lucide-react";
import type { ReviewWindow, ReviewWindowDays } from "@/types/review-window";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";

type Preset = "all" | ReviewWindowDays;

const PRESETS: Preset[] = ["all", 7, 14, 30, 60];

function presetToWindow(p: Preset): ReviewWindow {
  if (p === "all") return { mode: "all" };
  return { mode: "days", days: p };
}

function windowToPreset(w: ReviewWindow): Preset | "custom" {
  if (w.mode === "all") return "all";
  if (w.mode === "days") return w.days;
  return "custom";
}

export default function ReviewWindowPicker({
  value,
  onChange,
  className,
}: {
  value: ReviewWindow;
  onChange: (w: ReviewWindow) => void;
  className?: string;
}) {
  const { t, lang } = useUiCopy();
  const [custom, setCustom] = useState(windowToPreset(value) === "custom");
  const preset = windowToPreset(value);

  const labelFor = (p: Preset) => {
    if (p === "all") return t("Tất cả", "All reviews");
    return lang === "vi" ? `${p} ngày` : `${p}d`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <CalendarRange className="w-3.5 h-3.5" />
        {t("Khoảng bình luận phân tích", "Reviews to analyze")}
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={String(p)}
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(presetToWindow(p));
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              !custom && preset === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {labelFor(p)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            custom
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {t("Tùy chọn", "Custom")}
        </button>
      </div>
      {custom && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={value.mode === "range" ? value.from : ""}
            onChange={(e) => {
              const from = e.target.value;
              const to = value.mode === "range" ? value.to : from;
              if (from) onChange({ mode: "range", from, to: to || from });
            }}
            className="rounded-lg border border-border bg-background px-2 py-1.5"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="date"
            value={value.mode === "range" ? value.to : ""}
            onChange={(e) => {
              const to = e.target.value;
              const from = value.mode === "range" ? value.from : to;
              if (to) onChange({ mode: "range", from: from || to, to });
            }}
            className="rounded-lg border border-border bg-background px-2 py-1.5"
          />
        </div>
      )}
    </div>
  );
}
