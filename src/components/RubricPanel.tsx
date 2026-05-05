import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, BookMarked, Sparkles, Blend } from "lucide-react";
import type { RubricBlock, RubricCriterionOutput, RubricPartRollup, RubricTestDecision } from "@/types";
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

/** Phản hồi API cũ (3 giá trị) → quyết định mới. */
const LEGACY_DECISION_MAP: Record<string, RubricTestDecision> = {
  good_for_test: "suitable_test",
  need_verification: "consider_test",
  drop: "no_test",
};

function normalizeTestDecision(aggregate: RubricBlock["aggregate"]): RubricTestDecision {
  const raw = aggregate.decision as string;
  if (aggregate.redFlagHardGate && (raw === "drop" || raw === "blocked_red_flag")) {
    return "blocked_red_flag";
  }
  if (raw in LEGACY_DECISION_MAP) return LEGACY_DECISION_MAP[raw]!;
  if (
    raw === "must_test" ||
    raw === "suitable_test" ||
    raw === "consider_test" ||
    raw === "no_test" ||
    raw === "blocked_red_flag"
  ) {
    return raw as RubricTestDecision;
  }
  return "no_test";
}

function decisionLabelViEn(d: RubricTestDecision, t: (vi: string, en: string) => string): string {
  switch (d) {
    case "must_test":
      return t("Phải thử nghiệm ngay", "Must test immediately");
    case "suitable_test":
      return t("Phù hợp thử nghiệm", "Suitable for testing");
    case "consider_test":
      return t("Cân nhắc thử nghiệm", "Consider testing");
    case "no_test":
      return t("Không thử nghiệm", "Not for testing");
    case "blocked_red_flag":
      return t("Không thử nghiệm (chặn red flag)", "Blocked — red flag");
    default:
      return t("Không thử nghiệm", "Not for testing");
  }
}

