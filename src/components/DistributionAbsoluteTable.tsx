import { useState, useMemo, type ReactNode } from "react";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import type { DistributionBucket, DistributionMetric } from "@/types";
import { formatDistributionMetricValue } from "@/lib/distribution-chart-copy";
import { cn } from "@/lib/utils";

type SortKey = "bucket" | "count" | "metricSum" | "sharePct";

interface DistributionAbsoluteTableProps {
  buckets: DistributionBucket[];
  metric: DistributionMetric;
  labels: {
    range: string;
    games: string;
    share: string;
    metricTotal: string;
  };
  dense?: boolean;
}

export default function DistributionAbsoluteTable({
  buckets,
  metric,
  labels,
  dense = false,
}: DistributionAbsoluteTableProps) {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "bucket",
    dir: "asc",
  });

  const rows = useMemo(() => {
    const withPct = buckets.map((b) => ({
      ...b,
      sharePct: total > 0 ? Math.round((b.count / total) * 1000) / 10 : 0,
    }));
    const mul = sort.dir === "desc" ? -1 : 1;
    return [...withPct].sort((a, b) => {
      if (sort.key === "bucket") return mul * (a.min - b.min);
      return mul * (a[sort.key] - b[sort.key]);
    });
  }, [buckets, sort, total]);

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
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border",
        dense && "max-h-[min(70vh,520px)] overflow-y-auto",
      )}
    >
      <table className={dense ? "w-full text-xs" : "w-full text-sm"}>
        <thead className="bg-muted/40 sticky top-0 z-10">
          <tr>
            <Th col="bucket">{labels.range}</Th>
            <Th col="count">{labels.games}</Th>
            <Th col="sharePct">{labels.share}</Th>
            <Th col="metricSum">{labels.metricTotal}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((b) => (
            <tr key={b.label} className="hover:bg-muted/30">
              <td className="px-3 py-2.5 font-medium whitespace-nowrap">{b.label}</td>
              <td className="px-3 py-2.5 tabular-nums">{b.count.toLocaleString("vi-VN")}</td>
              <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{b.sharePct}%</td>
              <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                {formatDistributionMetricValue(metric, b.metricSum)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
