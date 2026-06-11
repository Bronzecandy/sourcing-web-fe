import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DistributionBucket, DistributionLifecycleFilter, DistributionMetric } from "@/types";
import { formatDistributionMetricValue } from "@/lib/distribution-chart-copy";

const LIFECYCLE_COLORS = {
  reserve: "#f59e0b",
  new: "#22c55e",
  old: "#64748b",
  unknown: "#cbd5e1",
} as const;

interface DistributionBarChartProps {
  buckets: DistributionBucket[];
  lifecycle: DistributionLifecycleFilter;
  metric: DistributionMetric;
  /** Khi true — một cột duy nhất (dùng trong tab lifecycle cụ thể). */
  singleBar?: boolean;
  labels: {
    count: string;
    countDelta: string;
    reserve: string;
    new: string;
    old: string;
    unknown: string;
    games: string;
    metricSum: string;
    metricDelta: string;
  };
}

function CustomTooltip({
  active,
  payload,
  labels,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown> }>;
  labels: DistributionBarChartProps["labels"];
  metric: DistributionMetric;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm min-w-[200px]">
      <p className="font-semibold mb-2">{String(row.label)}</p>
      <p className="text-muted-foreground">
        {labels.games}: <span className="text-foreground font-medium">{row.count as number}</span>
      </p>
      <p className="text-muted-foreground">
        {labels.countDelta}:{" "}
        <span
          className={
            (row.countDelta as number) > 0
              ? "text-up font-medium"
              : (row.countDelta as number) < 0
                ? "text-down font-medium"
                : "text-foreground font-medium"
          }
        >
          {(row.countDelta as number) > 0 ? "+" : ""}
          {row.countDelta as number}
        </span>
      </p>
      <p className="text-muted-foreground mt-1">
        {labels.metricSum}:{" "}
        <span className="text-foreground font-medium">
          {formatDistributionMetricValue(metric, row.metricSum as number)}
        </span>
      </p>
      <p className="text-muted-foreground">
        {labels.metricDelta}:{" "}
        <span
          className={
            (row.metricDelta as number) > 0
              ? "text-up font-medium"
              : (row.metricDelta as number) < 0
                ? "text-down font-medium"
                : "text-foreground font-medium"
          }
        >
          {(row.metricDelta as number) > 0 ? "+" : ""}
          {formatDistributionMetricValue(metric, row.metricDelta as number)}
        </span>
      </p>
    </div>
  );
}

export default function DistributionBarChart({
  buckets,
  lifecycle,
  metric,
  singleBar = false,
  labels,
}: DistributionBarChartProps) {
  const chartData = buckets.map((b) => ({
    label: b.label,
    count: b.count,
    countDelta: b.countDelta,
    metricSum: b.metricSum,
    metricDelta: b.metricDelta,
    reserve: b.byLifecycle.reserve,
    new: b.byLifecycle.new,
    old: b.byLifecycle.old,
    unknown: b.byLifecycle.unknown,
  }));

  const showStacked = !singleBar && lifecycle === "all";

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip labels={labels} metric={metric} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {showStacked ? (
          <>
            <Bar yAxisId="left" dataKey="reserve" name={labels.reserve} stackId="lc" fill={LIFECYCLE_COLORS.reserve} radius={[0, 0, 0, 0]} />
            <Bar yAxisId="left" dataKey="new" name={labels.new} stackId="lc" fill={LIFECYCLE_COLORS.new} />
            <Bar yAxisId="left" dataKey="old" name={labels.old} stackId="lc" fill={LIFECYCLE_COLORS.old} />
            <Bar yAxisId="left" dataKey="unknown" name={labels.unknown} stackId="lc" fill={LIFECYCLE_COLORS.unknown} radius={[4, 4, 0, 0]} />
          </>
        ) : (
          <Bar yAxisId="left" dataKey="count" name={labels.count} fill="#6366f1" radius={[4, 4, 0, 0]} />
        )}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="countDelta"
          name={labels.countDelta}
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