const DECISION_TEXT_CLASS: Record<RubricTestDecision, string> = {
  no_test: "text-red-600 dark:text-red-400",
  consider_test: "text-amber-600 dark:text-amber-500",
  suitable_test: "text-emerald-600 dark:text-emerald-400",
  must_test: "text-violet-600 dark:text-violet-400",
  blocked_red_flag: "text-red-700 dark:text-red-300 font-semibold",
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

  const rollupByPart = useMemo(() => {
    const m = new Map<string, RubricPartRollup>();
    for (const r of rubric?.aggregate.partRollups ?? []) {
      m.set(r.partId, r);
    }
    return m;
  }, [rubric]);

  /** Σ weightInPart toàn bộ tiêu chí trong phần (để hiển thị % đóng góp trong phần). */
  const partWeightTotals = useMemo(() => {
    const m = new Map<string, number>();
    if (!rubric) return m;
    for (const c of rubric.criteria) {
      if (c.partId === "red_flag") continue;
      m.set(c.partId, (m.get(c.partId) ?? 0) + c.weightInPart);
    }
    return m;
  }, [rubric]);

  if (!rubric) return null;

  const testDecision = normalizeTestDecision(rubric.aggregate);

  const partOrder = Array.from(grouped.keys()).sort((a, b) => {
    if (a === "red_flag") return -1;
    if (b === "red_flag") return 1;
    const rank = (id: string) =>
      ["overview", "gameplay", "presentation", "monetization", "socialization", "liveops", "other", "genre_specific", "red_flag"].indexOf(id);
    return rank(a) - rank(b);
  });

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1 text-left">
            <h3 className="text-sm font-semibold text-left">{t("Bảng điểm rubric", "Rubric scores")}</h3>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t("Manifest v", "Manifest v")}
              {rubric.manifestVersion} ·{" "}
              {rubric.dataConfidence.meetsThreshold
                ? t(`Đủ ngưỡng dữ liệu (≥${rubric.dataConfidence.threshold} review)`, `Enough data (≥${rubric.dataConfidence.threshold} reviews)`)
                : t(`Chưa đủ ngưỡng (< ${rubric.dataConfidence.threshold} review)`, `Below threshold (< ${rubric.dataConfidence.threshold} reviews)`)}
            </p>
            {rubric.genrePackResolved != null && rubric.genrePackResolved !== "" && (
              <p className="text-[11px] text-muted-foreground leading-snug text-left">
                <span className="font-medium text-foreground">{t("Gói rubric:", "Rubric pack:")}</span>{" "}
                <span className="font-medium text-foreground">{rubric.genrePackResolved}</span>
                {" — "}
                {rubric.genrePackResolved === "base"
                  ? t(
                      "Phần \"Theo thể loại\" ~4% trong điểm tổng; các phần khác được scale lại.",
                      "“Genre-specific” ~4% of total score; other parts scaled accordingly.",
                    )
                  : t(
                      "Gameplay ~14% và \"Theo thể loại\" ~24%; các phần khác chia ~62% theo tỷ lệ manifest.",
                      "Gameplay ~14% and “Genre-specific” ~24%; remaining ~62% split across other parts per manifest ratios.",
                    )}
              </p>
            )}
          </div>
          <div className="shrink-0 w-full sm:w-auto sm:min-w-[220px] rounded-lg border border-border/70 bg-muted/25 px-4 py-3 text-left space-y-1.5">
            <p className="text-xs">
              <span className="text-muted-foreground">{t("Điểm có trọng số:", "Weighted score:")} </span>
              <span className="font-bold tabular-nums text-base">{rubric.aggregate.weightedScore ?? "—"}</span>
              {rubric.aggregate.band5 != null && (
                <span className="text-muted-foreground"> ({t("thang 1–5", "band 1–5")}: {rubric.aggregate.band5})</span>
              )}
            </p>
            <p className="text-xs">
              <span className="text-muted-foreground">{t("Quyết định:", "Decision:")} </span>
              <span className={cn("font-medium", DECISION_TEXT_CLASS[testDecision])}>
                {decisionLabelViEn(testDecision, t)}
              </span>
              {rubric.aggregate.redFlagHardGate && testDecision !== "blocked_red_flag" && (
                <span className="ml-2 text-red-600 font-medium">{t("(Red flag cứng)", "(Hard red flag)")}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(`Tiêu chí điểm <30: ${rubric.aggregate.lowScoreCriteriaCount}`, `Criteria score <30: ${rubric.aggregate.lowScoreCriteriaCount}`)}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2.5 text-left">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {rubric.aggregate.globalWeightDenominator != null && rubric.aggregate.globalWeightDenominator > 0
              ? t(
                  `Công thức điểm tổng: trung bình có trọng số theo từng phần, rồi Σ(ĐTB phần × trọng số phần) ÷ ${rubric.aggregate.globalWeightDenominator.toFixed(2)} (chỉ các phần có ít nhất một tiêu chí có điểm).`,
                  `Formula: weighted average per part, then Σ(part avg × part weight) ÷ ${rubric.aggregate.globalWeightDenominator.toFixed(2)} (parts with at least one scored criterion only). No separate LLM “master” score.`,
                )
              : t(
                  "Điểm tổng được tính từ điểm từng tiêu chí theo manifest (kết quả cũ có thể thiếu chi tiết phần).",
                  "Total score is derived from per-criterion scores per the manifest (older saved runs may omit part breakdown).",
                )}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground text-left">
          {t("Red Flag xem khối ưu tiên phía trên + cột Có/Không dưới đây.", "See Red Flag block above and Yes/No column below.")}
        </p>
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
                <span className="flex-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span>{label}</span>
                  {partId !== "red_flag" && (() => {
                    const rollup = rollupByPart.get(partId);
                    const effPct =
                      rollup?.weightInTotal != null ? Math.round(rollup.weightInTotal * 100) : null;
                    const pct = effPct != null ? `${effPct}%` : "—";
                    const avg =
                      rollup?.partAverageScore != null
                        ? rollup.partAverageScore.toFixed(1)
                        : "—";
                    const skip =
                      rollup && rollup.includedInGlobalScore === false
                        ? t(" · không vào điểm tổng", " · excluded from total")
                        : "";
                    return (
                      <span className="text-xs font-normal text-muted-foreground">
                        {t("Trọng số phần:", "Part weight:")} <span className="tabular-nums font-medium text-foreground">{pct}</span>
                        {" · "}
                        {t("ĐTB phần:", "Part avg:")} <span className="tabular-nums font-medium text-foreground">{avg}</span>
                        {skip}
                      </span>
                    );
                  })()}
                </span>
                <span className="text-xs font-normal text-muted-foreground shrink-0">({rows.length})</span>
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
                      {partId !== "red_flag" && (
                        <p className="text-[10px] text-muted-foreground">
                          {t("Trọng số trong phần:", "Weight in part:")}{" "}
                          <span className="tabular-nums font-medium text-foreground/80">
                            {(() => {
                              const totalW = partWeightTotals.get(partId) ?? 0;
                              if (totalW <= 0) return `— (${row.weightInPart})`;
                              const pct = (row.weightInPart / totalW) * 100;
                              return `${pct.toFixed(0)}% · w=${row.weightInPart.toFixed(2)}`;
                            })()}
                          </span>
                        </p>
                      )}
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
