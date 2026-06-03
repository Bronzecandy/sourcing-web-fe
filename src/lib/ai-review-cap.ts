/** Đồng bộ với BE `AI_MAX_REVIEWS_FOR_ANALYSIS` (mặc định 15_000). */
export const AI_MAX_REVIEWS_FOR_ANALYSIS = (() => {
  const raw = import.meta.env.VITE_AI_MAX_REVIEWS_FOR_ANALYSIS;
  if (raw == null || raw === "") return 15_000;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : 15_000;
})();
