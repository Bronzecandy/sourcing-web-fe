import type { GenrePackRollup, GenrePackResolvedItem, RubricBlock, RubricCriterionOutput } from "@/types";

export const PACK_LABELS: Record<string, { vi: string; en: string }> = {
  base: { vi: "Chung (base)", en: "Base" },
  cardRpg: { vi: "Card RPG", en: "Card RPG" },
  extraction: { vi: "Extraction (Loot & Scoot)", en: "Extraction" },
  shooter: { vi: "Shooter", en: "Shooter" },
  moba: { vi: "MOBA", en: "MOBA" },
};

/** Màu cố định theo gói — dùng cho badge, viền, chữ tiêu đề. */
export const PACK_THEME: Record<
  string,
  { badge: string; border: string; text: string; bullet: string; headerBg: string }
> = {
  moba: {
    badge: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/25",
    border: "border-l-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
    bullet: "marker:text-indigo-500",
    headerBg: "bg-indigo-500/10",
  },
  extraction: {
    badge: "bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30",
    border: "border-l-amber-500",
    text: "text-amber-800 dark:text-amber-300",
    bullet: "marker:text-amber-500",
    headerBg: "bg-amber-500/10",
  },
  shooter: {
    badge: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/25",
    border: "border-l-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    bullet: "marker:text-rose-500",
    headerBg: "bg-rose-500/10",
  },
  cardRpg: {
    badge: "bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-500/25",
    border: "border-l-violet-500",
    text: "text-violet-700 dark:text-violet-300",
    bullet: "marker:text-violet-500",
    headerBg: "bg-violet-500/10",
  },
};

const FALLBACK_THEME = {
  badge: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/25",
  border: "border-l-sky-500",
  text: "text-sky-700 dark:text-sky-300",
  bullet: "marker:text-sky-500",
  headerBg: "bg-sky-500/10",
};

export function packTheme(packId: string) {
  return PACK_THEME[packId] ?? FALLBACK_THEME;
}

export function packLabel(packId: string, lang: "vi" | "en", labelVi?: string): string {
  return PACK_LABELS[packId]?.[lang] ?? labelVi ?? packId;
}

function scoreRows(rows: RubricCriterionOutput[]): number | null {
  let num = 0;
  let den = 0;
  for (const c of rows) {
    if (c.score == null) continue;
    num += c.score * c.weightInPart;
    den += c.weightInPart;
  }
  return den > 0 ? Math.round((num / den) * 10) / 10 : null;
}

/** Ưu tiên rollups từ API; fallback tính từ criteria (phân tích cũ). */
export function resolveGenrePackRollups(rubric: RubricBlock): GenrePackRollup[] {
  const packs = (rubric.genrePacksResolved ?? []).filter((p) => p.packId !== "base");
  if (packs.length === 0) return rubric.genrePackRollups ?? [];

  if (rubric.genrePackRollups?.length) return rubric.genrePackRollups;

  const byPack = new Map<string, RubricCriterionOutput[]>();
  for (const p of packs) byPack.set(p.packId, []);
  for (const c of rubric.criteria) {
    if (c.partId !== "genre_specific" || !c.genrePack) continue;
    if (byPack.has(c.genrePack)) byPack.get(c.genrePack)!.push(c);
  }

  return packs.map(({ packId, weight, labelVi }) => ({
    packId,
    weight,
    labelVi,
    averageScore: scoreRows(byPack.get(packId) ?? []),
  }));
}

export function formatPackBlend(
  packs: GenrePackResolvedItem[],
  lang: "vi" | "en",
): string | null {
  const nonBase = packs.filter((p) => p.packId !== "base");
  if (nonBase.length === 0) return null;
  return nonBase
    .map((p) => `${packLabel(p.packId, lang, p.labelVi)} ${Math.round(p.weight * 100)}%`)
    .join(" · ");
}
