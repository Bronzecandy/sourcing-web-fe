import { useState, useMemo, type ReactNode } from "react";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import type { DistributionGrowthBucket, DistributionMetric } from "@/types";
import { formatDistributionMetricValue } from "@/lib/distribution-chart-copy";
import { cn } from "@/lib/utils";

type SortKey = "bucket" | "count" | "sharePct" | "totalDelta";

interface DistributionGrowthTableProps {
  buckets: DistributionGrowthBucket[];
  metric: DistributionMetric;
  labels: {
    range: string;
    games: string;
    share: string;
    totalChange: string;
  };
}

export default function DistributionGrowthTable({
  buckets,
  metric,
  labels,
}: DistributionGrowthTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "bucket",
    dir: "asc",
  });

  const rows = useMemo(() => {
    const mul = sort.dir === "desc" ? -1 : 1;
    return [...buckets].sort((a, b) => {
      if (sort.key === "bucket") return mul * (a.min - b.min);
      return mul * (a[sort.key] - b[sort.key]);
    });
  }, [buckets, sort]);

  const toggle = (key: SortKey) =>
    setSort((p) => (p.key === key ? { key, dir: p.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));

  const Th = ({ col, children }: { col: SortKey; children: ReactNode }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
      onClick={() => toggle(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sort.key === col ? (
          sort.dir === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
        )}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <Th col="bucket">{labels.range}</Th>
            <Th col="count">{labels.games}</Th>
            <Th col="sharePct">{labels.share}</Th>
            <Th col="totalDelta">{labels.totalChange}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((b) => (
            <tr key={b.label} className="hover:bg-muted/30">
              <td
                className={cn(
                  "px-3 py-2.5 font-medium whitespace-nowrap",
                  b.max != null && b.max < 0
                    ? "text-down"
                    : b.min > 0
                      ? "text-up"
                      : b.label === "Không đổi"
                        ? "text-muted-foreground"
                        : "",
                )}
              >
                {b.label}
              </td>
              <td className="px-3 py-2.5 tabular-nums">{b.count.toLocaleString("vi-VN")}</td>
              <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{b.sharePct}%</td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    b.totalDelta > 0 ? "text-up" : b.totalDelta < 0 ? "text-down" : "text-muted-foreground",
                  )}
                >
                  {b.totalDelta > 0 ? "+" : ""}
                  {formatDistributionMetricValue(metric, b.totalDelta)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
