import { TesterApiError } from "@/tester/api";
import { viDate } from "../labels";
import type { AnswerValue, Answers, AssignmentStatus, TagDef, TemplateQuestion, TesterTestGame } from "../types";

export type ActionKey = TesterTestGame["nextAction"]["key"];
export type Tone = "todo" | "progress" | "success" | "danger" | "muted";

const TODO_ACTIONS: ActionKey[] = ["respond", "survey", "resubmit"];
const FINAL_ACTIONS: ActionKey[] = ["approved", "rejected", "declined", "expired", "closed", "cancelled"];
const JOINED: AssignmentStatus[] = ["confirmed", "in_test", "submitted"];

export const ACTION_TONE: Record<ActionKey, Tone> = {
  respond: "todo",
  survey: "todo",
  resubmit: "danger",
  wait_start: "progress",
  reviewing: "progress",
  approved: "success",
  rejected: "danger",
  declined: "muted",
  expired: "muted",
  closed: "muted",
  cancelled: "muted",
  none: "muted",
};

export const TONE_CLASS: Record<Tone, string> = {
  todo: "bg-brand-yellow text-brand-navy",
  progress: "bg-brand-lavender/60 text-brand-navy",
  success: "bg-brand-mint/50 text-brand-navy",
  danger: "bg-brand-magenta/15 text-brand-magenta",
  muted: "bg-brand-navy/10 text-brand-navy/60",
};

export const fieldClass =
  "w-full rounded-2xl border border-brand-navy/15 bg-white px-4 py-2.5 text-sm text-brand-navy outline-none transition placeholder:text-brand-navy/35 focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 disabled:cursor-default disabled:bg-[#f5f4ff] disabled:text-brand-navy/75";

export const testPath = (id: string) => `/tester/tests/${id}`;
export const surveyPath = (id: string) => `/tester/tests/${id}/survey`;

export function isJoined(t: TesterTestGame): boolean {
  return JOINED.includes(t.status);
}

export function testGroup(t: TesterTestGame): "todo" | "active" | "history" {
  if (TODO_ACTIONS.includes(t.nextAction.key)) return "todo";
  if (FINAL_ACTIONS.includes(t.nextAction.key) || t.campaign.status === "done" || t.campaign.status === "cancelled") return "history";
  return "active";
}

/** Nút chính theo bước tiếp theo; null = chỉ hiện trạng thái. */
export function primaryAction(t: TesterTestGame): { to: string; label: string } | null {
  switch (t.nextAction.key) {
    case "respond":
      return { to: testPath(t.id), label: "Xác nhận tham gia" };
    case "survey":
      return { to: surveyPath(t.id), label: "Làm questionnaire" };
    case "resubmit":
      return { to: surveyPath(t.id), label: "Nộp lại" };
    default:
      return null;
  }
}

const ICT = "Asia/Ho_Chi_Minh";

export function todayIct(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ICT, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Số ngày từ hôm nay (giờ VN) tới `date` (YYYY-MM-DD); âm = đã qua. */
export function daysUntil(date: string): number {
  const utc = (d: string) => {
    const [y, m, day] = d.slice(0, 10).split("-").map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, day ?? 1);
  };
  return Math.round((utc(date) - utc(todayIct())) / 86_400_000);
}

export function countdownText(date: string): string {
  const n = daysUntil(date);
  if (n < 0) return "đã quá hạn";
  if (n === 0) return "hạn chót hôm nay";
  return `còn ${n} ngày`;
}

/** Ngày theo giờ VN của mốc ISO (invitedAt, submittedAt…). */
export function viDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { timeZone: ICT, day: "2-digit", month: "2-digit", year: "numeric" });
}

export function viTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function dateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Chưa chốt ngày";
  return `${viDate(start)} – ${viDate(end)}`;
}

export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function errorIssues(err: unknown): string[] {
  return err instanceof TesterApiError ? err.issues : [];
}

/** BE trả 404 khi tài khoản đang đăng nhập không phải email nhận lời mời. */
export function isNotInvited(err: unknown): boolean {
  return err instanceof TesterApiError && err.status === 404;
}

/** Thử lại tối đa 2 lần với lỗi mạng / lỗi máy chủ; lỗi nghiệp vụ (4xx) thì không. */
export function retryLoad(count: number, err: unknown): boolean {
  if (count >= 2) return false;
  return !(err instanceof TesterApiError) || (err.status ?? 0) >= 500;
}

