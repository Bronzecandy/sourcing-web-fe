import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { prepareAnalysis, type AnalysisPrepareSource } from "@/services/api";
import { analysisDetailPath } from "@/lib/analysis-url";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn, getScoreColor } from "@/lib/utils";
import type { AnalysisPrepareResult, GenrePackResolvedItem } from "@/types";

const PACK_LABELS: Record<string, { vi: string; en: string }> = {
  base: { vi: "Chung (base)", en: "Base" },
  cardRpg: { vi: "Card RPG", en: "Card RPG" },
  extraction: { vi: "Extraction (Loot & Scoot)", en: "Extraction" },
  shooter: { vi: "Shooter", en: "Shooter" },
  moba: { vi: "MOBA", en: "MOBA" },
};

type WizardStep = "loading" | "duplicate" | "packs";

type ScoringMode = "base" | "genre";

const BASE_PACK_ID = "base";

type Props = {
  open: boolean;
  onClose: () => void;
  source: AnalysisPrepareSource | null;
  onConfirm: (genrePacks: GenrePackResolvedItem[]) => void;
};

function formatPackList(packs: GenrePackResolvedItem[], lang: "vi" | "en"): string {
  return packs
    .map((p) => {
      const label = PACK_LABELS[p.packId]?.[lang] ?? p.labelVi ?? p.packId;
      return `${label} ${Math.round(p.weight * 100)}%`;
    })
    .join(" + ");
}

