import { AlertTriangle } from "lucide-react";
import type { AiAnalysis, RubricBlock } from "@/types";
import { useUiCopy } from "@/lib/use-ui-copy";
import { hasActiveRedFlags } from "@/lib/red-flag-utils";
import { cn } from "@/lib/utils";

function yn(v: boolean | null | undefined, t: (vi: string, en: string) => string) {
  if (v === true) return t("Có", "Yes");
  if (v === false) return t("Không", "No");
  return t("Chưa rõ", "Unknown");
}

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

type MentionKey = "politics" | "religion" | "casino" | "violence" | "sexual";

const MENTION_LABELS: Record<MentionKey, { vi: string; en: string }> = {
  politics: { vi: "Chính trị / chủ quyền", en: "Politics / sovereignty" },
  religion: { vi: "Tôn giáo nhạy cảm", en: "Religion sensitivity" },
  casino: { vi: "Casino / cờ bạc", en: "Casino / gambling" },
  violence: { vi: "Bạo lực gore", en: "Violence (gore)" },
  sexual: { vi: "Sexual / gợi dục", en: "Sexual content" },
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
  const mentions = glance?.playerMentions ?? rubric?.redFlag?.playerMentions;

  if (!hasActiveRedFlags(glance, checklist, rubric)) return null;

  const detailLines =
    glance?.detailVi && glance.detailVi.length > 0
      ? glance.detailVi
      : [];

  const mentionForChecklist = (key: MentionKey): string | null | undefined => {
    const m = mentions?.[key];
    return typeof m === "string" && m.trim() ? m.trim() : null;
  };

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
        <div className="space-y-2 min-w-0">
          <h3 className="text-sm font-semibold">{t("Cảnh báo nội dung", "Content warnings")}</h3>
          {glance?.headlineVi ? (
            <p className="text-sm text-foreground leading-relaxed font-medium">{glance.headlineVi}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("Rà soát rủi ro nội dung / pháp lý VN.", "Quick compliance scan for VN market.")}
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

      {detailLines.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-5 leading-relaxed border-t border-border/50 pt-3">
          {detailLines.map((line, i) => (
            <li key={i} className="text-foreground/90">
              {line}
            </li>
          ))}
        </ul>
      )}

      {checklist && (() => {
        const items = (
          [
            { key: "politics" as const, label: MENTION_LABELS.politics, value: checklist.politics, mentionKey: "politics" as MentionKey },
            { key: "religion", label: MENTION_LABELS.religion, value: checklist.religion, mentionKey: "religion" },
            { key: "casino", label: MENTION_LABELS.casino, value: checklist.casino, mentionKey: "casino" },
            { key: "violence", label: MENTION_LABELS.violence, value: checklist.violenceConcern, mentionKey: "violence" },
            { key: "sexual", label: MENTION_LABELS.sexual, value: checklist.sexualConcern, mentionKey: "sexual" },
          ] as const
        ).filter(({ value }) => value !== false);

        if (items.length === 0) return null;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {items.map(({ key, label, value, mentionKey }) => {
              const playerText = mentionForChecklist(mentionKey);
              const active = value === true || !!playerText;
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 space-y-1",
                    active ? "border-amber-500/40 bg-background/90" : "border-border/60 bg-background/80",
                  )}
                >
                  <div className="text-muted-foreground">{t(label.vi, label.en)}</div>
                  <div className="font-semibold">{yn(value, t)}</div>
                  {playerText && (
                    <p className="text-[11px] text-muted-foreground leading-snug pt-0.5 border-t border-border/40">
                      <span className="font-medium text-foreground/80">
                        {t("Người chơi nhắc:", "Players mention:")}{" "}
                      </span>
                      {playerText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {rubric?.redFlag.otherTaboosNote && (
        <p className="text-[11px] text-muted-foreground italic border-t border-border/50 pt-2">
          {t("Taboo khác:", "Other taboos:")} {rubric.redFlag.otherTaboosNote}
        </p>
      )}
    </div>
  );
}
