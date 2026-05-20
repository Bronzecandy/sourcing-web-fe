export type HistoryPoint = {
  date: string;
  fansCount: number | null;
  reserveCount: number | null;
};

export type FanReserveDeltaPoint = {
  date: string;
  fansDelta: number | null;
  reservesDelta: number | null;
};

export function buildFanReserveDeltaSeries(history: HistoryPoint[]): FanReserveDeltaPoint[] {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((h, i) => {
    if (i === 0) {
      return { date: h.date, fansDelta: null, reservesDelta: null };
    }
    const prev = sorted[i - 1]!;
    const fansDelta =
      h.fansCount != null && prev.fansCount != null ? h.fansCount - prev.fansCount : null;
    const reservesDelta =
      h.reserveCount != null && prev.reserveCount != null
        ? h.reserveCount - prev.reserveCount
        : null;
    return { date: h.date, fansDelta, reservesDelta };
  });
}

export function formatDelta(n: number): string {
  const sign = n > 0 ? "+" : "";
  if (Math.abs(n) >= 1_000_000) return `${sign}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${sign}${(n / 1_000).toFixed(1)}K`;
  return `${sign}${n}`;
}
