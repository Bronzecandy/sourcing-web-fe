import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Gamepad2, Database, CalendarDays, MessageSquare,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { fetchDashboard } from "@/services/api";
import { formatDate, formatNumber } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useUiCopy } from "@/lib/use-ui-copy";

const PIE_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8",
  "#6d28d9", "#4f46e5", "#7c3aed", "#5b21b6", "#4338ca",
  "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useUiCopy();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const tagData = stats.tagDistribution.slice(0, 10).map((t) => ({
    name: t.tag,
    value: t.count,
  }));

  const moverData = [
    ...stats.topMovers.gainers.slice(0, 5).map((g) => ({
      name: g.title.length > 14 ? g.title.slice(0, 14) + "…" : g.title,
      change: g.change,
      appId: g.appId,
      iconUrl: g.iconUrl,
    })),
    ...stats.topMovers.losers.slice(0, 5).map((l) => ({
      name: l.title.length > 14 ? l.title.slice(0, 14) + "…" : l.title,
      change: l.change,
      appId: l.appId,
      iconUrl: l.iconUrl,
    })),
  ];
  const maxAbsChange = Math.max(...moverData.map((m) => Math.abs(m.change)), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("Tổng quan", "Dashboard")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("Tổng quan bảng xếp hạng Top 200 game TapTap", "TapTap Top 200 Game Rankings Overview")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Gamepad2 className="w-5 h-5 text-primary" />}
          label={t("Tổng số game", "Total Games")}
          value={formatNumber(stats.totalApps)}
        />
        <StatCard
          icon={<Database className="w-5 h-5 text-primary" />}
          label={t("Điểm dữ liệu", "Data Points")}
          value={formatNumber(stats.totalDataPoints)}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-primary" />}
          label={t("Tổng bình luận", "Total Reviews")}
          value={formatNumber(stats.totalReviews)}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-primary" />}
          label={t("Dữ liệu mới nhất", "Latest Data")}
          value={stats.latestDate ? formatDate(stats.latestDate) : t("Không có", "N/A")}
          sub={t(`${stats.dateCount} ngày đã theo dõi`, `${stats.dateCount} days tracked`)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-4">
            {t("Biến động mạnh (hôm nay so với hôm qua)", "Top Movers (Today vs Yesterday)")}
          </h2>
          {moverData.length > 0 ? (
            <div className="space-y-2">
              {moverData.map((m) => {
                const pct = (Math.abs(m.change) / maxAbsChange) * 100;
                const isGain = m.change >= 0;
                return (
                  <div
                    key={m.appId}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/game/${m.appId}`)}
                  >
                    {m.iconUrl ? (
                      <img src={m.iconUrl} alt="" className="w-7 h-7 rounded-md shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {m.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium w-[110px] truncate shrink-0">{m.name}</span>
                    <div className="flex-1 h-5 relative flex items-center">
                      <div
                        className={`h-full rounded ${isGain ? "bg-up/80" : "bg-down/80"}`}
                        style={{ width: `${pct}%`, minWidth: "4px" }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-12 text-right shrink-0 ${isGain ? "text-up" : "text-down"}`}>
                      {isGain ? "+" : ""}{m.change}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">
              {t("Cần ít nhất 2 ngày dữ liệu", "Need at least 2 days of data")}
            </p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-4">
            {t("Phân bố thẻ (Top 10)", "Tag Distribution (Top 10)")}
          </h2>
          {tagData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={tagData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={105}
                  paddingAngle={2}
                  dataKey="value"
                  label={(props: any) => `${props.name} (${props.value})`}
                >
                  {tagData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">{t("Chưa có dữ liệu", "No data")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-up" />
            <h2 className="text-lg font-semibold">{t("Tăng mạnh nhất", "Top Gainers")}</h2>
          </div>
          <div className="space-y-2">
            {stats.topMovers.gainers.slice(0, 8).map((g) => (
              <div
                key={g.appId}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/game/${g.appId}`)}
              >
                <div className="flex items-center gap-3">
                  {g.iconUrl ? (
                    <img src={g.iconUrl} alt="" className="w-7 h-7 rounded-md" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {g.title.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium text-sm">{g.title}</span>
                </div>
                <span className="text-up font-semibold text-sm">+{g.change}</span>
              </div>
            ))}
            {stats.topMovers.gainers.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">{t("Chưa có dữ liệu", "No data yet")}</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-down" />
            <h2 className="text-lg font-semibold">{t("Giảm mạnh nhất", "Top Losers")}</h2>
          </div>
          <div className="space-y-2">
            {stats.topMovers.losers.slice(0, 8).map((l) => (
              <div
                key={l.appId}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/game/${l.appId}`)}
              >
                <div className="flex items-center gap-3">
                  {l.iconUrl ? (
                    <img src={l.iconUrl} alt="" className="w-7 h-7 rounded-md" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {l.title.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium text-sm">{l.title}</span>
                </div>
                <span className="text-down font-semibold text-sm">{l.change}</span>
              </div>
            ))}
            {stats.topMovers.losers.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">{t("Chưa có dữ liệu", "No data yet")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
      <div className="p-2.5 rounded-lg bg-accent">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}
