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
  usedBenefits: number;
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

export interface TesterBenefits {
  stats: TesterStats;
  redemptions: Array<{ id: string; amount: number; item: string; note: string | null; createdAt: string }>;
  catalog: BenefitCatalog;
  benefitHoursPerUnit: number;
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
  redemptions: TesterBenefits["redemptions"];
}

export interface TestCampaign {
  id: string;
  gameName: string;
  appId: number | null;
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
