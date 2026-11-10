import type { FindingCategory, MapStatus, MetricScore, RunStatus, StageKey, Verdict } from "./types";

type T = (vi: string, en: string) => string;

export function compact(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(digits)}K`;
  return abs >= 100 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(2);
}

export function usd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return Math.abs(v) < 10 ? `$${v.toFixed(2)}` : `$${compact(v)}`;
}

export function signedPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const p = v * 100;
  return `${p > 0 ? "+" : ""}${p.toFixed(digits)}%`;
}

export function metricValue(m: Pick<MetricScore, "unit" | "value">): string {
  const v = m.value;
  if (v == null) return "—";
  switch (m.unit) {
    case "usd":
      return usd(v);
    case "ratio":
      return `${(v * 100).toFixed(1)}%`;
    case "pct":
      return signedPct(v);
    case "hours":
      return `${v.toFixed(1)} h`;
    default:
      return compact(v);
  }
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${m}/${y}`;
}

export function scoreTone(v: number | null | undefined): string {
  if (v == null) return "text-muted-foreground";
  if (v >= 70) return "text-up";
  if (v >= 45) return "text-stable";
  return "text-down";
}

export const VERDICT_STYLE: Record<Verdict, string> = {
  strong: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  promising: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  watch: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  weak: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  insufficient: "bg-muted text-muted-foreground border-border",
};

export function verdictLabel(v: Verdict, t: T): string {
  switch (v) {
    case "strong":
      return t("Mạnh", "Strong");
    case "promising":
      return t("Triển vọng", "Promising");
    case "watch":
      return t("Theo dõi", "Watch");
    case "weak":
      return t("Yếu", "Weak");
    default:
      return t("Thiếu dữ liệu", "Insufficient");
  }
}

export function runStatusLabel(s: RunStatus, t: T): string {
  switch (s) {
    case "queued":
      return t("Đang chờ", "Queued");
    case "running":
      return t("Đang chạy", "Running");
    case "needs_mapping":
      return t("Chờ xác nhận mapping", "Needs mapping");
    case "done":
      return t("Hoàn tất", "Done");
    default:
      return t("Lỗi", "Failed");
  }
}

export function stageLabel(k: StageKey, t: T): string {
  switch (k) {
    case "identify":
      return t("Tìm tên quốc tế (web)", "Find international name (web)");
    case "mapping":
      return t("Ghép Sensor Tower / Steam", "Map to Sensor Tower / Steam");
    case "market":
      return t("Số liệu Sensor Tower", "Sensor Tower metrics");
    case "steam":
      return t("Số liệu Steam", "Steam metrics");
    case "web":
      return t("Báo cáo & bài báo (web)", "Reports & articles (web)");
    default:
      return t("Tổng hợp đánh giá", "Synthesis");
  }
}

export function mapStatusLabel(s: MapStatus, t: T): string {
  switch (s) {
    case "auto":
      return t("Tự ghép", "Auto");
    case "confirmed":
      return t("Đã xác nhận", "Confirmed");
    case "none":
      return t("Không có", "Not listed");
    default:
      return t("Chưa ghép", "Unmapped");
  }
}

export function mapMethodLabel(method: string | null, t: T): string {
  switch (method) {
    case "itunes_id":
      return t("trùng App Store id", "matching App Store id");
    case "android_package":
      return t("trùng package Android", "matching Android package");
    case "name_exact":
      return t("trùng tên chính xác", "exact name match");
    case "st_name_exact":
      return t("trùng tên tiếng Anh trên Sensor Tower", "Sensor Tower English name");
    case "web_link":
      return t("link Steam từ web search", "Steam link from web search");
    case "manual":
      return t("chọn tay", "picked manually");
    default:
      return method ?? "";
  }
}

export function categoryLabel(c: FindingCategory, t: T): string {
  switch (c) {
    case "performance":
      return t("Hiệu quả", "Performance");
    case "launch":
      return t("Ra mắt / test", "Launch / test");
    case "reception":
      return t("Phản hồi", "Reception");
    case "company_financial":
      return t("Tài chính công ty", "Company financials");
    case "company_news":
      return t("Tin công ty", "Company news");
    default:
      return t("Rủi ro", "Risk");
  }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function timeAgo(iso: string | null | undefined, t: T): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return t("vừa xong", "just now");
  if (min < 60) return t(`${min} phút trước`, `${min}m ago`);
  const h = Math.round(min / 60);
  if (h < 24) return t(`${h} giờ trước`, `${h}h ago`);
  const d = Math.round(h / 24);
  return t(`${d} ngày trước`, `${d}d ago`);
}
