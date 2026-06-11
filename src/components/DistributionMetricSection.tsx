import type { DistributionMetric, DistributionMetricBlock } from "@/types";
import DistributionBarChart from "@/components/DistributionBarChart";
import DistributionAbsoluteTable from "@/components/DistributionAbsoluteTable";
import DistributionGrowthTable from "@/components/DistributionGrowthTable";
import DistributionGrowthBarChart from "@/components/DistributionGrowthBarChart";
import DistributionTrendChart from "@/components/DistributionTrendChart";
import DistributionRatingInsightsPanel from "@/components/DistributionRatingInsights";
import DistributionChartLegendGuide from "@/components/DistributionChartLegendGuide";
import { getMetricChartCopy } from "@/lib/distribution-chart-copy";
import { cn } from "@/lib/utils";

interface DistributionMetricSectionProps {
  block: DistributionMetricBlock;
  metricLabel: string;
  showTrend: boolean;
  periodLabel?: string | null;
  t: (vi: string, en: string) => string;
}

export default function DistributionMetricSection({
  block,
  metricLabel,
  showTrend,
  periodLabel,
  t,
}: DistributionMetricSectionProps) {
  const metric = block.metric;
  const copy = getMetricChartCopy(metric, t);
  const absoluteBuckets = block.absoluteBuckets ?? block.buckets;
  const hasAbsolute = absoluteBuckets.some((b) => b.count > 0);
  const hasGrowth = block.growthBuckets.some((b) => b.count > 0);
  const hasData = block.totalGames > 0 || hasAbsolute || hasGrowth;
  const isRating = metric === "rating";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/20 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{metricLabel}</h3>
            {periodLabel && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("So sánh", "Compare")}: {periodLabel}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <StatPill label={t("Có số liệu", "With data")} value={block.totalGames.toLocaleString("vi-VN")} />
            <StatPill label={t("Tăng", "Up")} value={String(block.gamesIncreased)} positive />
            <StatPill label={t("Giảm", "Down")} value={String(block.gamesDecreased)} negative />
            <StatPill label={t("Giữ nguyên", "Flat")} value={String(block.gamesFlat)} />
          </div>
        </div>
      </div>

      {!hasData ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          {t("Không có dữ liệu cho chỉ số này trong kỳ đã chọn", "No data for this metric in the selected period")}
        </p>
      ) : (
        <div className="space-y-8 p-5">
          <section className="space-y-3">
            <SectionHeading
              title={t("Phân phối giá trị tuyệt đối (cuối kỳ)", "Absolute value distribution (period end)")}
              intro={copy.absoluteIntro}
            />
            {hasAbsolute ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
                <div className="space-y-3 xl:col-span-7">
                  <DistributionBarChart
                    buckets={absoluteBuckets}
                    lifecycle="reserve"
                    metric={metric}
                    singleBar
                    labels={copy}
                  />
                  <DistributionChartLegendGuide guide={copy.guide} t={t} />
                </div>
                <div className="xl:col-span-5">
                  <DistributionAbsoluteTable
                    buckets={absoluteBuckets}
                    metric={metric}
                    labels={copy.absoluteTable}
                  />
                </div>
              </div>
            ) : (
              <EmptyBlock
                text={t(
                  "Chưa có game nào có giá trị cuối kỳ để vẽ biểu đồ",
                  "No period-end values to chart",
                )}
              />
            )}
          </section>

          <section className="space-y-3 border-t border-border pt-8">
            <SectionHeading
              title={t("Phân phối mức tăng/giảm trong kỳ", "Growth distribution in period")}
              intro={copy.growthIntro}
            />
            {hasGrowth ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
                <div className="xl:col-span-7">
                  <DistributionGrowthBarChart
                    buckets={block.growthBuckets}
                    metric={metric}
                    labels={{
                      games: copy.growthTable.games,
                      totalChange: copy.growthTable.totalChange,
                    }}
                  />
                </div>
                <div className="xl:col-span-5">
                  <DistributionGrowthTable
                    buckets={block.growthBuckets}
                    metric={metric}
                    labels={copy.growthTable}
                  />
                </div>
              </div>
            ) : (
              <EmptyBlock
                text={t(
                  "Chưa đủ dữ liệu đầu/cuối kỳ để tính biến động",
                  "Not enough start/end data for growth bands",
                )}
              />
            )}
          </section>

          {isRating && block.ratingInsights && (
            <section className="space-y-3 border-t border-border pt-8">
              <SectionHeading
                title={t("Tóm tắt chất lượng rating", "Rating quality summary")}
                intro={t(
                  "Tỷ lệ game theo mức rating và xu hướng điểm trong kỳ.",
                  "Share of games by rating level and score trend in the period.",
                )}
              />
              <DistributionRatingInsightsPanel insights={block.ratingInsights} />
            </section>
          )}

          {showTrend && block.trend.length > 0 && (
            <section className="border-t border-border pt-8">
              <h4 className="mb-3 text-sm font-semibold">{t("Xu hướng theo kỳ", "Period trend")}</h4>
              <DistributionTrendChart data={block.trend} labels={copy.trendLabels} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ title, intro }: { title: string; intro: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-0.5 text-xs text-muted-foreground">{intro}</p>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function StatPill({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          positive && "text-up",
          negative && "text-down",
        )}
      >
        {value}
      </p>
    </div>
  );
}
