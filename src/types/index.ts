export interface GameListItem {
  appId: number;
  title: string;
  iconUrl: string | null;
  androidRank: number | null;
  iosRank: number | null;
  rating: string | null;
  reviewCount: number | null;
  fansCount: number | null;
  reserveCount: number | null;
  tags: string[];
  isExclusive: boolean;
  editorChoice: boolean;
}

export interface GameDetail {
  appId: number;
  title: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  developerNote: string | null;
  tags: string[];
  rating: string | null;
  latestScore: string | null;
  voteInfo: Record<string, number> | null;
  reviewCount: number | null;
  fansCount: number | null;
  reserveCount: number | null;
  hitsTotal: number | null;
  isExclusive: boolean;
  editorChoice: boolean;
  screenshots: string[];
  platforms: string[];
  androidRank: number | null;
  iosRank: number | null;
  actualReviewCount: number;
  reviewDistribution: Record<string, number>;
  history: Array<{
    date: string;
    androidRank: number | null;
    iosRank: number | null;
    rating: string | null;
    reviewCount: number | null;
    fansCount: number | null;
    reserveCount: number | null;
  }>;
}

export interface GameReview {
  id: number;
  reviewId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  score: number | null;
  upsCount: number;
  commentCount: number;
  reviewAt: string | null;
}

export interface PotentialScore {
  appId: number;
  title: string;
  iconUrl: string | null;
  momentumScore: number;
  engagementScore: number;
  stabilityScore: number;
  dataConfidence: number;
  compositeScore: number;
  currentRank: number | null;
  androidRank: number | null;
  iosRank: number | null;
  rating: string | null;
  fansCount: number | null;
  trend: "up" | "down" | "stable";
}

export interface BreakoutGame {
  appId: number;
  title: string;
  iconUrl: string | null;
  startRank: number;
  currentRank: number;
  improvement: number;
  daysTracked: number;
}

export interface ReserveGrowthGame {
  appId: number;
  title: string;
  iconUrl: string | null;
  startReserve: number;
  currentReserve: number;
  growth: number;
  growthRate: number;
  currentRank: number | null;
  daysTracked: number;
}

export interface AIFeedbackItem {
  point: string;
  mentionRate: number;
  tier: "frequent" | "moderate" | "rare";
}

export interface SentimentCriterion {
  score: number;
  reasoning: string;
}

export interface SentimentBreakdown {
  ratingDistribution: SentimentCriterion;
  textSentiment: SentimentCriterion;
  issueSeverity: SentimentCriterion;
  trendMomentum: SentimentCriterion;
  formula: string;
}

export type RubricScoreSource = "library" | "llm" | "merged";

export type RedFlagSeverity = "none" | "low" | "medium" | "high";

export interface RubricCriterionOutput {
  id: string;
  partId: string;
  elementVi: string;
  input: string;
  weightInPart: number;
  score: number | null;
  severity?: RedFlagSeverity | null;
  /** Red Flag: Có / Không / chưa rõ — thay cho ô điểm số */
  flagPresent?: boolean | null;
  reasoning?: string;
  mentionCount?: number;
  strengths?: string[];
  weaknesses?: string[];
  source: RubricScoreSource;
  confidence?: "high" | "medium" | "low";
  matchedLibraryKey?: string;
}

export interface RubricRedFlagBlock {
  politics?: boolean | null;
  casino?: boolean | null;
  religionSensitive?: boolean | null;
  violenceSeverity?: RedFlagSeverity | null;
  sexualSeverity?: RedFlagSeverity | null;
  violenceScore?: number | null;
  sexualScore?: number | null;
  otherTaboosNote?: string | null;
}

export interface RedFlagsChecklist {
  politics: boolean | null;
  religion: boolean | null;
  casino: boolean | null;
  violenceConcern: boolean | null;
  sexualConcern: boolean | null;
}

export interface RedFlagAtAGlance {
  headlineVi: string;
  riskLevel: "clear" | "low" | "medium" | "high" | "critical";
  blockedByHardGate: boolean;
  hasElevatedRisk: boolean;
  politics: boolean | null;
  religion: boolean | null;
  casino: boolean | null;
  violenceSeverity: RedFlagSeverity | null;
  sexualSeverity: RedFlagSeverity | null;
  otherTaboosNote?: string | null;
}

