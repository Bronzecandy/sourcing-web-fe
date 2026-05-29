import { useMemo, useState } from "react";
import type { HistoryRange } from "@/types/history-range";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { dateToIso, todayIsoDate } from "@/lib/review-date-range";
import DateRangeCalendar from "@/components/DateRangeCalendar";

const PRESET_DAYS = [7, 14, 30, 60] as const;

export default function HistoryRangePicker({
  value,
  onChange,
}: {
  value: HistoryRange;
  onChange: (r: HistoryRange) => void;
}) {
  const { t, lang } = useUiCopy();
  const today = useMemo(() => todayIsoDate(), []);
  const [customOpen, setCustomOpen] = useState(value.kind === "custom");

  const rangeFrom = value.kind === "custom" ? value.from : today;
  const rangeTo = value.kind === "custom" ? value.to : today;

  const openCustom = () => {
    setCustomOpen(true);
    if (value.kind !== "custom") {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      onChange({
        kind: "custom",
        from: dateToIso(start),
        to: dateToIso(end),
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              onChange({ kind: "days", days: d });
            }}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
              !customOpen && value.kind === "days" && value.days === d
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {lang === "vi" ? `${d} ngày` : `${d}d`}
          </button>
        ))}
        <button
          type="button"
          onClick={openCustom}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
            customOpen || value.kind === "custom"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {t("Tùy chọn", "Custom")}
        </button>
      </div>
      {(customOpen || value.kind === "custom") && (
        <div className="w-full flex justify-center pt-1">
          <DateRangeCalendar
            from={rangeFrom}
            to={rangeTo}
            maxDate={today}
            onChange={(from, to) => onChange({ kind: "custom", from, to })}
            className="w-full max-w-[320px] mx-auto"
          />
        </div>
      )}
    </div>
  );
}
