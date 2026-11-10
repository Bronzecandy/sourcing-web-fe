import { useEffect } from "react";
import type { QuestionKey, QuestionRole, QuestionTemplate, QuestionType, TagDef, TemplateQuestion } from "../types";

export const TEMPLATE_STATUS_LABEL: Record<QuestionTemplate["status"], string> = {
  draft: "Nháp",
  active: "Đang dùng",
  retired: "Ngừng dùng",
};

export const TEMPLATE_STATUS_CLASS: Record<QuestionTemplate["status"], string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  retired: "bg-muted text-muted-foreground border-border",
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  number: "Số",
  short_text: "Văn bản ngắn",
  long_text: "Văn bản dài",
  scale: "Thang điểm",
  yes_no: "Có / Không",
  file: "Tệp / link",
  single: "Chọn một",
  multiple: "Chọn nhiều",
};

export const QUESTION_ROLE_LABEL: Record<QuestionRole, string> = {
  score: "Điểm",
  reason: "Lý do",
  condition: "Điều kiện",
  other: "Khác",
};

export const QUESTION_ROLE_HINT: Record<QuestionRole, string> = {
  score: "Thang điểm 1–5, tính vào điểm phần của tag.",
  reason: "Câu trả lời tự do giải thích cho tag.",
  condition: "Có / Không. Trả lời Không thì ẩn câu Điểm / Lý do của tag và không tính tester đó vào điểm tag.",
  other: "Không gắn vào điểm phần nào.",
};

export const QUESTION_ROLE_CLASS: Record<QuestionRole, string> = {
  score: "bg-violet-50 text-violet-700 border-violet-200",
  reason: "bg-sky-50 text-sky-700 border-sky-200",
  condition: "bg-amber-50 text-amber-800 border-amber-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export const QUESTION_KEY_LABEL: Record<QuestionKey, string> = {
  play_hours: "Giờ chơi",
  level: "Level / tiến trình",
  footage: "Footage",
  usp: "USP",
  improve: "Cần cải thiện",
  red_flag: "Red flag",
};

export const QUESTION_KEY_HINT: Record<QuestionKey, string> = {
  play_hours: "Giờ chơi tester khai — AI đối chiếu với ảnh bằng chứng.",
  level: "Level / tiến trình tester khai — AI đối chiếu với ảnh bằng chứng.",
  footage: "Ô tải footage; bắt buộc khi game test yêu cầu footage.",
  usp: "Đưa vào mục USP của report.",
  improve: "Đưa vào mục điểm cần cải thiện của report.",
  red_flag: "Đưa vào mục Red flag của report.",
};

export interface DraftQuestion {
  uid: string;
  id: string;
  code: string;
  text: string;
  help: string;
  type: QuestionType;
  role: QuestionRole;
  tag: string;
  key: QuestionKey | "";
  required: boolean;
  optionsText: string;
  scaleMin: string;
  scaleMax: string;
  minLabel: string;
  maxLabel: string;
}

export interface TemplateDraft {
  name: string;
  genres: string[];
  status: QuestionTemplate["status"];
  questions: DraftQuestion[];
  weights: Record<string, string>;
}

export type TemplatePayload = Pick<QuestionTemplate, "name" | "genres" | "status" | "questions" | "tagWeights">;

let seq = 0;
export function newUid(): string {
  seq += 1;
  return `dq${seq}`;
}

export function isChoice(type: QuestionType): boolean {
  return type === "single" || type === "multiple";
}

export function draftQuestion(q: TemplateQuestion, uid = newUid()): DraftQuestion {
  return {
    uid,
    id: q.id,
    code: q.code,
    text: q.text,
    help: q.help ?? "",
    type: q.type,
    role: q.role,
    tag: q.tag ?? "",
    key: q.key ?? "",
    required: q.required,
    optionsText: (q.options ?? []).join("\n"),
    scaleMin: String(q.scaleMin ?? 1),
    scaleMax: String(q.scaleMax ?? 5),
    minLabel: q.minLabel ?? "Rất tệ",
    maxLabel: q.maxLabel ?? "Rất tốt",
  };
}

export function blankQuestion(code: string): DraftQuestion {
  return draftQuestion({ id: "", code, text: "", type: "long_text", role: "other", tag: null, key: null, required: false });
}

/** `uids` giữ trạng thái mở / đóng của từng dòng sau khi lưu (BE không đổi thứ tự câu). */
export function draftFromTemplate(t: QuestionTemplate, uids: string[] = []): TemplateDraft {
  return {
    name: t.name,
    genres: [...t.genres],
    status: t.status,
    questions: t.questions.map((q, i) => draftQuestion(q, uids.length === t.questions.length ? uids[i] : undefined)),
    weights: Object.fromEntries(Object.entries(t.tagWeights ?? {}).map(([k, v]) => [k, String(v)])),
  };
}

