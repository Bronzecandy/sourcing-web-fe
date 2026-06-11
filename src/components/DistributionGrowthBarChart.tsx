import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DistributionGrowthBucket, DistributionMetric } from "@/types";
import { formatDistributionMetricValue } from "@/lib/distribution-chart-copy";

function barColor(bucket: DistributionGrowthBucket): string {
  if (bucket.label === "Không đổi") return "#94a3b8";
  if (bucket.max != null && bucket.max < 0) return "#f43f5e";
  if (bucket.min > 0) return "#22c55e";
  if (bucket.min < 0) return "#fb923c";
  return "#6366f1";
}

interface DistributionGrowthBarChartProps {
  buckets: DistributionGrowthBucket[];
  metric: DistributionMetric;
  labels: { games: string; totalChange: string };
}

export default function DistributionGrowthBarChart({
  buckets,
  metric,
  labels,
}: DistributionGrowthBarChartProps) {
  const chartData = buckets.filter((b) => b.count > 0);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-28} textAnchor="end" height={64} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0]!.payload as DistributionGrowthBucket;
            return (
              <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
                <p className="font-semibold mb-1">{row.label}</p>
                <p>
                  {labels.games}: <strong>{row.count}</strong> ({row.sharePct}%)
                </p>
                <p>
                  {labels.totalChange}:{" "}
                  <strong>
                    {row.totalDelta > 0 ? "+" : ""}
                    {formatDistributionMetricValue(metric, row.totalDelta)}
                  </strong>
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" name={labels.games} radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.label} fill={barColor(entry)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
