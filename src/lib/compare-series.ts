import type { CompareGameEntry } from "@/types";
import { buildFanReserveDeltaSeries } from "@/lib/chart-delta";

export const COMPARE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"] as const;

/** Màu cột UI — khớp COMPARE_COLORS (indigo, emerald, amber, red). */
export const COMPARE_COLUMN_THEMES = [
  {
    dot: "bg-indigo-500",
    headerBg: "bg-indigo-500/12",
    headerBorder: "border-indigo-500/40",
    headerText: "text-indigo-900 dark:text-indigo-100",
    colBg: "bg-indigo-500/[0.05]",
    colBgStrong: "bg-indigo-500/15",
    colBorder: "border-indigo-500/20",
    cardBorder: "border-indigo-500/40",
    cardBg: "bg-indigo-500/[0.07]",
    cardHeader: "bg-indigo-500/12 border-indigo-500/25",
    accent: "text-indigo-700 dark:text-indigo-300",
    strengthsBg: "bg-emerald-500/10 border-emerald-500/25",
    weaknessesBg: "bg-amber-500/10 border-amber-500/25",
  },
  {
    dot: "bg-emerald-500",
    headerBg: "bg-emerald-500/12",
    headerBorder: "border-emerald-500/40",
    headerText: "text-emerald-900 dark:text-emerald-100",
    colBg: "bg-emerald-500/[0.05]",
    colBgStrong: "bg-emerald-500/15",
    colBorder: "border-emerald-500/20",
    cardBorder: "border-emerald-500/40",
    cardBg: "bg-emerald-500/[0.07]",
    cardHeader: "bg-emerald-500/12 border-emerald-500/25",
    accent: "text-emerald-700 dark:text-emerald-300",
    strengthsBg: "bg-emerald-500/10 border-emerald-500/25",
    weaknessesBg: "bg-amber-500/10 border-amber-500/25",
  },
  {
    dot: "bg-amber-500",
    headerBg: "bg-amber-500/12",
    headerBorder: "border-amber-500/40",
    headerText: "text-amber-900 dark:text-amber-100",
    colBg: "bg-amber-500/[0.05]",
    colBgStrong: "bg-amber-500/15",
    colBorder: "border-amber-500/20",
    cardBorder: "border-amber-500/40",
    cardBg: "bg-amber-500/[0.07]",
    cardHeader: "bg-amber-500/12 border-amber-500/25",
    accent: "text-amber-800 dark:text-amber-200",
    strengthsBg: "bg-emerald-500/10 border-emerald-500/25",
    weaknessesBg: "bg-amber-500/10 border-amber-500/25",
  },
  {
    dot: "bg-red-500",
    headerBg: "bg-red-500/12",
    headerBorder: "border-red-500/40",
    headerText: "text-red-900 dark:text-red-100",
    colBg: "bg-red-500/[0.05]",
    colBgStrong: "bg-red-500/15",
    colBorder: "border-red-500/20",
    cardBorder: "border-red-500/40",
    cardBg: "bg-red-500/[0.07]",
    cardHeader: "bg-red-500/12 border-red-500/25",
    accent: "text-red-700 dark:text-red-300",
    strengthsBg: "bg-emerald-500/10 border-emerald-500/25",
    weaknessesBg: "bg-amber-500/10 border-amber-500/25",
  },
] as const;

export type CompareColumnTheme = (typeof COMPARE_COLUMN_THEMES)[number];

export function compareTheme(index: number): CompareColumnTheme {
  return COMPARE_COLUMN_THEMES[index % COMPARE_COLUMN_THEMES.length];
}

export function compareGameTheme(games: CompareGameEntry[], appId: number): CompareColumnTheme {
  const idx = games.findIndex((g) => g.appId === appId);
  return compareTheme(idx >= 0 ? idx : 0);
}

export function compareSeriesKey(appId: number) {
  return `g${appId}`;
}

function formatChartDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

type HistoryRow = CompareGameEntry["detail"]["history"][number];

export function mergeHistoryByField(
  games: CompareGameEntry[],
  pick: (h: HistoryRow) => number | null | undefined,
): Array<Record<string, string | number | null>> {
  const dateMap = new Map<string, Record<string, string | number | null>>();

  for (const g of games) {
    const key = compareSeriesKey(g.appId);
    const sorted = [...g.detail.history].sort((a, b) => a.date.localeCompare(b.date));
    for (const h of sorted) {
      if (!dateMap.has(h.date)) {
        dateMap.set(h.date, { date: formatChartDate(h.date), rawDate: h.date });
      }
      const row = dateMap.get(h.date)!;
      const v = pick(h);
      row[key] = v != null && !Number.isNaN(v) ? v : null;
    }
  }

  return [...dateMap.values()].sort((a, b) =>
    String(a.rawDate).localeCompare(String(b.rawDate)),
  );
}

export function mergeReserveDeltaSeries(games: CompareGameEntry[]) {
  const dateMap = new Map<string, Record<string, string | number | null>>();

  for (const g of games) {
    const key = compareSeriesKey(g.appId);
    const sorted = [...g.detail.history].sort((a, b) => a.date.localeCompare(b.date));
    const deltas = buildFanReserveDeltaSeries(sorted);
    for (const h of deltas) {
      if (!dateMap.has(h.date)) {
        dateMap.set(h.date, { date: formatChartDate(h.date), rawDate: h.date });
      }
      const row = dateMap.get(h.date)!;
      row[key] = h.reservesDelta ?? null;
    }
  }

  return [...dateMap.values()].sort((a, b) =>
    String(a.rawDate).localeCompare(String(b.rawDate)),
  );
}

export function gameLabel(games: CompareGameEntry[], appId: number) {
  return games.find((g) => g.appId === appId)?.detail.title ?? `#${appId}`;
}

/** For metrics where lower is better (rank). */
export function bestAppIdLower(
  games: CompareGameEntry[],
  values: Record<number, number | null | undefined>,
): number | null {
  let best: number | null = null;
  let bestVal: number | null = null;
  for (const g of games) {
    const v = values[g.appId];
    if (v == null || v <= 0) continue;
    if (bestVal == null || v < bestVal) {
      bestVal = v;
      best = g.appId;
    }
  }
  return best;
}

/** For metrics where higher is better. */
export function bestAppIdHigher(
  games: CompareGameEntry[],
  values: Record<number, number | null | undefined>,
): number | null {
  let best: number | null = null;
  let bestVal: number | null = null;
  for (const g of games) {
    const v = values[g.appId];
    if (v == null) continue;
    if (bestVal == null || v > bestVal) {
      bestVal = v;
      best = g.appId;
    }
  }
  return best;
}