/* ---------------- Questionnaire ---------------- */

/** Phải khớp `isVisible` ở BE: câu Điểm / Lý do của tag có câu Điều kiện chỉ hiện khi trả lời Có. */
export function isVisible(q: TemplateQuestion, questions: TemplateQuestion[], answers: Answers): boolean {
  if (q.role !== "score" && q.role !== "reason") return true;
  const cond = questions.find((x) => x.role === "condition" && x.tag === q.tag);
  return !cond || answers[cond.id] === "yes";
}

export function isRequired(q: TemplateQuestion, footageRequired: boolean): boolean {
  return q.key === "footage" ? footageRequired : q.required;
}

const URL_RE = /^https?:\/\/\S+$/i;

export function linkRows(v: AnswerValue): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v.trim()) return v.split(/\s+/);
  return [];
}

export function isLink(s: string): boolean {
  return URL_RE.test(s.trim());
}

function normalize(q: TemplateQuestion, v: AnswerValue): AnswerValue {
  switch (q.type) {
    case "number": {
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.trim().replace(",", ".")) : NaN;
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
    }
    case "scale": {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isInteger(n) ? n : null;
    }
    case "yes_no":
      return v === "yes" || v === "no" ? v : null;
    case "single":
      return typeof v === "string" && v ? v : null;
    case "multiple":
      return Array.isArray(v) && v.length > 0 ? v : null;
    case "file": {
      const links = linkRows(v)
        .map((s) => s.trim())
        .filter(isLink)
        .slice(0, 10);
      return links.length > 0 ? links : null;
    }
    default:
      return typeof v === "string" && v.trim() ? v : null;
  }
}

export function isAnswered(q: TemplateQuestion, v: AnswerValue, footageFiles: number): boolean {
  if (q.type === "file") return normalize(q, v) != null || footageFiles > 0;
  return normalize(q, v) != null;
}

/** Body gửi BE: câu đang ẩn = null, số thành number, thang điểm thành số nguyên. */
export function toPayload(questions: TemplateQuestion[], answers: Answers): Answers {
  const out: Answers = {};
  for (const q of questions) out[q.id] = isVisible(q, questions, answers) ? normalize(q, answers[q.id] ?? null) : null;
  return out;
}

export interface QuestionGroup {
  key: string;
  title: string;
  description: string | null;
  questions: TemplateQuestion[];
}

/** Gom câu liền nhau cùng tag thành một phần. */
export function groupQuestions(questions: TemplateQuestion[], tags: TagDef[]): QuestionGroup[] {
  const groups: Array<QuestionGroup & { tag: string | null }> = [];
  let seenTag = false;
  for (const q of questions) {
    const tag = q.tag || null;
    const last = groups[groups.length - 1];
    if (last && last.tag === tag) {
      last.questions.push(q);
      continue;
    }
    groups.push({
      key: `${groups.length}-${tag ?? "general"}`,
      tag,
      title: tag ?? (seenTag ? "Tổng kết" : "Thông tin chơi"),
      description: tag ? (tags.find((t) => t.name === tag)?.description ?? null) : null,
      questions: [q],
    });
    if (tag) seenTag = true;
  }
  return groups;
}

/** Ô ảnh bằng chứng đặt ngay sau câu giờ chơi / level; null = đặt đầu bài. */
export function evidenceAnchor(questions: TemplateQuestion[]): string | null {
  let anchor: string | null = null;
  for (const q of questions) if (q.key === "play_hours" || q.key === "level") anchor = q.id;
  return anchor;
}

/* ---------------- Nháp trên máy ---------------- */

export interface LocalDraft {
  savedAt: number;
  answers: Answers;
}

const draftKey = (id: string) => `testgame-survey:${id}`;

export function readDraft(id: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<LocalDraft>;
    return typeof d.savedAt === "number" && d.answers && typeof d.answers === "object" ? (d as LocalDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(id: string, answers: Answers): void {
  try {
    localStorage.setItem(draftKey(id), JSON.stringify({ savedAt: Date.now(), answers }));
  } catch {
    /* hết dung lượng / chế độ ẩn danh */
  }
}

export function clearDraft(id: string): void {
  try {
    localStorage.removeItem(draftKey(id));
  } catch {
    /* bỏ qua */
  }
}
