import axios from "axios";
import type {
  DashboardStats,
  GameListItem,
  GameDetail,
  GameReview,
  PotentialScore,
  BreakoutGame,
  ReserveGrowthGame,
  GamePotentialDetail,
  PotentialBreakdown,
  AiAnalysis,
  ApiResponse,
  LibraryPendingItem,
  DistributionResponse,
  DistributionMeta,
  DistributionMetric,
  DistributionLifecycleFilter,
  DistributionOverviewResponse,
  DistributionTrendsResponse,
  DistributionTab,
} from "../types";
import type { ReviewWindow } from "@/types/review-window";
import type { HistoryRange } from "@/types/history-range";
import type { AnalysisProgressUpdate } from "@/lib/analysis-stream";
import { postAnalysisStream, postCsvAnalysisStream } from "@/lib/analysis-stream";
import type { AdminMeta, AdminUserRow, AuthUser, PermissionKey, UserRole } from "@/types/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 30000,
  withCredentials: true,
});

export async function fetchAuthMe(): Promise<AuthUser> {
  const { data } = await api.get<ApiResponse<AuthUser>>("/auth/me");
  return data.data;
}

export async function logoutAuth(): Promise<void> {
  await api.post("/auth/logout");
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const { data } = await api.get<ApiResponse<AdminUserRow[]>>("/admin/users");
  return data.data;
}

export async function fetchAdminMeta(): Promise<AdminMeta> {
  const { data } = await api.get<ApiResponse<AdminMeta>>("/admin/meta");
  return data.data;
}

export async function patchAdminUser(
  id: string,
  body: {
    status?: "PENDING" | "ACTIVE";
    role?: UserRole;
    permissions?: Partial<Record<PermissionKey, boolean>>;
  },
): Promise<AdminUserRow> {
  const { data } = await api.patch<ApiResponse<AdminUserRow>>(`/admin/users/${id}`, body);
  return data.data;
}

export async function fetchDashboard(): Promise<DashboardStats> {
  const { data } = await api.get<ApiResponse<DashboardStats>>("/games/dashboard");
  return data.data;
}

export async function fetchDistributionMeta(): Promise<DistributionMeta> {
  const { data } = await api.get<ApiResponse<DistributionMeta>>("/analytics/distribution/meta");
  return data.data;
}

export async function fetchDistribution(params: {
  year: number;
  month?: number;
  metric: DistributionMetric;
  lifecycle: DistributionLifecycleFilter;
}): Promise<DistributionResponse> {
  const { data } = await api.get<ApiResponse<DistributionResponse>>("/analytics/distribution", {
    params,
  });
  return data.data;
}

export async function fetchDistributionOverview(params: {
  year?: number | null;
  month?: number;
  lifecycle: DistributionTab;
}): Promise<DistributionOverviewResponse> {
  const { data } = await api.get<ApiResponse<DistributionOverviewResponse>>(
    "/analytics/distribution/overview",
    {
      params: {
        ...params,
        year: params.year == null ? "all" : params.year,
        month: params.month,
      },
      timeout: 180_000,
    },
  );
  return data.data;
}

export async function fetchDistributionTrends(params: {
  year?: number | null;
  month?: number;
  lifecycle: DistributionTab;
}): Promise<DistributionTrendsResponse> {
  const { data } = await api.get<ApiResponse<DistributionTrendsResponse>>(
    "/analytics/distribution/overview/trends",
    {
      params: {
        ...params,
        year: params.year == null ? "all" : params.year,
        month: params.month,
      },
      timeout: 300_000,
    },
  );
  return data.data;
}

export async function fetchRankings(params: {
  page?: number;
  limit?: number;
  date?: string;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  tag?: string;
  platform?: "combined" | "android" | "ios";
  segment?: "reserve" | "launched";
}) {
  const { data } = await api.get("/games/rankings", { params });
  return data as {
    success: boolean;
    data: GameListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    date: string;
  };
}

export async function fetchDates(): Promise<string[]> {
  const { data } = await api.get<ApiResponse<string[]>>("/games/dates");
  return data.data;
}

export async function fetchTags(date?: string): Promise<Array<{ name: string; count: number }>> {
  const { data } = await api.get<ApiResponse<Array<{ name: string; count: number }>>>("/games/tags", {
    params: { date },
  });
  return data.data;
}

export type ContentLangParam = "vi" | "en";

