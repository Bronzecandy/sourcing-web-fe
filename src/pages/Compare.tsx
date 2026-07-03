import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ArrowLeft, GitCompare, Sparkles, X } from "lucide-react";
import { fetchCompareOverview, fetchCompareHistory, runCompareAI } from "@/services/api";
import { runAnalyzeMissingThenCompare, type MissingAnalysisEntry } from "@/lib/compare-analyze-flow";
import CompareGamePicker from "@/components/CompareGamePicker";
import AnalysisProgressPanel, {
  INITIAL_ANALYSIS_PROGRESS,
  appendProgressFromStream,
  type AnalysisProgressState,
} from "@/components/AnalysisProgressPanel";
import type { AnalysisProgressUpdate } from "@/lib/analysis-stream";
import {
  COMPARE_COLORS,
  compareSeriesKey,
  compareTheme,
  compareGameTheme,
  mergeHistoryByField,
  mergeReserveDeltaSeries,
  gameLabel,
  bestAppIdHigher,
  bestAppIdLower,
} from "@/lib/compare-series";
import { cn, formatNumber, getScoreColor } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { CompareMissingAnalysisError, type CompareGameEntry, type GameComparisonAI } from "@/types";

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map(Number).filter((n) => n > 0))].slice(0, 4);
}

