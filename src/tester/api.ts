import { api } from "@/services/api";
import type {
  AdminRedemption,
  AdminTesterDetail,
  AdminTesterRow,
  CampaignGameOption,
  SurveyAnswers,
  SurveyForm,
  TestCampaign,
  TestCampaignDetail,
  TesterAdminMeta,
  TesterBenefits,
  TesterMe,
  TesterPublicInfo,
  TesterRecommendation,
  TesterTest,
} from "./types";

type Envelope<T> = { success: boolean; data?: T; error?: string; issues?: string[] };

export class TesterApiError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.issues = issues;
  }
}

async function unwrap<T>(p: Promise<{ data: Envelope<T> }>): Promise<T> {
  try {
    const { data } = await p;
    if (!data.success) throw new TesterApiError(data.error || "Lỗi Tester Program", data.issues ?? []);
    return data.data as T;
  } catch (err) {
    const res = (err as { response?: { data?: Envelope<T> } }).response?.data;
    if (res && res.success === false) throw new TesterApiError(res.error || "Lỗi Tester Program", res.issues ?? []);
    throw err;
  }
}

export const testerApi = {
  publicInfo: () => unwrap<TesterPublicInfo>(api.get("/tester/public")),
  me: () => unwrap<TesterMe>(api.get("/tester/me")),
  survey: () => unwrap<SurveyForm>(api.get("/tester/survey")),
  submitSurvey: (answers: SurveyAnswers, startedAt: string) =>
    unwrap<TesterMe>(api.post("/tester/survey", { answers, startedAt, device: navigator.userAgent.includes("Mobile") ? "mobile" : "pc" })),
  tests: () => unwrap<TesterTest[]>(api.get("/tester/tests")),
  benefits: () => unwrap<TesterBenefits>(api.get("/tester/benefits")),
  redeem: (body: { tier: number; item: number; option?: number; gameAccount: string; note?: string }) =>
    unwrap<TesterBenefits>(api.post("/tester/benefits/redeem", body)),
  cancelRedemption: (id: string) => unwrap<TesterBenefits>(api.post(`/tester/benefits/${id}/cancel`, {})),

  adminMeta: () => unwrap<TesterAdminMeta>(api.get("/tester/admin/meta")),
  adminTesters: () => unwrap<AdminTesterRow[]>(api.get("/tester/admin/testers")),
  adminTester: (userId: string) => unwrap<AdminTesterDetail>(api.get(`/tester/admin/testers/${userId}`)),
  adminUpdateTester: (userId: string, body: { active?: boolean }) =>
    unwrap<AdminTesterRow>(api.patch(`/tester/admin/testers/${userId}`, body)),
  adminRescore: (userId: string) => unwrap<{ queued: boolean }>(api.post(`/tester/admin/testers/${userId}/rescore`, {})),
  adminCampaigns: () => unwrap<TestCampaign[]>(api.get("/tester/admin/campaigns")),
  adminCampaign: (id: string) => unwrap<TestCampaignDetail>(api.get(`/tester/admin/campaigns/${id}`)),
  adminSaveCampaign: (body: Partial<TestCampaign> & { id?: string }) =>
    body.id
      ? unwrap<TestCampaign>(api.patch(`/tester/admin/campaigns/${body.id}`, body))
      : unwrap<TestCampaign>(api.post("/tester/admin/campaigns", body)),
  adminDeleteCampaign: (id: string) => unwrap<{ deleted: boolean }>(api.delete(`/tester/admin/campaigns/${id}`)),
  adminRecommend: (id: string, opts: { limit?: number; platformFilter?: boolean } = {}) =>
    unwrap<TesterRecommendation[]>(
      api.get(`/tester/admin/campaigns/${id}/recommend`, {
        params: { limit: opts.limit ?? 7, platform: opts.platformFilter === false ? "0" : "1" },
      }),
    ),
  adminAssign: (id: string, userIds: string[]) =>
    unwrap<TestCampaignDetail>(api.post(`/tester/admin/campaigns/${id}/assignments`, { userIds })),
  adminUpdateAssignment: (assignmentId: string, body: { completed?: boolean; workloadHours?: number | null }) =>
    unwrap<{ id: string }>(api.patch(`/tester/admin/assignments/${assignmentId}`, body)),
  adminRemoveAssignment: (assignmentId: string) =>
    unwrap<{ deleted: boolean }>(api.delete(`/tester/admin/assignments/${assignmentId}`)),
  adminTapTapSearch: (q: string) =>
    unwrap<CampaignGameOption[]>(api.get("/tester/admin/taptap-search", { params: { q } })),
  adminRedemptions: (status: "pending" | "fulfilled" | "closed" | "all") =>
    unwrap<{ counts: Record<string, number>; items: AdminRedemption[] }>(
      api.get("/tester/admin/redemptions", { params: { status } }),
    ),
  adminProcessRedemption: (id: string, body: { status: "fulfilled" | "rejected"; adminNote?: string }) =>
    unwrap<{ id: string; status: string }>(api.patch(`/tester/admin/redemptions/${id}`, body)),
  adminSurveyReport: () =>
    unwrap<{ form: SurveyForm; report: { errors: string[]; warnings: string[]; placeholders: string[] }; responses: number }>(
      api.get("/tester/admin/survey"),
    ),
  adminExport: async (): Promise<void> => {
    const res = await api.get("/tester/admin/export", { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    const header = String(res.headers["content-disposition"] ?? "");
    a.href = url;
    a.download = header.match(/filename="([^"]+)"/)?.[1] ?? "Tester Program.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  },
};
