import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import {
  buildMonthGrid,
  compareIso,
  dateToIso,
  formatIsoDisplay,
  isIsoInRange,
  isoToDate,
  normalizeReviewDateRange,
  todayIsoDate,
} from "@/lib/review-date-range";

const WEEKDAYS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEKDAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  maxDate?: string;
  className?: string;
};

/**
 * Một lịch: click ngày 1 = bắt đầu, click ngày 2 = kết thúc (cùng panel, không mở 2 input date).
 */
export default function DateRangeCalendar({
  from,
  to,
  onChange,
  maxDate = todayIsoDate(),
  className,
}: Props) {
  const { t, lang } = useUiCopy();
  const locale = lang === "vi" ? "vi" : "en";
  const weekdays = lang === "vi" ? WEEKDAYS_VI : WEEKDAYS_EN;

  const initialMonth = from ? isoToDate(from) : isoToDate(maxDate);
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());
  /** Đang chọn: chỉ có điểm neo (chờ click ngày thứ 2). */
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  /** Khoảng đã chốt trước khi bấm chọn lại (để huỷ giữa chừng). */
  const rangeBeforeRepick = useRef<{ from: string; to: string } | null>(null);

  useEffect(() => {
    if (from) {
      const d = isoToDate(from);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [from]);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return d.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      month: "long",
      year: "numeric",
    });
  }, [viewYear, viewMonth, locale]);

  const previewEnd = anchor && hoverDay ? hoverDay : null;
  const previewFrom =
    anchor && previewEnd
      ? compareIso(anchor, previewEnd) <= 0
        ? anchor
        : previewEnd
      : null;
  const previewTo =
    anchor && previewEnd
      ? compareIso(anchor, previewEnd) <= 0
        ? previewEnd
        : anchor
      : null;

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleDayClick = (day: string) => {
    if (day > maxDate) return;

    if (!anchor) {
      if (from && to && from !== to) {
        rangeBeforeRepick.current = { from, to };
      } else {
        rangeBeforeRepick.current = null;
      }
      setAnchor(day);
      setHoverDay(null);
      // Bắt đầu chọn lại: gỡ khoảng cũ ngay (chỉ còn 1 mốc) thay vì giữ 6–7 + preview chồng
      onChange(day, day);
      return;
    }

    const { from: f, to: te } = normalizeReviewDateRange(anchor, day, maxDate);
    onChange(f, te);
    setAnchor(null);
    setHoverDay(null);
    rangeBeforeRepick.current = null;
  };

  const showCommittedRange = !anchor && from && to && from !== to;

  const displayFrom = (() => {
    if (anchor && previewFrom) return formatIsoDisplay(previewFrom, locale);
    if (anchor) return formatIsoDisplay(anchor, locale);
    return from ? formatIsoDisplay(from, locale) : "—";
  })();

  const displayTo = (() => {
    if (anchor && previewTo) return formatIsoDisplay(previewTo, locale);
    if (anchor) return "…";
    return to ? formatIsoDisplay(to, locale) : "—";
  })();

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 shadow-sm", className)}>
      <p className="text-[10px] text-muted-foreground mb-2 text-center">
        {anchor
          ? t("Chọn ngày kết thúc", "Pick end date")
          : t("Chọn ngày bắt đầu, rồi chọn ngày kết thúc", "Pick start date, then end date")}
      </p>
      <p className="text-xs font-medium text-center tabular-nums mb-3">
        {displayFrom}
        <span className="text-muted-foreground mx-2">—</span>
        {displayTo}
      </p>

      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          aria-label={t("Tháng trước", "Previous month")}
          onClick={() => shiftMonth(-1)}
          className="p-1 rounded-md hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button
          type="button"
          aria-label={t("Tháng sau", "Next month")}
          onClick={() => shiftMonth(1)}
          className="p-1 rounded-md hover:bg-muted"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground mb-1">
        {weekdays.map((w) => (
          <div key={w} className="py-1 font-medium">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const disabled = day > maxDate;
          const inCommitted =
            showCommittedRange && from && to && isIsoInRange(day, from, to);
          const inPreview =
            anchor && previewFrom && previewTo && isIsoInRange(day, previewFrom, previewTo);
          const inRange = inCommitted || inPreview;
          const isEdge =
            day === anchor ||
            day === previewFrom ||
            day === previewTo ||
            (showCommittedRange && (day === from || day === to));

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => !disabled && anchor && setHoverDay(day)}
              onMouseLeave={() => setHoverDay(null)}
              className={cn(
                "h-8 w-full rounded-md text-xs tabular-nums transition-colors",
                disabled && "text-muted-foreground/40 cursor-not-allowed",
                !disabled && !inRange && !isEdge && "hover:bg-muted",
                inRange && !isEdge && "bg-primary/15 text-foreground",
                isEdge && !disabled && "bg-primary text-primary-foreground font-semibold",
              )}
            >
              {isoToDate(day).getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between mt-3 gap-2">
        <button
          type="button"
          className="text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => {
            setAnchor(null);
            setHoverDay(null);
            const prev = rangeBeforeRepick.current;
            if (prev) onChange(prev.from, prev.to);
            rangeBeforeRepick.current = null;
          }}
        >
          {t("Chọn lại", "Reset selection")}
        </button>
        <button
          type="button"
          className="text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => {
            const { from: f, to: te } = normalizeReviewDateRange(maxDate, maxDate, maxDate);
            onChange(f, te);
            setAnchor(null);
          }}
        >
          {t("Hôm nay", "Today")}
        </button>
      </div>
    </div>
  );
}
