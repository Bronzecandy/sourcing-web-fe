import { useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import type { ReviewWindow, ReviewWindowDays } from "@/types/review-window";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { dateToIso, todayIsoDate } from "@/lib/review-date-range";
import DateRangeCalendar from "@/components/DateRangeCalendar";

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
  const today = useMemo(() => todayIsoDate(), []);
  const [custom, setCustom] = useState(windowToPreset(value) === "custom");
  const preset = windowToPreset(value);

  const rangeFrom = value.mode === "range" ? value.from : today;
  const rangeTo = value.mode === "range" ? value.to : today;

  const labelFor = (p: Preset) => {
    if (p === "all") return t("Tất cả", "All reviews");
    return lang === "vi" ? `${p} ngày` : `${p}d`;
  };

  const openCustom = () => {
    setCustom(true);
    if (value.mode !== "range") {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 13);
      onChange({
        mode: "range",
        from: dateToIso(start),
        to: dateToIso(end),
      });
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 justify-center sm:justify-start">
        <CalendarRange className="w-3.5 h-3.5" />
        {t("Khoảng bình luận phân tích", "Reviews to analyze")}
      </p>
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
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
          onClick={openCustom}
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
        <div className="w-full flex justify-center pt-1">
          <DateRangeCalendar
            from={rangeFrom}
            to={rangeTo}
            maxDate={today}
            onChange={(from, to) => onChange({ mode: "range", from, to })}
            className="w-full max-w-[320px] mx-auto"
          />
        </div>
      )}
    </div>
  );
}
