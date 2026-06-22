import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, BookMarked, Sparkles, Blend } from "lucide-react";
import type { RubricBlock, RubricCriterionOutput, RubricPartRollup, RubricTestDecision } from "@/types";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn, getScoreColor } from "@/lib/utils";
import {
  formatPackBlend,
  packLabel,
  packTheme,
  PACK_LABELS,
  resolveGenrePackRollups,
} from "@/lib/genre-pack-ui";

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

function formatPackBlendLine(rubric: RubricBlock, lang: "vi" | "en"): string | null {
  if (rubric.genrePacksResolved && rubric.genrePacksResolved.length > 0) {
    if (rubric.genrePacksResolved.length === 1 && rubric.genrePacksResolved[0].packId === "base") {
      return PACK_LABELS.base[lang];
    }
    return formatPackBlend(rubric.genrePacksResolved, lang);
  }
  if (rubric.genrePackResolved) return rubric.genrePackResolved;
  return null;
}

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

function buildPartCollapsedBullets(
  partId: string,
  rows: RubricCriterionOutput[],
  t: (vi: string, en: string) => string,
  multiGenre = false,
): { key: string; content: ReactNode; packId?: string }[] {
  const bullets: { key: string; content: ReactNode; packId?: string }[] = [];
  for (const row of rows) {
    if (partId === "red_flag") {
      bullets.push({
        key: `${row.id}-flag`,
        content: (
          <>
            <span className="font-medium text-foreground">{row.elementVi}:</span> {scoreOrFlag(row, t)}
          </>
        ),
      });
      continue;
    }
    if (row.reasoning?.trim()) {
      bullets.push({
        key: `${row.id}-reason`,
        packId: multiGenre ? row.genrePack ?? undefined : undefined,
        content: (
          <>
            <span className={cn("font-medium", multiGenre && row.genrePack ? packTheme(row.genrePack).text : "text-foreground")}>
              {row.elementVi}:
            </span>{" "}
            {row.reasoning.trim()}
          </>
        ),
      });
    }
  }
  return bullets;
}

