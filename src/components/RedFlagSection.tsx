import { AlertTriangle } from "lucide-react";
import type { AiAnalysis, RubricBlock } from "@/types";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";

function yn(v: boolean | null | undefined, t: (vi: string, en: string) => string) {
  if (v === true) return t("Có", "Yes");
  if (v === false) return t("Không", "No");
  return t("Chưa rõ", "Unknown");
}

/** Fallback khi phân tích cũ chưa có redFlagsChecklist / redFlagAtAGlance */
function checklistFromRubric(rubric: RubricBlock | undefined): AiAnalysis["redFlagsChecklist"] | undefined {
  if (!rubric) return undefined;
  const rf = rubric.redFlag;
  const concern = (s: string | null | undefined) => {
    if (s == null) return null;
    return s !== "none";
  };
  return {
    politics: typeof rf.politics === "boolean" ? rf.politics : null,
    religion: typeof rf.religionSensitive === "boolean" ? rf.religionSensitive : null,
    casino: typeof rf.casino === "boolean" ? rf.casino : null,
    violenceConcern: concern(rf.violenceSeverity),
    sexualConcern: concern(rf.sexualSeverity),
  };
}

const riskClass: Record<NonNullable<AiAnalysis["redFlagAtAGlance"]>["riskLevel"], string> = {
  clear: "text-emerald-600",
  low: "text-sky-600",
  medium: "text-amber-600",
  high: "text-orange-600",
  critical: "text-red-600",
};

export default function RedFlagSection({
  redFlagAtAGlance,
  redFlagsChecklist: checklistProp,
  rubric,
}: {
  redFlagAtAGlance?: AiAnalysis["redFlagAtAGlance"];
  redFlagsChecklist?: AiAnalysis["redFlagsChecklist"];
  rubric?: RubricBlock;
}) {
  const { t } = useUiCopy();
  const checklist = checklistProp ?? checklistFromRubric(rubric);
  const glance = redFlagAtAGlance;

  if (!rubric && !glance) return null;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        glance?.blockedByHardGate
          ? "border-red-500/50 bg-red-500/5"
          : "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className={cn(
            "w-5 h-5 shrink-0 mt-0.5",
            glance?.riskLevel ? riskClass[glance.riskLevel] : "text-amber-600",
          )}
        />
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm font-semibold">{t("Red Flag (ưu tiên)", "Red Flag (priority)")}</h3>
          {glance?.headlineVi ? (
            <p className="text-xs text-muted-foreground leading-relaxed">{glance.headlineVi}</p>
          ) : !checklist ? null : (
            <p className="text-xs text-muted-foreground">
              {t("Rà soát nhanh rủi ro nội dung / pháp lý VN.", "Quick compliance scan for VN market.")}
            </p>
          )}
          {glance?.riskLevel && (
            <p className={cn("text-[11px] font-medium uppercase tracking-wide", riskClass[glance.riskLevel])}>
              {t("Mức rủi ro:", "Risk level:")}{" "}
              {glance.riskLevel === "clear" && t("ổn định", "Clear")}
              {glance.riskLevel === "low" && t("thấp", "Low")}
              {glance.riskLevel === "medium" && t("trung bình", "Medium")}
              {glance.riskLevel === "high" && t("cao", "High")}
              {glance.riskLevel === "critical" && t("nghiêm trọng / hard gate", "Critical / hard gate")}
            </p>
          )}
        </div>
      </div>

      {checklist && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          <div className="rounded-lg bg-background/80 border border-border/60 px-2 py-1.5">
            <div className="text-muted-foreground">{t("Chính trị", "Politics")}</div>
            <div className="font-semibold">{yn(checklist.politics, t)}</div>
          </div>
          <div className="rounded-lg bg-background/80 border border-border/60 px-2 py-1.5">
            <div className="text-muted-foreground">{t("Tôn giáo nhạy cảm", "Religion sensitivity")}</div>
            <div className="font-semibold">{yn(checklist.religion, t)}</div>
          </div>
          <div className="rounded-lg bg-background/80 border border-border/60 px-2 py-1.5">
            <div className="text-muted-foreground">{t("Casino", "Casino")}</div>
            <div className="font-semibold">{yn(checklist.casino, t)}</div>
          </div>
          <div className="rounded-lg bg-background/80 border border-border/60 px-2 py-1.5">
            <div className="text-muted-foreground">{t("Bạo lực (gore)", "Violence (gore)")}</div>
            <div className="font-semibold">{yn(checklist.violenceConcern, t)}</div>
          </div>
          <div className="rounded-lg bg-background/80 border border-border/60 px-2 py-1.5">
            <div className="text-muted-foreground">{t("Sexual / gợi dục", "Sexual")}</div>
            <div className="font-semibold">{yn(checklist.sexualConcern, t)}</div>
          </div>
        </div>
      )}

      {rubric?.redFlag.otherTaboosNote && (
        <p className="text-[11px] text-muted-foreground italic border-t border-border/50 pt-2">
          {t("Taboo khác:", "Other taboos:")} {rubric.redFlag.otherTaboosNote}
        </p>
      )}
    </div>
  );
}
