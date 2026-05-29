/** ISO date YYYY-MM-DD in local timezone (max selectable = today). */
export function todayIsoDate(): string {
  const d = new Date();
  return dateToIso(d);
}

export function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
}

export function isIsoInRange(day: string, from: string, to: string): boolean {
  return day >= from && day <= to;
}

/** Clamp range: không quá hôm nay; from luôn ≤ to. */
export function normalizeReviewDateRange(
  from: string,
  to: string,
  today: string = todayIsoDate(),
): { from: string; to: string } {
  let f = from.slice(0, 10);
  let t = to.slice(0, 10);
  if (f > today) f = today;
  if (t > today) t = today;
  if (f && t && f > t) {
    const swap = f;
    f = t;
    t = swap;
  }
  return { from: f, to: t };
}

export function formatIsoDisplay(iso: string, locale: string): string {
  try {
    return isoToDate(iso).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Các ô ngày trong tháng (null = ô trống đầu tuần). */
export function buildMonthGrid(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const startPad = (first.getDay() + 6) % 7; // Thứ 2 = cột đầu
  const cells: (string | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(dateToIso(new Date(year, monthIndex, d)));
  }
  return cells;
}