export default function RubricPanel({
  rubric,
  showAggregateScore = true,
}: {
  rubric: RubricBlock | undefined;
  showAggregateScore?: boolean;
}) {
  const { t, lang } = useUiCopy();
  const [openParts, setOpenParts] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    if (!rubric) return new Map<string, RubricBlock["criteria"]>();
    const m = new Map<string, RubricBlock["criteria"]>();
    for (const c of rubric.criteria) {
      if (c.partId === "red_flag") continue;
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
  const langKey = lang === "vi" ? "vi" : "en";
  const genrePackRollups = resolveGenrePackRollups(rubric);
  const hasMultiGenre = genrePackRollups.length > 1;

  const partOrder = Array.from(grouped.keys())
    .filter((partId) => {
      if (partId === "red_flag") return false;
      if (partId === "genre_specific") {
        const packs = rubric.genrePacksResolved ?? [];
        const isBaseOnly =
          rubric.genrePackResolved === "base" &&
          (packs.length === 0 || (packs.length === 1 && packs[0].packId === "base"));
        if (isBaseOnly) return false;
      }
      const rollup = rollupByPart.get(partId);
      if (rollup?.weightInTotal != null && rollup.weightInTotal <= 0) return false;
      return true;
    })
    .sort((a, b) => {
      const rank = (id: string) =>
        ["overview", "gameplay", "presentation", "monetization", "socialization", "liveops", "other", "genre_specific"].indexOf(id);
      return rank(a) - rank(b);
    });

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1 text-left">
            <h3 className="text-sm font-semibold text-left">{t("Bảng chấm điểm", "Evaluation scorecard")}</h3>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t("Manifest v", "Manifest v")}
              {rubric.manifestVersion} ·{" "}
              {rubric.dataConfidence.meetsThreshold
                ? t(`Đủ ngưỡng dữ liệu (≥${rubric.dataConfidence.threshold} review)`, `Enough data (≥${rubric.dataConfidence.threshold} reviews)`)
                : t(`Chưa đủ ngưỡng (< ${rubric.dataConfidence.threshold} review)`, `Below threshold (< ${rubric.dataConfidence.threshold} reviews)`)}
            </p>
            {(() => {
              const packLabel = formatPackBlendLine(rubric, langKey);
              if (!packLabel) return null;
              const isBase = rubric.genrePackResolved === "base" && (rubric.genrePacksResolved?.length ?? 0) <= 1;
              return (
                <p className="text-[11px] text-muted-foreground leading-snug text-left">
                  <span className="font-medium text-foreground">{t("Gói chấm:", "Scoring pack:")}</span>{" "}
                  <span className="font-medium text-foreground">{packLabel}</span>
                  {" — "}
                  {isBase
                    ? t(
                        "Không có gói thể loại riêng — Gameplay 40%; không hiển thị phần Theo thể loại.",
                        "No genre pack — Gameplay 40%; genre-specific section hidden.",
                      )
                    : t(
                        "Gameplay 10% + Theo thể loại 30% = 40%; Social giảm 2% so với manifest.",
                        "Gameplay 10% + Genre-specific 30% = 40%; Social −2% vs manifest.",
                      )}
                  {rubric.genrePackBlendReasoning && (
                    <span className="block mt-1 text-muted-foreground/90">{rubric.genrePackBlendReasoning}</span>
                  )}
                </p>
              );
            })()}
          </div>
          {showAggregateScore && (
            <div className="shrink-0 w-full sm:w-auto sm:min-w-[200px] rounded-lg border border-border/70 bg-muted/25 px-4 py-3 text-left space-y-1.5">
              <p className="text-xs">
                <span className="text-muted-foreground">{t("Quyết định thử nghiệm:", "Test decision:")} </span>
                <span className={cn("font-medium", DECISION_TEXT_CLASS[testDecision])}>
                  {decisionLabelViEn(testDecision, t)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  `Tiêu chí điểm thấp (<30): ${rubric.aggregate.lowScoreCriteriaCount}`,
                  `Low criteria (<30): ${rubric.aggregate.lowScoreCriteriaCount}`,
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {partOrder.map((partId) => {
          const rows = grouped.get(partId) ?? [];
          if (rows.length === 0) return null;
          const isGenrePart = partId === "genre_specific";
          const packOrder = rubric.genrePacksResolved?.map((p) => p.packId) ?? [];
          const displayRows =
            isGenrePart && packOrder.length > 1
              ? [...rows].sort(
                  (a, b) => packOrder.indexOf(a.genrePack ?? "") - packOrder.indexOf(b.genrePack ?? ""),
                )
              : rows;
          const label = PART_LABELS[partId]?.[langKey] ?? partId;
          const open = openParts[partId] ?? false;
          const rollup = rollupByPart.get(partId);
          const partGenreRollups = isGenrePart ? genrePackRollups : [];
          const collapsedBullets = buildPartCollapsedBullets(
            partId,
            isGenrePart && genrePackRollups.length > 0 ? displayRows : rows,
            t,
            isGenrePart && genrePackRollups.length > 0,
          );
          return (
            <div key={partId} className="border border-border/60 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 bg-muted/40 text-left text-sm font-medium hover:bg-muted/60 transition-colors"
                onClick={() => setOpenParts((o) => ({ ...o, [partId]: !open }))}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  <span className="flex-1 flex flex-col gap-1 min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span>{label}</span>
                      {partId !== "red_flag" && (() => {
                        const effPct =
                          rollup?.weightInTotal != null ? Math.round(rollup.weightInTotal * 100) : null;
                        const pct = effPct != null ? `${effPct}%` : "—";
                        return (
                          <span className="text-xs font-normal text-muted-foreground">
                            {t("Trọng số:", "Weight:")}{" "}
                            <span className="tabular-nums font-medium text-foreground">{pct}</span>
                          </span>
                        );
                      })()}
                    </span>
                    {isGenrePart && partGenreRollups.length > 0 && (
                      <span className="flex flex-wrap gap-1.5">
                        {partGenreRollups.map((p) => (
                          <span
                            key={p.packId}
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                              packTheme(p.packId).badge,
                            )}
                          >
                            {packLabel(p.packId, langKey, p.labelVi)} {Math.round(p.weight * 100)}%
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </div>
                {partId !== "red_flag" &&
                  (isGenrePart && partGenreRollups.length > 0 ? (
                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 shrink-0 pl-6 sm:pl-0">
                      {partGenreRollups.map((p) => (
                        <div key={p.packId} className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wide", packTheme(p.packId).text)}>
                            {packLabel(p.packId, langKey, p.labelVi)}
                          </span>
                          <span
                            className={cn(
                              "text-sm tabular-nums font-bold",
                              p.averageScore != null ? getScoreColor(p.averageScore) : "text-muted-foreground",
                            )}
                          >
                            {p.averageScore != null ? p.averageScore.toFixed(1) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    rollup?.partAverageScore != null && (
                      <span
                        className={cn(
                          "text-sm tabular-nums font-bold shrink-0 pl-6 sm:pl-0",
                          getScoreColor(rollup.partAverageScore),
                        )}
                      >
                        {rollup.partAverageScore.toFixed(1)}
                      </span>
                    )
                  ))}
              </button>
              {!open && collapsedBullets.length > 0 && (
                <ul className="px-3 pb-2 pt-2 text-xs text-muted-foreground leading-snug border-t border-border/40 list-disc pl-5 space-y-1">
                  {collapsedBullets.map((b) => (
                    <li
                      key={b.key}
                      className={cn(b.packId ? packTheme(b.packId).bullet : undefined)}
                    >
                      {b.content}
                    </li>
                  ))}
                </ul>
              )}
              {open && (
                <div className="divide-y divide-border/50">
                  {displayRows.map((row, idx) => {
                    const packRollup =
                      isGenrePart && row.genrePack
                        ? partGenreRollups.find((p) => p.packId === row.genrePack)
                        : undefined;
                    const showPackHeader =
                      isGenrePart &&
                      hasMultiGenre &&
                      row.genrePack &&
                      (idx === 0 || displayRows[idx - 1].genrePack !== row.genrePack);
                    const rowTheme = row.genrePack ? packTheme(row.genrePack) : null;
                    return (
                    <div key={row.id}>
                      {showPackHeader && (
                        <div
                          className={cn(
                            "px-3 py-2 flex items-center justify-between gap-2 border-b border-border/40",
                            rowTheme?.headerBg,
                          )}
                        >
                          <p className={cn("text-[11px] font-semibold uppercase tracking-wide", rowTheme?.text)}>
                            {packLabel(row.genrePack!, langKey)}
                            <span className="ml-2 font-normal normal-case tracking-normal opacity-80">
                              {Math.round((packRollup?.weight ?? 0) * 100)}%
                            </span>
                          </p>
                          {packRollup?.averageScore != null && (
                            <span className={cn("text-sm font-bold tabular-nums", getScoreColor(packRollup.averageScore))}>
                              {packRollup.averageScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                      )}
                    <div
                      className={cn(
                        "px-3 py-2.5 text-xs space-y-1",
                        rowTheme && cn("border-l-4", rowTheme.border),
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={cn("font-medium", rowTheme?.text ?? "text-foreground")}>{row.elementVi}</span>
                        <div className="flex items-center gap-2">
                          {sourceBadge(row.source, t)}
                          {row.partId !== "red_flag" && row.score != null ? (
                            <span
                              className={cn(
                                "text-sm font-bold tabular-nums text-right min-w-[4rem]",
                                getScoreColor(row.score),
                              )}
                            >
                              {row.score}
                            </span>
                          ) : (
                            <span className="font-bold tabular-nums text-right min-w-[4rem]">
                              {scoreOrFlag(row, t)}
                            </span>
                          )}
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
                        <p className="text-sm font-semibold text-foreground leading-snug rounded-md border border-border/60 bg-muted/35 px-2.5 py-2">
                          {row.reasoning}
                        </p>
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
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
