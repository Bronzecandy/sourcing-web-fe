import { api } from "@/services/api";
import { TesterApiError } from "@/tester/api";
import type {
  Answers,
  AuditEntry,
  BotStatus,
  CampaignDetail,
  CampaignInput,
  CampaignOption,
  CampaignSummary,
  EmailPreview,
  MailLogEntry,
  MailPreview,
  MailTemplate,
  QuestionTemplate,
  SchedulerRun,
  ShareKey,
  TagDef,
  TestFileDto,
  TestGameMeta,
  TestGameSettings,
  TesterRecommendation,
  TesterSurveyForm,
  TesterTestGame,
  TestReport,
} from "./types";

type Envelope<T> = { success: boolean; data?: T; error?: string; issues?: string[] };

/** Lỗi API kèm `issues` (danh sách trường thiếu / câu chưa trả lời) — dùng chung class với Tester Program. */
async function unwrap<T>(p: Promise<{ data: Envelope<T> }>): Promise<T> {
  try {
    const { data } = await p;
    if (!data.success) throw new TesterApiError(data.error || "Lỗi Test Game", data.issues ?? []);
    return data.data as T;
  } catch (err) {
    const response = (err as { response?: { status?: number; data?: Envelope<T> } }).response;
    const res = response?.data;
    if (res && res.success === false) throw new TesterApiError(res.error || "Lỗi Test Game", res.issues ?? [], response?.status);
    throw err;
  }
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

/** URL xem tệp (ảnh bằng chứng, footage, tệp hướng dẫn) — cookie đăng nhập đi kèm. */
export function testFileUrl(fileId: string, download = false): string {
  return `${apiBase}/testgame/files/${fileId}${download ? "?download=1" : ""}`;
}

export function sharedFileUrl(key: string, fileId: string): string {
  return `${apiBase}/testgame/share/${encodeURIComponent(key)}/files/${fileId}`;
}

async function downloadBlob(path: string, fallbackName: string): Promise<void> {
  const res = await api.get(path, { responseType: "blob" });
  const header = String(res.headers["content-disposition"] ?? "");
  const star = header.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  const name = star ? decodeURIComponent(star) : header.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function upload<T>(path: string, file: File, onProgress?: (pct: number) => void): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  return unwrap<T>(
    api.post(path, form, {
      timeout: 15 * 60_000,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }),
  );
}

const A = "/testgame/admin";

export const testGameAdminApi = {
  meta: () => unwrap<TestGameMeta>(api.get(`${A}/meta`)),

  campaigns: (query: { q?: string; status?: string; genre?: string } = {}) =>
    unwrap<CampaignSummary[]>(api.get(`${A}/campaigns`, { params: query })),
  campaignOptions: (q: string) => unwrap<CampaignOption[]>(api.get(`${A}/campaign-options`, { params: { q } })),
  campaign: (id: string) => unwrap<CampaignDetail>(api.get(`${A}/campaigns/${id}`)),
  createCampaign: (body: CampaignInput) => unwrap<CampaignDetail>(api.post(`${A}/campaigns`, body)),
  updateCampaign: (id: string, body: CampaignInput) => unwrap<CampaignDetail>(api.patch(`${A}/campaigns/${id}`, body)),
  deleteCampaign: (id: string) => unwrap<{ deleted: boolean }>(api.delete(`${A}/campaigns/${id}`)),
  /** Lỗi thiếu trường: TesterApiError.issues. */
  initiate: (id: string) => unwrap<CampaignDetail>(api.post(`${A}/campaigns/${id}/initiate`, {})),
  cancel: (id: string) => unwrap<CampaignDetail>(api.post(`${A}/campaigns/${id}/cancel`, {})),
  reopen: (id: string) => unwrap<CampaignDetail>(api.post(`${A}/campaigns/${id}/reopen`, {})),
  finishNoTest: (id: string, body: { decision: string | null; conclusion?: string | null }) =>
    unwrap<CampaignDetail>(api.post(`${A}/campaigns/${id}/finish`, body)),
  retryDriveFolder: (id: string) => unwrap<CampaignDetail>(api.post(`${A}/campaigns/${id}/drive-folder`, {})),
  resendSeaTalk: (id: string) => unwrap<CampaignDetail>(api.post(`${A}/campaigns/${id}/seatalk`, {})),
  audit: (id: string) => unwrap<{ actions: AuditEntry[]; mails: MailLogEntry[] }>(api.get(`${A}/campaigns/${id}/audit`)),

  uploadGuideFile: (id: string, file: File, onProgress?: (pct: number) => void) =>
    upload<TestFileDto>(`${A}/campaigns/${id}/guide-files`, file, onProgress),
  deleteFile: (fileId: string) => unwrap<{ deleted: boolean }>(api.delete(`${A}/files/${fileId}`)),

  recommend: (id: string, opts: { limit?: number; platformFilter?: boolean; securityFilter?: boolean } = {}) =>
    unwrap<TesterRecommendation[]>(
      api.get(`${A}/campaigns/${id}/recommend`, {
        params: {
          limit: opts.limit ?? 10,
          platform: opts.platformFilter === false ? "0" : "1",
          security: opts.securityFilter === false ? "0" : "1",
        },
      }),
    ),
  previewEmails: (id: string, emails: string) => unwrap<EmailPreview>(api.post(`${A}/campaigns/${id}/emails/preview`, { emails })),
  /** `invite: true` gửi M1 ngay nếu game test đã Initiate. */
  addTesters: (id: string, body: { emails?: string | string[]; userIds?: string[]; invite?: boolean }) =>
    unwrap<{ added: number; invalid: string[]; skipped: number; detail: CampaignDetail }>(api.post(`${A}/campaigns/${id}/testers`, body)),
  inviteAdded: (id: string) => unwrap<CampaignDetail>(api.post(`${A}/campaigns/${id}/invite`, {})),
  approveRecommended: (id: string) =>
    unwrap<{ approved: number; detail: CampaignDetail }>(api.post(`${A}/campaigns/${id}/approve-recommended`, {})),

  updateAssignment: (
    assignmentId: string,
    body: { email?: string; note?: string | null; whitelistInfo?: string | null; workloadHours?: number | null; status?: "confirmed" | "declined" | "no_response" | "in_test" },
  ) => unwrap<CampaignDetail>(api.patch(`${A}/assignments/${assignmentId}`, body)),
  removeAssignment: (assignmentId: string) => unwrap<CampaignDetail>(api.delete(`${A}/assignments/${assignmentId}`)),
  /** reject cần `note`; approve có thể chỉnh số giờ được tính. */
  review: (assignmentId: string, body: { decision: "approve" | "reject" | "reset"; note?: string; workloadHours?: number | null }) =>
    unwrap<CampaignDetail>(api.post(`${A}/assignments/${assignmentId}/review`, body)),
  rerunAiReview: (assignmentId: string) => unwrap<CampaignDetail>(api.post(`${A}/assignments/${assignmentId}/ai-review`, {})),
  resendMail: (assignmentId: string, code: string) => unwrap<CampaignDetail>(api.post(`${A}/assignments/${assignmentId}/resend`, { code })),

  mailPreview: (body: { code: string; campaignId?: string | null; assignmentId?: string | null; subject?: string; body?: string }) =>
    unwrap<MailPreview>(api.post(`${A}/mail-preview`, body)),
  /** Gửi thử về email của Admin đang đăng nhập, điền dữ liệu của tester `assignmentId` (mặc định tester đầu tiên). */
  mailTest: (id: string, code: string, assignmentId?: string | null) =>
    unwrap<{ sent: boolean; queued: boolean }>(api.post(`${A}/campaigns/${id}/mail-test`, { code, assignmentId: assignmentId || null })),
  mailTemplates: () => unwrap<MailTemplate[]>(api.get(`${A}/mail-templates`)),
  saveMailTemplate: (code: string, body: { subject?: string; body?: string; enabled?: boolean; reset?: boolean }) =>
    unwrap<MailTemplate>(api.patch(`${A}/mail-templates/${code}`, body)),

  templates: () => unwrap<QuestionTemplate[]>(api.get(`${A}/templates`)),
  template: (id: string) => unwrap<QuestionTemplate>(api.get(`${A}/templates/${id}`)),
  /** Không có `id` = tạo mới. Lỗi validate: TesterApiError.issues. */
  saveTemplate: (body: Partial<QuestionTemplate>) => unwrap<QuestionTemplate>(api.post(`${A}/templates`, body)),
  cloneTemplate: (body: { fromId?: string; name?: string; genres?: string[] }) => unwrap<QuestionTemplate>(api.post(`${A}/templates/clone`, body)),
  deleteTemplate: (id: string) => unwrap<{ deleted: boolean; retired: boolean }>(api.delete(`${A}/templates/${id}`)),
  tags: () => unwrap<TagDef[]>(api.get(`${A}/tags`)),
  saveTag: (body: TagDef) => unwrap<TagDef[]>(api.post(`${A}/tags`, body)),
  deleteTag: (name: string) => unwrap<TagDef[]>(api.delete(`${A}/tags/${encodeURIComponent(name)}`)),

  settings: () => unwrap<{ settings: TestGameSettings; bot: BotStatus; scheduler: SchedulerRun | null }>(api.get(`${A}/settings`)),
  saveSettings: (body: Partial<TestGameSettings>) => unwrap<TestGameSettings>(api.patch(`${A}/settings`, body)),
  runScheduler: () => unwrap<SchedulerRun>(api.post(`${A}/scheduler/run`, {}, { timeout: 5 * 60_000 })),

  report: (id: string) => unwrap<TestReport>(api.get(`${A}/campaigns/${id}/report`)),
  updateReport: (
    id: string,
    body: Partial<{ sections: Record<string, { vi?: string; en?: string }>; usp: string; pros: string; cons: string; conclusion: string; decision: string | null }>,
  ) => unwrap<TestReport>(api.patch(`${A}/campaigns/${id}/report`, body)),
  /** Chạy nền AI-01 → AI-05 → AI-02; theo dõi qua `report.runs`. */
  summarize: (id: string) => unwrap<TestReport>(api.post(`${A}/campaigns/${id}/report/summarize`, {})),
  saveRun: (id: string, runId: string, parts?: Array<"sections" | "general">) =>
    unwrap<TestReport>(api.post(`${A}/campaigns/${id}/report/runs/${runId}/save`, parts ? { parts } : {})),
  runConfig: (id: string) => unwrap<{ runId: string }>(api.post(`${A}/campaigns/${id}/report/config`, {})),
  lockReport: (id: string) => unwrap<TestReport>(api.post(`${A}/campaigns/${id}/report/lock`, {})),
  unlockReport: (id: string) => unwrap<TestReport>(api.post(`${A}/campaigns/${id}/report/unlock`, {})),
  shareKeys: (id: string) => unwrap<ShareKey[]>(api.get(`${A}/campaigns/${id}/share`)),
  createShareKey: (id: string, body: { label?: string; expiresInDays?: number | null }) =>
    unwrap<ShareKey[]>(api.post(`${A}/campaigns/${id}/share`, body)),
  revokeShareKey: (id: string, shareId: string) => unwrap<ShareKey[]>(api.delete(`${A}/campaigns/${id}/share/${shareId}`)),
  exportReport: (id: string) => downloadBlob(`${A}/campaigns/${id}/export`, "Test report.xlsx"),

  testerSchedule: (email: string) =>
    unwrap<
      Array<{
        id: string;
        status: string;
        reviewStatus: string | null;
        completed: boolean;
        hours: number;
        campaign: { id: string; gameName: string; status: string; startDate: string | null; endDate: string | null; workloadHours: number };
      }>
    >(api.get(`${A}/testers/${encodeURIComponent(email)}/schedule`)),
  setTesterType: (userId: string, testerType: string | null) =>
    unwrap<{ userId: string; testerType: string | null }>(api.patch(`${A}/testers/${userId}/type`, { testerType })),
};

export const testGameApi = {
  tests: () => unwrap<TesterTestGame[]>(api.get("/testgame/tests")),
  test: (id: string) => unwrap<TesterTestGame>(api.get(`/testgame/tests/${id}`)),
  respond: (id: string, body: { action: "confirm" | "decline"; whitelistInfo?: string }) =>
    unwrap<TesterTestGame>(api.post(`/testgame/tests/${id}/respond`, body)),
  survey: (id: string) => unwrap<TesterSurveyForm>(api.get(`/testgame/tests/${id}/survey`)),
  /** `submit: false` = lưu nháp. Nộp thiếu: TesterApiError.issues. */
  saveSurvey: (id: string, answers: Answers, submit: boolean) =>
    unwrap<TesterSurveyForm>(api.post(`/testgame/tests/${id}/survey`, { answers, submit })),
  uploadFile: (id: string, kind: "evidence" | "footage", file: File, onProgress?: (pct: number) => void) =>
    upload<TestFileDto>(`/testgame/tests/${id}/files?kind=${kind}`, file, onProgress),
  deleteFile: (fileId: string) => unwrap<{ deleted: boolean }>(api.delete(`/testgame/files/${fileId}`)),
};

export const testGameShareApi = {
  report: (key: string) => unwrap<TestReport>(api.get(`/testgame/share/${encodeURIComponent(key)}`)),
};
