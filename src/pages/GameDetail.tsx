import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { ArrowLeft, Brain, Star, Users, Heart, MessageSquare, TrendingUp, Activity, Shield, Database, History, ChevronDown, ChevronUp, Trash2, Sparkles, Calendar, Download } from "lucide-react";
import { fetchGameDetail, fetchGameReviews, triggerAnalysis, fetchGamePotentialBreakdown, fetchLatestAnalysis, fetchAnalysisHistory, deleteAnalysis } from "@/services/api";
import { useContentLang } from "@/lib/content-language";
import { localizeAnalysisToEn, getSummaryBullets, mainAnalysisScore } from "@/lib/analysis-localize";
import ReviewWindowPicker from "@/components/ReviewWindowPicker";
import AnalysisProgressPanel, {
  INITIAL_ANALYSIS_PROGRESS,
  appendProgressLog,
  type AnalysisProgressState,
} from "@/components/AnalysisProgressPanel";
import type { AnalysisProgressUpdate } from "@/lib/analysis-stream";
import HistoryRangePicker from "@/components/HistoryRangePicker";
import type { HistoryRange } from "@/types/history-range";
import AnalysisDetailModal from "@/components/AnalysisDetailModal";
import AnalysisSourceBadge from "@/components/AnalysisSourceBadge";
import { DEFAULT_REVIEW_WINDOW, type ReviewWindow } from "@/types/review-window";
import { buildFanReserveDeltaSeries, formatDelta } from "@/lib/chart-delta";
import { useUiCopy, potentialRadarMetric } from "@/lib/use-ui-copy";
import { cn, formatNumber, getScoreColor } from "@/lib/utils";
import type { AiAnalysis, GameReview, GamePotentialDetail, PotentialBreakdown } from "@/types";

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
    enabled: appId > 0,
  });

  const [potentialDays, setPotentialDays] = useState(14);
  const { data: potentialBreakdown } = useQuery({
    queryKey: ["potential-breakdown", appId, potentialDays],
    queryFn: () => fetchGamePotentialBreakdown(appId, potentialDays, "combined"),
    enabled: appId > 0,
  });

  const queryClient = useQueryClient();

  const { data: savedAnalysis } = useQuery({
    queryKey: ["ai-analysis", appId],
    queryFn: () => fetchLatestAnalysis(appId),
    enabled: appId > 0,
  });

  const { data: analysisHistory } = useQuery({
    queryKey: ["ai-analysis-history", appId],
    queryFn: () => fetchAnalysisHistory(appId),
    enabled: appId > 0,
  });

  const [reviewWindow, setReviewWindow] = useState<ReviewWindow>(DEFAULT_REVIEW_WINDOW);
  const [analysisProgress, setAnalysisProgress] =
    useState<AnalysisProgressState>(INITIAL_ANALYSIS_PROGRESS);

  const onAnalysisProgress = useCallback((p: AnalysisProgressUpdate) => {
    setAnalysisProgress((prev) => appendProgressLog(prev, p.message, p.percent));
  }, []);

  const analysisMutation = useMutation({
    mutationFn: () => triggerAnalysis(appId, reviewWindow, onAnalysisProgress),
    onMutate: () => setAnalysisProgress(INITIAL_ANALYSIS_PROGRESS),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", appId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis-history", appId] });
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

      {/* Potential Analysis — moved above charts */}
      <PotentialBreakdownSection
        breakdown={potentialBreakdown}
        days={potentialDays}
        setDays={setPotentialDays}
      />

      {/* AI Analysis — moved above charts */}
      <AIAnalysisSection
        analysisResult={analysisResult}
        analysisMutation={analysisMutation}
        analysisProgress={analysisProgress}
        history={analysisHistory ?? []}
        reviewWindow={reviewWindow}
        onReviewWindowChange={setReviewWindow}
      />

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

      {/* User Reviews */}
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
}: {
  analysisResult: AiAnalysis | undefined;
  analysisMutation: { mutate: () => void; isPending: boolean; isError: boolean; error: Error | null };
  analysisProgress: AnalysisProgressState;
  history: AiAnalysis[];
  reviewWindow: ReviewWindow;
  onReviewWindowChange: (w: ReviewWindow) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [modalAnalysis, setModalAnalysis] = useState<AiAnalysis | null>(null);
  const queryClient = useQueryClient();
  const { lang: contentLang } = useContentLang();
  const { t } = useUiCopy();
  const appId = analysisResult?.appId ?? history[0]?.appId ?? 0;

  const overview = analysisResult;

  const { data: modalLocalized } = useQuery({
    queryKey: ["ai-analysis-localized", modalAnalysis?.appId, modalAnalysis?.analyzedAt, contentLang],
    queryFn: () => localizeAnalysisToEn(modalAnalysis!),
    enabled: !!modalAnalysis && contentLang === "en",
    staleTime: 86_400_000,
  });

  const modalView =
    modalAnalysis && contentLang === "en" ? (modalLocalized ?? modalAnalysis) : modalAnalysis;

  const handleDelete = async (analyzedAt: string) => {
    if (!confirm(t("Xóa phân tích này?", "Delete this analysis?"))) return;
    try {
      await deleteAnalysis(appId, analyzedAt);
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", appId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis-history", appId] });
      if (modalAnalysis?.analyzedAt === analyzedAt) setModalAnalysis(null);
    } catch { /* ignore */ }
  };

  const handleDeleteAll = async () => {
    if (!confirm(t(`Xóa tất cả ${history.length} phân tích của game này?`, `Delete all ${history.length} analyses for this game?`))) return;
    try {
      await deleteAnalysis(appId);
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", appId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis-history", appId] });
      setModalAnalysis(null);
      setShowHistory(false);
    } catch { /* ignore */ }
  };

  const runBlock = (
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
  );

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
                    {h.dateRangeStart && h.dateRangeEnd && (
                      <span className="text-muted-foreground">{h.dateRangeStart} — {h.dateRangeEnd}</span>
                    )}
                  </div>
                  <span className={cn("font-bold tabular-nums shrink-0", getScoreColor(mainAnalysisScore(h)))}>
                    {mainAnalysisScore(h)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalAnalysis(h)}
                    className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-medium shrink-0"
                  >
                    {t("Chi tiết", "Details")}
                  </button>
                  <button
                    type="button"
                    onClick={() => h.analyzedAt && handleDelete(h.analyzedAt)}
                    className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {history.length > 1 && (
              <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
                <button type="button" onClick={handleDeleteAll} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> {t("Xóa tất cả phân tích", "Delete all analyses")}
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
            <button
              type="button"
              onClick={() => setModalAnalysis(overview)}
              className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-medium"
            >
              {t("Xem chi tiết đánh giá", "View evaluation details")}
            </button>
          </div>
        )}
      </div>

      <AnalysisDetailModal analysis={modalView} onClose={() => setModalAnalysis(null)} />
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
                  `Chuyển giai đoạn từ ${lc.firstLaunchDate}. Reserve (v6): ${days} ngày trước ngày chuyển. Launch (v8): ${lc.postLaunchDayCount} ngày sau chuyển trong cửa sổ ${days} ngày gần nhất.`,
                  `Phase change from ${lc.firstLaunchDate}. Reserve (v6): ${days} days before launch. Launch (v8): ${lc.postLaunchDayCount} post-launch days in the latest ${days}d window.`,
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
        title={t("Tiềm năng — Launch (v8)", "Potential — Launch (v8)")}
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
  const wMom = isLaunch ? 0.25 : 0.2;
  const wEng = isLaunch ? 0.55 : 0.6;
  const wStab = isLaunch ? 0.2 : 0.2;
  const radarData = useMemo(
    () =>
      detail
        ? [
            { metric: potentialRadarMetric("Momentum", lang), value: detail.momentum.score },
            { metric: potentialRadarMetric("Engagement", lang), value: detail.engagement.score },
            { metric: potentialRadarMetric("Stability", lang), value: detail.stability.score },
          ]
        : [],
    [detail, lang],
  );

  const m = detail?.momentum;
  const e = detail?.engagement;
  const st = detail?.stability;
  const momL = potentialRadarMetric("Momentum", lang);
  const engL = potentialRadarMetric("Engagement", lang);
  const stabL = potentialRadarMetric("Stability", lang);

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
      {isLaunch && (
        <p className="text-xs text-muted-foreground mb-4 -mt-2">
          {t(
            "Chỉ tính từ ngày xuất hiện trên bảng Hot/Pop/New; ưu tiên hạng Pop > Hot > New.",
            "Scores only from days on Hot/Pop/New charts; rank priority Pop > Hot > New.",
          )}
        </p>
      )}

      {!detail ? (
        <p className="text-muted-foreground text-sm text-center py-8">{emptyHint}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <div className="md:col-span-2 flex justify-center">
              <ResponsiveContainer width="100%" height={220}>
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
                  = {momL}×{wMom} + {engL}×{wEng} + {stabL}×{wStab}
                  {isLaunch && detail.preLaunchBonus != null && detail.preLaunchBonus > 0
                    ? t(` + bonus Reserve trước launch (+${detail.preLaunchBonus})`, ` + pre-launch reserve bonus (+${detail.preLaunchBonus})`)
                    : ""}
                  {isLaunch ? t(" (+5 nếu ≥2 board Launch)", " (+5 if on ≥2 launch boards)") : ""}
                </p>
                <p>
                  <span className="font-medium text-foreground">{t("Cuối", "Final")}</span>{" "}
                  = {t("Thô", "Raw")} × {t("hệ số tin cậy", "Confidence multiplier")} ({detail.rawComposite} × {detail.confidence.multiplier} = {detail.compositeScore})
                </p>
                <p>
                  {t(
                    `Tin cậy = độ phủ dữ liệu (${detail.confidence.coverage}%), hệ số ×0.3 đến ×1.0. Càng nhiều ngày dữ liệu thì tin cậy càng cao.`,
                    `Confidence = data coverage (${detail.confidence.coverage}%), range ×0.3 to ×1.0. More days of data = higher confidence.`,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {m && <FactorCard
              icon={<TrendingUp className="w-4 h-4" />}
              label={momL}
              weight={`${wMom * 100}%`}
              score={m.score}
              description={t(
                "Vị trí xếp hạng hiện tại + biến động xếp hạng + đỉnh cao giai đoạn.",
                "Current rank position + rank movement + peak performance.",
              )}
              rows={[
                {
                  label: t("Vị trí hiện tại", "Current Position"),
                  badge: "50%",
                  value: t(`Xếp hạng gần đây TB: #${m.avgRecentRank}`, `Avg recent rank: #${m.avgRecentRank}`),
                  details: [`100 - ${m.avgRecentRank} × 0.5 = ${m.positionScore} pts`],
                  note: t("Hạng 1 ≈ 100, hạng 50 ≈ 75, hạng 100 ≈ 50, hạng 200 ≈ 0", "Rank 1 ≈ 100, Rank 50 ≈ 75, Rank 100 ≈ 50, Rank 200 ≈ 0"),
                },
                {
                  label: t("Thay đổi xếp hạng", "Rank Change"),
                  badge: "25%",
                  value: `#${m.rankStart} → #${m.rankEnd} (${m.change >= 0 ? "+" : ""}${m.change})`,
                  details: [
                    t(`Tuyệt đối: 50 + ${m.change} = ${m.absoluteScore} pts`, `Absolute: 50 + ${m.change} = ${m.absoluteScore} pts`),
                    t(
                      `Tương đối: ${m.change} / ${Math.max(m.rankStart - 1, 1)} leo tối đa = ${m.relativeScore} pts`,
                      `Relative: ${m.change} / ${Math.max(m.rankStart - 1, 1)} max climb = ${m.relativeScore} pts`,
                    ),
                    t(`Lấy tốt hơn trong hai = ${m.rankChangeScore} pts`, `Best of the two = ${m.rankChangeScore} pts`),
                  ],
                  note: t(
                    "Lấy giá trị tốt hơn giữa tuyệt đối và tương đối — ví dụ #2→#1 được tính trọn điểm.",
                    "Best of absolute or relative — a #2→#1 move gets full credit",
                  ),
                },
                {
                  label: t("Đỉnh giai đoạn", "Peak Performance"),
                  badge: "25%",
                  value: t(`Hạng tốt nhất: #${m.bestRank}`, `Best rank: #${m.bestRank}`),
                  details: [`100 - ${m.bestRank} × 0.5 = ${m.peakScore} pts`],
                  note: t("Hạng cao nhất đạt được trong khoảng phân tích", "The highest rank achieved during the analysis period"),
                },
                {
                  label: t("Tổng", "Total"),
                  value: `${m.positionScore}×0.5 + ${m.rankChangeScore}×0.25 + ${m.peakScore}×0.25 = ${m.score}`,
                },
              ]}
            />}
            {e && <FactorCard
              icon={<Activity className="w-4 h-4" />}
              label={engL}
              weight={`${wEng * 100}%`}
              score={e.score}
              description={
                isLaunch
                  ? t(
                      "Rating, tăng fan và tăng download (không dùng reserve).",
                      "Rating, fan growth, and download growth (reserve excluded).",
                    )
                  : t(
                      "Người chơi có đang quan tâm nhiều hơn? Gồm chất lượng sao, tăng fan và tăng đăng ký trước — trọng số cao nhất.",
                      "Are users increasingly interested? Measures rating quality, fan growth, and reserve growth. The most important factor.",
                    )
              }
              rows={[
                ...(e.ratingScore != null ? [{
                  label: t("Điểm sao", "Rating"),
                  value: `${e.ratingEnd} ★ (${e.ratingDelta >= 0 ? "+" : ""}${e.ratingDelta} ${t("thay đổi", "change")})`,
                  details: [
                    t(`Mức sao: (${e.ratingEnd} - 5) × 20 = ${e.ratingBaseScore ?? "–"} pts`, `Rating level: (${e.ratingEnd} - 5) × 20 = ${e.ratingBaseScore ?? "–"} pts`),
                    t(`Thưởng biến động: 50 + ${e.ratingDelta} × 20 = ${e.ratingChangeScore ?? "–"} pts`, `Change bonus: 50 + ${e.ratingDelta} × 20 = ${e.ratingChangeScore ?? "–"} pts`),
                    `${e.ratingBaseScore ?? "–"} × 0.6 + ${e.ratingChangeScore ?? "–"} × 0.4 = ${e.ratingScore} pts`,
                  ],
                  note: t("Game sao cao có nền điểm tốt. 9★ ổn định ≈ 68 pts", "High-rated games get a strong base. 9★ steady ≈ 68 pts"),
                }] : [{ label: t("Điểm sao", "Rating"), value: t("Không đủ dữ liệu", "N/A (insufficient data)") }]),
                ...(e.fansScore != null ? [{
                  label: t("Tăng fan", "Fans Growth"),
                  value: `${formatNumber(e.fansStart!)} → ${formatNumber(e.fansEnd!)} (+${formatNumber(e.fansGrowth)})`,
                  details: [
                    t(`Theo %: ${e.fansRate ?? 0}% × 2 = ${e.fansRateScore ?? "–"} pts`, `By rate: ${e.fansRate ?? 0}% × 2 = ${e.fansRateScore ?? "–"} pts`),
                    t(`Theo khối lượng: +${formatNumber(e.fansGrowth)} / ${formatNumber(e.absThreshold)} = ${e.fansAbsScore ?? "–"} pts`, `By volume: +${formatNumber(e.fansGrowth)} / ${formatNumber(e.absThreshold)} = ${e.fansAbsScore ?? "–"} pts`),
                    t(`Lấy tốt hơn trong hai = ${e.fansScore} pts`, `Best of the two = ${e.fansScore} pts`),
                  ],
                  note: t(`Ngưỡng theo chu kỳ (${formatNumber(e.absThreshold)} cho giai đoạn này)`, `Threshold scales with period (${formatNumber(e.absThreshold)} for this period)`),
                }] : [{ label: t("Tăng fan", "Fans Growth"), value: t("Không có (cần ≥ 100 fan ban đầu)", "N/A (need ≥ 100 start)") }]),
                ...(!isLaunch
                  ? e.resScore != null
                    ? [{
                        label: t("Tăng đăng ký trước", "Reserve Growth"),
                        value: `${formatNumber(e.resStart!)} → ${formatNumber(e.resEnd!)} (+${formatNumber(e.resGrowth)})`,
                        details: [
                          t(`Theo %: ${e.resRate ?? 0}% × 2 = ${e.resRateScore ?? "–"} pts`, `By rate: ${e.resRate ?? 0}% × 2 = ${e.resRateScore ?? "–"} pts`),
                          t(`Theo khối lượng: +${formatNumber(e.resGrowth)} / ${formatNumber(e.absThreshold)} = ${e.resAbsScore ?? "–"} pts`, `By volume: +${formatNumber(e.resGrowth)} / ${formatNumber(e.absThreshold)} = ${e.resAbsScore ?? "–"} pts`),
                          t(`Lấy tốt hơn trong hai = ${e.resScore} pts`, `Best of the two = ${e.resScore} pts`),
                        ],
                        note: t("Lấy tốt hơn giữa tăng % và tăng tuyệt đối", "Best of % growth or absolute volume"),
                      }]
                    : [{ label: t("Tăng đăng ký trước", "Reserve Growth"), value: t("Không có (cần ≥ 50 đăng ký ban đầu)", "N/A (need ≥ 50 start)") }]
                  : []),
                ...(isLaunch && e.dlScore != null
                  ? [{
                      label: t("Tăng download", "Download Growth"),
                      value: `${formatNumber(e.dlStart!)} → ${formatNumber(e.dlEnd!)} (+${formatNumber(e.dlGrowth ?? 0)})`,
                      details: [
                        t(`Theo %: ${e.dlRate ?? 0}% × 2 = ${e.dlRateScore ?? "–"} pts`, `By rate: ${e.dlRate ?? 0}% × 2 = ${e.dlRateScore ?? "–"} pts`),
                        t(`Theo khối lượng: +${formatNumber(e.dlGrowth ?? 0)} / ${formatNumber(e.absThreshold)} = ${e.dlAbsScore ?? "–"} pts`, `By volume: +${formatNumber(e.dlGrowth ?? 0)} / ${formatNumber(e.absThreshold)} = ${e.dlAbsScore ?? "–"} pts`),
                        t(`Lấy tốt hơn trong hai = ${e.dlScore} pts`, `Best of the two = ${e.dlScore} pts`),
                      ],
                      note: t("Nguồn: stat.hits_total từ TapTap", "Source: TapTap stat.hits_total"),
                    }]
                  : isLaunch
                    ? [{ label: t("Tăng download", "Download Growth"), value: t("Không đủ dữ liệu", "N/A") }]
                    : []),
                {
                  label: t("Tổng", "Total"),
                  value: t(
                    `Trung bình ${e.subsCount} chỉ số = ${e.score}`,
                    `avg of ${e.subsCount} metric${e.subsCount !== 1 ? "s" : ""} = ${e.score}`,
                  ),
                  note: t("Chỉ số thiếu được bỏ qua, không tính bằng 0", "Missing metrics excluded, not counted as 0"),
                },
              ]}
            />}
            {st && <FactorCard
              icon={<Shield className="w-4 h-4" />}
              label={stabL}
              weight={`${wStab * 100}%`}
              score={st.score}
              description={t(
                "Game có ổn định trong bảng xếp hạng không? Thưởng số ngày có mặt và độ dao động hạng thấp.",
                "Is the game consistently ranked? Rewards daily presence with low rank fluctuation.",
              )}
              rows={[
                {
                  label: t("Hiện diện", "Presence"),
                  badge: "50%",
                  value: t(`${st.daysInTop}/${st.analysisDays} ngày trong Top 200`, `${st.daysInTop}/${st.analysisDays} days in Top 200`),
                  details: [`(${st.daysInTop} / ${st.analysisDays}) × 100 = ${st.presenceScore} pts`],
                  note: t("Số ngày game xuất hiện trong Top 200", "Days the game appeared in Top 200"),
                },
                {
                  label: t("Biến động thấp", "Low Volatility"),
                  badge: "30%",
                  value: t(`Độ lệch chuẩn = ${st.stdDev}`, `Std dev = ${st.stdDev}`),
                  details: [`100 - ${st.stdDev} × 2 = ${st.volatilityScore} pts`],
                  note: t("Dao động thấp = điểm cao. σ≥50 → 0 pts", "Low fluctuation = high score. σ≥50 → 0 pts"),
                },
                {
                  label: t("Chuỗi ngày liên tiếp", "Streak"),
                  badge: "20%",
                  value: t(`${st.maxStreak} ngày liên tiếp`, `${st.maxStreak} consecutive days`),
                  details: [`(${st.maxStreak} / ${st.analysisDays}) × 100 = ${st.streakScore} pts`],
                  note: t("Chuỗi dài nhất liên tục trong Top 200", "Longest unbroken streak in Top 200"),
                },
                {
                  label: t("Tổng", "Total"),
                  value: `${st.presenceScore}×0.5 + ${st.volatilityScore}×0.3 + ${st.streakScore}×0.2 = ${st.score}`,
                },
              ]}
            />}
          </div>
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
  value: string;
  details?: string[];
  note?: string;
}

function FactorCard({ icon, label, weight, score, description, rows }: {
  icon: React.ReactNode;
  label: string;
  weight: string;
  score: number;
  description?: string;
  rows: FactorRow[];
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon} {label}
          <span className="text-xs font-normal text-muted-foreground">({weight})</span>
        </div>
        <span className={cn("text-sm font-bold", getScoreColor(score))}>{score.toFixed(1)}</span>
      </div>
      {description && <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">{description}</p>}
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground shrink-0 flex items-center gap-1.5">
                {r.label}
                {r.badge && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{r.badge}</span>}
              </span>
              <span className="font-medium text-right">{r.value}</span>
            </div>
            {r.details && r.details.length > 0 && (
              <div className="mt-1 ml-2 pl-2 border-l-2 border-muted space-y-0.5">
                {r.details.map((d, j) => (
                  <p key={j} className="text-muted-foreground font-mono text-[10px]">{d}</p>
                ))}
              </div>
            )}
            {r.note && (
              <p className="mt-1 text-[10px] text-muted-foreground/70 italic">{r.note}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
