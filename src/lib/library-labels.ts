/** Human-readable labels for library document slugs. */
export const LIBRARY_FILE_LABELS: Record<string, { vi: string; en: string }> = {
  "genre-tiers.json": { vi: "Genre tiers", en: "Genre tiers" },
  "studio-tiers.json": { vi: "Studio tiers", en: "Studio tiers" },
  "game-size-tiers.json": { vi: "Game size tiers", en: "Game size tiers" },
  "update-cycle-tiers.json": { vi: "Update cycle tiers", en: "Update cycle tiers" },
  "community-size-tiers.json": { vi: "Community size tiers", en: "Community size tiers" },
  "ip-theme-tiers.json": { vi: "IP / theme tiers", en: "IP / theme tiers" },
  "system-requirement-tiers.json": { vi: "System requirement tiers", en: "System requirement tiers" },
  "art-style-keywords.json": { vi: "Art style keywords", en: "Art style keywords" },
  "pending-additions.json": { vi: "Pending additions", en: "Pending additions" },
};

export function libraryFileLabel(slug: string, lang: "vi" | "en"): string {
  const row = LIBRARY_FILE_LABELS[slug];
  if (row) return lang === "vi" ? row.vi : row.en;
  return slug.replace(/\.json$/, "").replace(/-/g, " ");
}
