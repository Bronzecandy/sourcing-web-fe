import type { SurveyAnswers, SurveyForm, SurveyQuestion } from "./types";

export type StepId = "basic" | "genres" | "prefs";

export const STEPS: Array<{ id: StepId; title: string; description: string }> = [
  { id: "basic", title: "Thông tin cơ bản", description: "Bạn là ai và thường chơi game thế nào" },
  { id: "genres", title: "Dòng game bạn chơi", description: "Chọn dòng game, rồi ghi tựa game kèm số giờ/trận và rank" },
  { id: "prefs", title: "Sở thích và thời gian test", description: "Dòng game thích nhất và thời gian bạn có thể hỗ trợ" },
];

const BASIC = new Set(["name", "office", "team", "age", "platforms", "gender", "weekly_play"]);
const GENRES = new Set(["genres", "genre_detail", "other_games"]);

export function stepOf(q: SurveyQuestion): StepId {
  if (q.semanticKey && BASIC.has(q.semanticKey)) return "basic";
  if (q.semanticKey && GENRES.has(q.semanticKey)) return "genres";
  return "prefs";
}

export function values(answer: string | string[] | undefined): string[] {
  if (answer == null) return [];
  return (Array.isArray(answer) ? answer : [answer]).filter((v) => v.trim() !== "");
}

/** Giống BE: câu bị CONNECT chỉ hiện khi đáp án mở nó được chọn; bỏ câu trong vùng JUMP. */
export function visibleNumbers(form: SurveyForm, answers: SurveyAnswers): Set<number> {
  const connected = new Set<number>();
  for (const q of form.questions) for (const o of q.options) for (const n of o.connect) connected.add(n);
  const visible = new Set(form.questions.filter((q) => !connected.has(q.number)).map((q) => q.number));
  const skipped = new Set<number>();
  for (const q of form.questions) {
    const chosen = values(answers[q.code]);
    for (const o of q.options) {
      if (!chosen.includes(o.value)) continue;
      for (const n of o.connect) visible.add(n);
      if (o.jump) for (const other of form.questions) if (other.number > q.number && other.number < o.jump) skipped.add(other.number);
    }
  }
  for (const n of skipped) visible.delete(n);
  return visible;
}

export function questionErrors(questions: SurveyQuestion[], answers: SurveyAnswers, visible: Set<number>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const q of questions) {
    if (!visible.has(q.number)) continue;
    const v = values(answers[q.code]);
    if (v.length === 0) {
      if (q.mustAnswer) errors[q.code] = "Vui lòng trả lời câu này";
      continue;
    }
    if (q.type === "text_num" && v.some((x) => !Number.isFinite(Number(x)))) errors[q.code] = "Cần nhập số";
  }
  return errors;
}

/** Tách tiêu đề và phần "Ví dụ" trong nội dung câu hỏi. */
export function splitExample(text: string): { title: string; example: string | null } {
  const idx = text.search(/Ví dụ\s*:/i);
  if (idx === -1) {
    const dash = text.indexOf("- ");
    if (text.includes("giờ") && dash > 40) return { title: text.slice(0, dash).trim(), example: text.slice(dash).trim() };
    return { title: text, example: null };
  }
  return { title: text.slice(0, idx).trim(), example: text.slice(idx).replace(/^Ví dụ\s*:\s*/i, "").trim() };
}

export interface GameRow {
  game: string;
  amount: string;
  unit: "giờ" | "trận";
  rank: string;
}

export const EMPTY_ROW: GameRow = { game: "", amount: "", unit: "giờ", rank: "" };

/** Định dạng chấm điểm đang dùng: "- Tên game - 200 giờ - Rank". */
export function serializeRows(rows: GameRow[]): string {
  return rows
    .filter((r) => r.game.trim())
    .map((r) => {
      const parts = [r.game.trim()];
      if (r.amount.trim()) parts.push(`${r.amount.trim()} ${r.unit}`);
      if (r.rank.trim()) parts.push(r.rank.trim());
      return `- ${parts.join(" - ")}`;
    })
    .join("\n");
}

export function parseRows(stored: string | string[] | undefined, text: string | string[] | undefined): GameRow[] | null {
  if (typeof stored === "string" && stored.trim()) {
    try {
      const rows = JSON.parse(stored) as GameRow[];
      if (Array.isArray(rows)) return rows.map((r) => ({ ...EMPTY_ROW, ...r }));
    } catch {
      // fall through
    }
  }
  const raw = values(text).join("\n").trim();
  if (!raw) return [];
  const rows: GameRow[] = [];
  for (const line of raw.split(/\n|;/)) {
    const parts = line.replace(/^[-*•\s]+/, "").split(/\s+-\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    const amount = parts[1]?.match(/(\d[\d.,]*)\s*(giờ|h|tiếng|trận)?/i);
    if (parts.length > 3 || (parts[1] && !amount)) return null;
    rows.push({
      game: parts[0]!,
      amount: amount?.[1]?.replace(/[.,]/g, "") ?? "",
      unit: amount?.[2] && /trận/i.test(amount[2]) ? "trận" : "giờ",
      rank: parts[2] ?? "",
    });
  }
  return rows;
}
