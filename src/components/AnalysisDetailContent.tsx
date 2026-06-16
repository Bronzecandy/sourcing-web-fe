import { TrendingUp } from "lucide-react";
import type { AiAnalysis } from "@/types";
import { useContentLang } from "@/lib/content-language";
import {
  getSummaryBullets,
  getRecentTrendBullets,
  mainAnalysisScore,
} from "@/lib/analysis-localize";
import { aggregateCriterionInsights } from "@/lib/aggregate-criterion-insights";
import { AnalysisBulletBlock } from "@/components/AnalysisBulletBlock";
import RubricPanel from "@/components/RubricPanel";
import RedFlagSection from "@/components/RedFlagSection";
import AnalysisSourceBadge from "@/components/AnalysisSourceBadge";
import StoreLinkChips from "@/components/StoreLinkChips";
import { analysisStoreLinks } from "@/lib/store-links";
import { useUiCopy, bucketDisplayName } from "@/lib/use-ui-copy";
import { cn, getScoreColor } from "@/lib/utils";

const BUCKET_COLORS: Record<string, string> = {
  "Very Negative": "bg-red-500",
  Negative: "bg-orange-500",
  Mixed: "bg-amber-500",
  Positive: "bg-green-500",
  "Very Positive": "bg-emerald-500",
};

export default function AnalysisDetailContent({
  analysis,
  compactHeader,
}: {
  analysis: AiAnalysis;
  compactHeader?: boolean;
}) {
  const { t, lang: contentLang } = useUiCopy();
  const score = mainAnalysisScore(analysis);
  const buckets = analysis.bucketCounts ?? {};
  const totalReviews = analysis.reviewsAnalyzed ?? 0;
  const { strengths, weaknesses } = aggregateCriterionInsights(analysis.rubric);

  return (
    <div className="space-y-5">
      <div className={cn("flex items-start gap-4", compactHeader && "flex-wrap")}>
        {analysis.iconUrl ? (
          <img
            src={analysis.iconUrl}
            alt=""
            className="w-14 h-14 rounded-xl object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-lg font-semibold truncate min-w-0 flex-1">
              {analysis.gameName || `App #${analysis.appId}`}
            </h3>
            <AnalysisSourceBadge source={analysis.source} className="shrink-0" />
          </div>
          <StoreLinkChips links={analysisStoreLinks(analysis)} size="sm" className="mt-2" stopPropagation={false} />
          {analysis.developerName && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{t("Nhà phát triển:", "Developer:")}</span>{" "}
              {analysis.developerName}
              {analysis.publisherName &&
                analysis.publisherName !== analysis.developerName && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {t("Phát hành:", "Publisher:")} {analysis.publisherName}
                  </span>
                )}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
            <span>
              {totalReviews} {t("bình luận", "reviews")}
            </span>
            {analysis.dateRangeStart && analysis.dateRangeEnd && (
              <>
                <span>·</span>
                <span>
                  {analysis.dateRangeStart} — {analysis.dateRangeEnd}
                </span>
              </>
            )}
            {analysis.analyzedAt && (
              <>
                <span>·</span>
                <span>{new Date(analysis.analyzedAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn("text-3xl font-bold tabular-nums", getScoreColor(score))}>{score}</div>
          <div className="text-[10px] text-muted-foreground">{t("Điểm tổng", "Overall score")}</div>
        </div>
      </div>

      <RedFlagSection
        redFlagAtAGlance={analysis.redFlagAtAGlance}
        redFlagsChecklist={analysis.redFlagsChecklist}
        rubric={analysis.rubric}
      />

      <div className="bg-card rounded-xl border border-border p-4">
        <h4 className="text-sm font-medium mb-2">{t("Tóm tắt", "Summary")}</h4>
        <AnalysisBulletBlock
          items={getSummaryBullets(analysis)}
          className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground"
        />
        {getRecentTrendBullets(analysis).length > 0 && (
          <>
            <h4 className="text-sm font-medium mt-4 mb-2 flex items-center gap-1 text-blue-500">
              <TrendingUp className="w-3.5 h-3.5" />
              {t("Xu hướng gần đây (~60 ngày)", "Recent trend (~60 days)")}
            </h4>
            <AnalysisBulletBlock
              items={getRecentTrendBullets(analysis)}
              className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground"
            />
          </>
        )}
      </div>

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {strengths.length > 0 && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
              <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                {t("Điểm mạnh (tổng quan)", "Strengths (overview)")}
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
              <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                {t("Điểm yếu (tổng quan)", "Weaknesses (overview)")}
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                {weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {totalReviews > 0 && Object.keys(buckets).length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h4 className="text-sm font-medium mb-3">{t("Phân bố cảm xúc", "Review sentiment")}</h4>
          <div className="flex gap-0.5 h-7 rounded-lg overflow-hidden">
            {Object.entries(buckets).map(([label, count]) => {
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={label}
                  className={cn(
                    "flex items-center justify-center text-[10px] font-medium text-white",
                    BUCKET_COLORS[label] ?? "bg-gray-400",
                  )}
                  style={{ width: `${pct}%` }}
                  title={`${bucketDisplayName(label, contentLang)}: ${count}`}
                >
                  {pct >= 10 ? count : ""}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(buckets)
              .filter(([, c]) => c > 0)
              .map(([label, count]) => (
                <span key={label} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className={cn("w-2 h-2 rounded-full", BUCKET_COLORS[label] ?? "bg-gray-400")} />
                  {bucketDisplayName(label, contentLang)}: {count}
                </span>
              ))}
          </div>
        </div>
      )}

      <RubricPanel rubric={analysis.rubric} showAggregateScore={false} />
    </div>
  );
}
