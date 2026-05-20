import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContentLang } from "@/lib/content-language";
import { localizeAnalysisToEn, getSummaryBullets, mainAnalysisScore } from "@/lib/analysis-localize";
import ReviewWindowPicker from "@/components/ReviewWindowPicker";
import AnalysisDetailModal from "@/components/AnalysisDetailModal";
import AnalysisSourceBadge from "@/components/AnalysisSourceBadge";
import { Brain, Search, Sparkles, ExternalLink, Trash2, Globe, Upload, FileSpreadsheet, X } from "lucide-react";
import { triggerExternalAnalysis, triggerCsvAnalysis, deleteAnalysis, fetchAllAnalyses } from "@/services/api";
import { cn, getScoreColor } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";
import { DEFAULT_REVIEW_WINDOW, type ReviewWindow } from "@/types/review-window";
import type { AiAnalysis } from "@/types";

export default function AIAnalysisPage() {
  const [input, setInput] = useState("");
  const [externalPlatform, setExternalPlatform] = useState<"taptap" | "steam">("taptap");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [reviewWindow, setReviewWindow] = useState<ReviewWindow>(DEFAULT_REVIEW_WINDOW);
  const [modalAnalysis, setModalAnalysis] = useState<AiAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { lang: contentLang } = useContentLang();
  const { t } = useUiCopy();

  const { data: modalLocalized } = useQuery({
    queryKey: ["ai-analysis-localized", modalAnalysis?.appId, modalAnalysis?.analyzedAt, contentLang],
    queryFn: () => localizeAnalysisToEn(modalAnalysis!),
    enabled: !!modalAnalysis && contentLang === "en",
    staleTime: 86_400_000,
  });

  const modalView =
    modalAnalysis && contentLang === "en" ? (modalLocalized ?? modalAnalysis) : modalAnalysis;

  const { data: savedAnalyses = [] } = useQuery({
    queryKey: ["all-analyses"],
    queryFn: fetchAllAnalyses,
    staleTime: 30_000,
  });

  const analyzeMutation = useMutation({
    mutationFn: (args: { input: string; platform: "taptap" | "steam" }) =>
      triggerExternalAnalysis(args.input, args.platform, reviewWindow),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
      setModalAnalysis(data);
    },
  });

  const csvMutation = useMutation({
    mutationFn: (file: File) => triggerCsvAnalysis(file, reviewWindow),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
      setModalAnalysis(data);
      setCsvFile(null);
    },
  });

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    analyzeMutation.mutate({ input: trimmed, platform: externalPlatform });
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
    if (!a?.analyzedAt) return;
    deleteAnalysis(a.appId, a.analyzedAt).then(() => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
      if (modalAnalysis?.analyzedAt === a.analyzedAt) setModalAnalysis(null);
    }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> {t("Phân tích bình luận bằng AI", "AI Review Analysis")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(
            "Chọn nguồn và khoảng bình luận, rồi phân tích TapTap, Steam hoặc file CSV.",
            "Pick source and review window, then analyze TapTap, Steam, or a CSV file.",
          )}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" /> {t("Phân tích một game", "Analyze any game")}
        </h2>

        <ReviewWindowPicker value={reviewWindow} onChange={setReviewWindow} />

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">{t("Nguồn:", "Source:")}</span>
          <select
            value={externalPlatform}
            onChange={(e) => setExternalPlatform(e.target.value as "taptap" | "steam")}
            className="text-sm rounded-lg border border-border bg-background px-3 py-2"
          >
            <option value="taptap">TapTap</option>
            <option value="steam">Steam</option>
          </select>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                externalPlatform === "steam"
                  ? t("URL Steam hoặc App ID", "Steam URL or App ID")
                  : t("URL TapTap hoặc App ID", "TapTap URL or App ID")
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={analyzeMutation.isPending || !input.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {analyzeMutation.isPending ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {t("Đang phân tích…", "Analyzing…")}
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" /> {t("Phân tích", "Analyze")}
              </>
            )}
          </button>
        </div>
        {analyzeMutation.isError && (
          <p className="text-red-500 text-xs">{(analyzeMutation.error as Error).message}</p>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">{t("HOẶC", "OR")}</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-blue-500" /> {t("Tải file bình luận", "Upload review file")}
          </h3>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
            {csvFile ? (
              <p className="text-sm font-medium">{csvFile.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("Kéo thả hoặc chọn CSV/TSV", "Drag & drop or pick CSV/TSV")}</p>
            )}
          </div>
          {csvFile && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCsvSubmit}
                disabled={csvMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {csvMutation.isPending ? t("Đang phân tích…", "Analyzing…") : t("Phân tích file", "Analyze file")}
              </button>
              <button type="button" onClick={() => setCsvFile(null)} className="p-2 rounded-lg border">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
          {t("Kết quả", "Results")} ({savedAnalyses.length})
        </h2>
        {savedAnalyses.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
            {t("Chưa có phân tích. Chạy phân tích phía trên.", "No analyses yet. Run one above.")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedAnalyses.map((a, idx) => (
              <div key={`${a.appId}-${a.analyzedAt}`} className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  {a.iconUrl ? (
                    <img src={a.iconUrl} alt="" className="w-11 h-11 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center">
                      <Brain className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <p className="font-medium text-sm truncate min-w-0 flex-1">
                        {a.gameName || `App #${a.appId}`}
                      </p>
                      <AnalysisSourceBadge source={a.source} size="sm" />
                    </div>
                    {a.developerName && (
                      <p className="text-[10px] text-muted-foreground truncate">{a.developerName}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-0.5">
                      {a.analyzedAt && (
                        <span className="tabular-nums">{new Date(a.analyzedAt).toLocaleString()}</span>
                      )}
                      {a.analyzedAt && <span className="text-muted-foreground/40 select-none">·</span>}
                      <span>
                        {a.reviewsAnalyzed} {t("bình luận", "reviews")}
                      </span>
                    </p>
                  </div>
                  <span className={cn("text-lg font-bold tabular-nums shrink-0", getScoreColor(mainAnalysisScore(a)))}>
                    {mainAnalysisScore(a)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                  {getSummaryBullets(a)[0] ?? a.summary}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAnalysis(a)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-medium"
                  >
                    {t("Chi tiết đánh giá", "Evaluation details")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="p-2 rounded-lg border hover:bg-red-500/10 hover:text-red-500"
                    title={t("Xóa", "Delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnalysisDetailModal analysis={modalView} onClose={() => setModalAnalysis(null)} />
    </div>
  );
}
