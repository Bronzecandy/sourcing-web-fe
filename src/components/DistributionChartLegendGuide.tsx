import { Info } from "lucide-react";

interface DistributionChartLegendGuideProps {
  guide: {
    count: string;
    countDelta: string;
    metricSum: string;
    metricDelta: string;
  };
  t: (vi: string, en: string) => string;
}

export default function DistributionChartLegendGuide({
  guide,
  t,
}: DistributionChartLegendGuideProps) {
  const items = [
    { key: "count", label: t("Số game (cột)", "Games (bars)"), text: guide.count },
    { key: "countDelta", label: t("Chuyển bucket (đường)", "Bucket change (line)"), text: guide.countDelta },
    { key: "metricSum", label: t("Tổng cuối kỳ", "Period-end total"), text: guide.metricSum },
    { key: "metricDelta", label: t("Tổng thay đổi", "Total change"), text: guide.metricDelta },
  ];

  return (
    <details className="group rounded-lg border border-border/70 bg-muted/20 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {t("Chú thích biểu đồ", "Chart legend")}
        <span className="ml-auto text-[10px] font-normal text-muted-foreground group-open:hidden">
          {t("Mở", "Show")}
        </span>
      </summary>
      <ul className="grid gap-2 border-t border-border/60 px-3 pb-3 pt-2 text-muted-foreground sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key}>
            <span className="font-medium text-foreground">{item.label}:</span> {item.text}
          </li>
        ))}
      </ul>
    </details>
  );
}
