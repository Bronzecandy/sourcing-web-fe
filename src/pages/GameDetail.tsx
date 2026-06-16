import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { ArrowLeft, Brain, Star, Users, Heart, MessageSquare, TrendingUp, Activity, Shield, Database, History, ChevronDown, ChevronUp, Trash2, Sparkles, Calendar, Download, LayoutGrid, Bookmark } from "lucide-react";
import { fetchGameDetail, fetchGameReviews, triggerAnalysis, fetchGamePotentialBreakdown, fetchLatestAnalysis, fetchAnalysisHistory, deleteAnalysis } from "@/services/api";
import { useContentLang } from "@/lib/content-language";
import { getSummaryBullets, mainAnalysisScore } from "@/lib/analysis-localize";
import ReviewWindowPicker from "@/components/ReviewWindowPicker";
import AnalysisProgressPanel, {
  INITIAL_ANALYSIS_PROGRESS,
  appendProgressFromStream,
  type AnalysisProgressState,
} from "@/components/AnalysisProgressPanel";
import type { AnalysisProgressUpdate } from "@/lib/analysis-stream";
import HistoryRangePicker from "@/components/HistoryRangePicker";
import type { HistoryRange } from "@/types/history-range";
import AnalysisSourceBadge from "@/components/AnalysisSourceBadge";
import { analysisDetailPath } from "@/lib/analysis-url";
import StoreLinkChips from "@/components/StoreLinkChips";
import { analysisStoreLinks, gameStoreLinks } from "@/lib/store-links";
import { DEFAULT_REVIEW_WINDOW, type ReviewWindow } from "@/types/review-window";
import { buildFanReserveDeltaSeries, formatDelta } from "@/lib/chart-delta";
import { LaunchBoardTags } from "@/components/LaunchBoardTags";
import { useUiCopy, potentialRadarMetric } from "@/lib/use-ui-copy";
import { cn, formatNumber, getScoreColor } from "@/lib/utils";
import type { AiAnalysis, GameReview, GamePotentialDetail, PotentialBreakdown } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";

const STAR_COLORS: Record<string, string> = {
  "1": "bg-red-500",
  "2": "bg-orange-500",
  "3": "bg-amber-500",
  "4": "bg-green-500",
  "5": "bg-emerald-500",
};

