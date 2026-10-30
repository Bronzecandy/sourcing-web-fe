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
  primaryLaunchBoard?: "pop" | "hot" | "new" | null;
  launchCategory?: LaunchCategory | null;
  hotAndroidRank?: number | null;
  hotIosRank?: number | null;
  popAndroidRank?: number | null;
  popIosRank?: number | null;
  newAndroidRank?: number | null;
  newIosRank?: number | null;
  downloadCount?: number | null;
  releaseDate?: string | null;
  launchBoardTags?: Array<{ board: "pop" | "hot" | "new"; rank: number | null }>;
}

export interface GameDetail {
  appId: number;
  title: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  developerNote: string | null;
  developerName?: string | null;
  publisherName?: string | null;
  tags: string[];
  rating: string | null;
  latestScore: string | null;
  voteInfo: Record<string, number> | null;
  reviewCount: number | null;
  fansCount: number | null;
  reserveCount: number | null;
  hitsTotal: number | null;
  releaseDate?: string | null;
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
  /** True when crawl DB is down and this payload is from ranking cache / TapTap. */
  degraded?: boolean;
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

export type PotentialSegment = "reserve" | "launched";
export type LaunchCategory = "new_launch" | "established_launch";

export interface PotentialScore {
  appId: number;
  title: string;
  iconUrl: string | null;
  audienceScore: number;
  /** @deprecated alias */
  scaleScore?: number;
  /** @deprecated alias */
  growthScore?: number;
  ratingScore: number;
  rankQualityScore: number;
  launchBoardScore?: number;
  dataConfidence: number;
  compositeScore: number;
  currentRank: number | null;
  androidRank: number | null;
  iosRank: number | null;
  hotAndroidRank?: number | null;
  hotIosRank?: number | null;
  popAndroidRank?: number | null;
  popIosRank?: number | null;
  newAndroidRank?: number | null;
  newIosRank?: number | null;
  rating: string | null;
  fansCount: number | null;
  trend: "up" | "down" | "stable";
  segment?: PotentialSegment;
  audienceGrowthAbsolute?: number | null;
  audienceGrowthRate?: number | null;
  momentumScore?: number;
  momentumGrowthNorm?: number;
  momentumGrowthPercentile?: number;
  momentumGrowthAbsCap?: number;
  momentumGrowthCohortSize?: number;
  momentumGrowthPerDayAnchors?: { p50: number; p75: number; p90: number; p95: number };
  momentumMovementScore?: number;
  launchCategory?: LaunchCategory;
  releaseDate?: string | null;
  primaryLaunchBoard?: "pop" | "hot" | "new" | null;
  launchBoardTags?: Array<{ board: "pop" | "hot" | "new"; rank: number | null }>;
  downloadCount?: number | null;
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
  genrePack?: string | null;
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
  playerMentions?: {
    summary?: string | null;
    politics?: string | null;
    religion?: string | null;
    casino?: string | null;
    violence?: string | null;
    sexual?: string | null;
  };
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
  detailVi?: string[];
  playerMentions?: RubricRedFlagBlock["playerMentions"];
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
  genrePacksResolved?: GenrePackResolvedItem[];
  genrePackBlendReasoning?: string;
  genrePackRollups?: GenrePackRollup[];
  criteria: RubricCriterionOutput[];
  aggregate: RubricAggregate;
  redFlag: RubricRedFlagBlock;
  dataConfidence: {
    reviewCount: number;
    meetsThreshold: boolean;
    threshold: number;
  };
}

export interface GenrePackResolvedItem {
  packId: string;
  weight: number;
  labelVi?: string;
}

/** Điểm trung bình có trọng số trong phần Theo thể loại, theo từng gói genre. */
export interface GenrePackRollup {
  packId: string;
  weight: number;
  labelVi?: string;
  averageScore: number | null;
}

export interface GenrePackPlan {
  packs: GenrePackResolvedItem[];
  reasoning: string;
  ratioPreset?: "7:3" | "6:4" | null;
}

export interface AnalysisPrepareExistingItem {
  appId: number;
  gameName?: string;
  analyzedAt?: string;
  reviewsAnalyzed?: number;
  score?: number | null;
  genrePacks?: GenrePackResolvedItem[];
  genrePackResolved?: string | null;
}

export interface AnalysisPrepareResult {
  appId: number;
  gameName: string;
  iconUrl: string | null;
  tagInferredPacks: string[];
  availablePackIds: string[];
  genrePackPlan: GenrePackPlan;
  existingAnalyses: AnalysisPrepareExistingItem[];
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
  analysisId?: string;
  analyzedByUserId?: string;
  reviewWindowMode?: "all" | "days" | "range";
  reviewWindowDays?: 7 | 14 | 30 | 60;
  reviewFilterFrom?: string;
  reviewFilterTo?: string;
  developerName?: string | null;
  publisherName?: string | null;
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

export type DistributionMetric = "reserve" | "download" | "rating" | "reviewCount" | "fans";
export type DistributionLifecycle = "reserve" | "new" | "old" | "unknown";
export type DistributionLifecycleFilter = "all" | DistributionLifecycle;

export interface DistributionBucket {
  label: string;
  min: number;
  max: number | null;
  count: number;
  countDelta: number;
  metricSum: number;
  metricDelta: number;
  byLifecycle: Record<DistributionLifecycle, number>;
}

export interface DistributionSummary {
  totalGames: number;
  byLifecycle: Record<DistributionLifecycle, number>;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface DistributionMonthlyPoint {
  month: number;
  periodStart: string | null;
  periodEnd: string | null;
  totalGames: number;
  totalMetricSum: number;
  totalMetricDelta: number;
}

export interface DistributionMonthResponse {
  mode: "month";
  metric: DistributionMetric;
  lifecycle: DistributionLifecycleFilter;
  year: number;
  month: number;
  buckets: DistributionBucket[];
  summary: DistributionSummary;
  message?: string;
}

export interface DistributionYearResponse {
  mode: "year";
  metric: DistributionMetric;
  lifecycle: DistributionLifecycleFilter;
  year: number;
  monthlyTrend: DistributionMonthlyPoint[];
  summary: DistributionSummary;
}

export type DistributionResponse = DistributionMonthResponse | DistributionYearResponse;

export interface DistributionMeta {
  years: number[];
  months: Record<number, number[]>;
  metrics: Array<{ id: DistributionMetric; label: string }>;
}

export type DistributionTab = "reserve" | "new" | "old";

export interface DistributionTrendPoint {
  key: string;
  label: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalGames: number;
  metricSum: number;
  metricDelta: number;
}

export interface DistributionGrowthBucket {
  label: string;
  min: number;
  max: number | null;
  count: number;
  totalDelta: number;
  sharePct: number;
}

export interface DistributionRatingInsights {
  highRatingShare: number;
  lowRatingShare: number;
  improvingShare: number;
  decliningShare: number;
  avgRating: number;
  avgRatingDelta: number;
  vote5StarShare: number | null;
}

export interface DistributionTabInsights {
  primaryMetric: DistributionMetric;
  label: string;
  value: string;
  sub?: string;
  items: Array<{ label: string; value: string }>;
}

export interface DistributionMetricBlock {
  metric: DistributionMetric;
  label: string;
  buckets: DistributionBucket[];
  absoluteBuckets: DistributionBucket[];
  growthBuckets: DistributionGrowthBucket[];
  totalGames: number;
  metricSum: number;
  metricDelta: number;
  gamesWithGrowth: number;
  gamesIncreased: number;
  gamesDecreased: number;
  gamesFlat: number;
  trend: DistributionTrendPoint[];
  ratingInsights?: DistributionRatingInsights;
}

export interface DistributionOverviewResponse {
  lifecycle: DistributionTab;
  year: number | null;
  month: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  segmentCounts: Record<DistributionLifecycle, number>;
  segmentTotal: number;
  metrics: DistributionMetricBlock[];
  tabInsights: DistributionTabInsights;
  message?: string;
}

export interface DistributionTrendsResponse {
  lifecycle: DistributionTab;
  year: number | null;
  month: number | null;
  metrics: Array<{ metric: DistributionMetric; trend: DistributionTrendPoint[] }>;
}

export type PotentialScaleMetric = "reserve" | "download";

export interface PotentialAudienceBlock {
  score: number;
  metric: PotentialScaleMetric;
  start: number | null;
  end: number | null;
  delta: number;
  baseValue: number;
  baseTierLabel: string | null;
  growthBonus: number;
  growthTierLabel: string | null;
  growthWeight: number;
}

/** @deprecated use PotentialAudienceBlock */
export type PotentialScaleBlock = PotentialAudienceBlock;
/** @deprecated use PotentialAudienceBlock */
export type PotentialGrowthBlock = PotentialAudienceBlock;

export interface PotentialRatingBlock {
  score: number;
  start: number | null;
  end: number | null;
  delta: number;
  baseValue: number;
  deltaAdjustment: number;
}

export interface PotentialRankQualityBlock {
  score: number;
  positionQuality: number;
  top10Rate: number;
  top20Rate: number;
  top50Rate: number;
  presenceScore: number;
  streakScore: number;
  volatilityScore: number;
  movementScore: number;
  avgRank: number;
  bestRank: number;
  rankStart: number;
  rankEnd: number;
  change: number;
  stdDev: number;
  longestTop20Streak: number;
  daysTracked: number;
}

export interface GamePotentialDetail {
  audience: PotentialAudienceBlock;
  /** @deprecated use audience */
  scale?: PotentialAudienceBlock;
  /** @deprecated use audience */
  growth?: PotentialAudienceBlock;
  rating: PotentialRatingBlock;
  rankQuality: PotentialRankQualityBlock;
  confidence: {
    coverage: number;
    multiplier: number;
    dataPoints: number;
    analysisDays: number;
  };
  compositeScore: number;
  rawComposite: number;
  floorApplied?: boolean;
  segment?: PotentialSegment;
  preLaunchBonus?: number;
  preLaunchScore?: number;
  launchBoard?: {
    primaryBoard: "pop" | "hot" | "new" | null;
    primaryRank: number | null;
    score: number;
    chartQuality: number;
    consistency: number;
    coverage: number;
    popDayRate: number;
    hotDayRate: number;
    newDayRate: number;
    activeBoardCount: number;
    activeBoards: Array<{ board: "pop" | "hot" | "new"; rank: number | null }>;
  };
  audienceGrowthAbsolute?: number | null;
  audienceGrowthRate?: number | null;
  momentumScore?: number;
  momentumGrowthNorm?: number;
  momentumGrowthPercentile?: number;
  momentumGrowthAbsCap?: number;
  momentumGrowthCohortSize?: number;
  momentumGrowthPerDayAnchors?: { p50: number; p75: number; p90: number; p95: number };
  momentumMovementScore?: number;
  potentialRankGrowth?: number | null;
  potentialRankStable?: number | null;
  potentialListSize?: number;
}

export interface PotentialLifecycleMeta {
  firstLaunchDate: string | null;
  firstLaunchIndex: number;
  hasReservePhase: boolean;
  hasLaunchPhase: boolean;
  preLaunchDayCount: number;
  postLaunchDayCount: number;
  transitioned: boolean;
  reserveWindowEnd?: string | null;
  reserveWindowDays?: number;
}

export interface PotentialBreakdown {
  lifecycle: PotentialLifecycleMeta;
  reserve: GamePotentialDetail | null;
  launched: GamePotentialDetail | null;
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

export interface CompareAnalysisSummary {
  available: boolean;
  analyzedAt?: string;
  weightedScore?: number | null;
  band5?: number | null;
  decision?: string | null;
  partRollups?: Array<{
    partId: string;
    labelVi: string;
    weightInTotal: number;
    partAverageScore: number | null;
  }>;
  redFlagAtAGlance?: AiAnalysis["redFlagAtAGlance"] | null;
}

export interface CompareGameEntry {
  appId: number;
  detail: GameDetail;
  potential: PotentialBreakdown;
  analysisSummary: CompareAnalysisSummary;
}

export interface CompareOverview {
  appIds: number[];
  days: number;
  platform: "combined" | "android" | "ios";
  games: CompareGameEntry[];
}

export interface ComparePartGameVerdict {
  score: number | null;
  verdict: string;
}

export interface ComparePartResult {
  partId: string;
  labelVi: string;
  byGame: Record<number, ComparePartGameVerdict>;
  winnerAppId: number | null;
  note: string;
}

export interface GameComparisonAI {
  summaryBullets: string[];
  perPart: ComparePartResult[];
  strengthsByGame: Record<number, string[]>;
  weaknessesByGame: Record<number, string[]>;
  overallRecommendation: string;
  bestForTestAppId: number | null;
  genrePackNote?: string | null;
}

export interface SavedGameComparison {
  compareId: string;
  appIds: number[];
  comparedAt: string;
  comparison: GameComparisonAI;
}

export interface RadarBullet {
  appId: number;
  nameCn: string;
  nameEn: string;
  overviewUrl: string;
  text: string;
  isNew: boolean;
  repeat: boolean;
}

export interface RadarSection3 {
  newEntries: RadarBullet[];
  scheduleUpdates: RadarBullet[];
  testable: RadarBullet[];
  market: Array<{ publisher: string; items: RadarBullet[] }>;
}

export interface RadarDigestLine {
  appId: number;
  name: string;
  url: string;
  /** Rỗng khi dòng tự nêu thay đổi nhãn (vd rời nhóm High). */
  nextAction: string;
  note: string;
  publisher: string | null;
  /** Có thẻ ở mục Game Overview. */
  card: boolean;
}

export interface RadarDigestGroup {
  key: string;
  title: string;
  lines: RadarDigestLine[];
  empty?: string;
}

/** Executive Summary trên web: High Potential + Mid/Medium có biến động, mỗi game một lần. */
export interface RadarDigest {
  stats: Array<{ key: string; label: string; value: number }>;
  internalTests: string[];
  groups: RadarDigestGroup[];
  quiet: RadarDigestLine[];
  others: string | null;
  cards: Array<{ appId: number; badges: string[]; boards: string }>;
  counts: { columns: string[]; rows: Array<{ label: string; counts: Record<string, number> }> };
}

export interface RadarRecapSummary {
  periodCode: string;
  dateLabel: string;
  copyText: string;
  digest?: RadarDigest;
  executiveParagraphs: string[];
  testableNow: string[];
  upcoming: string[];
  monitorNoDateCount: number;
  counts: Array<{ label: string; counts: Record<string, number> }>;
  previousDate?: string | null;
  previousPeriodCode?: string | null;
  testingThisWeek?: string[];
  section3?: RadarSection3;
  carryOver?: Array<{
    appId: number;
    title: string;
    titleEn: string;
    nextAction: string;
    previousDate: string;
    overviewUrl: string;
  }>;
}

export interface RadarMetrics {
  reserveCount: number | null;
  downloadCount: number | null;
  scale: number | null;
  scaleKind: "reserve" | "download" | null;
  rating: string | null;
  fansCount: number | null;
  audienceScore: number | null;
  ratingScore: number | null;
  rankQualityScore: number | null;
  dataConfidence: number | null;
  compositeScore: number | null;
  momentumScore: number | null;
  trend: string | null;
  releaseDate: string | null;
}

export interface RadarRecapRow {
  board: string;
  rank: number;
  appId: number;
  title: string;
  titleEn: string;
  score: number;
  nextAction: string;
  insights: string;
  reason?: string;
  releaseLabel?: string;
  genre?: string;
  publisher?: string;
  toolAdjustments?: string;
  overviewUrl: string;
  taptapUrl?: string;
  screeningUrl?: string | null;
  analysisScore?: number | null;
  firstInRecap?: boolean;
  newThisPeriod?: boolean;
  metrics?: RadarMetrics;
  schedule?: { kind: string | null; date: string | null; label: string } | null;
  scheduleChanged?: boolean;
  scheduleChangeNote?: string;
  videoUrl?: string | null;
  internalTest?: { label: string; status: string; startDate: string | null; endDate: string | null } | null;
  /** Dòng nhập từ báo cáo làm tay (Game Radar Recap.xlsx). */
  legacy?: boolean;
  nextActionRaw?: string;
  chartRank?: string;
  trend?: string;
  metricsText?: string;
  screeningText?: string;
}

export interface RadarRecapLatest {
  date: string;
  periodCode: string;
  status: string;
  summary: RadarRecapSummary | null;
  rows: RadarRecapRow[];
}

export interface RadarRunListItem {
  date: string;
  periodCode: string;
  /** completed | imported (báo cáo làm tay) | stale | failed | started */
  status: string;
  source: "tool" | "sheet";
  weekStart: string;
  weekEnd: string;
  games: number;
  actions: { testViable: number; monitor: number; ignore: number; drop: number; other: number };
  highPotential?: number;
  /** Game High/Mid mới vào radar / có lịch mới. */
  newGames: number;
  scheduleUpdates: number;
  hasDocx: boolean;
}

/** summary của kỳ nhập từ báo cáo làm tay. */
export interface RadarLegacySummary {
  legacy: true;
  source: string;
  sheets: string[];
  docx: string | null;
}

export class CompareMissingAnalysisError extends Error {
  code: "MISSING_ANALYSIS";
  missing: Array<{ appId: number; gameName?: string }>;

  constructor(
    message: string,
    missing: Array<{ appId: number; gameName?: string }>,
  ) {
    super(message);
    this.name = "CompareMissingAnalysisError";
    this.code = "MISSING_ANALYSIS";
    this.missing = missing;
  }
}