export interface RubricPartRollup {
  partId: string;
  labelVi: string;
  weightInTotal: number;
  manifestWeightInTotal?: number;
  partAverageScore: number | null;
  scoredWeightSumInPart: number;
  includedInGlobalScore: boolean;
  numeratorContribution: number | null;
}

/** Quyết định thử nghiệm từ điểm có trọng số 0–100 và red flag cứng. */
export type RubricTestDecision =
  | "must_test"
  | "suitable_test"
  | "consider_test"
  | "no_test"
  | "blocked_red_flag";

export interface RubricAggregate {
  weightedScore: number | null;
  band5: number | null;
  decision: RubricTestDecision;
  lowScoreCriteriaCount: number;
  redFlagHardGate: boolean;
  partRollups?: RubricPartRollup[];
  globalWeightDenominator?: number;
}

export interface RubricBlock {
  manifestVersion: number;
  genrePackResolved?: string | null;
  criteria: RubricCriterionOutput[];
  aggregate: RubricAggregate;
  redFlag: RubricRedFlagBlock;
  dataConfidence: {
    reviewCount: number;
    meetsThreshold: boolean;
    threshold: number;
  };
}

export interface AiAnalysis {
  appId: number;
  gameName?: string;
  iconUrl?: string | null;
  redFlagAtAGlance?: RedFlagAtAGlance;
  redFlagsChecklist?: RedFlagsChecklist;
  source?: "database" | "external" | "csv-upload" | "steam";
  summary: string;
  summaryBullets?: string[];
  strengths: AIFeedbackItem[];
  weaknesses: AIFeedbackItem[];
  sentimentScore: number;
  sentimentBreakdown?: SentimentBreakdown;
  topics: Record<string, number>;
  recentTrend: string;
  recentTrendBullets?: string[];
  reviewsAnalyzed: number;
  bucketCounts: Record<string, number>;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  analyzedAt: string;
  rubric?: RubricBlock;
  /** Gợi ý bổ sung file JSON thư viện sau phân tích */
  libraryRequests?: LibraryRequestItem[];
}

export interface LibraryRequestItem {
  kind: string;
  label: string;
  messageVi: string;
  jsonSuggestion: Record<string, unknown>;
}

export interface DashboardStats {
  totalApps: number;
  totalDataPoints: number;
  totalReviews: number;
  latestDate: string | null;
  dateCount: number;
  topMovers: {
    gainers: Array<{ appId: number; title: string; change: number; iconUrl: string | null }>;
    losers: Array<{ appId: number; title: string; change: number; iconUrl: string | null }>;
  };
  tagDistribution: Array<{ tag: string; count: number }>;
}

export interface GamePotentialDetail {
  momentum: {
    score: number;
    positionScore: number;
    avgRecentRank: number;
    rankChangeScore: number;
    absoluteScore: number;
    relativeScore: number;
    peakScore: number;
    bestRank: number;
    rankStart: number;
    rankEnd: number;
    change: number;
  };
  engagement: {
    score: number;
    ratingStart: number | null;
    ratingEnd: number | null;
    ratingDelta: number;
    ratingBaseScore: number | null;
    ratingChangeScore: number | null;
    ratingScore: number | null;
    fansStart: number | null;
    fansEnd: number | null;
    fansGrowth: number;
    fansRate: number | null;
    fansRateScore: number | null;
    fansAbsScore: number | null;
    fansScore: number | null;
    resStart: number | null;
    resEnd: number | null;
    resGrowth: number;
    resRate: number | null;
    resRateScore: number | null;
    resAbsScore: number | null;
    resScore: number | null;
    subsCount: number;
    absThreshold: number;
  };
  stability: {
    score: number;
    presenceScore: number;
    volatilityScore: number;
    streakScore: number;
    daysInTop: number;
    stdDev: number;
    maxStreak: number;
    analysisDays: number;
  };
  confidence: {
    coverage: number;
    multiplier: number;
    dataPoints: number;
    analysisDays: number;
  };
  compositeScore: number;
  rawComposite: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Hàng chờ bổ sung thư viện (từ phân tích AI / thủ công) */
export interface LibraryPendingItem {
  id: string;
  type: string;
  label: string;
  detailVi: string;
  jsonSuggestion: Record<string, unknown>;
  appId: number;
  gameName: string;
  createdAt: string;
  status: "pending" | "merged";
}
