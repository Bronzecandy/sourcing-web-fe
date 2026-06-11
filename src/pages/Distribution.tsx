import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarRange } from "lucide-react";
import {
  fetchDistributionMeta,
  fetchDistributionOverview,
  fetchDistributionTrends,
} from "@/services/api";
import type { DistributionTab } from "@/types";
import { formatDate, formatNumber } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";
import Tabs from "@/components/ui/Tabs";
import DistributionMetricSection from "@/components/DistributionMetricSection";

const TAB_CONFIG: Array<{
  id: DistributionTab;
  labelVi: string;
  labelEn: string;
  icon: typeof Bookmark;
  descVi: string;
  descEn: string;
}> = [
  {
    id: "reserve",
    labelVi: "Đăng ký trước",
    labelEn: "Pre-launch",
    icon: Bookmark,
    descVi: "Game chưa ra mắt — Reserve, Rating & Fans",
    descEn: "Pre-launch games — Reserve, Rating & Fans",
  },
  {
    id: "new",
    labelVi: "Game mới",
    labelEn: "New games",
    icon: Sparkles,
    descVi: "Ra mắt dưới 6 tháng — Download, Rating, Bình luận, Fans",
    descEn: "Launched <6 months — Download, Rating, Reviews, Fans",
  },
  {
    id: "old",
    labelVi: "Game cũ",
    labelEn: "Established",
    icon: Clock,
    descVi: "Ra mắt từ 6 tháng trở lên — Download, Rating, Bình luận, Fans",
    descEn: "Launched ≥6 months — Download, Rating, Reviews, Fans",
  },
];

const METRIC_LABELS: Record<string, { vi: string; en: string }> = {
  reserve: { vi: "Đăng ký trước", en: "Reserve" },
  download: { vi: "Download", en: "Download" },
  rating: { vi: "Rating", en: "Rating" },
  reviewCount: { vi: "Bình luận", en: "Reviews" },
  fans: { vi: "Fans", en: "Fans" },
};