export function parseOptions(text: string): string[] {
  return text
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function toQuestion(d: DraftQuestion): TemplateQuestion {
  const q: TemplateQuestion = {
    id: d.id,
    code: d.code.trim(),
    text: d.text.trim(),
    type: d.type,
    role: d.role,
    tag: d.tag || null,
    key: d.key || null,
    required: d.required,
  };
  if (d.help.trim()) q.help = d.help.trim();
  if (d.type === "scale") {
    q.scaleMin = Number(d.scaleMin);
    q.scaleMax = Number(d.scaleMax);
    q.minLabel = d.minLabel.trim();
    q.maxLabel = d.maxLabel.trim();
  }
  if (isChoice(d.type)) q.options = parseOptions(d.optionsText);
  return q;
}

/** Tag có câu Điểm, theo thứ tự xuất hiện — đúng tập trọng số BE giữ lại. */
export function scoreTagsOf(questions: DraftQuestion[]): string[] {
  return [...new Set(questions.filter((q) => q.role === "score" && q.tag).map((q) => q.tag))];
}

export function toPayload(d: TemplateDraft): TemplatePayload {
  return {
    name: d.name.trim(),
    genres: d.genres,
    status: d.status,
    questions: d.questions.map(toQuestion),
    tagWeights: Object.fromEntries(scoreTagsOf(d.questions).map((t) => [t, Number(d.weights[t] ?? "1")])),
  };
}

export function nextCode(questions: DraftQuestion[]): string {
  const nums = questions.map((q) => q.code.match(/^Q(\d+)$/i)?.[1]).filter(Boolean).map(Number);
  return `Q${nums.length > 0 ? Math.max(...nums) + 1 : questions.length + 2}`;
}

export interface DraftIssues {
  form: { name?: string; genres?: string; questions?: string };
  rows: Record<string, string[]>;
  warnings: Record<string, string[]>;
  weights: Record<string, string>;
  count: number;
}

/**
 * Cùng luật với `cleanQuestions` / `saveTemplate` ở BE, thêm kiểm tra mã câu và thang điểm.
 * `tags` null (chưa tải) thì bỏ qua kiểm tra tag có trong danh sách.
 */
export function validateDraft(d: TemplateDraft, tags: TagDef[] | null, isBase: boolean): DraftIssues {
  const tagMap = tags ? new Map(tags.map((t) => [t.name, t])) : null;
  const form: DraftIssues["form"] = {};
  const rows: Record<string, string[]> = {};
  const warnings: Record<string, string[]> = {};
  const push = (target: Record<string, string[]>, uid: string, msg: string) => {
    (target[uid] ??= []).push(msg);
  };

  if (!d.name.trim()) form.name = "Cần tên template";
  if (!isBase && d.status === "active" && d.genres.length === 0) form.genres = "Template đang dùng cần gắn ít nhất một dòng game";
  if (d.questions.length === 0) form.questions = "Template cần ít nhất một câu hỏi";

  const codeCount = new Map<string, number>();
  for (const q of d.questions) {
    const c = q.code.trim().toUpperCase();
    if (c) codeCount.set(c, (codeCount.get(c) ?? 0) + 1);
  }
  const conditionByTag = new Map<string, string[]>();
  for (const q of d.questions) if (q.role === "condition" && q.tag) conditionByTag.set(q.tag, [...(conditionByTag.get(q.tag) ?? []), q.code]);

  for (const q of d.questions) {
    const code = q.code.trim();
    if (!code) push(rows, q.uid, "Thiếu mã câu");
    else if ((codeCount.get(code.toUpperCase()) ?? 0) > 1) push(rows, q.uid, `Mã câu "${code}" bị trùng`);
    if (!q.text.trim()) push(rows, q.uid, "Thiếu nội dung câu");
    if (q.role !== "other" && !q.tag) push(rows, q.uid, `Câu ${QUESTION_ROLE_LABEL[q.role]} cần tag`);
    if (q.tag && tagMap && !tagMap.has(q.tag)) push(rows, q.uid, `Tag "${q.tag}" chưa có trong danh sách tag`);
    if (q.role === "score" && q.type !== "scale") push(rows, q.uid, "Câu Điểm phải là thang điểm");
    if (q.role === "condition" && q.type !== "yes_no") push(rows, q.uid, "Câu Điều kiện phải là Có / Không");
    if (q.role === "condition" && q.tag && (conditionByTag.get(q.tag)?.length ?? 0) > 1) {
      push(rows, q.uid, `Tag "${q.tag}" có hơn một câu Điều kiện (${conditionByTag.get(q.tag)!.join(", ")})`);
    }
    if (isChoice(q.type) && parseOptions(q.optionsText).length < 2) push(rows, q.uid, "Cần ít nhất 2 lựa chọn");
    if (isChoice(q.type) && parseOptions(q.optionsText).length > 30) push(rows, q.uid, "Tối đa 30 lựa chọn");
    if (q.type === "scale") {
      const min = Number(q.scaleMin);
      const max = Number(q.scaleMax);
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max <= min || max > 10) {
        push(rows, q.uid, "Thang điểm cần số nguyên, 1 ≤ nhỏ nhất < lớn nhất ≤ 10");
      } else if (q.role === "score" && (min !== 1 || max !== 5)) {
        push(warnings, q.uid, "Report tính điểm trên thang 5 — câu Điểm nên dùng thang 1–5");
      }
    }
    if (q.role === "score" && q.tag && tagMap?.get(q.tag)?.scored === false) {
      push(warnings, q.uid, `Tag "${q.tag}" không tính điểm — câu này không được tính vào điểm tổng`);
    }
  }

  const weights: Record<string, string> = {};
  for (const t of scoreTagsOf(d.questions)) {
    const w = Number(d.weights[t] ?? "1");
    if (!Number.isFinite(w) || w <= 0) weights[t] = "Trọng số phải lớn hơn 0";
  }

  const count =
    Object.keys(form).length + Object.values(rows).reduce((s, list) => s + list.length, 0) + Object.keys(weights).length;
  return { form, rows, warnings, weights, count };
}

/** Câu Điểm / Lý do của tag có câu Điều kiện chỉ hiện khi câu Điều kiện chọn Có (giống form tester). */
export function isVisibleIn(q: DraftQuestion, questions: DraftQuestion[], answers: Record<string, "yes" | "no">): boolean {
  if (q.role !== "score" && q.role !== "reason") return true;
  const cond = questions.find((x) => x.role === "condition" && x.tag === q.tag);
  return !cond || (answers[cond.uid] ?? "yes") === "yes";
}

export function useUnsavedWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}
