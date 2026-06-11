import type { ReactNode } from "react";
import type { DistributionRatingInsights } from "@/types";
import { Star, TrendingUp, TrendingDown, ThumbsUp } from "lucide-react";
import { useUiCopy } from "@/lib/use-ui-copy";

export default function DistributionRatingInsightsPanel({
  insights,
}: {
  insights: DistributionRatingInsights;
}) {
  const { t } = useUiCopy();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <InsightCard
        icon={<Star className="w-4 h-4 text-amber-500" />}
        label={t("Rating ≥ 8", "Rating ≥ 8")}
        value={`${insights.highRatingShare}%`}
      />
      <InsightCard
        icon={<TrendingDown className="w-4 h-4 text-down" />}
        label={t("Rating < 6", "Rating < 6")}
        value={`${insights.lowRatingShare}%`}
      />
      <InsightCard
        icon={<TrendingUp className="w-4 h-4 text-up" />}
        label={t("Điểm đang tăng", "Improving")}
        value={`${insights.improvingShare}%`}
      />
      <InsightCard
        icon={<TrendingDown className="w-4 h-4 text-orange-500" />}
        label={t("Điểm đang giảm", "Declining")}
        value={`${insights.decliningShare}%`}
      />
      <InsightCard
        icon={<Star className="w-4 h-4 text-primary" />}
        label={t("TB rating", "Avg rating")}
        value={String(insights.avgRating)}
        sub={`Δ ${insights.avgRatingDelta >= 0 ? "+" : ""}${insights.avgRatingDelta}`}
      />
      {insights.vote5StarShare != null && (
        <InsightCard
          icon={<ThumbsUp className="w-4 h-4 text-green-500" />}
          label={t("Vote 5 sao", "5-star votes")}
          value={`${insights.vote5StarShare}%`}
        />
      )}
    </div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