export default function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang: contentLang } = useContentLang();
  const { t } = useUiCopy();
  const { user } = useAuth();
  const canReviews = hasPermission(user, "crawl.reviews");
  const canPotential = hasPermission(user, "analytics.potential");
  const canAiRead = hasPermission(user, "ai.read");
  const canAiRun = hasPermission(user, "ai.run");
  const canAiDelete = hasPermission(user, "ai.delete");
  const [historyRange, setHistoryRange] = useState<HistoryRange>({ kind: "days", days: 30 });
  const [reviewPage, setReviewPage] = useState(1);
  const appId = parseInt(id || "0");

  const { data: game, isLoading } = useQuery({
    queryKey: ["game", appId, historyRange, contentLang],
    queryFn: () => fetchGameDetail(appId, historyRange, contentLang),
    enabled: appId > 0,
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", appId, reviewPage],
    queryFn: () => fetchGameReviews(appId, reviewPage),
    enabled: appId > 0 && canReviews,
  });

  const [potentialDays, setPotentialDays] = useState(14);
  const { data: potentialBreakdown } = useQuery({
    queryKey: ["potential-breakdown", appId, potentialDays],
    queryFn: () => fetchGamePotentialBreakdown(appId, potentialDays, "combined"),
    enabled: appId > 0 && canPotential,
  });

  const queryClient = useQueryClient();

  const { data: savedAnalysis } = useQuery({
    queryKey: ["ai-analysis", appId],
    queryFn: () => fetchLatestAnalysis(appId),
    enabled: appId > 0 && canAiRead,
  });

  const { data: analysisHistory } = useQuery({
    queryKey: ["ai-analysis-history", appId],
    queryFn: () => fetchAnalysisHistory(appId),
    enabled: appId > 0 && canAiRead,
  });

  const [reviewWindow, setReviewWindow] = useState<ReviewWindow>(DEFAULT_REVIEW_WINDOW);
  const [analysisProgress, setAnalysisProgress] =
    useState<AnalysisProgressState>(INITIAL_ANALYSIS_PROGRESS);

  const onAnalysisProgress = useCallback(
    (p: AnalysisProgressUpdate) => {
      setAnalysisProgress((prev) => appendProgressFromStream(prev, p, t));
    },
    [t],
  );

  const analysisMutation = useMutation({
    mutationFn: () => triggerAnalysis(appId, reviewWindow, onAnalysisProgress),
    onMutate: () => setAnalysisProgress(INITIAL_ANALYSIS_PROGRESS),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", appId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis-history", appId] });
      navigate(analysisDetailPath(data));
    },
  });

  const analysisResult = analysisMutation.data ?? savedAnalysis ?? undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("Không tìm thấy game", "Game not found")}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:underline">{t("Quay lại", "Go back")}</button>
      </div>
    );
  }

  const shortNum = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(v);
  };

  const chartData = [...game.history].reverse().map((h) => ({
    date: new Date(h.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    android: h.androidRank,
    ios: h.iosRank,
  }));

  const reserveChartData = [...game.history].reverse().map((h) => ({
    date: new Date(h.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    reserves: h.reserveCount,
    fans: h.fansCount,
    reviews: h.reviewCount,
    rating: h.rating != null ? parseFloat(h.rating) : null,
  }));

  const fanDeltaChartData = buildFanReserveDeltaSeries(game.history).map((h) => ({
    date: new Date(h.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    fansDelta: h.fansDelta,
    reservesDelta: h.reservesDelta,
  }));

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t("Quay lại", "Back")}
      </button>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start gap-5">
          {game.iconUrl ? (
            <img src={game.iconUrl} alt="" className="w-20 h-20 rounded-2xl" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/50 flex items-center justify-center text-2xl font-bold text-primary">
              {game.title.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{game.title}</h1>
            <StoreLinkChips links={gameStoreLinks(game.appId)} className="mt-2" />
            {game.developerName && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{t("Nhà phát triển:", "Developer:")}</span>{" "}
                {game.developerName}
                {game.publisherName && game.publisherName !== game.developerName && (
                  <span> · {t("Phát hành:", "Publisher:")} {game.publisherName}</span>
                )}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {game.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium">{tag}</span>
              ))}
              {game.isExclusive && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{t("Độc quyền", "Exclusive")}</span>}
              {game.editorChoice && <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">{t("Biên tập viên chọn", "Editor's Choice")}</span>}
            </div>
            {game.description && (
              <p className="text-sm text-muted-foreground mt-3 max-w-3xl line-clamp-3" dangerouslySetInnerHTML={{ __html: game.description }} />
            )}
          </div>
          <div className="flex gap-4 text-center">
            {game.androidRank && (
              <div>
                <p className="text-xs text-muted-foreground">{t("Android", "Android")}</p>
                <p className="text-2xl font-bold text-primary">#{game.androidRank}</p>
              </div>
            )}
            {game.iosRank && (
              <div>
                <p className="text-xs text-muted-foreground">{t("iOS", "iOS")}</p>
                <p className="text-2xl font-bold text-primary">#{game.iosRank}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats — no Views, enhanced Reviews */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MiniStat icon={<Star className="w-4 h-4 text-yellow-500" />} label={t("Đánh giá", "Rating")} value={game.rating ? `${game.rating}/10` : "N/A"} />
        <MiniStat icon={<Users className="w-4 h-4" />} label={t("Người hâm mộ", "Fans")} value={game.fansCount != null ? formatNumber(game.fansCount) : "N/A"} />
        <MiniStat icon={<Heart className="w-4 h-4" />} label={t("Đăng ký trước", "Reserves")} value={game.reserveCount != null ? formatNumber(game.reserveCount) : "N/A"} />
        <MiniStat
          icon={<Download className="w-4 h-4" />}
          label={t("Lượt tải", "Downloads")}
          value={game.hitsTotal != null ? formatNumber(game.hitsTotal) : "N/A"}
        />
        <MiniStat
          icon={<Calendar className="w-4 h-4" />}
          label={t("Ngày ra mắt", "Release date")}
          value={game.releaseDate ?? "N/A"}
        />
        <MiniStat
          icon={<MessageSquare className="w-4 h-4" />}
          label={t("Bình luận", "Reviews")}
          value={game.reviewCount != null ? formatNumber(game.reviewCount) : "N/A"}
          sub={t(`${formatNumber(game.actualReviewCount)} trong CSDL`, `${formatNumber(game.actualReviewCount)} in DB`)}
        />
      </div>

      {/* Review Distribution */}
      <ReviewDistributionCard distribution={game.reviewDistribution} actualCount={game.actualReviewCount} />

      {canPotential && (
        <PotentialBreakdownSection
          breakdown={potentialBreakdown}
          days={potentialDays}
          setDays={setPotentialDays}
        />
      )}

      {canAiRead && (
        <AIAnalysisSection
          analysisResult={analysisResult}
          analysisMutation={analysisMutation}
          analysisProgress={analysisProgress}
          history={analysisHistory ?? []}
          reviewWindow={reviewWindow}
          onReviewWindowChange={setReviewWindow}
          canRun={canAiRun}
          canDelete={canAiDelete}
          currentUserId={user?.id}
        />
      )}

      {/* Charts */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">{t("Lịch sử xếp hạng", "Rank History")}</h2>
          <HistoryRangePicker value={historyRange} onChange={setHistoryRange} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis reversed domain={["dataMin - 5", "dataMax + 5"]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="android" name="Android" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="ios" name="iOS" stroke="#f43f5e" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold mb-1">{t("Tăng fan & đăng ký trước theo ngày", "Daily fan & reserve growth")}</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {t("So với ngày liền trước trong khoảng đã chọn.", "Change vs. the previous day in the selected range.")}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={fanDeltaChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatDelta(Number(v))} />
            <Tooltip formatter={(value) => (value != null ? formatDelta(Number(value)) : "—")} />
            <Legend />
            <Line type="monotone" dataKey="fansDelta" name={t("Tăng fan/ngày", "Fans/day")} stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
            <Line type="monotone" dataKey="reservesDelta" name={t("Tăng đăng ký/ngày", "Reserves/day")} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold mb-4">{t("Lịch sử điểm đánh giá", "Rating History")}</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={reserveChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => Number(value).toFixed(1)} />
            <Line type="monotone" dataKey="rating" name={t("Đánh giá", "Rating")} stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold mb-4">{t("Lịch sử số bình luận", "Reviews History")}</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={reserveChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={shortNum} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Line type="monotone" dataKey="reviews" name={t("Bình luận", "Reviews")} stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {canReviews && (
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold mb-4">
          {t("Bình luận người chơi", "User Reviews")}
          {reviews?.total != null && <span className="text-sm font-normal text-muted-foreground"> ({formatNumber(reviews.total)})</span>}
        </h2>
        {reviews?.data && reviews.data.length > 0 ? (
          <div className="space-y-3">
            {reviews.data.map((review: GameReview) => (
              <div key={review.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {review.userAvatar ? (
                      <img src={review.userAvatar} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">{review.userName.charAt(0)}</div>
                    )}
                    <span className="font-medium text-sm">{review.userName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {review.score != null && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {review.score}
                      </span>
                    )}
                    {review.upsCount > 0 && <span>👍 {review.upsCount}</span>}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{review.content}</p>
              </div>
            ))}
            {reviews.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <button disabled={reviewPage === 1} onClick={() => setReviewPage(reviewPage - 1)}
                  className="px-3 py-1 text-xs rounded border border-border disabled:opacity-40">{t("Trước", "Prev")}</button>
                <span className="px-3 py-1 text-xs">{reviewPage}/{reviews.totalPages}</span>
                <button disabled={reviewPage === reviews.totalPages} onClick={() => setReviewPage(reviewPage + 1)}
                  className="px-3 py-1 text-xs rounded border border-border disabled:opacity-40">{t("Sau", "Next")}</button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">{t("Chưa có bình luận", "No reviews available")}</p>
        )}
      </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}<span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ReviewDistributionCard({ distribution, actualCount }: { distribution: Record<string, number>; actualCount: number }) {
  const { t } = useUiCopy();
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const stars = ["5", "4", "3", "2", "1"];

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-primary" /> {t("Phân bố điểm sao", "Review Score Distribution")}
        <span className="text-xs font-normal text-muted-foreground">
          ({formatNumber(total)} {t("có sao", "rated")} / {formatNumber(actualCount)} {t("tổng trong CSDL", "total in DB")})
        </span>
      </h3>
      <div className="space-y-2">
        {stars.map((star) => {
          const count = distribution[star] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs w-12 text-right font-medium">{star} ★</span>
              <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", STAR_COLORS[star] ?? "bg-gray-400")}
                  style={{ width: `${pct}%`, opacity: 0.8 }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-20 text-right">{count} ({pct.toFixed(1)}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AIAnalysisSection({
  analysisResult,
  analysisMutation,
  analysisProgress,
  history,
  reviewWindow,
  onReviewWindowChange,
  canRun,
  canDelete,
  currentUserId,
}: {
  analysisResult: AiAnalysis | undefined;
  analysisMutation: { mutate: () => void; isPending: boolean; isError: boolean; error: Error | null };
  analysisProgress: AnalysisProgressState;
  history: AiAnalysis[];
  reviewWindow: ReviewWindow;
  onReviewWindowChange: (w: ReviewWindow) => void;
  canRun: boolean;
  canDelete: boolean;
  currentUserId?: string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useUiCopy();
  const appId = analysisResult?.appId ?? history[0]?.appId ?? 0;

  const overview = analysisResult;

  const handleDelete = async (analyzedAt: string) => {
    if (!confirm(t("Xóa phân tích này?", "Delete this analysis?"))) return;
    try {
      await deleteAnalysis(appId, analyzedAt);
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", appId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis-history", appId] });
    } catch { /* ignore */ }
  };

  const canDeleteItem = (h: AiAnalysis) =>
    canDelete && !!currentUserId && h.analyzedByUserId === currentUserId;
  const ownHistory = history.filter((h) => h.analyzedByUserId === currentUserId);

  const handleDeleteAll = async () => {
    if (ownHistory.length === 0) return;
    if (
      !confirm(
        t(
          `Xóa ${ownHistory.length} phân tích của bạn cho game này?`,
          `Delete your ${ownHistory.length} analyses for this game?`,
        ),
      )
    )
      return;
    try {
      await deleteAnalysis(appId);
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", appId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis-history", appId] });
      setShowHistory(false);
    } catch { /* ignore */ }
  };

  const runBlock = canRun ? (
    <div className="mb-4 max-w-lg mx-auto text-center">
      <ReviewWindowPicker value={reviewWindow} onChange={onReviewWindowChange} className="mb-4" />
      {analysisMutation.isPending && (
        <AnalysisProgressPanel progress={analysisProgress} className="mb-4 text-left" />
      )}
      <button
        onClick={() => analysisMutation.mutate()}
        disabled={analysisMutation.isPending}
        className="mx-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all shadow-md inline-flex items-center justify-center"
      >
        {analysisMutation.isPending ? (
          <span className="flex items-center gap-2 justify-center">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            {t("Đang phân tích…", "Analyzing…")}
          </span>
        ) : (
          <span className="flex items-center gap-2 justify-center">
            <Sparkles className="w-4 h-4" /> {t("Chạy phân tích AI", "Run AI Analysis")}
          </span>
        )}
      </button>
      {analysisMutation.isError && (
        <p className="text-destructive text-xs mt-3 text-center">
          {t("Lỗi:", "Error:")} {(analysisMutation.error as Error)?.message ?? t("Phân tích thất bại", "Analysis failed")}
        </p>
      )}
    </div>
  ) : null;

  if (!overview && history.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-purple-500" />
        </div>
        <h3 className="font-semibold mb-1">{t("Phân tích bình luận bằng AI", "AI Review Analysis")}</h3>
        <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
          {t(
            "Chọn khoảng bình luận, rồi chạy AI để chấm điểm và tóm tắt.",
            "Pick a review window, then run AI scoring and summary.",
          )}
        </p>
        {runBlock}
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" /> {t("Phân tích bình luận bằng AI", "AI Review Analysis")}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" /> {t("Lịch sử", "History")} ({history.length})
                {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {runBlock}

        {showHistory && history.length > 0 && (
          <div className="mb-4 border border-border/50 rounded-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
              {history.map((h, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2.5 text-xs hover:bg-muted/50 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium truncate tabular-nums">
                        {h.analyzedAt ? new Date(h.analyzedAt).toLocaleString() : `Analysis #${history.length - idx}`}
                      </span>
                      <AnalysisSourceBadge source={h.source} size="sm" />
                    </div>
                    <StoreLinkChips links={analysisStoreLinks(h)} size="xs" className="mt-1" stopPropagation={false} />
                    {h.dateRangeStart && h.dateRangeEnd && (
                      <span className="text-muted-foreground">{h.dateRangeStart} — {h.dateRangeEnd}</span>
                    )}
                  </div>
                  <span className={cn("font-bold tabular-nums shrink-0", getScoreColor(mainAnalysisScore(h)))}>
                    {mainAnalysisScore(h)}
                  </span>
                  <Link
                    to={analysisDetailPath(h)}
                    className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-medium shrink-0"
                  >
                    {t("Chi tiết", "Details")}
                  </Link>
                  {canDeleteItem(h) && (
                    <button
                      type="button"
                      onClick={() => h.analyzedAt && handleDelete(h.analyzedAt)}
                      className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canDelete && ownHistory.length > 1 && (
              <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
                <button type="button" onClick={handleDeleteAll} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> {t("Xóa phân tích của tôi", "Delete my analyses")}
                </button>
              </div>
            )}
          </div>
        )}

        {overview && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {overview.developerName && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">{t("Nhà phát triển:", "Developer:")}</span>{" "}
                    {overview.developerName}
                  </p>
                )}
                <StoreLinkChips links={analysisStoreLinks(overview)} size="xs" className="mb-2" stopPropagation={false} />
                <p className="text-xs text-muted-foreground">
                  {overview.reviewsAnalyzed} {t("bình luận", "reviews")}
                  {overview.dateRangeStart && overview.dateRangeEnd && (
                    <> · {overview.dateRangeStart} — {overview.dateRangeEnd}</>
                  )}
                </p>
              </div>
              <div className="text-right">
                <div className={cn("text-2xl font-bold tabular-nums", getScoreColor(mainAnalysisScore(overview)))}>
                  {mainAnalysisScore(overview)}
                </div>
                <div className="text-[10px] text-muted-foreground">{t("Điểm tổng", "Overall score")}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {getSummaryBullets(overview)[0] ?? overview.summary}
            </p>
            <Link
              to={analysisDetailPath(overview)}
              className="inline-block px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-medium"
            >
              {t("Xem chi tiết đánh giá", "View evaluation details")}
            </Link>
          </div>
        )}
      </div>

    </>
  );
}

function PotentialBreakdownSection({
  breakdown,
  days,
  setDays,
}: {
  breakdown: PotentialBreakdown | undefined;
  days: number;
  setDays: (d: number) => void;
}) {
  const { t, lang } = useUiCopy();
  const lc = breakdown?.lifecycle;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> {t("Phân tích tiềm năng", "Potential Analysis")}
        </h2>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {lang === "vi" ? `${d} ngày` : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {lc?.transitioned && lc.firstLaunchDate && (
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3 text-sm">
          <p className="font-medium text-violet-800 dark:text-violet-200">
            {t("Reserve → Launch", "Reserve → Launch")}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {lc.reserveWindowEnd
              ? t(
                  `Chuyển giai đoạn từ ${lc.firstLaunchDate}. Reserve (v6): ${days} ngày trước ngày chuyển. Launch (v12): ${lc.postLaunchDayCount} ngày sau chuyển trong cửa sổ ${days} ngày gần nhất.`,
                  `Phase change from ${lc.firstLaunchDate}. Reserve (v6): ${days} days before launch. Launch (v12): ${lc.postLaunchDayCount} post-launch days in the latest ${days}d window.`,
                )
              : t(
                  `Chuyển giai đoạn từ ${lc.firstLaunchDate} — trong ${days} ngày: ${lc.preLaunchDayCount} ngày Reserve, ${lc.postLaunchDayCount} ngày Launch`,
                  `Phase change from ${lc.firstLaunchDate} — in ${days}d window: ${lc.preLaunchDayCount} reserve days, ${lc.postLaunchDayCount} launch days`,
                )}
          </p>
        </div>
      )}

      <PotentialSection
        variant="reserve"
        title={t("Tiềm năng — Reserve (v6)", "Potential — Reserve (v6)")}
        detail={breakdown?.reserve}
        lifecycle={lc}
        emptyHint={t(
          "Chưa đủ dữ liệu Reserve trong khoảng thời gian này.",
          "Not enough Reserve chart data in this window.",
        )}
      />

      <PotentialSection
        variant="launched"
        title={t("Tiềm năng — Launch (v12)", "Potential — Launch (v12)")}
        detail={breakdown?.launched}
        emptyHint={t(
          "Chưa đủ dữ liệu Launch (cần ≥2–3 ngày sau khi lên bảng Hot/Pop/New).",
          "Not enough Launch data (need ≥2–3 days after appearing on Hot/Pop/New charts).",
        )}
      />
    </div>
  );
}

function PotentialSection({
  variant,
  title,
  detail,
  lifecycle,
  emptyHint,
}: {
  variant: "reserve" | "launched";
  title: string;
  detail: GamePotentialDetail | null | undefined;
  lifecycle?: PotentialBreakdown["lifecycle"];
  emptyHint: string;
}) {
  const { t, lang } = useUiCopy();
  const isLaunch = variant === "launched";
  const wAudience = isLaunch ? 0.45 : 0.65;
  const wRating = isLaunch ? 0.15 : 0.25;
  const wRank = isLaunch ? 0.2 : 0.1;
  const wBoard = isLaunch ? 0.15 : 0;
  const wPre = isLaunch ? 0.05 : 0;

  const scaleMetricLabel = (metric: "reserve" | "download") =>
    metric === "download" ? t("lượt tải", "downloads") : t("đăng ký trước", "pre-registrations");

  const radarData = useMemo(() => {
    if (!detail) return [];
    const aud = detail.audience ?? detail.scale;
    const items = [
      { metric: potentialRadarMetric("Audience", lang), value: aud?.score ?? 0 },
      { metric: potentialRadarMetric("Rating", lang), value: detail.rating.score },
      { metric: potentialRadarMetric("RankQuality", lang), value: detail.rankQuality.score },
    ];
    if (isLaunch) {
      items.push({
        metric: potentialRadarMetric("LaunchBoard", lang),
        value: detail.launchBoard?.score ?? 0,
      });
      items.push({
        metric: potentialRadarMetric("PreLaunch", lang),
        value: detail.preLaunchScore ?? 0,
      });
    }
    return items;
  }, [detail, lang, isLaunch]);

  const aud = detail?.audience ?? detail?.scale;
  const ra = detail?.rating;
  const rq = detail?.rankQuality;
  const lb = detail?.launchBoard;
  const preScore = detail?.preLaunchScore ?? 0;
  const preRaw = detail?.preLaunchBonus ?? 0;
  const audienceL = potentialRadarMetric("Audience", lang);
  const ratingL = potentialRadarMetric("Rating", lang);
  const rankL = potentialRadarMetric("RankQuality", lang);
  const boardL = potentialRadarMetric("LaunchBoard", lang);
  const preL = potentialRadarMetric("PreLaunch", lang);
  const fmtContrib = (score: number, w: number) => (score * w).toFixed(1);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-base font-semibold mb-4">{title}</h3>
      {!isLaunch && lifecycle?.reserveWindowEnd && (
        <p className="text-xs text-muted-foreground mb-4 -mt-2">
          {t(
            `${lifecycle.reserveWindowDays ?? 14} ngày Reserve trước ngày chuyển Launch (${lifecycle.reserveWindowEnd}) — không tính ngày sau khi đã ra mắt.`,
            `${lifecycle.reserveWindowDays ?? 14} reserve days before launch (${lifecycle.reserveWindowEnd}) — post-launch days excluded.`,
          )}
        </p>
      )}
      <p className="text-xs text-muted-foreground mb-4 -mt-2">
        {isLaunch
          ? t(
              "3 trụ chính + BXH Launch + bonus Reserve. Quy mô & tăng trưởng gộp một mốc: base theo tier Phân phối, tăng chậm được dung hoà khi quy mô đã lớn.",
              "3 main pillars + Launch charts + pre-launch bonus. Audience merges scale + growth: Distribution tier base, slow growth forgiven when already large.",
            )
          : t(
              "3 trụ: Quy mô & tăng trưởng (gộp), Đánh giá, Chất lượng hạng. Rating giữ điểm cao khi ổn định ở mức tốt; game lớn không bị trừ nặng vì tăng chậm.",
              "3 pillars: Audience (merged), Rating, Rank Quality. Rating stays high when stable at a good level; large games aren't heavily penalized for slow growth.",
            )}
      </p>

      {!detail ? (
        <p className="text-muted-foreground text-sm text-center py-8">{emptyHint}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <div className="md:col-span-2 flex justify-center">
              <ResponsiveContainer width="100%" height={isLaunch ? 260 : 220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="md:col-span-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <ScoreCard label={t("Điểm cuối", "Final Score")} value={detail.compositeScore} large />
                <ScoreCard label={t("Điểm thô", "Raw Score")} value={detail.rawComposite} />
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{t("Độ tin cậy dữ liệu", "Data Confidence")}</p>
                  <p className="text-lg font-bold">×{detail.confidence.multiplier}</p>
                  <p className="text-xs text-muted-foreground">
                    {detail.confidence.dataPoints}/{detail.confidence.analysisDays} {t("ngày", "days")} ({detail.confidence.coverage}%)
                  </p>
                </div>
              </div>
              <div className="bg-muted/20 rounded-lg px-3 py-2 text-[10px] text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium text-foreground">{t("Thô", "Raw")}</span>{" "}
                  = {audienceL}×{wAudience} + {ratingL}×{wRating} + {rankL}×{wRank}
                  {isLaunch ? ` + ${boardL}×${wBoard} + ${preL}×${wPre}` : ""}
                </p>
                <p>
                  {t(
                    "Trụ thiếu dữ liệu sẽ bị bỏ và chia lại trọng số cho các trụ còn lại (không tính 0).",
                    "Pillars with no data are dropped and weights renormalized over the rest (not scored as 0).",
                  )}
                </p>
                <p>
                  <span className="font-medium text-foreground">{t("Cuối", "Final")}</span>{" "}
                  = {t("Thô", "Raw")} × {t("hệ số tin cậy", "Confidence multiplier")} ({detail.rawComposite} × {detail.confidence.multiplier} = {detail.compositeScore})
                </p>
                {detail.floorApplied && (
                  <p className="text-amber-700 dark:text-amber-400">
                    {t(
                      "Đã áp sàn: hạng BXH không được kéo điểm thô xuống dưới (Quy mô & Đánh giá) − 2 khi cả hai trụ đủ mạnh.",
                      "Floor applied: chart rank cannot drag raw score below (Audience + Rating) core − 2 when both pillars are strong.",
                    )}
                  </p>
                )}
                <p>
                  {t(
                    `Tin cậy = độ phủ dữ liệu (${detail.confidence.coverage}%), hệ số ×0.3 đến ×1.0. Càng nhiều ngày dữ liệu thì tin cậy càng cao.`,
                    `Confidence = data coverage (${detail.confidence.coverage}%), range ×0.3 to ×1.0. More days of data = higher confidence.`,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aud && (
              <FactorCard
                icon={<Database className="w-4 h-4" />}
                label={audienceL}
                weight={`${Math.round(wAudience * 100)}%`}
                score={aud.score}
                description={t(
                  `Gộp quy mô + tăng trưởng ${scaleMetricLabel(aud.metric)}. Base theo mốc Phân phối; bonus tăng trưởng được giảm trọng số khi base đã cao — game lớn tăng chậm không bị trừ nặng.`,
                  `Merged ${scaleMetricLabel(aud.metric)} scale + growth. Base from Distribution tiers; growth bonus weighted down when base is high — large games with slow growth aren't heavily penalized.`,
                )}
                rows={[
                  {
                    label: t("Base quy mô", "Scale base"),
                    badge: "tier",
                    value:
                      aud.end != null
                        ? `${formatNumber(aud.end)}${aud.baseTierLabel ? ` (${aud.baseTierLabel})` : ""}`
                        : t("Chưa có", "No data"),
                    points: aud.baseValue,
                    help: t(
                      "Điểm nền theo mốc quy mô tuyệt đối (nội suy log): 2M+ ≈ 94đ, 3M+ ≈ 98đ, 1M–2M 80→94, … Không còn vách đứng giữa các mốc.",
                      "Base points from absolute scale (log-interpolated): 2M+ ≈ 94pts, 3M+ ≈ 98pts, 1M–2M ramps 80→94, … No cliff jumps between tiers.",
                    ),
                  },
                  {
                    label: t("Bonus tăng trưởng", "Growth bonus"),
                    badge: aud.growthTierLabel ?? undefined,
                    value:
                      aud.start != null && aud.end != null ? (
                        <span className="block text-right">
                          <span className="block">
                            {formatNumber(aud.start)} → {formatNumber(aud.end)} (
                            {aud.delta >= 0 ? "+" : ""}
                            {formatNumber(aud.delta)})
                          </span>
                          {aud.growthBonus !== 0 && (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {t(
                                `Áp dụng: +${(aud.growthBonus * aud.growthWeight).toFixed(1)} đ (×${(aud.growthWeight * 100).toFixed(0)}% vì base cao)`,
                                `Applied: +${(aud.growthBonus * aud.growthWeight).toFixed(1)} pts (×${(aud.growthWeight * 100).toFixed(0)}% due to high base)`,
                              )}
                            </span>
                          )}
                        </span>
                      ) : (
                        t("Chưa đủ dữ liệu", "Not enough data")
                      ),
                    points: aud.growthBonus,
                    pointsTone: "bonus",
                    help: t(
                      "Số dương = cộng thêm theo mốc tốc độ tăng Phân phối. Với base lớn, chỉ một phần bonus được cộng vào điểm cuối.",
                      "Positive = tier bonus from Distribution growth buckets. With a large base, only part of the bonus is added to the final score.",
                    ),
                    formula: t(
                      `${aud.baseValue} + ${aud.growthBonus} × ${aud.growthWeight} = ${aud.score}`,
                      `${aud.baseValue} + ${aud.growthBonus} × ${aud.growthWeight} = ${aud.score}`,
                    ),
                  },
                  {
                    label: t("Tổng", "Total"),
                    isTotal: true,
                    value: t("Base + bonus tăng trưởng (có dung hoà)", "Base + growth bonus (forgiven)"),
                    points: aud.score,
                  },
                ]}
              />
            )}
            {ra && (
              <FactorCard
                icon={<Star className="w-4 h-4" />}
                label={ratingL}
                weight={`${Math.round(wRating * 100)}%`}
                score={ra.score}
                description={t(
                  "Base từ rating ĐẦU KỲ (8★→60, 10★→90) + ±5đ mỗi 0.1 thay đổi. Rating cao giữ nguyên không bị trừ vì không tăng thêm.",
                  "Base from period-START rating (8★→60, 10★→90) + ±5pts per 0.1 change. High stable ratings aren't penalized for not climbing further.",
                )}
                rows={[
                  {
                    label: t("Base đầu kỳ", "Period-start base"),
                    badge: "100%",
                    value: ra.start != null ? `${ra.start} ★` : t("Chưa có", "No data"),
                    points: ra.baseValue,
                    help: t(
                      "Điểm nền = (rating đầu kỳ − 5) × 15 + 15. Ví dụ 9.5★ → 82.5đ dù không đổi trong kỳ.",
                      "Base = (start rating − 5) × 15 + 15. E.g. 9.5★ → 82.5pts even if unchanged in the window.",
                    ),
                    formula:
                      ra.start != null
                        ? `(${ra.start} − 5) × 15 + 15 = ${ra.baseValue}`
                        : undefined,
                  },
                  {
                    label: t("Điều chỉnh biến động", "Change adjustment"),
                    badge: "±5/0.1",
                    value:
                      ra.start != null && ra.end != null
                        ? ra.delta === 0
                          ? t("Ổn định — không đổi", "Stable — no change")
                          : `${ra.start} → ${ra.end} (${ra.delta >= 0 ? "+" : ""}${ra.delta})`
                        : t("Ổn định", "Stable"),
                    points: ra.deltaAdjustment,
                    pointsTone: "delta",
                    help: t(
                      "Mỗi +0.1 rating cộng 5đ, mỗi −0.1 trừ 5đ. Không đổi = không cộng không trừ.",
                      "+5pts per +0.1 rating, −5pts per −0.1. No change = no adjustment.",
                    ),
                    formula:
                      ra.start != null && ra.delta !== 0
                        ? `${ra.delta} / 0.1 × 5 = ${ra.deltaAdjustment >= 0 ? "+" : ""}${ra.deltaAdjustment}`
                        : undefined,
                  },
                  {
                    label: t("Tổng", "Total"),
                    isTotal: true,
                    value: t("Base + điều chỉnh", "Base + adjustment"),
                    points: ra.score,
                    formula:
                      ra.start != null
                        ? `${ra.baseValue} + ${ra.deltaAdjustment >= 0 ? "+" : ""}${ra.deltaAdjustment} = ${ra.score}`
                        : undefined,
                  },
                ]}
              />
            )}
            {rq && (
              <FactorCard
                icon={<Shield className="w-4 h-4" />}
                label={rankL}
                weight={`${Math.round(wRank * 100)}%`}
                score={rq.score}
                description={t(
                  "Gộp vị thế hạng + độ ổn định vào MỘT trụ. Chấm theo bậc hạng (Top 10 = 100, Top 20 = 80, Top 50 = 55...) nên game lẹt đẹt hạng 50 không còn được tính như game top 10.",
                  "Merges rank position + stability into ONE pillar. Scored by rank tiers (Top 10 = 100, Top 20 = 80, Top 50 = 55...) so a game stuck at #50 no longer counts like a top-10 game.",
                )}
                rows={[
                  {
                    label: t("Chất lượng vị thế", "Position quality"),
                    badge: "40%",
                    value: t(`Hạng TB #${rq.avgRank}`, `Avg rank #${rq.avgRank}`),
                    points: rq.positionQuality,
                    help: t(
                      "Trung bình điểm-bậc theo từng ngày: Top 10→100, Top 20→80, Top 50→55, Top 100→30, Top 200→12. Duy trì hạng cao mới được điểm cao.",
                      "Average per-day tier score: Top 10→100, Top 20→80, Top 50→55, Top 100→30, Top 200→12. Only consistently high ranks score high.",
                    ),
                  },
                  {
                    label: t("Có mặt Top 20", "Top-20 presence"),
                    badge: "20%",
                    value: `${rq.top20Rate}% (${t("Top10", "Top10")} ${rq.top10Rate}%)`,
                    points: rq.presenceScore,
                    help: t(
                      "% số ngày nằm trong Top 20 — siết hơn cách cũ (Top 200) để chỉ thưởng game thực sự đứng cao.",
                      "% of days inside Top 20 — stricter than the old Top-200 rule, rewarding only genuinely high placement.",
                    ),
                  },
                  {
                    label: t("Chuỗi Top 20", "Top-20 streak"),
                    badge: "10%",
                    value: t(`${rq.longestTop20Streak} ngày`, `${rq.longestTop20Streak} days`),
                    points: rq.streakScore,
                    help: t(
                      "Chuỗi ngày liên tiếp trong Top 20 dài nhất — phạt kiểu lên-rớt-lên-rớt.",
                      "Longest consecutive Top-20 streak — penalizes on-off-on-off patterns.",
                    ),
                  },
                  {
                    label: t("Ít dao động", "Low volatility"),
                    badge: "10%",
                    value: t(`Độ lệch ${rq.stdDev}`, `Variation ${rq.stdDev}`),
                    points: rq.volatilityScore,
                    help: t(
                      "Hạng càng ít nhảy ngày qua ngày càng ổn định, dễ tin cậy.",
                      "Steadier day-to-day rank = more stable and trustworthy.",
                    ),
                  },
                  {
                    label: t("Đà di chuyển", "Movement"),
                    badge: "20%",
                    value: `#${rq.rankStart} → #${rq.rankEnd} (${rq.change >= 0 ? "+" : ""}${rq.change})`,
                    points: rq.movementScore,
                    help: t(
                      "Leo hạng được thưởng; giữ top ổn định vẫn điểm cao nhờ điểm duy trì — không phạt game đã ở đỉnh.",
                      "Climbing is rewarded; holding the top still scores high via maintenance — games already at the peak aren't penalized.",
                    ),
                  },
                  {
                    label: t("Tổng", "Total"),
                    isTotal: true,
                    value: t("Vị thế 40 · Top20 20 · Chuỗi 10 · Dao động 10 · Đà 20", "Position 40 · Top20 20 · Streak 10 · Volatility 10 · Movement 20"),
                    points: rq.score,
                    help: t(
                      "Gộp 5 phần trên: ưu tiên vị thế cao và ổn định bền vững, hạn chế thưởng game chỉ 'trụ' ở hạng thấp.",
                      "Combines the five parts: favors high, durable placement and limits credit for merely lingering at low ranks.",
                    ),
                  },
                ]}
              />
            )}
          </div>

          {isLaunch && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lb && (
                <FactorCard
                  icon={<LayoutGrid className="w-4 h-4" />}
                  label={boardL}
                  weight={`${Math.round(wBoard * 100)}%`}
                  score={lb.score}
                  description={t(
                    "Game mạnh trên BXH Launch không? 3 câu hỏi: hôm nay ở BXH nào, có bền không, có nhiều BXH cùng lúc không.",
                    "How strong on launch charts? Three questions: which chart today, is it consistent, how many charts at once.",
                  )}
                  rows={[
                    {
                      label: t("Vị thế BXH hôm nay", "Today's chart position"),
                      badge: "60%",
                      value: (
                        <span className="inline-flex flex-col items-end gap-1">
                          <LaunchBoardTags tags={lb.activeBoards} className="justify-end" />
                        </span>
                      ),
                      points: lb.chartQuality,
                      help: t(
                        "Pop = phổ biến thật, Hot = đang hot, New = mới ra nên dễ lên chart hơn. Ưu tiên Pop > Hot > New vì lên Pop chứng minh scale; hạng càng cao (# nhỏ) càng nhiều điểm.",
                        "Pop = genuinely popular, Hot = trending, New = newly released (easier to chart). Pop > Hot > New priority because Pop proves scale; better rank (# lower) scores higher.",
                      ),
                      formula: t(
                        `BXH chính ${lb.primaryBoard?.toUpperCase() ?? "—"} #${lb.primaryRank ?? "—"} → ${lb.chartQuality}`,
                        `Primary ${lb.primaryBoard?.toUpperCase() ?? "—"} #${lb.primaryRank ?? "—"} → ${lb.chartQuality}`,
                      ),
                    },
                    {
                      label: t("Độ bền theo ngày", "Day consistency"),
                      badge: "25%",
                      value: `Pop ${lb.popDayRate}% · Hot ${lb.hotDayRate}%`,
                      points: lb.consistency,
                      help: t(
                        "Xét % ngày có mặt trên từng BXH — Pop được trọng số cao nhất (60%) vì bền trên Pop quan trọng hơn chỉ lên New vài ngày.",
                        "Looks at % of days on each chart — Pop weighted highest (60%) because staying on Pop beats a brief New-chart spike.",
                      ),
                      formula: `Pop ${lb.popDayRate}%×60 + Hot ${lb.hotDayRate}%×25 + New ${lb.newDayRate}%×15 = ${lb.consistency}`,
                    },
                    {
                      label: t("Phủ BXH hôm nay", "Charts covered today"),
                      badge: "15%",
                      value: t(`${lb.activeBoardCount} bảng`, `${lb.activeBoardCount} charts`),
                      points: lb.coverage,
                      help: t(
                        "Chỉ nhìn hôm nay: đồng thời trên nhiều BXH cao cấp (Pop+Hot) cho thấy game mạnh đa chiều, không chỉ mới list.",
                        "Today's snapshot only: appearing on multiple top charts (Pop+Hot) shows multi-dimensional strength, not just being newly listed.",
                      ),
                      formula: t(
                        "Pop+Hot+New=100 · Pop+Hot=85 · chỉ Pop=55 · chỉ Hot=25 · chỉ New=10",
                        "Pop+Hot+New=100 · Pop+Hot=85 · Pop only=55 · Hot only=25 · New only=10",
                      ),
                    },
                    {
                      label: t("Tổng", "Total"),
                      isTotal: true,
                      value: t(
                        `Đóng góp Potential: ×${wBoard * 100}% = ${fmtContrib(lb.score, wBoard)}`,
                        `Potential contribution: ×${wBoard * 100}% = ${fmtContrib(lb.score, wBoard)}`,
                      ),
                      points: lb.score,
                      help: t(
                        "Gộp vị thế hôm nay (60%), độ bền (25%) và phủ BXH (15%) — cân bằng snapshot hiện tại và lịch sử gần đây.",
                        "Combines today's position (60%), consistency (25%), and chart coverage (15%) — balances current snapshot with recent history.",
                      ),
                    },
                  ]}
                />
              )}
              <FactorCard
                icon={<Bookmark className="w-4 h-4" />}
                label={preL}
                weight={`${Math.round(wPre * 100)}%`}
                score={preScore}
                description={t(
                  "Trước khi lên Hot/Pop/New, Reserve có tăng mạnh không? Không có giai đoạn Reserve → 0 điểm.",
                  "Did reserve grow strongly before launch charts? No reserve phase → 0 points.",
                )}
                rows={[
                  {
                    label: t("Tăng Reserve trước launch", "Pre-launch reserve growth"),
                    badge: "100%",
                    value: preRaw > 0 ? `Bonus +${preRaw.toFixed(1)}/3` : t("Không có", "None"),
                    points: preScore,
                    help: preRaw > 0
                      ? t(
                          "Game từng có giai đoạn Reserve và tăng đăng ký trước khi lên Hot/Pop/New — dấu hiệu hype trước launch được ghi nhận thêm (trọng số nhỏ 5% vì đã qua).",
                          "The game had a Reserve phase with growing pre-registrations before launch charts — pre-launch hype gets a small bonus (5% weight, since it's in the past).",
                        )
                      : t(
                          "Không có giai đoạn Reserve trước launch trong cửa sổ này, hoặc reserve không tăng — không penalize, chỉ không có điểm thêm.",
                          "No reserve phase before launch in this window, or no growth — not penalized, just no bonus points.",
                        ),
                    formula: preRaw > 0 ? `${preRaw} / 3 × 100 = ${preScore}` : undefined,
                  },
                  {
                    label: t("Tổng", "Total"),
                    isTotal: true,
                    value: t(
                      `Đóng góp Potential: ×${wPre * 100}% = ${fmtContrib(preScore, wPre)}`,
                      `Potential contribution: ×${wPre * 100}% = ${fmtContrib(preScore, wPre)}`,
                    ),
                    points: preScore,
                    help: t(
                      "Chuẩn hóa bonus 0–3 thành 0–100 rồi nhân 5% vào tổng Potential — phần nhỏ, không làm vượt 100 điểm.",
                      "Normalizes the 0–3 bonus to 0–100 then applies 5% to total Potential — a small slice that won't push past 100.",
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, value, large }: { label: string; value: number; large?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-bold", large ? "text-2xl" : "text-lg", getScoreColor(value))}>{value.toFixed(1)}</p>
    </div>
  );
}

interface FactorRow {
  label: string;
  badge?: string;
  value: React.ReactNode;
  /** Numeric value in the right column */
  points?: number | null;
  /**
   * score = 0–100 pillar scale (green/yellow/red by level)
   * bonus = additive tier bonus (+N, green if positive)
   * delta = period change adjustment (+/−/0, neutral when zero)
   */
  pointsTone?: "score" | "bonus" | "delta";
  help?: string;
  formula?: string;
  isTotal?: boolean;
}

function rowPointsDisplay(
  points: number,
  tone: FactorRow["pointsTone"],
): { text: string; className: string; suffix: string } {
  if (tone === "bonus") {
    const sign = points > 0 ? "+" : points < 0 ? "" : "";
    return {
      text: `${sign}${points.toFixed(0)}`,
      className: points > 0 ? "text-up" : points < 0 ? "text-down" : "text-muted-foreground",
      suffix: "",
    };
  }
  if (tone === "delta") {
    if (Math.abs(points) < 0.05) {
      return { text: "±0", className: "text-muted-foreground", suffix: "" };
    }
    const sign = points > 0 ? "+" : "";
    return {
      text: `${sign}${points.toFixed(1)}`,
      className: points > 0 ? "text-up" : "text-down",
      suffix: "",
    };
  }
  return {
    text: points.toFixed(1),
    className: getScoreColor(points),
    suffix: "pts",
  };
}

function FactorCard({ icon, label, weight, score, description, rows }: {
  icon: React.ReactNode;
  label: string;
  weight: string;
  score: number;
  description?: string;
  rows: FactorRow[];
}) {
  const { t } = useUiCopy();

  return (
    <div className="rounded-lg border border-border p-4 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon} {label}
          <span className="text-xs font-normal text-muted-foreground">({weight})</span>
        </div>
        <span className={cn("text-lg font-bold tabular-nums", getScoreColor(score))}>{score.toFixed(1)}</span>
      </div>
      {description && (
        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{description}</p>
      )}

      <div className="divide-y divide-border/60">
        {rows.map((r, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0",
              r.isTotal && "pt-3 mt-1 border-t border-border/80",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn("text-xs", r.isTotal ? "font-semibold text-foreground" : "text-foreground/90")}>
                  {r.label}
                </span>
                {r.badge && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
                    {r.badge}
                  </span>
                )}
              </div>
              {r.help && (
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed pr-1">{r.help}</p>
              )}
              {r.formula && (
                <p className="text-[10px] text-muted-foreground/55 mt-0.5 pr-1">
                  {t("Cách tính:", "Formula:")} <span className="font-mono">{r.formula}</span>
                </p>
              )}
            </div>
            <div className="text-right shrink-0 max-w-[55%]">
              <div className={cn("text-[11px] leading-snug", r.isTotal ? "text-muted-foreground" : "text-foreground/80")}>
                {r.value}
              </div>
              {r.points != null && (() => {
                const disp = rowPointsDisplay(r.points, r.pointsTone ?? (r.isTotal ? "score" : "score"));
                return (
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <span className={cn("text-sm font-bold tabular-nums", disp.className)}>
                      {disp.text}
                    </span>
                    {disp.suffix && (
                      <span className="text-[10px] text-muted-foreground">{t("điểm", disp.suffix)}</span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
