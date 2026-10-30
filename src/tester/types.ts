export type SurveyAnswers = Record<string, string | string[]>;

export interface SurveyOption {
  order: number;
  label: string;
  value: string;
  jump: number | null;
  connect: number[];
  textInput: boolean;
  exclusive: boolean;
}

export interface SurveyQuestion {
  number: number;
  code: string;
  text: string;
  type: string;
  mustAnswer: boolean;
  page: number;
  regex: string | null;
  pic: string | null;
  video: string | null;
  semanticKey: string | null;
  genreKey: string | null;
  options: SurveyOption[];
}

export interface SurveyForm {
  id: string;
  slug: string;
  version: number;
  title: string;
  introduction: string;
  questions: SurveyQuestion[];
}

export interface TesterGenreScore {
  genre: string;
  label: string;
  finalScore: number;
  volumeScore: number;
  rankScore: number;
  hasRank: boolean;
  hours: number;
  matches: number;
  anchorGame: string | null;
  bestRank: string | null;
}

export interface TesterStats {
  activeTests: number;
  activeGames: string[];
  completedTests: number;
  completedHours: number;
  earnedBenefits: number;
  /** Đã trao + đang chờ trao. */
  usedBenefits: number;
  pendingBenefits: number;
  availableBenefits: number;
}

export interface TesterProfile {
  name: string;
  office: string | null;
  team: string | null;
  ageRange: string | null;
  platforms: string[];
  gender: string | null;
  weeklyPlayLabel: string | null;
  weeklyPlayLevel: number | null;
  payLabel: string | null;
  payTier: string | null;
  testTimeLabel: string | null;
  favoriteGenre: string | null;
  favoriteGenreLabel: string | null;
  genres: string[];
  scoringStatus: "pending" | "scoring" | "scored" | "failed";
  scoredAt: string | null;
  genreScores: TesterGenreScore[];
}

export interface TesterMe {
  user: { id: string; email: string; name: string | null; avatarUrl: string | null; role: string; roles: string[] };
  canManage: boolean;
  /** Có role Sourcing đã duyệt — hiện link sang web Sourcing. */
  hasSourcing: boolean;
  profile: TesterProfile | null;
  answers: SurveyAnswers | null;
  submittedAt: string | null;
  stats: TesterStats;
}

export interface TesterTest {
  id: string;
  completed: boolean;
  completedAt: string | null;
  workloadHours: number;
  campaign: {
    id: string;
    gameName: string;
    appId: number | null;
    iconUrl?: string | null;
    genre: string | null;
    platform: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
  };
}

export interface BenefitCatalog {
  tiers: Array<{ condition: string; items: Array<{ game: string; reward: string; pic: string }> }>;
  teamRequests: Array<{ team: string; items: string[] }>;
}

export type RedemptionStatus = "pending" | "fulfilled" | "rejected" | "cancelled";

export interface BenefitRedemption {
  id: string;
  amount: number;
  item: string;
  game?: string | null;
  reward?: string | null;
  tier?: number | null;
  gameAccount: string | null;
  note: string | null;
  status: RedemptionStatus;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
}

/** Một tier quà kèm luật đổi; `lockedReason` khác null = chưa đổi được. */
export interface RedeemTier {
  index: number;
  condition: string;
  cost: number;
  monthlyLimit: number | null;
  requirement: { minGamesPerMonth?: number; minHoursPerMonth?: number } | null;
  usedThisMonth: number;
  lockedReason: string | null;
  /** `options` > 1 phần tử = tester chọn 1 phương án khi đổi. */
  items: Array<{ index: number; game: string; reward: string; options: string[]; pic: string }>;
}

export interface TesterBenefits {
  stats: TesterStats;
  /** Hoạt động tháng hiện tại (YYYY-MM). */
  month: { month: string; games: number; hours: number };
  tiers: RedeemTier[];
  teamRequests: BenefitCatalog["teamRequests"];
  redemptions: BenefitRedemption[];
  benefitHoursPerUnit: number;
}

export interface AdminRedemption extends BenefitRedemption {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  processedBy: string | null;
}

/** Game tìm được trên TapTap khi tạo đợt test. */
export interface CampaignGameOption {
  id: number;
  title: string;
  titleEn: string | null;
  iconUrl: string | null;
  tags: string[];
  tagsEn: string[];
  developer: string | null;
  platforms: string[];
  console: boolean;
  rating: string | null;
  reserveCount: number | null;
  fansCount: number | null;
  downloads: number | null;
  suggestion: {
    gameName: string;
    genre: string;
    platform: "MB" | "PC" | "CS" | null;
    mainTags: string[];
    secondaryTags: string[];
  };
}

export interface AdminTesterRow {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  roles: string[];
  /** false = có role TESTER nhưng chưa làm khảo sát */
  hasProfile: boolean;
  office: string | null;
  team: string | null;
  platforms: string[];
  favoriteGenre: string | null;
  weeklyPlayLabel: string | null;
  testTimeLabel: string | null;
  payTier: string | null;
  active: boolean;
  scoringStatus: string;
  scores: Record<string, number>;
  stats: TesterStats;
  submittedAt: string | null;
}

export interface AdminTesterDetail extends AdminTesterRow {
  answers: SurveyAnswers | null;
  genreScores: Array<TesterGenreScore & { rawText: string; source: string; matchedGames: string[] }>;
  assignments: TesterTest[];
  redemptions: BenefitRedemption[];
}

export interface TestCampaign {
  id: string;
  gameName: string;
  appId: number | null;
  iconUrl?: string | null;
  genre: string | null;
  platform: string | null;
  mainTags: string[];
  secondaryTags: string[];
  workloadHours: number;
  startDate: string | null;
  endDate: string | null;
  team: string | null;
  status: "planned" | "running" | "done" | "cancelled";
  result: "suitable" | "unsuitable" | null;
  resultNote: string | null;
  assignedCount: number;
  completedCount: number;
}

export interface CampaignAssignment {
  id: string;
  userId: string;
  name: string;
  email: string;
  workloadHours: number;
  completed: boolean;
  completedAt: string | null;
}

export interface TestCampaignDetail extends TestCampaign {
  assignments: CampaignAssignment[];
}

export interface TesterRecommendation {
  userId: string;
  name: string;
  email: string;
  score: number;
  favorite: boolean;
  platforms: string[];
  activeTests: number;
  testTimeLabel: string | null;
  assigned: boolean;
}

export interface TesterPublicInfo {
  genres: Array<{ key: string; label: string }>;
  benefitHoursPerUnit: number;
  workload: Array<{ label: string; testDays: number; hoursPerDay: number; workloadHours: number }>;
  rewards: Array<{ condition: string; items: Array<{ game: string; reward: string }> }>;
  stats: { testers: number; campaigns: number; completedTests: number };
}

export interface TesterAdminMeta {
  genres: Array<{ key: string; label: string; workloadGroup: string | null }>;
  workload: Array<{ key: string; label: string; testDays: number; hoursPerDay: number; workloadHours: number; weight: number }>;
  platforms: Array<{ key: string; label: string }>;
  benefitHoursPerUnit: number;
  catalog: BenefitCatalog;
}