export async function fetchGameDetail(
  appId: number,
  range: HistoryRange | number = 30,
  contentLang: ContentLangParam = "vi",
): Promise<GameDetail> {
  const params: Record<string, string | number> = { contentLang };
  if (typeof range === "number") {
    params.days = range;
  } else if (range.kind === "days") {
    params.days = range.days;
  } else {
    params.from = range.from;
    params.to = range.to;
  }
  const { data } = await api.get<ApiResponse<GameDetail>>(`/games/${appId}`, { params });
  return data.data;
}

/** Machine-translate Vietnamese UI strings to English (batched, cached on server). */
export async function translateTextsViToEn(texts: string[]): Promise<string[]> {
  const { data } = await api.post<{ success: boolean; data: string[] }>("/translate/strings", { texts }, {
    timeout: 120_000,
  });
  if (!data.success || !Array.isArray(data.data)) throw new Error("Translation failed");
  return data.data;
}

export async function fetchGameReviews(appId: number, page: number = 1, limit: number = 20) {
  const { data } = await api.get(`/games/${appId}/reviews`, {
    params: { page, limit },
  });
  return data as {
    success: boolean;
    data: GameReview[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function fetchCompareGames(appIds: number[], days?: number) {
  const { data } = await api.get("/games/compare", {
    params: { ids: appIds.join(","), days },
  });
  return data.data as GameDetail[];
}

export async function fetchPotentialScores(
  days?: number,
  platform?: "combined" | "android" | "ios",
  segment: "reserve" | "launched" = "reserve",
): Promise<PotentialScore[]> {
  const { data } = await api.get<ApiResponse<PotentialScore[]>>("/ranking/potential", {
    params: { days, platform, segment },
  });
  return data.data;
}

export async function fetchBreakoutGames(
  days?: number,
  threshold?: number,
  platform?: "combined" | "android" | "ios",
  segment: "reserve" | "launched" = "reserve",
): Promise<BreakoutGame[]> {
  const { data } = await api.get<ApiResponse<BreakoutGame[]>>("/ranking/breakout", {
    params: { days, threshold, platform, segment },
  });
  return data.data;
}

export async function fetchGamePotentialDetail(
  appId: number,
  days?: number,
  platform?: "combined" | "android" | "ios",
  segment: "reserve" | "launched" = "reserve",
): Promise<GamePotentialDetail | null> {
  const { data } = await api.get<ApiResponse<GamePotentialDetail | null>>(`/ranking/potential/${appId}`, {
    params: { days, platform, segment },
  });
  return data.data;
}

export async function fetchGamePotentialBreakdown(
  appId: number,
  days?: number,
  platform?: "combined" | "android" | "ios",
): Promise<PotentialBreakdown> {
  const { data } = await api.get<ApiResponse<PotentialBreakdown>>(`/ranking/potential/${appId}/breakdown`, {
    params: { days, platform },
  });
  return data.data;
}

export async function fetchReserveGrowth(
  days?: number,
  platform?: "combined" | "android" | "ios"
): Promise<ReserveGrowthGame[]> {
  const { data } = await api.get<ApiResponse<ReserveGrowthGame[]>>("/ranking/reserve-growth", {
    params: { days, platform },
  });
  return data.data;
}

export async function fetchAllAnalyses(): Promise<AiAnalysis[]> {
  const { data } = await api.get<ApiResponse<AiAnalysis[]>>("/analysis/all");
  return data.data;
}

export async function fetchLatestAnalysis(appId: number): Promise<AiAnalysis | null> {
  const { data } = await api.get<ApiResponse<AiAnalysis | null>>(`/analysis/${appId}`);
  return data.data;
}

export async function fetchAnalysisHistory(appId: number): Promise<AiAnalysis[]> {
  const { data } = await api.get<ApiResponse<AiAnalysis[]>>(`/analysis/${appId}/history`);
  return data.data;
}

export async function deleteAnalysis(appId: number, analyzedAt?: string): Promise<void> {
  await api.delete(`/analysis/${appId}`, { params: analyzedAt ? { analyzedAt } : undefined });
}

export async function triggerAnalysis(
  appId: number,
  reviewWindow?: ReviewWindow,
  onProgress?: (p: AnalysisProgressUpdate) => void,
): Promise<AiAnalysis> {
  if (onProgress) {
    return postAnalysisStream(
      `/analysis/analyze/${appId}`,
      { reviewWindow: reviewWindow ?? { mode: "all" } },
      onProgress,
    );
  }
  const { data } = await api.post<ApiResponse<AiAnalysis>>(
    `/analysis/analyze/${appId}`,
    { reviewWindow: reviewWindow ?? { mode: "all" } },
    { timeout: 300_000 },
  );
  return data.data;
}

export async function triggerExternalAnalysis(
  input: string,
  platform: "taptap" | "steam" = "taptap",
  reviewWindow?: ReviewWindow,
  onProgress?: (p: AnalysisProgressUpdate) => void,
): Promise<AiAnalysis> {
  if (onProgress) {
    return postAnalysisStream(
      "/analysis/analyze-external",
      { input, platform, reviewWindow: reviewWindow ?? { mode: "all" } },
      onProgress,
    );
  }
  const { data } = await api.post<ApiResponse<AiAnalysis>>(
    "/analysis/analyze-external",
    { input, platform, reviewWindow: reviewWindow ?? { mode: "all" } },
    { timeout: 600_000 },
  );
  return data.data;
}

export async function triggerCsvAnalysis(
  file: File,
  reviewWindow?: ReviewWindow,
  onProgress?: (p: AnalysisProgressUpdate) => void,
): Promise<AiAnalysis> {
  if (onProgress) {
    return postCsvAnalysisStream(file, reviewWindow ?? { mode: "all" }, onProgress);
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("reviewWindow", JSON.stringify(reviewWindow ?? { mode: "all" }));
  const { data } = await api.post<ApiResponse<AiAnalysis>>("/analysis/analyze-csv", formData, {
    timeout: 600_000,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

// —— Rubric library JSON (backend: /api/libraries) ——

export async function fetchLibraryFileList(): Promise<string[]> {
  const { data } = await api.get<{ success: boolean; data: string[] }>("/libraries/files");
  if (!data.success) throw new Error("Không tải được danh sách file thư viện");
  return data.data;
}

export async function fetchLibraryJson(id: string): Promise<unknown> {
  const { data } = await api.get<{ success: boolean; data: unknown }>(`/libraries/${encodeURIComponent(id)}`);
  if (!data.success) throw new Error("Không đọc được file thư viện");
  return data.data;
}

export async function putLibraryJson(id: string, body: unknown): Promise<void> {
  const { data } = await api.put<{ success: boolean; error?: string }>(
    `/libraries/${encodeURIComponent(id)}`,
    body,
  );
  if (!data.success) throw new Error(data.error || "Lưu thất bại");
}

export async function fetchLibraryPending(): Promise<LibraryPendingItem[]> {
  const { data } = await api.get<{ success: boolean; data: LibraryPendingItem[] }>("/libraries/pending");
  if (!data.success) throw new Error("Không tải được danh sách pending");
  return data.data;
}

export async function mergeLibraryPending(
  id: string,
  body: {
    score?: number;
    tier?: string;
    keywordsEn?: string;
    maxMb?: number;
    maxDaysSinceUpdate?: number;
    minFans?: number;
    ruleLabel?: string;
  } = {},
): Promise<void> {
  const { data } = await api.post<{ success: boolean; error?: string }>(
    `/libraries/pending/${encodeURIComponent(id)}/merge`,
    body,
  );
  if (!data.success) throw new Error(data.error || "Merge failed");
}

export async function deleteLibraryPending(id: string): Promise<void> {
  const { data } = await api.delete<{ success: boolean }>(`/libraries/pending/${encodeURIComponent(id)}`);
  if (!data.success) throw new Error("Xóa pending thất bại");
}

export async function appendLibraryStudio(input: {
  names: string[];
  score: number;
  tier?: string;
}): Promise<void> {
  const { data } = await api.post<{ success: boolean; error?: string }>("/libraries/studio", input);
  if (!data.success) throw new Error(data.error || "Thêm studio thất bại");
}

/** Append one row to a library document (immediate persist, no full PUT). */
export async function postLibraryEntry(fileId: string, body: Record<string, unknown>): Promise<void> {
  const { data } = await api.post<{ success: boolean; error?: string }>(
    `/libraries/${encodeURIComponent(fileId)}/entries`,
    body,
  );
  if (!data.success) throw new Error(data.error || "Thêm thất bại");
}
