/** Payload module Test Game — mirror `be/src/services/testgame/*`. */

export type CampaignStatus = "pending" | "inviting" | "testing" | "reporting" | "done" | "cancelled";
export type AssignmentStatus = "added" | "invited" | "confirmed" | "declined" | "no_response" | "in_test" | "submitted";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type AiStatus = "queued" | "running" | "done" | "failed";
export type Decision = "drop" | "monitor" | "recommend";
export type QuestionType = "number" | "short_text" | "long_text" | "scale" | "yes_no" | "file" | "single" | "multiple";
export type QuestionRole = "score" | "reason" | "condition" | "other";
export type QuestionKey = "play_hours" | "level" | "footage" | "usp" | "improve" | "red_flag";

export type KeyLabel = { key: string; label: string };

export interface TestFileDto {
  id: string;
  kind: "guide" | "footage" | "evidence";
  fileName: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface TemplateQuestion {
  id: string;
  code: string;
  text: string;
  help?: string;
  type: QuestionType;
  role: QuestionRole;
  tag?: string | null;
  key?: QuestionKey | null;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface TagDef {
  name: string;
  scored: boolean;
  description: string;
}

export interface QuestionTemplate {
  id: string;
  name: string;
  genres: string[];
  isBase: boolean;
  status: "draft" | "active" | "retired";
  version: number;
  questions: TemplateQuestion[];
  tagWeights: Record<string, number>;
  updatedBy: string | null;
  updatedAt: string;
}

export interface BotStatus {
  /** relay = bot Apps Script nhận việc qua trạm trên VM data */
  transport: "relay" | "smtp" | null;
  drive: boolean;
  /** Bot ghé trạm trong 3 phút gần nhất */
  online?: boolean;
  account?: string | null;
  quota?: number | null;
  lastPollAt?: string | null;
  /** Việc trên trạm chưa có kết quả */
  pending?: number;
  error?: string;
}

/** queued = đã giao bot, chờ bot báo kết quả. */
export type MailStatus = "queued" | "sent" | "failed";

export interface TestGameMeta {
  genres: Array<{ key: string; label: string; workloadGroup: string | null }>;
  workload: Array<{ key: string; label: string; testDays: number; hoursPerDay: number; workloadHours: number; weight: number }>;
  platforms: string[];
  sources: KeyLabel[];
  securityLevels: Array<KeyLabel & { hint: string; testerTypes: string[] }>;
  testerTypes: KeyLabel[];
  evalFormats: KeyLabel[];
  decisions: KeyLabel[];
  mailParams: KeyLabel[];
  questionTypes: QuestionType[];
  questionRoles: QuestionRole[];
  questionKeys: QuestionKey[];
  templates: Array<Pick<QuestionTemplate, "id" | "name" | "genres" | "isBase" | "status" | "version">>;
  tags: TagDef[];
  bot: BotStatus;
}

export interface CampaignCounts {
  total: number;
  invited: number;
  active: number;
  confirmed: number;
  submitted: number;
  approved: number;
  pendingReview: number;
}

export interface CampaignSummary {
  id: string;
  gameName: string;
  originalName: string | null;
  testRound: number;
  iconUrl: string | null;
  appId: number | null;
  genre: string | null;
  mainTags: string[];
  secondaryTags: string[];
  platforms: string[];
  securityLevel: string;
  noTest: boolean;
  status: CampaignStatus;
  decision: Decision | null;
  startDate: string | null;
  endDate: string | null;
  reportDeadline: string | null;
  overdue: boolean;
  coordinatorName: string | null;
  workloadHours: number;
  counts: CampaignCounts;
  /** Theo mốc M1–M7 (không tính mail gửi thử). */
  mails: Record<string, { sent: number; failed: number }>;
  /** `date` là YYYY-MM-DD, hoặc "Khi Initiate" khi game test còn Pending. */
  nextMail: { code: string; date: string } | null;
  reportStatus: "updating" | "locked" | null;
  legacyReportUrl: string | null;
  createdAt: string;
}

export interface EvidenceCheck {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  note: string;
}

export interface EvidenceDuplicate {
  fileId: string;
  matchFileId: string;
  kind: "exact" | "identical" | "similar";
  scope: "same_test_other_tester" | "own_old_test" | "other_test";
  email: string;
  gameName: string;
  sameScreenshot?: boolean;
}

export interface EvidenceReview {
  verdict: "approve" | "review" | "reject";
  /** 0–1 */
  confidence: number;
  uid: string | null;
  level: string | null;
  progress: string | null;
  claimedHours: number | null;
  claimedLevel: string | null;
  requiredHours: number;
  checks: EvidenceCheck[];
  duplicates: EvidenceDuplicate[];
  summary: string;
  research: { brief: string; sources: string[]; grounded: boolean } | null;
  model: string;
  at: string;
}

export interface AssignmentMail {
  code: string;
  status: MailStatus;
  error: string | null;
  sentAt: string;
  trigger: "auto" | "manual" | "test";
}

export interface CampaignAssignment {
  id: string;
  email: string;
  userId: string | null;
  name: string | null;
  avatarUrl: string | null;
  testerType: string | null;
  devices: string[];
  status: AssignmentStatus;
  invitedAt: string | null;
  respondedAt: string | null;
  submittedAt: string | null;
  workloadHours: number;
  customHours: boolean;
  completed: boolean;
  completedAt: string | null;
  reviewStatus: ReviewStatus | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  aiStatus: AiStatus | null;
  /** `{ error }` khi aiStatus = failed. */
  aiReview: EvidenceReview | { error: string } | null;
  aiReviewAt: string | null;
  whitelistInfo: string | null;
  /** ok | pending (bot đang share) | lỗi share */
  driveShare: string | null;
  note: string | null;
  /** Câu trả lời questionnaire (bản nháp khi đang test, bản nộp khi đã nộp). */
  answers: Answers | null;
  busyWith: string[];
  evidence: TestFileDto[];
  footage: TestFileDto[];
  mails: AssignmentMail[];
}

export interface CampaignDetail extends CampaignSummary {
  previousId: string | null;
  developer: string | null;
  ipName: string | null;
  devStage: string | null;
  taptapUrl: string | null;
  googlePlayUrl: string | null;
  steamUrl: string | null;
  background: string | null;
  source: string | null;
  sourceLabel: string;
  requester: string | null;
  sourceDetail: string | null;
  templateId: string | null;
  template: {
    name: string;
    version: number;
    locked: boolean;
    questionCount: number;
    questions: TemplateQuestion[];
    tags: string[];
    latestVersion: number | null;
  } | null;
  evalFormat: string | null;
  hoursPerDay: number | null;
  testDays: number | null;
  focusedAt: string | null;
  focusedPlace: string | null;
  guide: string | null;
  installUrl: string | null;
  testerNote: string | null;
  accessInfo: string | null;
  footageRequired: boolean;
  apkFolderUrl: string | null;
  apkFolderError: string | null;
  /** Bot đang tạo folder Drive */
  apkFolderPending: boolean;
  coordinatorEmail: string | null;
  team: string | null;
  conclusion: string | null;
  initiatedAt: string | null;
  initiatedBy: string | null;
  seatalkStatus: "sent" | "failed" | "skipped" | null;
  seatalkError: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
  guideFiles: TestFileDto[];
  /** Trường còn thiếu trước khi Initiate (chỉ khi Pending). */
  initiateIssues: string[];
  assignments: CampaignAssignment[];
}

/** Body tạo / sửa game test (chỉ gửi trường đổi; ngày YYYY-MM-DD, focusedAt ISO). */
export interface CampaignInput {
  fromId?: string;
  gameName?: string;
  originalName?: string | null;
  appId?: string | number | null;
  iconUrl?: string | null;
  genre?: string | null;
  platforms?: string[];
  mainTags?: string[];
  secondaryTags?: string[];
  developer?: string | null;
  ipName?: string | null;
  devStage?: string | null;
  taptapUrl?: string | null;
  googlePlayUrl?: string | null;
  steamUrl?: string | null;
  background?: string | null;
  source?: string | null;
  requester?: string | null;
  sourceDetail?: string | null;
  securityLevel?: string;
  noTest?: boolean;
  templateId?: string | null;
  evalFormat?: string | null;
  hoursPerDay?: number | null;
  testDays?: number | null;
  focusedAt?: string | null;
  focusedPlace?: string | null;
  guide?: string | null;
  installUrl?: string | null;
  testerNote?: string | null;
  accessInfo?: string | null;
  footageRequired?: boolean;
  workloadHours?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  reportDeadline?: string | null;
  coordinatorName?: string | null;
  coordinatorEmail?: string | null;
  team?: string | null;
  conclusion?: string | null;
  legacyReportUrl?: string | null;
}

export interface CampaignOption {
  id: string;
  gameName: string;
  originalName: string | null;
  testRound: number;
  iconUrl: string | null;
  status: CampaignStatus;
  startDate: string | null;
}

export interface TesterRecommendation {
  userId: string;
  name: string;
  email: string;
  /** 0–100 */
  score: number;
  favorite: boolean;
  platforms: string[];
  testerType: string;
  activeTests: number;
  completedHours: number;
  testTimeLabel: string | null;
  busyWith: string[];
  assigned: boolean;
}

export interface EmailPreview {
  invalid: string[];
  duplicates: string[];
  rows: Array<{
    email: string;
    name: string | null;
    hasAccount: boolean;
    hasProfile: boolean;
    testerType: string | null;
    securityWarning: string | null;
    exists: boolean;
  }>;
}

export interface AuditEntry {
  id: string;
  actor: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface MailLogEntry {
  id: string;
  code: string;
  toEmail: string;
  subject: string;
  status: MailStatus;
  error: string | null;
  attempts: number;
  trigger: "auto" | "manual" | "test";
  sentAt: string;
}

export interface MailTemplate {
  code: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  version: number;
  updatedBy: string | null;
  updatedAt: string;
  defaultSubject?: string;
}

export interface MailPreview {
  subject: string;
  html: string;
  text: string;
  sample: boolean;
  to: string | null;
  attachments?: string[];
}

export interface ConfigLibraryRow {
  level: string;
  android: string;
  ios: string;
  pc: string;
}

export interface TestGameSettings {
  sendHour: number;
  remindAfterDays: number;
  responseDays: number;
  remindBeforeDays: number;
  senderName: string;
  senderEmail: string;
  seatalkGroupId: string;
  driveRootFolderId: string;
  evidenceMax: number;
  footageMaxMb: number;
  configLibrary: ConfigLibraryRow[];
}

export interface SchedulerRun {
  date: string;
  at: string;
  campaigns: number;
  mails: Record<string, number>;
  failed: number;
  transitions: string[];
}

/* ---------------- Report ---------------- */

export interface SectionText {
  vi: string;
  en: string;
}

export interface ReportSection {
  tag: string;
  description: string;
  scored: boolean;
  weight: number | null;
  score: number | null;
  answered: number;
  condition: { question: string; yes: number; total: number } | null;
  questions: Array<{ code: string; text: string; role: QuestionRole }>;
  summary: SectionText;
  details: Array<{ tester: number; name: string; condition: string | null; counted: boolean; scores: number[]; reasons: string[] }>;
}

export interface PlatformSpec {
  os: string;
  cpu_chip: string;
  ram: string;
  gpu: string;
  storage: string;
}

export interface ConfigRequirement {
  platforms: Array<{ platform: string; minimum: PlatformSpec; recommended: PlatformSpec; sources: string[]; note: string }>;
  grounded: boolean;
  sources: string[];
}

export interface ConfigLevel {
  overall: string;
  byPlatform: Array<{ platform: string; level: string; reason: string; inLibrary: boolean }>;
  method: "library" | "ai" | "unknown";
}

export interface ReportRun {
  id: string;
  kind: "summary" | "config";
  status: "running" | "done" | "failed";
  error: string | null;
  nSubmitted: number | null;
  createdBy: string | null;
  createdAt: string;
  finishedAt: string | null;
  savedAt: string | null;
  savedBy: string | null;
  /** summary: { sections, usp, pros, cons, conclusion, overall } · config: { requirement, level } */
  output: Record<string, unknown> | null;
}

export interface TestReport {
  campaignId: string;
  name: string;
  status: "updating" | "locked";
  lockedAt: string | null;
  lockedBy: string | null;
  template: { name: string; version: number } | null;
  info: {
    gameName: string;
    originalName: string | null;
    testRound: number;
    genre: string | null;
    mainTags: string[];
    secondaryTags: string[];
    platforms: string[];
    developer: string | null;
    ipName: string | null;
    devStage: string | null;
    taptapUrl: string | null;
    googlePlayUrl: string | null;
    steamUrl: string | null;
    iconUrl: string | null;
    /** Link phân tích AI Sourcing gần nhất (null ở trang chia sẻ). */
    aiScreening: { url: string; analyzedAt: string } | null;
    startDate: string | null;
    endDate: string | null;
    reportDeadline: string | null;
    submitted: number;
    invited: number;
  };
  config: { requirement: ConfigRequirement | null; level: ConfigLevel | null; updatedAt: string | null };
  footage: Array<TestFileDto & { tester: string }>;
  footageLinks: Array<{ url: string; tester: string }>;
  overall: number | null;
  sections: ReportSection[];
  general: { usp: string | null; pros: string | null; cons: string | null; conclusion: string | null; decision: Decision | null };
  decisionLabel: string;
  testers: Array<{ index: number; name: string; email?: string; submittedAt: string | null; reviewStatus?: ReviewStatus | null }>;
  runs: ReportRun[];
}

export interface ShareKey {
  id: string;
  key: string;
  url: string;
  label: string | null;
  createdBy: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  active: boolean;
}

/* ---------------- Tester ---------------- */

export interface TesterTestGame {
  id: string;
  status: AssignmentStatus;
  invitedAt: string | null;
  respondedAt: string | null;
  submittedAt: string | null;
  responseDeadline: string;
  canRespond: boolean;
  surveyOpen: boolean;
  surveyEditable: boolean;
  reviewStatus: ReviewStatus | null;
  reviewNote: string | null;
  completed: boolean;
  hours: number;
  whitelistInfo: string | null;
  nextAction: {
    key: "cancelled" | "respond" | "declined" | "expired" | "wait_start" | "survey" | "closed" | "approved" | "resubmit" | "rejected" | "reviewing" | "none";
    label: string;
  };
  evidenceCount: number;
  campaign: {
    id: string;
    gameName: string;
    originalName: string | null;
    testRound: number;
    iconUrl: string | null;
    genre: string | null;
    mainTags: string[];
    platforms: string[];
    status: CampaignStatus;
    startDate: string | null;
    endDate: string | null;
    evalFormat: string;
    hoursPerDay: number | null;
    testDays: number | null;
    focusedAt: string | null;
    focusedPlace: string | null;
    background: string | null;
    taptapUrl: string | null;
    coordinatorName: string | null;
    coordinatorEmail: string | null;
    footageRequired: boolean;
    /** Các trường dưới chỉ có khi tester đã xác nhận tham gia. */
    guide: string | null;
    testerNote: string | null;
    apkFolderUrl: string | null;
    installUrl: string | null;
    accessInfo: string | null;
    guideFiles: TestFileDto[];
  };
}

export type AnswerValue = string | number | string[] | null;
export type Answers = Record<string, AnswerValue>;

export interface TesterSurveyForm {
  assignment: TesterTestGame;
  questions: TemplateQuestion[];
  tags: TagDef[];
  answers: Answers;
  /** Lần lưu câu trả lời gần nhất trên hệ thống (nháp hoặc nộp). */
  answersUpdatedAt: string | null;
  evidence: TestFileDto[];
  footage: TestFileDto[];
  evidenceMax: number;
  footageMaxMb: number;
  open: boolean;
  editable: boolean;
  locked: boolean;
}
