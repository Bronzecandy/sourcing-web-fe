/** Mirrors BE `RankingService.computeMomentumScore`. */
export function momentumBreakdown(growthBonus: number, movementScore: number) {
  const growthNorm = Math.min(100, Math.max(0, 50 + growthBonus));
  const growthPart = Math.round(0.75 * growthNorm * 10) / 10;
  const movementPart = Math.round(0.25 * movementScore * 10) / 10;
  const total = Math.round((growthPart + movementPart) * 10) / 10;
  return { growthBonus, growthNorm, growthPart, movementPart, total };
}
