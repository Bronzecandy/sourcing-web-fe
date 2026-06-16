import { useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { useContentLang } from "@/lib/content-language";
import { localizeAnalysisToEn } from "@/lib/analysis-localize";
import AnalysisDetailContent from "@/components/AnalysisDetailContent";
import { analysisDetailUrl } from "@/lib/analysis-url";
import { deleteAnalysis, fetchAnalysisById, fetchAnalysisLookup } from "@/services/api";
import { useUiCopy } from "@/lib/use-ui-copy";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { useQueryClient } from "@tanstack/react-query";

export default function AnalysisDetail() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useUiCopy();
  const { lang: contentLang } = useContentLang();
  const { user } = useAuth();
  const canDelete = hasPermission(user, "ai.delete");
  const [copied, setCopied] = useState(false);

  const isLookup = analysisId === "lookup";
  const lookupAppId = parseInt(searchParams.get("appId") ?? "", 10);
  const lookupAt = searchParams.get("at") ?? "";
  const lookupBy = searchParams.get("by") ?? undefined;

  const {
    data: analysis,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: isLookup
      ? ["ai-analysis-record", "lookup", lookupAppId, lookupAt, lookupBy]
      : ["ai-analysis-record", analysisId],
    queryFn: () =>
      isLookup
        ? fetchAnalysisLookup(lookupAppId, lookupAt, lookupBy)
        : fetchAnalysisById(analysisId!),
    enabled: isLookup
      ? Number.isFinite(lookupAppId) && !!lookupAt
      : !!analysisId && analysisId !== "lookup",
    retry: false,
  });

  const { data: localized } = useQuery({
    queryKey: ["ai-analysis-localized", analysis?.appId, analysis?.analyzedAt, contentLang],
    queryFn: () => localizeAnalysisToEn(analysis!),
    enabled: !!analysis && contentLang === "en",
    staleTime: 86_400_000,
  });

  const view = analysis && contentLang === "en" ? (localized ?? analysis) : analysis;

  const shareUrl = useMemo(() => (analysis ? analysisDetailUrl(analysis) : ""), [analysis]);

  const canDeleteThis =
    canDelete &&
    !!user?.id &&
    !!analysis &&
    analysis.analyzedByUserId === user.id &&
    !!analysis.analyzedAt;

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/ai-analysis");
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async () => {
    if (!analysis?.analyzedAt || !canDeleteThis) return;
    if (!confirm(t("Xóa phân tích này?", "Delete this analysis?"))) return;
    try {
      await deleteAnalysis(analysis.appId, analysis.analyzedAt);
      queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis", analysis.appId] });
      queryClient.invalidateQueries({ queryKey: ["ai-analysis-history", analysis.appId] });
      navigate("/ai-analysis");
    } catch {
      /* ignore */
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !view) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Quay lại", "Back")}
        </button>
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-destructive font-medium">
            {error instanceof Error ? error.message : t("Không tìm thấy phân tích", "Analysis not found")}
          </p>
          <Link to="/ai-analysis" className="text-sm text-primary hover:underline mt-3 inline-block">
            {t("Về danh sách phân tích", "Back to analyses")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Quay lại", "Back")}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t("Đã copy link", "Link copied") : t("Copy link", "Copy link")}
          </button>
          {canDeleteThis && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-red-600 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("Xóa", "Delete")}
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 md:p-6">
        <h1 className="text-xl font-bold mb-5">{t("Chi tiết đánh giá", "Evaluation details")}</h1>
        <AnalysisDetailContent analysis={view} />
      </div>
    </div>
  );
}
