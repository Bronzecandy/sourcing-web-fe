import { useMemo } from "react";
import { History } from "lucide-react";
import type { RadarRunListItem } from "@/types";
import { cn } from "@/lib/utils";
import { viDate, viDayMonth } from "@/lib/radar";

const VIEWABLE = new Set(["completed", "imported"]);

interface WeekGroup {
  weekStart: string;
  weekEnd: string;
  main: RadarRunListItem | null;
  others: RadarRunListItem[];
  problems: RadarRunListItem[];
}

function groupByWeek(runs: RadarRunListItem[]): WeekGroup[] {
  const map = new Map<string, RadarRunListItem[]>();
  for (const r of runs) {
    const list = map.get(r.weekStart) ?? [];
    list.push(r);
    map.set(r.weekStart, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekStart, list]) => {
      const viewable = list.filter((r) => VIEWABLE.has(r.status)).sort((a, b) => b.date.localeCompare(a.date));
      return {
        weekStart,
        weekEnd: list[0]!.weekEnd,
        main: viewable[0] ?? null,
        others: viewable.slice(1),
        problems: list.filter((r) => r.status === "stale" || r.status === "failed"),
      };
    });
}

function Count({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label} <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  );
}

/** Lịch sử Radar theo tuần: mỗi tuần 1 báo cáo chính (lần chạy cuối tuần), bấm để xem. */
export default function RadarHistory({
  runs,
  activeDate,
  onSelect,
}: {
  runs: RadarRunListItem[];
  activeDate: string | null;
  onSelect: (date: string) => void;
}) {
  const weeks = useMemo(() => groupByWeek(runs), [runs]);
  if (weeks.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-primary" />
          Lịch sử theo tuần
        </h2>
        <p className="text-xs text-muted-foreground">
          Mỗi tuần hiện báo cáo chốt cuối tuần. Các kỳ trước 21/10/2026 là báo cáo làm tay, nhập từ file Game Radar Recap.
        </p>
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {weeks.map((w) => {
          const active = w.main != null && [w.main, ...w.others].some((r) => r.date === activeDate);
          return (
            <div
              key={w.weekStart}
              className={cn(
                "w-64 shrink-0 snap-start rounded-lg border bg-card p-3 text-xs transition-colors",
                active ? "border-primary ring-1 ring-primary/30" : "border-border",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-foreground">
                  Tuần {viDayMonth(w.weekStart)} – {viDayMonth(w.weekEnd)}
                </span>
                {w.main && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      w.main.source === "sheet" ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary",
                    )}
                  >
                    {w.main.source === "sheet" ? "Làm tay" : "Tool"}
                  </span>
                )}
              </div>
              {w.main ? (
                <button type="button" onClick={() => onSelect(w.main!.date)} className="mt-2 block w-full text-left">
                  <span className={cn("font-medium", active ? "text-primary" : "text-foreground")}>
                    Kỳ {w.main.periodCode} · {viDate(w.main.date)}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                    <Count label="Test Viable" value={w.main.actions.testViable} color="#9DC3E6" />
                    <Count label="Monitor" value={w.main.actions.monitor} color="#A9D18E" />
                    <Count label="Ignore" value={w.main.actions.ignore} color="#FFD9A0" />
                    <Count label="Drop" value={w.main.actions.drop} color="#FFC7CE" />
                  </span>
                  {w.main.source === "tool" && (
                    <span className="mt-1.5 block text-muted-foreground">
                      {w.main.newGames} game mới · {w.main.scheduleUpdates} lịch mới
                    </span>
                  )}
                </button>
              ) : (
                <p className="mt-2 text-muted-foreground">Không có báo cáo hoàn tất.</p>
              )}
              {w.others.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-2 text-muted-foreground">
                  Lần chạy khác:
                  {w.others.map((r) => (
                    <button
                      key={r.date}
                      type="button"
                      onClick={() => onSelect(r.date)}
                      className={cn(
                        "rounded border px-1.5 py-0.5 tabular-nums hover:bg-muted",
                        r.date === activeDate ? "border-primary text-primary" : "border-border",
                      )}
                    >
                      {r.periodCode}
                    </button>
                  ))}
                </div>
              )}
              {w.problems.length > 0 && (
                <p className="mt-1.5 text-amber-700">
                  {w.problems.length} lần chạy {w.problems.some((p) => p.status === "failed") ? "lỗi" : "trùng dữ liệu"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
