import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContentLang } from "@/lib/content-language";
import { localizeAnalysisToEn, getSummaryBullets, getRecentTrendBullets, mainAnalysisScore } from "@/lib/analysis-localize";
import { AnalysisBulletBlock } from "@/components/AnalysisBulletBlock";
import RubricPanel from "@/components/RubricPanel";
import RedFlagSection from "@/components/RedFlagSection";
import { Brain, Search, Sparkles, ExternalLink, Clock, Trash2, Globe, Upload, FileSpreadsheet, X } from "lucide-react";
import { triggerExternalAnalysis, triggerCsvAnalysis, deleteAnalysis, fetchAllAnalyses } from "@/services/api";
import { cn, getScoreColor } from "@/lib/utils";
import {
  useUiCopy,
  bucketDisplayName,
} from "@/lib/use-ui-copy";
import type { AiAnalysis } from "@/types";

const BUCKET_COLORS: Record<string, string> = {
  "Very Negative": "bg-red-500",
  "Negative": "bg-orange-500",
  "Mixed": "bg-amber-500",
  "Positive": "bg-green-500",
  "Very Positive": "bg-emerald-500",
};

export default function AIAnalysisPage() {
  const [input, setInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<AiAnalysis | null>(null);
  const queryClient = useQueryClient();
  const { lang: contentLang } = useContentLang();
  const { t, lang } = useUiCopy();

  const { data: selectedLocalized, isPending: selectedLocalizing } = useQuery({
    queryKey: ["ai-analysis-localized", selected?.appId, selected?.analyzedAt, contentLang],
    queryFn: () => localizeAnalysisToEn(selected!),
    enabled: !!selected && contentLang === "en",
    staleTime: 86_400_000,
  });

  const selectedView = selected && contentLang === "en" ? (selectedLocalized ?? selected) : selected;

  const { data: savedAnalyses = [] } = useQuery({
    queryKey: ["all-analyses"],
    queryFn: fetchAllAnalyses,
    staleTime: 30_000,
  });

  const analyzeMutation = useMutation({
    mutationFn: (val: string) => triggerExternalAnalysis(val),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
      setSelected(data);
    },
  });

  const csvMutation = useMutation({
    mutationFn: (file: File) => triggerCsvAnalysis(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
      setSelected(data);
      setCsvFile(null);
    },
  });

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    analyzeMutation.mutate(trimmed);
  };

  const handleCsvSubmit = () => {
    if (!csvFile) return;
    csvMutation.mutate(csvFile);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.name.endsWith(".txt"))) {
      setCsvFile(file);
    }
  };

  const handleDelete = (idx: number) => {
    const a = savedAnalyses[idx];
    if (!a) return;
    if (a.analyzedAt) {
      deleteAnalysis(a.appId, a.analyzedAt).then(() => {
        queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
        if (selected?.analyzedAt === a.analyzedAt) setSelected(null);
      }).catch(() => {});
    }
  };

  const analyses = savedAnalyses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> {t("Phân tích bình luận bằng AI", "AI Review Analysis")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(
            "Phân tích bình luận game TapTap bất kỳ — nhập URL hoặc App ID để lấy bình luận trực tiếp từ TapTap.",
            "Analyze reviews of any TapTap game — enter a URL or App ID to fetch reviews directly from TapTap.",
          )}
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-500" /> {t("Phân tích một game", "Analyze Any Game")}
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t(
                "Nhập URL TapTap hoặc App ID (vd: https://www.taptap.cn/app/209601 hoặc 209601)",
                "Enter TapTap URL or App ID (e.g. https://www.taptap.cn/app/209601 or 209601)",
              )}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={analyzeMutation.isPending || !input.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
          >
            {analyzeMutation.isPending ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {t("Đang tải & phân tích…", "Fetching & Analyzing...")}
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" /> {t("Phân tích", "Analyze")}
              </>
            )}
          </button>
        </div>
        {analyzeMutation.isError && (
          <p className="text-red-500 text-xs mt-2">
            {t("Lỗi:", "Error:")} {(analyzeMutation.error as Error).message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          {t(
            "Bình luận được lấy trực tiếp từ API TapTap — có thể mất 1–2 phút tùy số lượng bình luận.",
            "Reviews are fetched live from TapTap's API — this may take 1-2 minutes depending on the number of reviews.",
          )}
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-5 mb-4">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground font-medium">{t("HOẶC", "OR")}</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* CSV Upload */}
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-blue-500" /> {t("Tải file bình luận", "Upload a Review File")}
          </h3>
          {!csvFile ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("Kéo thả file CSV/TSV vào đây, hoặc ", "Drag & drop a CSV/TSV file here, or ")}
                <span className="text-primary font-medium">{t("bấm để chọn file", "click to browse")}</span>
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t(
                  "Hỗ trợ Google Play, AppFollow, hoặc CSV có cột Nội dung, Đánh giá, Ngày.",
                  "Supports Google Play, AppFollow, or any CSV with Content, Rating, Date columns",
                )}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCsvFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{csvFile.name}</p>
                <p className="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => setCsvFile(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleCsvSubmit}
                disabled={csvMutation.isPending}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
              >
                {csvMutation.isPending ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {t("Đang phân tích…", "Analyzing...")}
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" /> {t("Phân tích file", "Analyze File")}
                  </>
                )}
              </button>
            </div>
          )}
          {csvMutation.isError && (
            <p className="text-red-500 text-xs mt-2">
              {t("Lỗi:", "Error:")} {(csvMutation.error as Error).message}
            </p>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Analysis List */}
        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t("Kết quả", "Results")} ({analyses.length})
          </h2>
          {analyses.length > 0 ? (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {analyses.map((a, idx) => (
                <div
                  key={`${a.appId}-${a.analyzedAt}`}
                  className={cn(
                    "bg-card rounded-xl border border-border p-4 cursor-pointer transition-all hover:shadow-md group",
                    selected?.analyzedAt === a.analyzedAt && selected?.appId === a.appId && "ring-2 ring-primary/50 border-primary/30"
                  )}
                  onClick={() => setSelected(a)}
                >
                  <div className="flex items-start gap-3">
                    {a.iconUrl ? (
                      <img
                        src={a.iconUrl}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Brain className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {a.gameName || `App #${a.appId}`}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                          title={t("Xóa", "Delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs font-bold", getScoreColor(mainAnalysisScore(a)))}>
                          {mainAnalysisScore(a)}/100
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {a.reviewsAnalyzed} {t("bình luận", "reviews")}
                        </span>
                        {a.source === "database" && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            {t("CSDL", "Database")}
                          </span>
                        )}
                        {a.source === "external" && (
                          <span className="text-[10px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded">
                            {t("Ngoài TapTap", "External")}
                          </span>
                        )}
                        {a.source === "csv-upload" && (
                          <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                            {t("Tải CSV", "CSV Upload")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {getSummaryBullets(a)[0] ?? a.summary}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t("Chưa có phân tích nào.", "No analyses yet.")}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {t("Nhập URL hoặc App ID TapTap phía trên để bắt đầu.", "Enter a TapTap URL or App ID above to get started.")}
              </p>
            </div>
          )}
        </div>

        {/* Right: Detail View */}
        {selectedView ? (
          <div className="lg:col-span-2 space-y-5">
            {selectedLocalizing && contentLang === "en" && (
              <p className="text-xs text-muted-foreground">{t("Đang dịch sang tiếng Anh…", "Translating to English…")}</p>
            )}
            {/* Header */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start gap-4">
                {selectedView.iconUrl ? (
                  <img
                    src={selectedView.iconUrl}
                    alt=""
                    className="w-16 h-16 rounded-2xl object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                    <Brain className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {selectedView.gameName || `App #${selectedView.appId}`}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{t("App ID", "App ID")}: {selectedView.appId}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedView.analyzedAt ? new Date(selectedView.analyzedAt).toLocaleString() : t("Không có", "N/A")}
                    </span>
                    {selectedView.dateRangeStart && selectedView.dateRangeEnd && (
                      <span>
                        {t("Bình luận:", "Reviews:")} {selectedView.dateRangeStart} — {selectedView.dateRangeEnd}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-2xl font-bold", getScoreColor(mainAnalysisScore(selectedView)))}>
                    {mainAnalysisScore(selectedView)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t("Điểm rubric (có trọng số)", "Weighted rubric")}
                  </div>
                </div>
              </div>
            </div>

            <RedFlagSection
              redFlagAtAGlance={selectedView.redFlagAtAGlance}
              redFlagsChecklist={selectedView.redFlagsChecklist}
              rubric={selectedView.rubric}
            />

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label={t("Bình luận đã phân tích", "Reviews Analyzed")} value={selectedView.reviewsAnalyzed} />
              <StatCard label={t("Điểm rubric", "Rubric score")} value={`${mainAnalysisScore(selectedView)}/100`} />
              <StatCard
                label={t("Thang 1–5", "Band (1–5)")}
                value={selectedView.rubric?.aggregate.band5 ?? "—"}
              />
              <StatCard
                label={t("Tiêu chí điểm thấp (dưới 30)", "Low-score criteria (<30)")}
                value={selectedView.rubric?.aggregate.lowScoreCriteriaCount ?? "—"}
              />
            </div>

            <RubricPanel rubric={selectedView.rubric} />

            {/* Bucket Distribution */}
            {selectedView.bucketCounts && Object.keys(selectedView.bucketCounts).length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h4 className="text-sm font-medium mb-3">{t("Phân bố cảm xúc bình luận", "Review Distribution")}</h4>
                <div className="flex rounded-lg overflow-hidden h-6">
                  {Object.entries(selectedView.bucketCounts).map(([bucket, count]) => {
                    const total = Object.values(selectedView.bucketCounts).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={bucket}
                        className={cn("flex items-center justify-center text-[10px] text-white font-medium", BUCKET_COLORS[bucket] ?? "bg-gray-500")}
                        style={{ width: `${pct}%` }}
                        title={`${bucketDisplayName(bucket, contentLang)}: ${count} (${pct.toFixed(1)}%)`}
                      >
                        {pct >= 8 ? count : ""}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {Object.entries(selectedView.bucketCounts).filter(([, c]) => c > 0).map(([bucket, count]) => (
                    <span key={bucket} className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className={cn("w-2 h-2 rounded-full", BUCKET_COLORS[bucket] ?? "bg-gray-500")} />
                      {bucketDisplayName(bucket, contentLang)}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary + Trend */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h4 className="text-sm font-medium mb-2">{t("Tóm tắt", "Summary")}</h4>
              <AnalysisBulletBlock items={getSummaryBullets(selectedView)} className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground" />
              {getRecentTrendBullets(selectedView).length > 0 && (
                <>
                  <h4 className="text-sm font-medium mt-4 mb-2">{t("Xu hướng gần đây", "Recent Trend")}</h4>
                  <AnalysisBulletBlock items={getRecentTrendBullets(selectedView)} className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground" />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-purple-500/60" />
              </div>
              <p className="text-muted-foreground text-sm">
                {t("Chọn một kết quả phân tích để xem chi tiết", "Select an analysis result to view details")}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {t("hoặc phân tích game mới ở trên", "or analyze a new game above")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
