import type { AiAnalysis } from "@/types";

export type AnalysisProgressUpdate = {
  type: "progress";
  phase: string;
  message: string;
  percent: number;
};

type DoneLine =
  | { type: "done"; success: true; data: AiAnalysis }
  | { type: "done"; success: false; error: string };

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function readNdjsonStream<T>(
  response: Response,
  onProgress: (p: AnalysisProgressUpdate) => void,
): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const obj = JSON.parse(trimmed) as AnalysisProgressUpdate | DoneLine;
      if (obj.type === "progress") {
        onProgress(obj);
      } else if (obj.type === "done") {
        if (!obj.success) throw new Error(obj.error || "Analysis failed");
        return obj.data as T;
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    const obj = JSON.parse(tail) as DoneLine;
    if (obj.type === "done") {
      if (!obj.success) throw new Error(obj.error || "Analysis failed");
      return obj.data as T;
    }
  }

  throw new Error("Kết thúc luồng không hợp lệ — thử lại.");
}

export async function postAnalysisStream(
  path: string,
  body: unknown,
  onProgress: (p: AnalysisProgressUpdate) => void,
): Promise<AiAnalysis> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(body as object), stream: true }),
  });
  return readNdjsonStream<AiAnalysis>(res, onProgress);
}

export async function postCsvAnalysisStream(
  file: File,
  reviewWindow: unknown,
  onProgress: (p: AnalysisProgressUpdate) => void,
): Promise<AiAnalysis> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("reviewWindow", JSON.stringify(reviewWindow ?? { mode: "all" }));
  formData.append("stream", "true");

  const res = await fetch(`${API_BASE}/analysis/analyze-csv`, {
    method: "POST",
    body: formData,
  });
  return readNdjsonStream<AiAnalysis>(res, onProgress);
}
