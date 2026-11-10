import type { AssignmentStatus, CampaignStatus, Decision, ReviewStatus } from "./types";

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  pending: "Pending",
  inviting: "Inviting",
  testing: "Testing",
  reporting: "Reporting",
  done: "Done",
  cancelled: "Đã huỷ",
};

export const CAMPAIGN_STATUS_HINT: Record<CampaignStatus, string> = {
  pending: "Đang chuẩn bị, chưa gửi lời mời",
  inviting: "Đã gửi lời mời, chờ tester xác nhận",
  testing: "Đang trong thời gian test",
  reporting: "Hết hạn test, đang tổng hợp report",
  done: "Đã chốt report / quyết định",
  cancelled: "Đã huỷ",
};

/** Lớp badge (admin, nền sáng) theo tiến độ game test. */
export const CAMPAIGN_STATUS_CLASS: Record<CampaignStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  inviting: "bg-sky-50 text-sky-700 border-sky-200",
  testing: "bg-violet-50 text-violet-700 border-violet-200",
  reporting: "bg-amber-50 text-amber-800 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  added: "Chưa mời",
  invited: "Đã mời",
  confirmed: "Đã xác nhận",
  declined: "Từ chối",
  no_response: "Không phản hồi",
  in_test: "Đang test",
  submitted: "Đã nộp",
};

export const ASSIGNMENT_STATUS_CLASS: Record<AssignmentStatus, string> = {
  added: "bg-slate-100 text-slate-700",
  invited: "bg-sky-50 text-sky-700",
  confirmed: "bg-indigo-50 text-indigo-700",
  declined: "bg-rose-50 text-rose-700",
  no_response: "bg-zinc-100 text-zinc-600",
  in_test: "bg-violet-50 text-violet-700",
  submitted: "bg-emerald-50 text-emerald-700",
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Không duyệt",
};

export const REVIEW_STATUS_CLASS: Record<ReviewStatus, string> = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

export const AI_VERDICT_LABEL: Record<"approve" | "review" | "reject", string> = {
  approve: "AI đề xuất duyệt",
  review: "AI: cần xem lại",
  reject: "AI đề xuất không duyệt",
};

export const AI_VERDICT_CLASS: Record<"approve" | "review" | "reject", string> = {
  approve: "bg-emerald-50 text-emerald-700 border-emerald-200",
  review: "bg-amber-50 text-amber-800 border-amber-200",
  reject: "bg-rose-50 text-rose-700 border-rose-200",
};

export const DECISION_LABEL: Record<Decision, string> = {
  drop: "Drop",
  monitor: "Monitor",
  recommend: "Recommend to Publish",
};

export const DECISION_CLASS: Record<Decision, string> = {
  drop: "bg-rose-50 text-rose-700 border-rose-200",
  monitor: "bg-sky-50 text-sky-700 border-sky-200",
  recommend: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const MAIL_LABEL: Record<string, string> = {
  M1: "Lời mời",
  M2: "Nhắc phản hồi",
  M3: "Xác nhận + hướng dẫn",
  M4: "Bắt đầu test",
  M5: "Nhắc còn 2 ngày",
  M6: "Nhắc ngày cuối",
  M7: "Kết thúc",
};

export const TESTER_TYPE_LABEL: Record<string, string> = { in_team: "In-team", staff: "Staff", collab: "Collab" };

/** "2026-11-12" → "12/11/2026"; giữ nguyên chuỗi không phải ngày (vd "Khi Initiate"). */
export function viDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function viDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