export default function AnalysisConfirmWizard({ open, onClose, source, onConfirm }: Props) {
  const { t, lang } = useUiCopy();
  const [step, setStep] = useState<WizardStep>("loading");
  const [prepare, setPrepare] = useState<AnalysisPrepareResult | null>(null);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("genre");
  const savedGenrePackIdsRef = useRef<string[]>([]);
  const [packPlan, setPackPlan] = useState<AnalysisPrepareResult["genrePackPlan"] | null>(null);
  const [reweighting, setReweighting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrepare = useCallback(
    async (overridePackIds?: string[]) => {
      if (!source) return;
      setError(null);
      if (!overridePackIds) {
        setStep("loading");
        setPrepare(null);
      } else {
        setReweighting(true);
      }
      try {
        const data = await prepareAnalysis(source, overridePackIds);
        setPrepare(data);
        const ids = data.genrePackPlan.packs.map((p) => p.packId);
        const isBaseOnly = ids.length === 1 && ids[0] === BASE_PACK_ID;
        setSelectedPackIds(ids);
        setPackPlan(data.genrePackPlan);
        if (isBaseOnly) {
          setScoringMode("base");
        } else {
          setScoringMode("genre");
          savedGenrePackIdsRef.current = ids;
        }
        if (!overridePackIds) {
          setStep(data.existingAnalyses.length > 0 ? "duplicate" : "packs");
        }
      } catch (err) {
        const fallback = lang === "vi" ? "Chuẩn bị thất bại" : "Prepare failed";
        setError(err instanceof Error ? err.message : fallback);
        if (!overridePackIds) setStep("packs");
      } finally {
        setReweighting(false);
      }
    },
    [source, lang],
  );

  useEffect(() => {
    if (!open || !source) return;
    void loadPrepare();
  }, [open, source, loadPrepare]);

  useEffect(() => {
    if (open) return;
    setStep("loading");
    setPrepare(null);
    setSelectedPackIds([]);
    setScoringMode("genre");
    savedGenrePackIdsRef.current = [];
    setPackPlan(null);
    setError(null);
  }, [open]);

  const genrePackOptions = (prepare?.availablePackIds ?? []).filter((id) => id !== BASE_PACK_ID);

  const pickDefaultGenreIds = (): string[] => {
    const fromSaved = savedGenrePackIdsRef.current.filter((id) => genrePackOptions.includes(id));
    if (fromSaved.length > 0) return fromSaved;
    const fromTags = (prepare?.tagInferredPacks ?? []).filter((id) => genrePackOptions.includes(id));
    if (fromTags.length > 0) return fromTags;
    return genrePackOptions.slice(0, 1);
  };

  const selectBaseMode = () => {
    if (scoringMode === "base" || reweighting) return;
    const currentGenre = selectedPackIds.filter((id) => id !== BASE_PACK_ID);
    if (currentGenre.length > 0) savedGenrePackIdsRef.current = currentGenre;
    setScoringMode("base");
    void loadPrepare([BASE_PACK_ID]);
  };

  const selectGenreMode = () => {
    if (scoringMode === "genre" || reweighting) return;
    setScoringMode("genre");
    void loadPrepare(pickDefaultGenreIds());
  };

  const toggleGenrePack = (packId: string) => {
    if (reweighting || scoringMode !== "genre") return;
    const genreOnly = selectedPackIds.filter((id) => id !== BASE_PACK_ID);
    const next = genreOnly.includes(packId)
      ? genreOnly.filter((id) => id !== packId)
      : [...genreOnly, packId];

    if (next.length === 0) {
      selectBaseMode();
      return;
    }

    savedGenrePackIdsRef.current = next;
    void loadPrepare(next);
  };

  const handleConfirmPacks = () => {
    const packs = packPlan?.packs ?? [];
    if (packs.length === 0) return;
    onConfirm(packs);
  };

  if (!open) return null;

  const title =
    step === "duplicate"
      ? t("Game đã có phân tích", "Game already analyzed")
      : step === "packs"
        ? t("Chọn gói rubric", "Choose rubric packs")
        : t("Đang chuẩn bị…", "Preparing…");

  const description =
    step === "duplicate"
      ? t(
          "Game này đã có bài phân tích trước đó. Bạn có thể xem lại hoặc tiếp tục phân tích mới.",
          "This game has prior analyses. Review them or continue with a new run.",
        )
      : step === "packs" && prepare
        ? `${prepare.gameName} · ${t("AI đề xuất gói chấm điểm", "AI-suggested scoring packs")}`
        : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      className="max-w-lg"
      footer={
        step === "duplicate" ? (
          <ModalFooterActions
            cancelLabel={t("Hủy", "Cancel")}
            onCancel={onClose}
            submitLabel={t("Tiếp tục phân tích", "Continue analysis")}
            onSubmit={() => setStep("packs")}
          />
        ) : step === "packs" ? (
          <ModalFooterActions
            cancelLabel={t("Hủy", "Cancel")}
            onCancel={onClose}
            submitLabel={t("Bắt đầu phân tích", "Start analysis")}
            onSubmit={handleConfirmPacks}
            submitDisabled={reweighting || !packPlan?.packs.length}
          />
        ) : undefined
      }
    >
      {step === "loading" && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">{t("AI đang chọn gói rubric…", "AI is selecting rubric packs…")}</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mb-3">{error}</p>
      )}

      {step === "duplicate" && prepare && (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {prepare.existingAnalyses.map((a, idx) => {
            const packsLabel =
              a.genrePacks?.length
                ? formatPackList(a.genrePacks, lang === "vi" ? "vi" : "en")
                : a.genrePackResolved ?? "—";
            return (
              <li
                key={`${a.analyzedAt ?? idx}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {a.analyzedAt ? new Date(a.analyzedAt).toLocaleString() : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.reviewsAnalyzed ?? "—"} {t("review", "reviews")} · {packsLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.score != null && (
                    <span className={cn("font-semibold tabular-nums", getScoreColor(a.score))}>
                      {Math.round(a.score)}
                    </span>
                  )}
                  {a.analyzedAt && (
                    <Link
                      to={analysisDetailPath({
                        appId: a.appId,
                        analyzedAt: a.analyzedAt,
                      })}
                      className="text-xs text-primary hover:underline"
                      onClick={onClose}
                    >
                      {t("Xem", "View")}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {step === "packs" && prepare && (
        <div className="space-y-4">
          {reweighting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("AI đang tính lại trọng số…", "AI is recalculating weights…")}
            </div>
          )}

          {packPlan && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">
                {formatPackList(packPlan.packs, lang === "vi" ? "vi" : "en")}
              </p>
              {packPlan.reasoning && (
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{packPlan.reasoning}</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("Cách chấm điểm", "Scoring approach")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={reweighting}
                onClick={selectBaseMode}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  scoringMode === "base"
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <p className="font-medium text-foreground">
                  {PACK_LABELS.base[lang === "vi" ? "vi" : "en"]}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {t(
                    "Gameplay 40%, không có phần Theo thể loại.",
                    "Gameplay 40%, no genre-specific section.",
                  )}
                </p>
              </button>
              <button
                type="button"
                disabled={reweighting}
                onClick={selectGenreMode}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  scoringMode === "genre"
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <p className="font-medium text-foreground">
                  {t("Theo thể loại", "Genre-specific")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {t(
                    "Gameplay 10% + Theo thể loại 30%; chọn một hoặc nhiều gói.",
                    "Gameplay 10% + genre 30%; pick one or more packs.",
                  )}
                </p>
              </button>
            </div>
          </div>

          {scoringMode === "genre" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t("Gói thể loại (chọn một hoặc nhiều):", "Genre packs (pick one or more):")}
              </p>
              <div className="flex flex-wrap gap-2">
                {genrePackOptions.map((packId) => {
                  const checked = selectedPackIds.includes(packId);
                  const label = PACK_LABELS[packId]?.[lang === "vi" ? "vi" : "en"] ?? packId;
                  return (
                    <label
                      key={packId}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors",
                        checked
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleGenrePack(packId)}
                        disabled={reweighting}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                {t(
                  "Bỏ hết gói thể loại sẽ tự chuyển về Gói chung.",
                  "Removing all genre packs switches back to Base.",
                )}
              </p>
            </div>
          )}

          {prepare.tagInferredPacks.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("Khớp tag:", "Tag match:")}{" "}
              {prepare.tagInferredPacks.join(", ")}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
