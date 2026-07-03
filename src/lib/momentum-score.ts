/** Mirrors BE `RankingService.computeMomentumScore` — 60% growth + 20% rating + 20% rank quality. */
export const MOMENTUM_WEIGHTS = { growth: 0.6, rating: 0.2, rank: 0.2 } as const;

function r1(v: number) {
  return Math.round(v * 10) / 10;
}

/** `growthNorm` is already computed on BE (min of cohort percentile + absolute cap). */
export function momentumBreakdown(growthNorm: number, ratingScore: number, rankQualityScore: number) {
  const norm = Math.min(100, Math.max(0, growthNorm));
  const growthPart = r1(MOMENTUM_WEIGHTS.growth * norm);
  const ratingPart = r1(MOMENTUM_WEIGHTS.rating * ratingScore);
  const rankPart = r1(MOMENTUM_WEIGHTS.rank * rankQualityScore);
  const total = r1(growthPart + ratingPart + rankPart);
  return { growthNorm: norm, growthPart, ratingPart, rankPart, total };
}
