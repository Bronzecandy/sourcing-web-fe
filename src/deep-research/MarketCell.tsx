import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Telescope } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchMarketSummary } from "./api";
import { compact, signedPct, usd, VERDICT_STYLE, verdictLabel } from "./format";
import type { MarketSummaryItem } from "./types";

export function useMarketSummary(appIds: number[]) {
  const key = useMemo(() => [...new Set(appIds)].sort((a, b) => a - b), [appIds]);
  return useQuery({
    queryKey: ["deep-research", "market-summary", key.join(",")],
    queryFn: () => fetchMarketSummary(key),
    enabled: key.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function MarketCell({
  item,
  loading,
  onResearch,
  t,
}: {
  item: MarketSummaryItem | undefined;
  loading: boolean;
  onResearch: () => void;
  t: (vi: string, en: string) => string;
}) {
  const run = item?.latestRun;
  const lm = item?.lastMonth;
  return (
    <div className="flex items-center gap-2 min-w-[170px]">
      <div className="flex-1 min-w-0 text-xs leading-tight">
        {loading && !item ? (
          <span className="inline-block h-3 w-20 rounded bg-muted animate-pulse" />
        ) : lm ? (
          <>
            <div className="font-medium text-foreground whitespace-nowrap">
              <span className="text-[10px] text-muted-foreground mr-1">{lm.country}</span>
              {usd(lm.revenueUsd)}
              {lm.revenueMoM != null && (
                <span className={cn("ml-1", lm.revenueMoM >= 0 ? "text-up" : "text-down")}>{signedPct(lm.revenueMoM, 0)}</span>
              )}
            </div>
            <div className="text-muted-foreground whitespace-nowrap">DAU {compact(lm.avgDau)}</div>
          </>
        ) : item?.st.status === "auto" || item?.st.status === "confirmed" ? (
          <span className="text-muted-foreground" title={item.st.name ?? undefined}>
            {t("ST: chưa có số tháng", "ST: no monthly data")}
          </span>
        ) : item?.st.status === "none" ? (
          <span className="text-muted-foreground">{t("Không có trên ST", "Not on ST")}</span>
        ) : (
          <span className="text-muted-foreground/70">{t("Chưa ghép", "Unmapped")}</span>
        )}
        {run?.verdict && (
          <span className={cn("mt-1 inline-flex rounded border px-1.5 py-0 text-[10px] font-semibold", VERDICT_STYLE[run.verdict])}>
            {verdictLabel(run.verdict, t)}
            {run.marketScore != null && ` · ${run.marketScore.toFixed(0)}`}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onResearch();
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        title={t("Deep Research", "Deep Research")}
        className="shrink-0 rounded-lg border border-primary/30 p-1.5 text-primary hover:bg-primary/10 transition-colors"
      >
        <Telescope className="w-4 h-4" />
      </button>
    </div>
  );
}
