import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, BookMarked, Sparkles, Blend } from "lucide-react";
import type { RubricBlock, RubricCriterionOutput } from "@/types";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";

const PART_LABELS: Record<string, { vi: string; en: string }> = {
  overview: { vi: "Tổng quan", en: "Overview" },
  gameplay: { vi: "Gameplay", en: "Gameplay" },
  presentation: { vi: "Hình ảnh & nội dung", en: "Presentation" },
  monetization: { vi: "Monetization & Event", en: "Monetization & Event" },
  socialization: { vi: "Social", en: "Social" },
  liveops: { vi: "LiveOps & hiệu năng", en: "LiveOps & Performance" },
  other: { vi: "Khác", en: "Other" },
  genre_specific: { vi: "Theo thể loại", en: "Genre-specific" },
  red_flag: { vi: "Red Flag", en: "Red Flag" },
};

function sourceBadge(source: string, t: (vi: string, en: string) => string) {
  if (source === "library")
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <BookMarked className="w-3 h-3" /> {t("Thư viện", "Library")}
      </span>
    );
  if (source === "llm")
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-400">
        <Sparkles className="w-3 h-3" /> AI
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-400">
      <Blend className="w-3 h-3" /> {t("Gộp", "Merged")}
    </span>
  );
}

function scoreOrFlag(row: RubricCriterionOutput, t: (vi: string, en: string) => string) {
  if (row.partId === "red_flag") {
    if (row.flagPresent === true) return t("Có", "Yes");
    if (row.flagPresent === false) return t("Không", "No");
    return t("Chưa rõ", "Unknown");
  }
  if (row.score != null) return String(row.score);
  return "N/A";
}

export default function RubricPanel({ rubric }: { rubric: RubricBlock | undefined }) {
  const { t, lang } = useUiCopy();
  const [openParts, setOpenParts] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    if (!rubric) return new Map<string, RubricBlock["criteria"]>();
    const m = new Map<string, RubricBlock["criteria"]>();
    for (const c of rubric.criteria) {
      if (!m.has(c.partId)) m.set(c.partId, []);
      m.get(c.partId)!.push(c);
    }
    return m;
  }, [rubric]);

  if (!rubric) return null;

  const decisionLabel = (d: RubricBlock["aggregate"]["decision"]) => {
    if (d === "good_for_test") return t("Phù hợp thử nghiệm", "Good for testing");
    if (d === "need_verification") return t("Cần xác minh", "Need verification");
    return t("Loại / không đạt", "Drop");
  };

  const partOrder = Array.from(grouped.keys()).sort((a, b) => {
    if (a === "red_flag") return -1;
    if (b === "red_flag") return 1;
    const rank = (id: string) =>
      ["overview", "gameplay", "presentation", "monetization", "socialization", "liveops", "other", "genre_specific", "red_flag"].indexOf(id);
    return rank(a) - rank(b);
  });

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t("Bảng điểm rubric", "Rubric scores")}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("Manifest v", "Manifest v")}
            {rubric.manifestVersion} ·{" "}
            {rubric.dataConfidence.meetsThreshold
              ? t(`Đủ ngưỡng dữ liệu (≥${rubric.dataConfidence.threshold} review)`, `Enough data (≥${rubric.dataConfidence.threshold} reviews)`)
              : t(`Chưa đủ ngưỡng (< ${rubric.dataConfidence.threshold} review)`, `Below threshold (< ${rubric.dataConfidence.threshold} reviews)`)}
          </p>
        </div>
        <div className="text-right text-xs space-y-1">
          <p>
            <span className="text-muted-foreground">{t("Điểm có trọng số:", "Weighted score:")} </span>
            <span className="font-bold">{rubric.aggregate.weightedScore ?? "—"}</span>
            {rubric.aggregate.band5 != null && (
              <span className="text-muted-foreground"> ({t("thang 1–5", "band 1–5")}: {rubric.aggregate.band5})</span>
            )}
          </p>
          <p>
            <span className="text-muted-foreground">{t("Quyết định:", "Decision:")} </span>
            <span className={cn(
              "font-medium",
              rubric.aggregate.decision === "good_for_test" && "text-emerald-600",
              rubric.aggregate.decision === "need_verification" && "text-amber-600",
              rubric.aggregate.decision === "drop" && "text-red-600",
            )}>
              {decisionLabel(rubric.aggregate.decision)}
            </span>
            {rubric.aggregate.redFlagHardGate && (
              <span className="ml-2 text-red-600 font-medium">{t("(Red flag cứng)", "(Hard red flag)")}</span>
            )}
          </p>
          <p className="text-muted-foreground">
            {t(`Tiêu chí điểm <30: ${rubric.aggregate.lowScoreCriteriaCount}`, `Criteria score <30: ${rubric.aggregate.lowScoreCriteriaCount}`)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {t("Red Flag xem khối ưu tiên phía trên + cột Có/Không dưới đây.", "See Red Flag block above and Yes/No column below.")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {partOrder.map((partId) => {
          const rows = grouped.get(partId) ?? [];
          if (rows.length === 0) return null;
          const label = PART_LABELS[partId]?.[lang === "vi" ? "vi" : "en"] ?? partId;
          const open = openParts[partId] ?? true;
          return (
            <div key={partId} className="border border-border/60 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 bg-muted/40 text-left text-sm font-medium hover:bg-muted/60 transition-colors"
                onClick={() => setOpenParts((o) => ({ ...o, [partId]: !open }))}
              >
                {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                {label}
                <span className="text-xs font-normal text-muted-foreground">({rows.length})</span>
              </button>
              {open && (
                <div className="divide-y divide-border/50">
                  {rows.map((row) => (
                    <div key={row.id} className="px-3 py-2.5 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{row.elementVi}</span>
                        <div className="flex items-center gap-2">
                          {sourceBadge(row.source, t)}
                          <span className="font-bold tabular-nums text-right min-w-[4rem]">
                            {scoreOrFlag(row, t)}
                          </span>
                        </div>
                      </div>
                      {row.reasoning && (
                        <p className="text-muted-foreground leading-snug">{row.reasoning}</p>
                      )}
                      {(row.strengths?.length ?? 0) > 0 && (
                        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/15 px-2 py-1.5 space-y-0.5">
                          <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">{t("Điểm mạnh", "Strengths")}</p>
                          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                            {row.strengths!.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(row.weaknesses?.length ?? 0) > 0 && (
                        <div className="rounded-md bg-red-500/10 border border-red-500/15 px-2 py-1.5 space-y-0.5">
                          <p className="text-[10px] font-medium text-red-700 dark:text-red-400">{t("Điểm yếu", "Weaknesses")}</p>
                          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                            {row.weaknesses!.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                        {row.mentionCount != null && (
                          <span>{t("Ước lượng review liên quan:", "Est. related reviews:")} {row.mentionCount}</span>
                        )}
                        {row.matchedLibraryKey && (
                          <span>{t("Khớp thư viện:", "Library match:")} {row.matchedLibraryKey}</span>
                        )}
                        {row.confidence && (
                          <span>{t("Tin cậy:", "Confidence:")} {row.confidence}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
