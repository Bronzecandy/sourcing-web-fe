import { useState, useMemo, type ReactNode } from "react";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import type { DistributionBucket } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

type SortKey = "label" | "count" | "countDelta" | "metricSum" | "metricDelta";
type SortDir = "asc" | "desc";

interface DistributionBucketTableProps {
  buckets: DistributionBucket[];
  labels: {
    range: string;
    games: string;
    change: string;
    metricTotal: string;
    metricChange: string;
    reserve: string;
    new: string;
    old: string;
  };
}

function DeltaCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        value > 0 ? "text-up" : value < 0 ? "text-down" : "text-muted-foreground",
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toLocaleString("vi-VN")}
    </span>
  );
}

export default function DistributionBucketTable({ buckets, labels }: DistributionBucketTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "count", dir: "desc" });

  const sorted = useMemo(() => {
    const mul = sort.dir === "desc" ? -1 : 1;
    return [...buckets].sort((a, b) => {
      if (sort.key === "label") return mul * a.label.localeCompare(b.label);
      return mul * (a[sort.key] - b[sort.key]);
    });
  }, [buckets, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sort.key !== col) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sort.dir === "desc" ? (
      <ChevronDown className="w-3.5 h-3.5" />
    ) : (
      <ChevronUp className="w-3.5 h-3.5" />
    );
  };

  const Th = ({ col, children }: { col: SortKey; children: ReactNode }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <Th col="label">{labels.range}</Th>
            <Th col="count">{labels.games}</Th>
            <Th col="countDelta">{labels.change}</Th>
            <Th col="metricSum">{labels.metricTotal}</Th>
            <Th col="metricDelta">{labels.metricChange}</Th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
              {labels.reserve} / {labels.new} / {labels.old}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((b) => (
            <tr key={b.label} className="hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2.5 font-medium whitespace-nowrap">{b.label}</td>
              <td className="px-3 py-2.5 tabular-nums">{b.count.toLocaleString("vi-VN")}</td>
              <td className="px-3 py-2.5">
                <DeltaCell value={b.countDelta} />
              </td>
              <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                {formatNumber(b.metricSum)}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    b.metricDelta > 0 ? "text-up" : b.metricDelta < 0 ? "text-down" : "text-muted-foreground",
                  )}
                >
                  {b.metricDelta > 0 ? "+" : ""}
                  {formatNumber(b.metricDelta)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                <span className="text-amber-600">{b.byLifecycle.reserve}</span>
                {" / "}
                <span className="text-green-600">{b.byLifecycle.new}</span>
                {" / "}
                <span className="text-slate-500">{b.byLifecycle.old}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
