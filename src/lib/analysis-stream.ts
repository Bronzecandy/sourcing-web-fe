import type { AiAnalysis } from "@/types";

export type AnalysisProgressDetail = {
  collected?: number;
  total?: number;
  step?: number;
  stepTotal?: number;
  capped?: boolean;
};

export type AnalysisProgressUpdate = {
  type: "progress";
  phase: string;
  message: string;
  percent: number;
  detail?: AnalysisProgressDetail;
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

  try {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/network error|failed to fetch|load failed|err_incomplete/i.test(msg)) {
      throw new Error(
        "Mất kết nối với server trong lúc phân tích (proxy timeout hoặc warm-up Phase 3 tranh pool DB). " +
          "Trên server: SKIP_WARMUP=1 khi test AI; tăng proxy_read_timeout 600s nếu có nginx.",
      );
    }
    throw err;
  }
}

export async function postAnalysisStream(
  path: string,
  body: unknown,
  onProgress: (p: AnalysisProgressUpdate) => void,
): Promise<AiAnalysis> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...(body as object), stream: true }),
  });
  return readNdjsonStream<AiAnalysis>(res, onProgress);
}

export async function postCsvAnalysisStream(
  file: File,
  reviewWindow: unknown,
  onProgress: (p: AnalysisProgressUpdate) => void,
  genrePacks?: Array<{ packId: string; weight: number }>,
): Promise<AiAnalysis> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("reviewWindow", JSON.stringify(reviewWindow ?? { mode: "all" }));
  formData.append("stream", "true");
  if (genrePacks?.length) {
    formData.append("genrePacks", JSON.stringify(genrePacks));
  }

  const res = await fetch(`${API_BASE}/analysis/analyze-csv`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return readNdjsonStream<AiAnalysis>(res, onProgress);
}