export default function Distribution() {
  const { t } = useUiCopy();
  const { data: meta } = useQuery({
    queryKey: ["distribution-meta"],
    queryFn: fetchDistributionMeta,
  });

  const [year, setYear] = useState<number | null | "pending">("pending");
  const [month, setMonth] = useState<number | null>(null);
  const [tab, setTab] = useState<DistributionTab>("reserve");

  useEffect(() => {
    if (meta?.years.length && year === "pending") {
      setYear(meta.years[0]!);
    }
  }, [meta, year]);

  const resolvedYear = year === "pending" ? null : year;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["distribution-overview", resolvedYear, month, tab],
    queryFn: () =>
      fetchDistributionOverview({
        year: resolvedYear,
        month: month ?? undefined,
        lifecycle: tab,
      }),
    enabled: year !== "pending",
    retry: false,
    staleTime: 3_600_000,
  });

  const showTrend = month == null;

  const { data: trendsData, isFetching: trendsFetching } = useQuery({
    queryKey: ["distribution-trends", resolvedYear, month, tab],
    queryFn: () =>
      fetchDistributionTrends({
        year: resolvedYear,
        month: month ?? undefined,
        lifecycle: tab,
      }),
    enabled: year !== "pending" && showTrend && !!data,
    retry: false,
    staleTime: 3_600_000,
  });

  const metrics = useMemo(() => {
    if (!data) return [];
    if (!trendsData) return data.metrics;
    const trendByMetric = new Map(trendsData.metrics.map((m) => [m.metric, m.trend]));
    return data.metrics.map((block) => ({
      ...block,
      trend: trendByMetric.get(block.metric) ?? block.trend,
    }));
  }, [data, trendsData]);

  const availableMonths = useMemo(() => {
    if (!meta || resolvedYear == null) return meta ? [...new Set(Object.values(meta.months).flat())].sort((a, b) => a - b) : [];
    return meta.months[resolvedYear] ?? [];
  }, [meta, resolvedYear]);

  const activeTab = TAB_CONFIG.find((x) => x.id === tab)!;

  if (!meta || year === "pending") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const periodLabel =
    data?.periodStart && data?.periodEnd
      ? `${formatDate(data.periodStart)} → ${formatDate(data.periodEnd)}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary" />
          {t("Phân phối số liệu", "Metric Distribution")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(
            "Phân tích theo nhóm game và khoảng chỉ số — so sánh đầu kỳ và cuối kỳ",
            "Analyze by game segment and metric buckets — compare period start vs end",
          )}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect
            label={t("Năm", "Year")}
            value={resolvedYear == null ? "all" : String(resolvedYear)}
            onChange={(v) => {
              if (v === "all") {
                setYear(null);
                setMonth(null);
              } else {
                const y = Number(v);
                setYear(y);
                const ms = meta.months[y];
                setMonth(ms?.length ? null : null);
              }
            }}
          >
            <option value="all">{t("Tất cả", "All years")}</option>
            {meta.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label={t("Tháng", "Month")}
            value={month ?? "all"}
            onChange={(v) => setMonth(v === "all" ? null : Number(v))}
          >
            <option value="all">
              {resolvedYear == null ? t("Tất cả tháng", "All months") : t("Cả năm", "Full year")}
            </option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {t(`Tháng ${m}`, `Month ${m}`)}
              </option>
            ))}
          </FilterSelect>

          {periodLabel && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1.5 ml-auto">
              <CalendarRange className="w-3.5 h-3.5 shrink-0" />
              <span>{periodLabel}</span>
              {isFetching && !isLoading && (
                <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>
      </div>

      <Tabs
        tabs={TAB_CONFIG.map((tc) => ({
          id: tc.id,
          label: (
            <span className="inline-flex items-center gap-2">
              <tc.icon className="w-4 h-4" />
              {t(tc.labelVi, tc.labelEn)}
            </span>
          ),
          badge:
            data?.lifecycle === tc.id
              ? data.segmentTotal
              : undefined,
        }))}
        active={tab}
        onChange={(id) => setTab(id as DistributionTab)}
      />

      <p className="text-sm text-muted-foreground -mt-2">
        {t(activeTab.descVi, activeTab.descEn)}
      </p>

      {isError ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm space-y-3">
          <p className="text-destructive font-medium">
            {t("Không tải được dữ liệu phân phối", "Failed to load distribution data")}
          </p>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <p className="text-muted-foreground text-xs">
            {t(
              "Lần đầu tải cả năm có thể mất 1–2 phút. Nếu BE đang warmup cache, thử SKIP_WARMUP=1 trong .env.",
              "Full-year first load may take 1–2 minutes. If BE is warming cache, try SKIP_WARMUP=1 in .env.",
            )}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("Thử lại", "Retry")}
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : !data ? null : (
        <>
          {data.message && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
              {data.message}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tab === "reserve"
                    ? t("Cohort tab này", "This tab's cohort")
                    : tab === "new"
                      ? t("Game mới trên bảng xếp hạng", "New games on charts")
                      : t("Game cũ trên bảng xếp hạng", "Established games on charts")}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {data.segmentTotal.toLocaleString("vi-VN")}
                </p>
                {periodLabel && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tab === "reserve"
                      ? t(
                          `${periodLabel} — game có hạng Reserve trong kỳ`,
                          `${periodLabel} — games ranked on Reserve in period`,
                        )
                      : periodLabel}
                  </p>
                )}
              </div>

              {data.tabInsights && (
                <div className="lg:col-span-8">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("Hình thái nhóm", "Segment shape")}
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
                    {data.tabInsights.value}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {data.tabInsights.sub}
                    </span>
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {data.tabInsights.items.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                      >
                        <p className="text-[10px] uppercase text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-semibold tabular-nums">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab !== "reserve" && !data.tabInsights && (
                <div className="grid grid-cols-3 gap-2 lg:col-span-8">
                  <MiniStat
                    label={t("Reserve", "Reserve")}
                    value={data.segmentCounts.reserve.toLocaleString("vi-VN")}
                  />
                  <MiniStat
                    label={t("Mới", "New")}
                    value={data.segmentCounts.new.toLocaleString("vi-VN")}
                  />
                  <MiniStat
                    label={t("Cũ", "Established")}
                    value={data.segmentCounts.old.toLocaleString("vi-VN")}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {metrics.map((block) => {
              const ml = METRIC_LABELS[block.metric];
              return (
                <DistributionMetricSection
                  key={block.metric}
                  block={block}
                  metricLabel={ml ? t(ml.vi, ml.en) : block.label}
                  showTrend={showTrend}
                  periodLabel={periodLabel}
                  t={t}
                />
              );
            })}
          </div>

          {metrics.length > 0 && (
            <div className="bg-muted/30 rounded-xl border border-border p-4 text-xs text-muted-foreground">
              {t(
                `Tổng chỉ số tăng trong kỳ: ${metrics.map((m) => `${METRIC_LABELS[m.metric]?.vi ?? m.metric} ${m.metricDelta >= 0 ? "+" : ""}${formatNumber(m.metricDelta)}`).join(" · ")}`,
                `Period growth: ${metrics.map((m) => `${METRIC_LABELS[m.metric]?.en ?? m.metric} ${m.metricDelta >= 0 ? "+" : ""}${formatNumber(m.metricDelta)}`).join(" · ")}`,
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
      >
        {children}
      </select>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
