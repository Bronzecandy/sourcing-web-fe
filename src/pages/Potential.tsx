import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { TrendingUp, Zap, ArrowUp, Bookmark, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { fetchPotentialScores, fetchBreakoutGames, fetchReserveGrowth } from "@/services/api";
import { cn, getScoreColor, getTrendIcon, formatNumber } from "@/lib/utils";
import { useUiCopy, potentialRadarMetric } from "@/lib/use-ui-copy";

type ReserveSortKey = "growth" | "growthRate";
type SortDir = "asc" | "desc";

export default function Potential() {
  const navigate = useNavigate();
  const { t, lang } = useUiCopy();
  const [days, setDays] = useState(14);
  const [platform, setPlatform] = useState<"combined" | "android" | "ios">("combined");
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  const { data: scores, isLoading } = useQuery({
    queryKey: ["potential", days, platform],
    queryFn: () => fetchPotentialScores(days, platform),
  });

  const { data: breakouts } = useQuery({
    queryKey: ["breakout", days, platform],
    queryFn: () => fetchBreakoutGames(days, 10, platform),
  });

  const { data: reserveGrowth } = useQuery({
    queryKey: ["reserve-growth", days, platform],
    queryFn: () => fetchReserveGrowth(days, platform),
  });

  const [reserveSort, setReserveSort] = useState<{ key: ReserveSortKey; dir: SortDir }>({ key: "growth", dir: "desc" });
  const toggleReserveSort = (key: ReserveSortKey) => {
    setReserveSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }
    );
  };
  const sortedReserveGrowth = useMemo(() => {
    if (!reserveGrowth) return [];
    const sorted = [...reserveGrowth];
    const mul = reserveSort.dir === "desc" ? -1 : 1;
    sorted.sort((a, b) => mul * (a[reserveSort.key] - b[reserveSort.key]));
    return sorted;
  }, [reserveGrowth, reserveSort]);

  const selected = scores?.find((s) => s.appId === selectedAppId);
  const radarData = useMemo(
    () =>
      selected
        ? [
            { metric: potentialRadarMetric("Momentum", lang), value: selected.momentumScore },
            { metric: potentialRadarMetric("Engagement", lang), value: selected.engagementScore },
            { metric: potentialRadarMetric("Stability", lang), value: selected.stabilityScore },
          ]
        : [],
    [selected, lang],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("Phân tích tiềm năng", "Potential Analysis")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("Chấm điểm tiềm năng game theo thuật toán", "Algorithm-based game potential scoring")}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["combined", "android", "ios"] as const).map((p) => (
            <button key={p} onClick={() => setPlatform(p)}
              className={cn("px-4 py-2 text-sm font-medium transition-colors",
                platform === p ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              )}>
              {p === "combined" ? t("Tất cả", "All") : p === "android" ? "Android" : "iOS"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                days === d ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              )}>
              {lang === "vi" ? `${d} ngày` : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> {t("Bảng xếp hạng tiềm năng", "Potential Ranking")}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Game", "Game")}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Hạng", "Rank")}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Đà tăng", "Momentum")}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("TTác.", "Engage.")}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Ổn định", "Stability")}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Tin cậy", "Conf.")}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Điểm", "Score")}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Xu hướng", "Trend")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scores?.map((s, idx) => (
                    <tr key={s.appId}
                      className={cn("hover:bg-muted/30 cursor-pointer transition-colors", selectedAppId === s.appId && "bg-accent/30")}
                      onClick={() => setSelectedAppId(s.appId)}
                      onDoubleClick={() => navigate(`/game/${s.appId}`)}>
                      <td className="px-3 py-3 text-sm font-medium">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {s.iconUrl ? (
                            <img src={s.iconUrl} alt="" className="w-7 h-7 rounded-lg" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{s.title.charAt(0)}</div>
                          )}
                          <span className="text-sm font-medium max-w-[140px] truncate">{s.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {platform === "combined" ? (
                          <span className="flex flex-col leading-tight">
                            {s.androidRank != null && <span>🤖 #{s.androidRank}</span>}
                            {s.iosRank != null && <span>🍎 #{s.iosRank}</span>}
                            {s.androidRank == null && s.iosRank == null && t("Không có", "N/A")}
                          </span>
                        ) : (
                          <>#{s.currentRank ?? t("Không có", "N/A")}</>
                        )}
                      </td>
                      <td className="px-3 py-3"><ScoreBar value={s.momentumScore} /></td>
                      <td className="px-3 py-3"><ScoreBar value={s.engagementScore} /></td>
                      <td className="px-3 py-3"><ScoreBar value={s.stabilityScore} /></td>
                      <td className="px-3 py-3"><ConfidenceBadge value={s.dataConfidence} /></td>
                      <td className="px-3 py-3">
                        <span className={cn("text-sm font-bold", getScoreColor(s.compositeScore))}>{(s.compositeScore ?? 0).toFixed(1)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("text-sm font-medium",
                          s.trend === "up" ? "text-up" : s.trend === "down" ? "text-down" : "text-stable"
                        )}>{getTrendIcon(s.trend)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {selected && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                {selected.iconUrl && <img src={selected.iconUrl} alt="" className="w-8 h-8 rounded-lg" referrerPolicy="no-referrer" />}
                <h3 className="font-semibold text-sm truncate">{selected.title}</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
              <div className="text-center mt-2">
                <span className="text-xs text-muted-foreground">{t("Fan:", "Fans: ")}</span>
                <span className="text-xs font-medium">{selected.fansCount != null ? formatNumber(selected.fansCount) : t("Không có", "N/A")}</span>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-500" />{" "}
              {t(`Game bùng nổ (${days} ngày)`, `Breakout Games (${days}d)`)}
            </h3>
            {breakouts && breakouts.length > 0 ? (
              <div className="space-y-3">
                {breakouts.slice(0, 10).map((g) => (
                  <div key={g.appId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/game/${g.appId}`)}>
                    {g.iconUrl ? (
                      <img src={g.iconUrl} alt="" className="w-9 h-9 rounded-lg shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {g.title.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.title}</p>
                      <p className="text-xs text-muted-foreground">#{g.startRank} → #{g.currentRank}</p>
                    </div>
                    <div className="flex items-center gap-1 text-up text-sm font-bold shrink-0">
                      <ArrowUp className="w-3 h-3" /> +{g.improvement}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                {t("Chưa phát hiện game bùng nổ", "No breakout games detected")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />{" "}
            {t(`Tăng đăng ký trước mạnh nhất (${days} ngày)`, `Top Reserve Growth (${days}d)`)}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t("Game tăng số lượng đăng ký trước nhiều nhất", "Games with the highest increase in pre-registrations")}
          </p>
        </div>
        {reserveGrowth && reserveGrowth.length > 0 ? (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Game", "Game")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Hạng", "Rank")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t("Đầu kỳ", "Start")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t("Hiện tại", "Current")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleReserveSort("growth")}>
                      {t("Tăng tuyệt đối", "Growth")} <SortIcon active={reserveSort.key === "growth"} dir={reserveSort.dir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleReserveSort("growthRate")}>
                      {t("Tỷ lệ %", "Rate")} <SortIcon active={reserveSort.key === "growthRate"} dir={reserveSort.dir} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedReserveGrowth.map((g, idx) => (
                  <tr key={g.appId}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/game/${g.appId}`)}>
                    <td className="px-4 py-3 text-sm font-medium">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {g.iconUrl ? (
                          <img src={g.iconUrl} alt="" className="w-7 h-7 rounded-lg" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{g.title.charAt(0)}</div>
                        )}
                        <span className="text-sm font-medium max-w-[160px] truncate">{g.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">#{g.currentRank ?? t("Không có", "N/A")}</td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground">{formatNumber(g.startReserve)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatNumber(g.currentReserve)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-up">+{formatNumber(g.growth)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        g.growthRate >= 50 ? "bg-up/15 text-up" : g.growthRate >= 10 ? "bg-stable/15 text-stable" : "bg-muted text-muted-foreground"
                      )}>
                        +{g.growthRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">
            {t("Chưa có dữ liệu tăng đăng ký trước", "No reserve growth data available")}
          </p>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-[60px]">
        <div
          className={cn("h-full rounded-full transition-all",
            v >= 70 ? "bg-up" : v >= 45 ? "bg-stable" : "bg-down"
          )}
          style={{ width: `${Math.min(v, 100)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-7">{v.toFixed(0)}</span>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const v = value ?? 0;
  const color = v >= 80 ? "bg-up/15 text-up" : v >= 50 ? "bg-stable/15 text-stable" : "bg-down/15 text-down";
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", color)}>
      {v.toFixed(0)}%
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === "desc"
    ? <ChevronDown className="w-3.5 h-3.5" />
    : <ChevronUp className="w-3.5 h-3.5" />;
}
