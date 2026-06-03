import type { AnalysisProgressUpdate } from "@/lib/analysis-stream";

export type FormattedProgress = {
  title: string;
  logLine: string;
  skipLog: boolean;
  phaseLabel: string;
};

const nf = (n: number) => n.toLocaleString("vi-VN");

function phaseLabel(phase: string, t: (vi: string, en: string) => string): string {
  const map: Record<string, [string, string]> = {
    start: ["Bắt đầu", "Starting"],
    connected: ["Đã kết nối", "Connected"],
    heartbeat: ["Đang xử lý", "Processing"],
    db_check: ["Kiểm tra dữ liệu", "Checking data"],
    db: ["Dữ liệu đã lưu", "Cached data"],
    fetch: ["Tải bình luận", "Loading reviews"],
    filter: ["Lọc bình luận", "Filtering reviews"],
    parse: ["Đọc file", "Reading file"],
    llm: ["Phân tích AI", "AI analysis"],
    merge: ["Tổng hợp kết quả", "Merging results"],
    save: ["Lưu kết quả", "Saving"],
    done: ["Hoàn tất", "Done"],
  };
  const pair = map[phase];
  return pair ? t(pair[0], pair[1]) : t("Tiến trình", "Progress");
}

function formatFetchDetail(
  d: NonNullable<AnalysisProgressUpdate["detail"]>,
  t: (vi: string, en: string) => string,
): string {
  if (d.collected != null && d.total != null && d.capped) {
    const pct = Math.min(100, Math.round((d.collected / d.total) * 100));
    return t(
      `Đã chọn ${nf(d.collected)} / ${nf(d.total)} bình luận (${pct}%)`,
      `Selected ${nf(d.collected)} / ${nf(d.total)} reviews (${pct}%)`,
    );
  }
  if (d.collected != null) {
    return t(`Đã tải ${nf(d.collected)} bình luận`, `Loaded ${nf(d.collected)} reviews`);
  }
  return "";
}

function isFetchMilestoneMessage(msg: string): boolean {
  return /đã (chọn|tải)|bắt đầu phân tích|chuẩn bị dữ liệu/i.test(msg);
}

/** Chuyển payload stream từ BE thành câu hiển thị cho người dùng. */
export function formatAnalysisProgress(
  update: AnalysisProgressUpdate,
  t: (vi: string, en: string) => string,
): FormattedProgress {
  const phase = phaseLabel(update.phase, t);

  if (update.phase === "heartbeat" || update.phase === "connected") {
    return {
      title: update.message || t("Đang phân tích…", "Analyzing…"),
      logLine: "",
      skipLog: true,
      phaseLabel: phase,
    };
  }

  const detail = update.detail;
  const rawMsg = update.message ?? "";
  let title = update.message;
  let logLine = update.message;
  let skipLog = false;

  if (update.phase === "fetch" && detail) {
    if (detail.capped && detail.total != null) {
      title = t(
        `Đang chọn bình luận đại diện (tối đa ${nf(10_000)} / ${nf(detail.total)} bình luận)…`,
        `Selecting a representative sample (up to ${nf(10_000)} of ${nf(detail.total)} reviews)…`,
      );
    } else {
      title = t("Đang tải bình luận từ cơ sở dữ liệu…", "Loading reviews from database…");
    }
    const sub = formatFetchDetail(detail, t);
    logLine = sub || title;
    skipLog = !isFetchMilestoneMessage(rawMsg);
  } else if (detail?.collected != null && detail?.total != null && detail.capped) {
    logLine = formatFetchDetail(detail, t);
    skipLog = !isFetchMilestoneMessage(rawMsg);
  }

  return {
    title,
    logLine,
    skipLog,
    phaseLabel: phase,
  };
}
