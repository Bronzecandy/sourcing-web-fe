import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DistributionTrendPoint } from "@/types";
import { formatNumber } from "@/lib/utils";

interface DistributionTrendChartProps {
  data: DistributionTrendPoint[];
  labels: { games: string; metricSum: string; metricDelta: string };
}

export default function DistributionTrendChart({ data, labels }: DistributionTrendChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((p) => ({
    label: p.label,
    totalGames: p.totalGames,
    metricSum: p.metricSum,
    metricDelta: p.metricDelta,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} width={36} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={44} />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === labels.games ? value : formatNumber(value),
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="totalGames"
          name={labels.games}
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="metricDelta"
          name={labels.metricDelta}
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
