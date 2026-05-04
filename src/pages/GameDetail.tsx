import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { ArrowLeft, Brain, Star, Users, Heart, MessageSquare, TrendingUp, Activity, Shield, Database, History, ChevronDown, ChevronUp, Trash2, Plus, Sparkles } from "lucide-react";
import { fetchGameDetail, fetchGameReviews, triggerAnalysis, fetchGamePotentialDetail, fetchLatestAnalysis, fetchAnalysisHistory, deleteAnalysis } from "@/services/api";
import { useContentLang } from "@/lib/content-language";
import { localizeAnalysisToEn, getSummaryBullets, getRecentTrendBullets, mainAnalysisScore } from "@/lib/analysis-localize";
import { AnalysisBulletBlock } from "@/components/AnalysisBulletBlock";
import RubricPanel from "@/components/RubricPanel";
import RedFlagSection from "@/components/RedFlagSection";
import {
  useUiCopy,
  potentialRadarMetric,
  bucketDisplayName,
} from "@/lib/use-ui-copy";
import { cn, formatNumber, getScoreColor } from "@/lib/utils";
import type { AiAnalysis, GameReview, GamePotentialDetail } from "@/types";

const BUCKET_COLORS: Record<string, string> = {
  "Very Negative": "bg-red-500",
  "Negative": "bg-orange-500",
  "Mixed": "bg-amber-500",
  "Positive": "bg-green-500",
  "Very Positive": "bg-emerald-500",
};

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
  const [days, setDays] = useState(30);
  const [reviewPage, setReviewPage] = useState(1);
  const appId = parseInt(id || "0");

  const { data: game, isLoading } = useQuery({
    queryKey: ["game", appId, days, contentLang],
    queryFn: () => fetchGameDetail(appId, days, contentLang),
    enabled: appId > 0,
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", appId, reviewPage],
    queryFn: () => fetchGameReviews(appId, reviewPage),
    enabled: appId > 0,
  });

  const [potentialDays, setPotentialDays] = useState(14);
  const { data: potentialDetail } = useQuery({
    queryKey: ["potential-detail", appId, potentialDays],
    queryFn: () => fetchGamePotentialDetail(appId, potentialDays, "combined"),
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

  const analysisMutation = useMutation({
    mutationFn: () => triggerAnalysis(appId),
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat icon={<Star className="w-4 h-4 text-yellow-500" />} label={t("Đánh giá", "Rating")} value={game.rating ? `${game.rating}/10` : "N/A"} />
        <MiniStat icon={<Users className="w-4 h-4" />} label={t("Người hâm mộ", "Fans")} value={game.fansCount != null ? formatNumber(game.fansCount) : "N/A"} />
        <MiniStat icon={<Heart className="w-4 h-4" />} label={t("Đăng ký trước", "Reserves")} value={game.reserveCount != null ? formatNumber(game.reserveCount) : "N/A"} />
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
      <PotentialSection detail={potentialDetail} days={potentialDays} setDays={setPotentialDays} />

      {/* AI Analysis — moved above charts */}
      <AIAnalysisSection
        analysisResult={analysisResult}
        analysisMutation={analysisMutation}
        history={analysisHistory ?? []}
      />

      {/* Charts */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("Lịch sử xếp hạng", "Rank History")}</h2>
          <div className="flex gap-2">
            {[7, 14, 30, 60].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                  days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}>
                {contentLang === "vi" ? `${d} ngày` : `${d}d`}
              </button>
            ))}
          </div>
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
        <h2 className="text-lg font-semibold mb-4">{t("Lịch sử fan & đăng ký trước", "Fans & Reserves History")}</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={reserveChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={shortNum} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Legend />
            <Line type="monotone" dataKey="fans" name={t("Người hâm mộ", "Fans")} stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="reserves" name={t("Đăng ký trước", "Reserves")} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
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
  history,
}: {
  analysisResult: AiAnalysis | undefined;
  analysisMutation: { mutate: () => void; isPending: boolean; isError: boolean; error: Error | null };
  history: AiAnalysis[];
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [viewingIdx, setViewingIdx] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { lang: contentLang } = useContentLang();
  const { t } = useUiCopy();
  const appId = analysisResult?.appId ?? history[0]?.appId ?? 0;

  const displayed = viewingIdx != null && history[viewingIdx] ? history[viewingIdx] : analysisResult;

  const { data: localized, isPending: localizing } = useQuery({
    queryKey: ["ai-analysis-localized", displayed?.appId, displayed?.analyzedAt, contentLang],
    queryFn: () => localizeAnalysisToEn(displayed!),
    enabled: !!displayed && contentLang === "en",
    staleTime: 86_400_000,
  });

  const view = contentLang === "en" ? (localized ?? displayed) : displayed;

  const handleDelete = async (analyzedAt: string) => {
    if (!confirm(t("Xóa phân tích này?", "Delete this analysis?"))) return;
    try {
      await deleteAnalysis(appId, analyzedAt);
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", appId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis-history", appId] });
      if (viewingIdx != null) setViewingIdx(null);
    } catch { /* ignore */ }
  };

  const handleDeleteAll = async () => {
    if (!confirm(t(`Xóa tất cả ${history.length} phân tích của game này?`, `Delete all ${history.length} analyses for this game?`))) return;
    try {
      await deleteAnalysis(appId);
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", appId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis-history", appId] });
      setViewingIdx(null);
      setShowHistory(false);
    } catch { /* ignore */ }
  };

  if (!displayed && history.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-purple-500" />
        </div>
        <h3 className="font-semibold mb-1">{t("Phân tích bình luận bằng AI", "AI Review Analysis")}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          {t(
            "Dùng AI để đọc bình luận người chơi và chấm theo bảng rubric (từng tiêu chí có điểm mạnh/yếu).",
            "Use AI to read player reviews and score them with the rubric (strengths and weaknesses per criterion).",
          )}
        </p>
        <button
          onClick={() => analysisMutation.mutate()}
          disabled={analysisMutation.isPending}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all shadow-md"
        >
          {analysisMutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              {t("Đang phân tích bình luận…", "Analyzing reviews...")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {t("Chạy phân tích AI", "Run AI Analysis")}
            </span>
          )}
        </button>
        {analysisMutation.isError && (
          <p className="text-destructive text-xs mt-3">
            {t("Lỗi:", "Error:")} {(analysisMutation.error as Error)?.message ?? t("Phân tích thất bại", "Analysis failed")}
          </p>
        )}
      </div>
    );
  }

  if (!displayed) return null;

  const buckets = view!.bucketCounts ?? {};
  const totalReviews = view!.reviewsAnalyzed ?? 0;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5" /> {t("Phân tích bình luận bằng AI", "AI Review Analysis")}
        </h2>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => { setShowHistory(!showHistory); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" /> {t("Lịch sử", "History")} ({history.length})
              {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button
            onClick={() => { analysisMutation.mutate(); setViewingIdx(null); }}
            disabled={analysisMutation.isPending}
            className="px-4 py-1.5 text-xs rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
          >
            {analysisMutation.isPending ? (
              <>
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                {t("Đang phân tích…", "Analyzing...")}
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> {t("Phân tích mới", "New Analysis")}
              </>
            )}
          </button>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="mb-4 border border-border/50 rounded-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
            {history.map((h, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 text-xs hover:bg-muted/50 transition-colors",
                  viewingIdx === idx && "bg-accent/30"
                )}
              >
                <button
                  onClick={() => { setViewingIdx(idx); setShowHistory(false); }}
                  className="flex-1 text-left"
                >
                  <span className="font-medium">
                    {h.analyzedAt ? new Date(h.analyzedAt).toLocaleString() : `Analysis #${history.length - idx}`}
                  </span>
                  {h.dateRangeStart && h.dateRangeEnd && (
                    <span className="text-muted-foreground ml-2">({h.dateRangeStart} — {h.dateRangeEnd})</span>
                  )}
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-muted-foreground">{h.reviewsAnalyzed} {t("bình luận", "reviews")}</span>
                  <span className={cn("font-semibold", getScoreColor(mainAnalysisScore(h)))}>{mainAnalysisScore(h)}/100</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (h.analyzedAt) handleDelete(h.analyzedAt); }}
                    className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title={t("Xóa phân tích này", "Delete this analysis")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {history.length > 1 && (
            <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
              <button
                onClick={handleDeleteAll}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> {t("Xóa tất cả phân tích", "Delete all analyses")}
              </button>
            </div>
          )}
        </div>
      )}

      {viewingIdx != null && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded font-medium">
            {t("Đang xem phân tích cũ", "Viewing historical analysis")}
          </span>
          <button onClick={() => setViewingIdx(null)} className="text-xs text-primary hover:underline">
            {t("Xem bản mới nhất", "View latest")}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
        <span className="font-medium text-foreground">
          {totalReviews} {t("bình luận đã phân tích", "reviews analyzed")}
        </span>
        {view!.dateRangeStart && view!.dateRangeEnd && (
          <>
            <span>|</span>
            <span>
              {t("Bình luận trong khoảng:", "Reviews from:")} {view!.dateRangeStart} — {view!.dateRangeEnd}
            </span>
          </>
        )}
        {view!.analyzedAt && (
          <>
            <span>|</span>
            <span>
              {t("Phân tích lúc:", "Analyzed:")} {new Date(view!.analyzedAt).toLocaleString()}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
        {Object.entries(buckets).map(([label, count]) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", BUCKET_COLORS[label] ?? "bg-gray-400")} />
            {bucketDisplayName(label, contentLang)}: {count}
          </span>
        ))}
      </div>

      {localizing && contentLang === "en" && (
        <p className="text-xs text-muted-foreground mb-2">{t("Đang dịch sang tiếng Anh…", "Translating to English…")}</p>
      )}

      <RedFlagSection
        redFlagAtAGlance={view!.redFlagAtAGlance}
        redFlagsChecklist={view!.redFlagsChecklist}
        rubric={view!.rubric}
      />

      <RubricPanel rubric={view!.rubric} />

      <div className="bg-muted/30 rounded-lg p-4 mb-4">
        <AnalysisBulletBlock items={getSummaryBullets(view!)} className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground" />
      </div>

      {getRecentTrendBullets(view!).length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
          <h4 className="text-xs font-medium text-blue-500 mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {t("Xu hướng gần đây", "Recent Trend")}
          </h4>
          <AnalysisBulletBlock items={getRecentTrendBullets(view!)} className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground" />
        </div>
      )}

      <div className="mb-5">
        <h4 className="text-sm font-medium mb-3">{t("Phân bố cảm xúc bình luận", "Review Distribution")}</h4>
        <div className="flex gap-0.5 h-8 rounded-lg overflow-hidden">
          {Object.entries(buckets).map(([label, count]) => {
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={label}
                className={cn("flex items-center justify-center transition-all duration-500 text-[10px] font-medium text-white", BUCKET_COLORS[label] ?? "bg-gray-400")}
                style={{ width: `${pct}%`, opacity: 0.85 }}
                title={`${bucketDisplayName(label, contentLang)}: ${count} (${pct.toFixed(0)}%)`}
              >
                {pct >= 8 && `${count}`}
              </div>
            );
          })}
        </div>
        <div className="flex gap-0.5 mt-1">
          {Object.entries(buckets).map(([label, count]) => {
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            if (pct === 0) return null;
            const starNum = Object.keys(BUCKET_COLORS).indexOf(label) + 1;
            return (
              <div key={label} className="text-[10px] text-muted-foreground text-center" style={{ width: `${pct}%` }}>
                {starNum > 0 ? `${starNum}★ (${pct.toFixed(0)}%)` : label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PotentialSection({ detail, days, setDays }: {
  detail: GamePotentialDetail | null | undefined;
  days: number;
  setDays: (d: number) => void;
}) {
  const { t, lang } = useUiCopy();
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
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> {t("Phân tích tiềm năng", "Potential Analysis")}
        </h2>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}>
              {lang === "vi" ? `${d} ngày` : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {!detail ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          {t("Chưa đủ dữ liệu để phân tích tiềm năng (cần tối thiểu 2 ngày).", "Not enough data for potential analysis (minimum 2 days required)")}
        </p>
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
                  = {momL}×0.2 + {engL}×0.6 + {stabL}×0.2
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
              weight="20%"
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
              weight="60%"
              score={e.score}
              description={t(
                "Người chơi có đang quan tâm nhiều hơn? Gồm chất lượng sao, tăng fan và tăng đăng ký trước — trọng số cao nhất.",
                "Are users increasingly interested? Measures rating quality, fan growth, and reserve growth. The most important factor.",
              )}
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
                ...(e.resScore != null ? [{
                  label: t("Tăng đăng ký trước", "Reserve Growth"),
                  value: `${formatNumber(e.resStart!)} → ${formatNumber(e.resEnd!)} (+${formatNumber(e.resGrowth)})`,
                  details: [
                    t(`Theo %: ${e.resRate ?? 0}% × 2 = ${e.resRateScore ?? "–"} pts`, `By rate: ${e.resRate ?? 0}% × 2 = ${e.resRateScore ?? "–"} pts`),
                    t(`Theo khối lượng: +${formatNumber(e.resGrowth)} / ${formatNumber(e.absThreshold)} = ${e.resAbsScore ?? "–"} pts`, `By volume: +${formatNumber(e.resGrowth)} / ${formatNumber(e.absThreshold)} = ${e.resAbsScore ?? "–"} pts`),
                    t(`Lấy tốt hơn trong hai = ${e.resScore} pts`, `Best of the two = ${e.resScore} pts`),
                  ],
                  note: t("Lấy tốt hơn giữa tăng % và tăng tuyệt đối", "Best of % growth or absolute volume"),
                }] : [{ label: t("Tăng đăng ký trước", "Reserve Growth"), value: t("Không có (cần ≥ 50 đăng ký ban đầu)", "N/A (need ≥ 50 start)") }]),
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
              weight="20%"
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
