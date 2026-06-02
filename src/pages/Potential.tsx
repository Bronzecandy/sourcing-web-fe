import { useState, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { TrendingUp, Zap, ArrowUp, Bookmark, ChevronUp, ChevronDown, ArrowUpDown, Rocket } from "lucide-react";
import { fetchPotentialScores, fetchBreakoutGames, fetchReserveGrowth } from "@/services/api";
import type { PotentialScore, PotentialSegment } from "@/types";
import { LaunchBoardTags } from "@/components/LaunchBoardTags";
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
  const [selectedSegment, setSelectedSegment] = useState<PotentialSegment>("reserve");

  const { data: reserveScores, isLoading: loadingReserve } = useQuery({
    queryKey: ["potential", "reserve", days, platform],
    queryFn: () => fetchPotentialScores(days, platform, "reserve"),
    enabled: selectedSegment === "reserve",
  });

  const { data: launchedScores, isLoading: loadingLaunched } = useQuery({
    queryKey: ["potential", "launched", days, platform],
    queryFn: () => fetchPotentialScores(days, platform, "launched"),
    enabled: selectedSegment === "launched",
  });

  const { data: breakoutsReserve } = useQuery({
    queryKey: ["breakout", "reserve", days, platform],
    queryFn: () => fetchBreakoutGames(days, 10, platform, "reserve"),
  });

  const { data: breakoutsLaunched } = useQuery({
    queryKey: ["breakout", "launched", days, platform],
    queryFn: () => fetchBreakoutGames(days, 10, platform, "launched"),
  });

  const { data: reserveGrowth } = useQuery({
    queryKey: ["reserve-growth", days, platform],
    queryFn: () => fetchReserveGrowth(days, platform),
  });

  const [reserveSort, setReserveSort] = useState<{ key: ReserveSortKey; dir: SortDir }>({ key: "growth", dir: "desc" });
  const toggleReserveSort = (key: ReserveSortKey) => {
    setReserveSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  };
  const sortedReserveGrowth = useMemo(() => {
    if (!reserveGrowth) return [];
    const sorted = [...reserveGrowth];
    const mul = reserveSort.dir === "desc" ? -1 : 1;
    sorted.sort((a, b) => mul * (a[reserveSort.key] - b[reserveSort.key]));
    return sorted;
  }, [reserveGrowth, reserveSort]);

  const activeScores = selectedSegment === "reserve" ? reserveScores : launchedScores;
  const selected = activeScores?.find((s) => s.appId === selectedAppId);
  const breakouts = selectedSegment === "reserve" ? breakoutsReserve : breakoutsLaunched;

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

  const pickRow = (appId: number) => {
    setSelectedAppId(appId);
  };

  const tableLoading = selectedSegment === "reserve" ? loadingReserve : loadingLaunched;
  const tableScores = activeScores;
  const tableSubtitle =
    selectedSegment === "reserve"
      ? t("Bảng xếp hạng đăng ký trước — công thức v6", "Pre-registration chart — algo v6")
      : t(
          "Công thức v8 — chỉ tính sau ngày lên bảng Hot/Pop/New",
          "Algo v8 — scores only from post-launch chart days",
        );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("Phân tích tiềm năng", "Potential Analysis")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(
            "Chấm điểm tiềm năng: game đặt chỗ (Reserve) và game đã ra mắt (Hot / Pop / New)",
            "Potential scores for reservation games and launched games (Hot / Pop / New charts)",
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["reserve", "launched"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setSelectedSegment(s);
                setSelectedAppId(null);
              }}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5",
                selectedSegment === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {s === "reserve" ? <Bookmark className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
              {s === "reserve" ? "Reserve" : "Launch"}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["combined", "android", "ios"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                platform === p ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {p === "combined" ? t("Tất cả", "All") : p === "android" ? "Android" : "iOS"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                days === d ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {lang === "vi" ? `${d} ngày` : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PotentialRankingTable
            title={
              selectedSegment === "reserve"
                ? t("Tiềm năng — game đặt chỗ (Reserve)", "Potential — reservation (Reserve)")
                : t("Tiềm năng — game đã ra mắt", "Potential — launched games")
            }
            subtitle={tableSubtitle}
            icon={
              selectedSegment === "reserve" ? (
                <Bookmark className="w-5 h-5 text-primary" />
              ) : (
                <Rocket className="w-5 h-5 text-violet-500" />
              )
            }
            scores={tableScores}
            isLoading={tableLoading}
            platform={platform}
            segment={selectedSegment}
            selectedAppId={selectedAppId}
            onSelect={pickRow}
            onOpenGame={(id) => navigate(`/game/${id}`)}
            t={t}
          />
        </div>

        <div className="space-y-6">
          {selected && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                {selected.iconUrl && (
                  <img src={selected.iconUrl} alt="" className="w-8 h-8 rounded-lg" referrerPolicy="no-referrer" />
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{selected.title}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedSegment === "reserve"
                      ? t("Đặt chỗ", "Reservation")
                      : selected.launchCategory === "new_launch"
                        ? t("Mới ra mắt", "New launch")
                        : t("Đã ra mắt lâu", "Established")}
                  </p>
                </div>
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
                <span className="text-xs font-medium">
                  {selected.fansCount != null ? formatNumber(selected.fansCount) : t("Không có", "N/A")}
                </span>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-500" />
              {selectedSegment === "reserve"
                ? t(`Bùng nổ Reserve (${days} ngày)`, `Reserve breakouts (${days}d)`)
                : t(`Bùng nổ đã ra mắt (${days} ngày)`, `Launched breakouts (${days}d)`)}
            </h3>
            {breakouts && breakouts.length > 0 ? (
              <div className="space-y-3">
                {breakouts.slice(0, 10).map((g) => (
                  <div
                    key={g.appId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/game/${g.appId}`)}
                  >
                    {g.iconUrl ? (
                      <img src={g.iconUrl} alt="" className="w-9 h-9 rounded-lg shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {g.title.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.title}</p>
                      <p className="text-xs text-muted-foreground">
                        #{g.startRank} → #{g.currentRank}
                      </p>
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
            <Bookmark className="w-5 h-5 text-primary" />
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
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleReserveSort("growth")}
                    >
                      {t("Tăng tuyệt đối", "Growth")}{" "}
                      <SortIcon active={reserveSort.key === "growth"} dir={reserveSort.dir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleReserveSort("growthRate")}
                    >
                      {t("Tỷ lệ %", "Rate")}{" "}
                      <SortIcon active={reserveSort.key === "growthRate"} dir={reserveSort.dir} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedReserveGrowth.map((g, idx) => (
                  <tr
                    key={g.appId}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/game/${g.appId}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {g.iconUrl ? (
                          <img src={g.iconUrl} alt="" className="w-7 h-7 rounded-lg" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {g.title.charAt(0)}
                          </div>
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
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full",
                          g.growthRate >= 50
                            ? "bg-up/15 text-up"
                            : g.growthRate >= 10
                              ? "bg-stable/15 text-stable"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
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

function PotentialRankingTable({
  title,
  subtitle,
  icon,
  scores,
  isLoading,
  platform,
  segment,
  selectedAppId,
  onSelect,
  onOpenGame,
  t,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  scores: PotentialScore[] | undefined;
  isLoading: boolean;
  platform: "combined" | "android" | "ios";
  segment: PotentialSegment;
  selectedAppId: number | null;
  onSelect: (appId: number) => void;
  onOpenGame: (appId: number) => void;
  t: (vi: string, en: string) => string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2">
          {icon} {title}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !scores?.length ? (
        <p className="text-sm text-muted-foreground text-center py-10">{t("Chưa có dữ liệu", "No data yet")}</p>
      ) : (
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Game", "Game")}</th>
                {segment === "launched" && (
                  <>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      {t("Tag BXH", "Chart tags")}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap w-px">
                      {t("Loại", "Type")}
                    </th>
                  </>
                )}
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Hạng", "Rank")}</th>
                {segment === "launched" && (
                  <>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      {t("Ra mắt", "Release")}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      {t("Download", "Downloads")}
                    </th>
                  </>
                )}
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Đà tăng", "Momentum")}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("TTác.", "Engage.")}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Ổn định", "Stability")}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Tin cậy", "Conf.")}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Điểm", "Score")}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t("Xu hướng", "Trend")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scores.map((s, idx) => (
                <tr
                  key={s.appId}
                  className={cn(
                    "hover:bg-muted/30 cursor-pointer transition-colors",
                    selectedAppId === s.appId && "bg-accent/30",
                  )}
                  onClick={() => onSelect(s.appId)}
                  onDoubleClick={() => onOpenGame(s.appId)}
                >
                  <td className="px-3 py-3 text-sm font-medium">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {s.iconUrl ? (
                        <img src={s.iconUrl} alt="" className="w-7 h-7 rounded-lg" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {s.title.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium max-w-[140px] truncate">{s.title}</span>
                    </div>
                  </td>
                  {segment === "launched" && (
                    <>
                      <td className="px-3 py-3">
                        <LaunchBoardTags tags={s.launchBoardTags} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap w-px">
                        <LaunchCategoryBadge category={s.launchCategory} t={t} />
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3 text-sm text-muted-foreground">
                    <RankCell s={s} platform={platform} segment={segment} t={t} />
                  </td>
                  {segment === "launched" && (
                    <>
                      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {s.releaseDate ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {s.downloadCount != null ? formatNumber(s.downloadCount) : "—"}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3">
                    <ScoreBar value={s.momentumScore} />
                  </td>
                  <td className="px-3 py-3">
                    <ScoreBar value={s.engagementScore} />
                  </td>
                  <td className="px-3 py-3">
                    <ScoreBar value={s.stabilityScore} />
                  </td>
                  <td className="px-3 py-3">
                    <ConfidenceBadge value={s.dataConfidence} />
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("text-sm font-bold", getScoreColor(s.compositeScore))}>
                      {(s.compositeScore ?? 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        s.trend === "up" ? "text-up" : s.trend === "down" ? "text-down" : "text-stable",
                      )}
                    >
                      {getTrendIcon(s.trend)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LaunchCategoryBadge({
  category,
  t,
}: {
  category?: PotentialScore["launchCategory"];
  t: (vi: string, en: string) => string;
}) {
  if (category === "new_launch") {
    return (
      <span className="inline-flex shrink-0 whitespace-nowrap text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300">
        {t("Mới", "New")}
      </span>
    );
  }
  if (category === "established_launch") {
    return (
      <span className="inline-flex shrink-0 whitespace-nowrap text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-800 dark:text-sky-300">
        {t("Đã ra mắt", "Launched")}
      </span>
    );
  }
  return <span className="text-[10px] text-muted-foreground">—</span>;
}

function RankCell({
  s,
  platform,
  segment,
  t,
}: {
  s: PotentialScore;
  platform: "combined" | "android" | "ios";
  segment: PotentialSegment;
  t: (vi: string, en: string) => string;
}) {
  if (segment === "launched") {
    return (
      <span className="font-medium text-foreground">#{s.currentRank ?? "—"}</span>
    );
  }

  if (platform === "combined") {
    return (
      <span className="flex flex-col leading-tight">
        {s.androidRank != null && <span>🤖 #{s.androidRank}</span>}
        {s.iosRank != null && <span>🍎 #{s.iosRank}</span>}
        {s.androidRank == null && s.iosRank == null && t("Không có", "N/A")}
      </span>
    );
  }
  return <>#{s.currentRank ?? t("Không có", "N/A")}</>;
}

function ScoreBar({ value }: { value: number }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-[60px]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            v >= 70 ? "bg-up" : v >= 45 ? "bg-stable" : "bg-down",
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
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", color)}>{v.toFixed(0)}%</span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />;
}
