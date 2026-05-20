import { useState } from "react";
import type { HistoryRange } from "@/types/history-range";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";

const PRESET_DAYS = [7, 14, 30, 60] as const;

export default function HistoryRangePicker({
  value,
  onChange,
}: {
  value: HistoryRange;
  onChange: (r: HistoryRange) => void;
}) {
  const { t, lang } = useUiCopy();
  const [customOpen, setCustomOpen] = useState(value.kind === "custom");

  return (
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
        onClick={() => setCustomOpen(true)}
        className={cn(
          "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
          customOpen || value.kind === "custom"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        {t("Tùy chọn", "Custom")}
      </button>
      {(customOpen || value.kind === "custom") && (
        <>
          <input
            type="date"
            value={value.kind === "custom" ? value.from : ""}
            onChange={(e) => {
              const from = e.target.value;
              const to = value.kind === "custom" ? value.to : from;
              if (from) onChange({ kind: "custom", from, to: to || from });
            }}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input
            type="date"
            value={value.kind === "custom" ? value.to : ""}
            onChange={(e) => {
              const to = e.target.value;
              const from = value.kind === "custom" ? value.from : to;
              if (to) onChange({ kind: "custom", from: from || to, to });
            }}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
          />
        </>
      )}
    </div>
  );
}
