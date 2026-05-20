import { X } from "lucide-react";
import type { AiAnalysis } from "@/types";
import AnalysisDetailContent from "@/components/AnalysisDetailContent";
import { useUiCopy } from "@/lib/use-ui-copy";

export default function AnalysisDetailModal({
  analysis,
  onClose,
}: {
  analysis: AiAnalysis | null;
  onClose: () => void;
}) {
  const { t } = useUiCopy();

  if (!analysis) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[min(96vw,1280px)] max-h-[92vh] overflow-y-auto rounded-xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-5 py-3">
          <h2 className="font-semibold">{t("Chi tiết đánh giá", "Evaluation details")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label={t("Đóng", "Close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <AnalysisDetailContent analysis={analysis} />
        </div>
      </div>
    </div>
  );
}
