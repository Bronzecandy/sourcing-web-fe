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
  AiAnalysis,
  ApiResponse,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

export async function fetchDashboard(): Promise<DashboardStats> {
  const { data } = await api.get<ApiResponse<DashboardStats>>("/games/dashboard");
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

export async function fetchGameDetail(appId: number, days?: number): Promise<GameDetail> {
  const { data } = await api.get<ApiResponse<GameDetail>>(`/games/${appId}`, {
    params: { days },
  });
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
  platform?: "combined" | "android" | "ios"
): Promise<PotentialScore[]> {
  const { data } = await api.get<ApiResponse<PotentialScore[]>>("/ranking/potential", {
    params: { days, platform },
  });
  return data.data;
}

export async function fetchBreakoutGames(
  days?: number,
  threshold?: number,
  platform?: "combined" | "android" | "ios"
): Promise<BreakoutGame[]> {
  const { data } = await api.get<ApiResponse<BreakoutGame[]>>("/ranking/breakout", {
    params: { days, threshold, platform },
  });
  return data.data;
}

export async function fetchGamePotentialDetail(
  appId: number,
  days?: number,
  platform?: "combined" | "android" | "ios"
): Promise<GamePotentialDetail | null> {
  const { data } = await api.get<ApiResponse<GamePotentialDetail | null>>(`/ranking/potential/${appId}`, {
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

export async function triggerAnalysis(appId: number): Promise<AiAnalysis> {
  const { data } = await api.post<ApiResponse<AiAnalysis>>(`/analysis/analyze/${appId}`, null, {
    timeout: 300_000,
  });
  return data.data;
}

export async function triggerExternalAnalysis(input: string): Promise<AiAnalysis> {
  const { data } = await api.post<ApiResponse<AiAnalysis>>("/analysis/analyze-external", { input }, {
    timeout: 600_000,
  });
  return data.data;
}