export default function Compare() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useUiCopy();
  const { user } = useAuth();
  const canAiRun = hasPermission(user, "ai.run");
  const canAiRead = hasPermission(user, "ai.read");
  const showAiCompare = canAiRun || canAiRead;

  const appIds = useMemo(() => parseIds(searchParams.get("ids")), [searchParams]);
  const [days, setDays] = useState(() => parseInt(searchParams.get("days") ?? "30", 10) || 30);
  const [platform, setPlatform] = useState<"combined" | "android" | "ios">(
    searchParams.get("platform") === "android" || searchParams.get("platform") === "ios"
      ? (searchParams.get("platform") as "android" | "ios")
      : "combined",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [aiResult, setAiResult] = useState<GameComparisonAI | null>(null);
  const [selectedCompareId, setSelectedCompareId] = useState<string | null>(null);
  const [missingAnalysis, setMissingAnalysis] = useState<MissingAnalysisEntry[] | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressState>(
    INITIAL_ANALYSIS_PROGRESS,
  );

  const { data: overview, isLoading, error } = useQuery({
    queryKey: ["compare-overview", appIds, days, platform],
    queryFn: () => fetchCompareOverview(appIds, days, platform),
    enabled: appIds.length >= 2,
  });

  const games = overview?.games ?? [];

  const { data: compareHistory, isLoading: compareHistoryLoading } = useQuery({
    queryKey: ["compare-ai-history", appIds],
    queryFn: () => fetchCompareHistory(appIds, 15),
    enabled: appIds.length >= 2 && showAiCompare,
  });

  useEffect(() => {
    if (!compareHistory?.length) return;
    const active =
      (selectedCompareId && compareHistory.find((h) => h.compareId === selectedCompareId)) ||
      compareHistory[0];
    if (active) {
      setAiResult(active.comparison);
      if (!selectedCompareId) setSelectedCompareId(active.compareId);
    }
  }, [compareHistory, selectedCompareId]);

  const applySavedCompare = useCallback((compareId: string) => {
    const row = compareHistory?.find((h) => h.compareId === compareId);
    if (!row) return;
    setSelectedCompareId(compareId);
    setAiResult(row.comparison);
  }, [compareHistory]);

  const invalidateCompareHistory = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["compare-ai-history", appIds] });
  }, [queryClient, appIds]);

  const gamesMissingAnalysis = useMemo<MissingAnalysisEntry[]>(
    () =>
      games
        .filter((g) => !g.analysisSummary.available)
        .map((g) => ({ appId: g.appId, gameName: g.detail.title })),
    [games],
  );

  const displayMissing = missingAnalysis ?? (gamesMissingAnalysis.length > 0 ? gamesMissingAnalysis : null);

  const rankChartData = useMemo(
    () =>
      mergeHistoryByField(games, (h) =>
        platform === "ios" ? h.iosRank : platform === "android" ? h.androidRank : h.androidRank ?? h.iosRank,
      ),
    [games, platform],
  );

  const ratingChartData = useMemo(
    () => mergeHistoryByField(games, (h) => (h.rating != null ? parseFloat(h.rating) : null)),
    [games],
  );

  const reviewsChartData = useMemo(
    () => mergeHistoryByField(games, (h) => h.reviewCount),
    [games],
  );

  const reserveDeltaData = useMemo(() => mergeReserveDeltaSeries(games), [games]);

  const onProgress = useCallback(
    (p: AnalysisProgressUpdate) => {
      setAnalysisProgress((prev) => appendProgressFromStream(prev, p, t));
    },
    [t],
  );

  const compareAiMutation = useMutation({
    mutationFn: () => runCompareAI(appIds, onProgress),
    onMutate: () => {
      setAnalysisProgress(INITIAL_ANALYSIS_PROGRESS);
      setMissingAnalysis(null);
      setAiResult(null);
    },
    onSuccess: (saved) => {
      setAiResult(saved.comparison);
      setSelectedCompareId(saved.compareId);
      setMissingAnalysis(null);
      invalidateCompareHistory();
    },
    onError: (err) => {
      if (err instanceof CompareMissingAnalysisError) {
        setMissingAnalysis(err.missing);
      }
    },
  });

  const analyzeThenCompareMutation = useMutation({
    mutationFn: (targets: MissingAnalysisEntry[]) =>
      runAnalyzeMissingThenCompare(appIds, targets, onProgress),
    onMutate: () => {
      setAnalysisProgress(INITIAL_ANALYSIS_PROGRESS);
      setAiResult(null);
    },
    onSuccess: async (saved) => {
      setAiResult(saved.comparison);
      setSelectedCompareId(saved.compareId);
      setMissingAnalysis(null);
      await queryClient.invalidateQueries({ queryKey: ["compare-overview", appIds, days, platform] });
      invalidateCompareHistory();
    },
    onError: (err) => {
      if (err instanceof CompareMissingAnalysisError) {
        setMissingAnalysis(err.missing);
        void queryClient.invalidateQueries({ queryKey: ["compare-overview", appIds, days, platform] });
      }
    },
  });

  const isAiBusy = compareAiMutation.isPending || analyzeThenCompareMutation.isPending;

  const updateIds = (ids: number[]) => {
    const next = new URLSearchParams(searchParams);
    next.set("ids", ids.join(","));
    next.set("days", String(days));
    next.set("platform", platform);
    setSearchParams(next);
    setAiResult(null);
    setSelectedCompareId(null);
    setMissingAnalysis(null);
  };

  const removeGame = (id: number) => {
    const next = appIds.filter((x) => x !== id);
    if (next.length < 2) return;
    updateIds(next);
  };

  if (appIds.length < 2) {
    return (
      <div className="space-y-4 text-center py-16">
        <GitCompare className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">
          {t("Chọn ít nhất 2 game để so sánh", "Select at least 2 games to compare")}
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
        >
          <GitCompare className="w-4 h-4" />
          {t("Chọn game", "Pick games")}
        </button>
        <CompareGamePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> {t("Quay lại", "Back")}
        </button>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium",
                  days === d ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["combined", "android", "ios"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium capitalize",
                  platform === p ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                )}
              >
                {p === "combined" ? t("Tất cả", "All") : p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <GitCompare className="w-3.5 h-3.5" />
            {t("Đổi game", "Change games")}
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-primary" />
          {t("So sánh game", "Compare games")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(`${games.length} game · ${days} ngày`, `${games.length} games · ${days}d window`)}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <p className="text-center text-destructive py-10">{t("Không tải được dữ liệu", "Failed to load data")}</p>
      ) : (
        <>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${games.length}, minmax(0, 1fr))` }}>
            {games.map((g, idx) => {
              const theme = compareTheme(idx);
              return (
              <div
                key={g.appId}
                className={cn(
                  "rounded-xl border-2 p-4 relative overflow-hidden",
                  theme.cardBorder,
                  theme.cardBg,
                )}
              >
                <div className={cn("absolute inset-x-0 top-0 h-1", theme.dot)} />
                {games.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeGame(g.appId)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                    aria-label="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <Link to={`/game/${g.appId}`} className="flex items-center gap-3 group">
                  {g.detail.iconUrl ? (
                    <img src={g.detail.iconUrl} alt="" className="w-12 h-12 rounded-xl ring-2 ring-background" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-bold ring-2 ring-background", theme.headerBg, theme.accent)}>
                      {g.detail.title.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={cn("font-semibold text-sm truncate group-hover:underline", theme.accent)}>{g.detail.title}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full", theme.dot)} />
                      #{g.appId}
                    </p>
                  </div>
                </Link>
              </div>
            );
            })}
          </div>

          <MetricsTable games={games} t={t} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompareChart
              title={t("Lịch sử hạng", "Rank history")}
              data={rankChartData}
              games={games}
              yReversed
            />
            <CompareChart title={t("Lịch sử rating", "Rating history")} data={ratingChartData} games={games} domain={[0, 10]} />
            <CompareChart title={t("Lịch sử reviews", "Reviews history")} data={reviewsChartData} games={games} />
            <CompareChart
              title={t("Tăng đăng ký trước (delta)", "Pre-reg growth (delta)")}
              data={reserveDeltaData}
              games={games}
            />
          </div>

          <PotentialCompareTable games={games} t={t} />

          {showAiCompare && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {t("So sánh AI (rubric)", "AI comparison (rubric)")}
                </h2>
                {canAiRun && (
                  <button
                    type="button"
                    disabled={isAiBusy}
                    onClick={() => compareAiMutation.mutate()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isAiBusy
                      ? t("Đang chạy…", "Running…")
                      : t("Chạy so sánh AI", "Run AI compare")}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Kết quả so sánh được lưu theo bộ game. Mỗi lần chạy tạo một bản ghi mới trong lịch sử.",
                  "Compare results are saved per game set. Each run adds a new history entry.",
                )}
              </p>

              {compareHistoryLoading && (
                <p className="text-xs text-muted-foreground">{t("Đang tải lịch sử…", "Loading history…")}</p>
              )}

              {compareHistory && compareHistory.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("Lịch sử so sánh", "Compare history")}
                  </span>
                  <select
                    value={selectedCompareId ?? compareHistory[0].compareId}
                    onChange={(e) => applySavedCompare(e.target.value)}
                    className="text-xs rounded-md border border-border bg-background px-2 py-1.5 min-w-[200px]"
                  >
                    {compareHistory.map((h, idx) => (
                      <option key={h.compareId} value={h.compareId}>
                        {idx === 0
                          ? `${t("Mới nhất", "Latest")} · `
                          : ""}
                        {new Date(h.comparedAt).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground">
                    {t(`${compareHistory.length} bản`, `${compareHistory.length} saved`)}
                  </span>
                </div>
              )}

              {isAiBusy && (
                <AnalysisProgressPanel progress={analysisProgress} />
              )}

              {displayMissing && displayMissing.length > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm space-y-3">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {t("Thiếu phân tích AI cho:", "Missing AI analysis for:")}
                  </p>
                  <ul className="space-y-2">
                    {displayMissing.map((m) => (
                      <li
                        key={m.appId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background/60 px-3 py-2"
                      >
                        <span className="min-w-0">
                          <Link to={`/game/${m.appId}`} className="text-primary hover:underline font-medium">
                            {m.gameName ?? `appId ${m.appId}`}
                          </Link>
                        </span>
                        {canAiRun && (
                          <button
                            type="button"
                            disabled={isAiBusy}
                            onClick={() => analyzeThenCompareMutation.mutate([m])}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-500/25 disabled:opacity-50 dark:text-amber-100"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {t("Phân tích rồi so sánh", "Analyze then compare")}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {canAiRun && displayMissing.length > 1 && (
                    <button
                      type="button"
                      disabled={isAiBusy}
                      onClick={() => analyzeThenCompareMutation.mutate(displayMissing)}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      {t(
                        `Phân tích ${displayMissing.length} game thiếu rồi so sánh`,
                        `Analyze ${displayMissing.length} missing games then compare`,
                      )}
                    </button>
                  )}
                </div>
              )}

              {aiResult && <AiCompareResults result={aiResult} games={games} t={t} />}
            </div>
          )}
        </>
      )}

      <CompareGamePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        seedGames={games.map((g) => ({
          appId: g.appId,
          title: g.detail.title,
          iconUrl: g.detail.iconUrl,
        }))}
        seedTags={games[0]?.detail.tags ?? []}
      />
    </div>
  );
}

function MetricsTable({
  games,
  t,
}: {
  games: CompareGameEntry[];
  t: (vi: string, en: string) => string;
}) {
  const rows = [
    {
      label: t("Rating", "Rating"),
      values: Object.fromEntries(games.map((g) => [g.appId, g.detail.rating != null ? parseFloat(g.detail.rating) : null])),
      higherBetter: true as const,
    },
    {
      label: t("Fans", "Fans"),
      values: Object.fromEntries(games.map((g) => [g.appId, g.detail.fansCount])),
      higherBetter: true as const,
    },
    {
      label: t("Đăng ký trước", "Pre-reg"),
      values: Object.fromEntries(games.map((g) => [g.appId, g.detail.reserveCount])),
      higherBetter: true as const,
    },
    {
      label: t("Downloads", "Downloads"),
      values: Object.fromEntries(games.map((g) => [g.appId, g.detail.hitsTotal])),
      higherBetter: true as const,
    },
    {
      label: t("Hạng Android", "Android rank"),
      values: Object.fromEntries(games.map((g) => [g.appId, g.detail.androidRank])),
      higherBetter: false as const,
    },
    {
      label: t("Hạng iOS", "iOS rank"),
      values: Object.fromEntries(games.map((g) => [g.appId, g.detail.iosRank])),
      higherBetter: false as const,
    },
    {
      label: t("Điểm AI rubric", "AI rubric score"),
      values: Object.fromEntries(
        games.map((g) => [g.appId, g.analysisSummary.available ? g.analysisSummary.weightedScore ?? null : null]),
      ),
      higherBetter: true as const,
    },
  ].map((r) => ({
    ...r,
    best: r.higherBetter
      ? bestAppIdHigher(games, r.values)
      : bestAppIdLower(games, r.values),
  }));

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground bg-muted/40 border-b border-border">
              {t("Chỉ số", "Metric")}
            </th>
            {games.map((g, idx) => {
              const theme = compareTheme(idx);
              return (
                <th
                  key={g.appId}
                  className={cn(
                    "px-4 py-3 text-right text-xs font-semibold border-b-2 border-l",
                    theme.headerBg,
                    theme.headerBorder,
                    theme.headerText,
                    theme.colBorder,
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 justify-end max-w-[160px] ml-auto">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", theme.dot)} />
                    <span className="truncate">{g.detail.title}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-4 py-3 font-medium text-muted-foreground bg-muted/20">{row.label}</td>
              {games.map((g, idx) => {
                const theme = compareTheme(idx);
                const v = row.values[g.appId];
                const display =
                  v == null
                    ? "—"
                    : typeof v === "number" && /Fans|Pre-reg|Download/i.test(row.label)
                      ? formatNumber(v)
                      : String(v);
                const isBest = row.best === g.appId;
                return (
                  <td
                    key={g.appId}
                    className={cn(
                      "px-4 py-3 text-right tabular-nums border-l",
                      theme.colBorder,
                      isBest ? theme.colBgStrong : theme.colBg,
                      isBest && "font-semibold",
                      isBest && theme.accent,
                    )}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PotentialCompareTable({
  games,
  t,
}: {
  games: CompareGameEntry[];
  t: (vi: string, en: string) => string;
}) {
  const rows = [
    {
      label: t("Reserve composite", "Reserve composite"),
      pick: (g: CompareGameEntry) => g.potential.reserve?.compositeScore ?? null,
    },
    {
      label: t("Reserve momentum", "Reserve momentum"),
      pick: (g: CompareGameEntry) => g.potential.reserve?.momentumScore ?? null,
    },
    {
      label: t("Launch composite", "Launch composite"),
      pick: (g: CompareGameEntry) => g.potential.launched?.compositeScore ?? null,
    },
    {
      label: t("Launch momentum", "Launch momentum"),
      pick: (g: CompareGameEntry) => g.potential.launched?.momentumScore ?? null,
    },
  ];

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold">{t("Tiềm năng", "Potential")}</h2>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs text-muted-foreground bg-muted/40 border-b border-border">
              {t("Chỉ số", "Metric")}
            </th>
            {games.map((g, idx) => {
              const theme = compareTheme(idx);
              return (
                <th
                  key={g.appId}
                  className={cn(
                    "px-4 py-3 text-right text-xs font-semibold border-b-2 border-l",
                    theme.headerBg,
                    theme.headerBorder,
                    theme.headerText,
                    theme.colBorder,
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 justify-end max-w-[160px] ml-auto">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", theme.dot)} />
                    <span className="truncate">{g.detail.title}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const values = Object.fromEntries(games.map((g) => [g.appId, row.pick(g)]));
            const best = bestAppIdHigher(games, values);
            return (
              <tr key={row.label}>
                <td className="px-4 py-3 text-muted-foreground bg-muted/20">{row.label}</td>
                {games.map((g, idx) => {
                  const theme = compareTheme(idx);
                  const v = row.pick(g);
                  const isBest = best === g.appId;
                  return (
                    <td
                      key={g.appId}
                      className={cn(
                        "px-4 py-3 text-right tabular-nums font-medium border-l",
                        theme.colBorder,
                        isBest ? theme.colBgStrong : theme.colBg,
                        isBest && theme.accent,
                        v != null && !isBest && getScoreColor(v),
                      )}
                    >
                      {v != null ? v.toFixed(1) : "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompareChart({
  title,
  data,
  games,
  yReversed,
  domain,
}: {
  title: string;
  data: Array<Record<string, string | number | null>>;
  games: CompareGameEntry[];
  yReversed?: boolean;
  domain?: [number, number];
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis reversed={yReversed} domain={domain} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          {games.map((g, idx) => (
            <Line
              key={g.appId}
              type="monotone"
              dataKey={compareSeriesKey(g.appId)}
              name={g.detail.title}
              stroke={COMPARE_COLORS[idx % COMPARE_COLORS.length]}
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function AiCompareResults({
  result,
  games,
  t,
}: {
  result: GameComparisonAI;
  games: CompareGameEntry[];
  t: (vi: string, en: string) => string;
}) {
  const gridCols = games.length <= 2 ? "grid-cols-2" : games.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-5 pt-2 border-t border-border">
      {result.summaryBullets.length > 0 && (
        <ul className="list-disc pl-5 text-sm space-y-1">
          {result.summaryBullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {result.genrePackNote && (
        <p className="text-xs text-muted-foreground italic">{result.genrePackNote}</p>
      )}
      {result.overallRecommendation && (
        <p className="text-sm font-medium border-l-4 border-primary pl-3">{result.overallRecommendation}</p>
      )}
      {result.bestForTestAppId != null && (
        <p className={cn("text-sm font-medium", compareGameTheme(games, result.bestForTestAppId).accent)}>
          <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5 align-middle", compareGameTheme(games, result.bestForTestAppId).dot)} />
          {t("Ưu tiên test", "Priority for test")}: {gameLabel(games, result.bestForTestAppId)}
        </p>
      )}

      {result.perPart.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">{t("Theo đầu mục rubric", "By rubric section")}</h3>
          {result.perPart.map((part) => (
            <div key={part.partId} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-sm">{part.labelVi}</span>
                {part.winnerAppId != null && (
                  <span className="text-xs text-muted-foreground">
                    {t("Tốt hơn", "Better")}:{" "}
                    <span className={cn("font-semibold", compareGameTheme(games, part.winnerAppId).accent)}>
                      {gameLabel(games, part.winnerAppId)}
                    </span>
                  </span>
                )}
              </div>
              {part.note && <p className="text-xs text-muted-foreground leading-relaxed">{part.note}</p>}
              <div className={cn("grid gap-3", gridCols)}>
                {games.map((g, idx) => {
                  const theme = compareTheme(idx);
                  const cell = part.byGame[g.appId];
                  const isWinner = part.winnerAppId === g.appId;
                  return (
                    <div
                      key={g.appId}
                      className={cn(
                        "rounded-lg border bg-card p-3 min-w-0",
                        isWinner
                          ? cn("border-2 shadow-sm", theme.cardBorder)
                          : "border-border",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs truncate flex items-center gap-1.5 mb-2",
                          isWinner ? cn("font-bold", theme.accent) : "font-medium text-muted-foreground",
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full shrink-0", theme.dot)} />
                        {g.detail.title}
                      </p>
                      <p
                        className={cn(
                          "text-xs leading-relaxed",
                          isWinner ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {cell?.score != null ? (
                          <span className={cn("tabular-nums", isWinner && "font-bold")}>{cell.score}đ</span>
                        ) : (
                          "—"
                        )}
                        {" — "}
                        {cell?.verdict || "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-3">{t("Điểm mạnh & điểm yếu", "Strengths & weaknesses")}</h3>
        <div className={cn("grid gap-4", gridCols)}>
          {games.map((g, idx) => {
            const theme = compareTheme(idx);
            const strengths = result.strengthsByGame[g.appId] ?? [];
            const weaknesses = result.weaknessesByGame[g.appId] ?? [];
            return (
              <div
                key={g.appId}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", theme.dot)} />
                  <p className="font-semibold text-sm truncate">{g.detail.title}</p>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                      {t("Điểm mạnh", "Strengths")}
                    </p>
                    <ul className="text-xs space-y-1 text-foreground/90">
                      {strengths.length === 0 ? (
                        <li className="text-muted-foreground">—</li>
                      ) : (
                        strengths.map((s, i) => (
                          <li key={i} className="flex gap-2 leading-relaxed">
                            <span className="text-muted-foreground shrink-0">·</span>
                            <span>{s}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                      {t("Điểm yếu", "Weaknesses")}
                    </p>
                    <ul className="text-xs space-y-1 text-foreground/90">
                      {weaknesses.length === 0 ? (
                        <li className="text-muted-foreground">—</li>
                      ) : (
                        weaknesses.map((s, i) => (
                          <li key={i} className="flex gap-2 leading-relaxed">
                            <span className="text-muted-foreground shrink-0">·</span>
                            <span>{s}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
