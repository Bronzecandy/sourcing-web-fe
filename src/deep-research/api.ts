import { api } from "@/services/api";
import type {
  AppOverview,
  Candidates,
  FrameworkPattern,
  MappingChoice,
  MappingDto,
  MarketSummary,
  RunContext,
  RunDto,
  RunListItem,
} from "./types";

type Envelope<T> = { success: boolean; data?: T; error?: string };

export class DeepResearchApiError extends Error {}

async function unwrap<T>(p: Promise<{ data: Envelope<T> }>): Promise<T> {
  try {
    const { data } = await p;
    if (!data.success) throw new DeepResearchApiError(data.error || "Lỗi Deep Research");
    return data.data as T;
  } catch (err) {
    const res = (err as { response?: { data?: Envelope<T> } }).response?.data;
    if (res && res.success === false) throw new DeepResearchApiError(res.error || "Lỗi Deep Research");
    throw err;
  }
}

export const fetchMarketSummary = (appIds: number[]) =>
  unwrap<MarketSummary>(api.post("/deep-research/market-summary", { appIds }, { timeout: 90_000 }));

export const fetchAppOverview = (appId: number) => unwrap<AppOverview>(api.get(`/deep-research/apps/${appId}`, { timeout: 60_000 }));

export const startDeepResearch = (appId: number, ctx: RunContext | null) =>
  unwrap<RunDto>(api.post(`/deep-research/apps/${appId}/runs`, ctx ?? {}, { timeout: 60_000 }));

export const fetchRun = (id: string) => unwrap<RunDto>(api.get(`/deep-research/runs/${id}`));

export const continueDeepResearch = (id: string) => unwrap<RunDto>(api.post(`/deep-research/runs/${id}/continue`));

export const fetchRuns = (limit = 100) => unwrap<RunListItem[]>(api.get("/deep-research/runs", { params: { limit } }));

export const searchCandidates = (appId: number, q: string) =>
  unwrap<Candidates>(api.get(`/deep-research/apps/${appId}/candidates`, { params: { q }, timeout: 60_000 }));

export const saveMarketMapping = (appId: number, choice: MappingChoice) =>
  unwrap<MappingDto>(api.put(`/deep-research/apps/${appId}/mapping`, choice));

export const fetchFrameworks = () =>
  unwrap<{ version: number; metrics: Record<string, { label: string; labelEn: string; unit: string; kind: string }>; patterns: FrameworkPattern[] }>(
    api.get("/deep-research/frameworks"),
  );
