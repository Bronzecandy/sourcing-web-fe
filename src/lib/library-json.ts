/** Helpers để chỉnh thư viện JSON dạng bảng — không thay đổi schema backend */

export type GenreTiersJson = {
  version?: number;
  defaultScore?: number;
  notesEditor?: string;
  tiers?: Record<string, { label: string; score: number }>;
  tagPatterns?: Array<{ match: string[]; tier: string }>;
};

export type StudioTiersJson = {
  version?: number;
  neutralScore?: number;
  entries?: Array<{ names: string[]; score: number; tier?: string; roles?: string[] }>;
};

export type RulesLibJson = {
  version?: number;
  neutralScore?: number;
  maxMbGood?: number;
  notes?: string;
  rules?: Array<Record<string, unknown>>;
};

export type CommunityLibJson = {
  version?: number;
  neutralScore?: number;
  notes?: string;
  fanTierRules?: Array<{ minFans: number; score: number }>;
};

export type KeywordLibJson = {
  version?: number;
  neutralScore?: number;
  notes?: string;
  keywordPatterns?: Array<{ match: string[]; score: number }>;
};

export type PendingFileJson = {
  version?: number;
  items?: Array<Record<string, unknown>>;
};

export function ensureArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function splitCsv(s: string): string[] {
  return s
    .split(/[,，、]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function joinCsv(arr: string[]): string {
  return arr.join(", ");
}

/** tier letter → điểm từ genre-tiers (tiers.S.score, …) */
export function tierScoreMap(genre: unknown): Record<string, number> {
  const g = genre as GenreTiersJson | undefined;
  const tiers = g?.tiers;
  if (!tiers || typeof tiers !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(tiers)) {
    if (v && typeof v === "object" && typeof (v as { score?: number }).score === "number") {
      out[k] = (v as { score: number }).score;
    }
  }
  return out;
}

/** Một dòng UI: một từ khóa genre + tier (điểm lấy từ bảng tiers khi hiển thị). */
export type FlatGenreKeywordRow = { keyword: string; tier: string };

/** JSON tagPatterns (nhóm theo tier) → danh sách phẳng, giữ thứ tự xuất hiện. */
export function flattenGenreTagPatterns(
  patterns: Array<{ match: string[]; tier: string }> | undefined,
): FlatGenreKeywordRow[] {
  const p = ensureArray<{ match: string[]; tier: string }>(patterns);
  const out: FlatGenreKeywordRow[] = [];
  for (const row of p) {
    for (const raw of row.match) {
      const k = String(raw).trim();
      if (!k) continue;
      out.push({ keyword: k, tier: row.tier });
    }
  }
  return out;
}

/**
 * Gộp lại thành tagPatterns trên đĩa (backend không đổi).
 * Trùng từ khóa (không phân biệt hoa thường): dòng sau ghi đè tier trước.
 * Thứ tự match[] trong mỗi tier = thứ tự lần đầu gặp từ khóa (duy nhất) trong danh sách phẳng.
 */
export function groupFlatToTagPatterns(flat: FlatGenreKeywordRow[]): Array<{ match: string[]; tier: string }> {
  const resolved = new Map<string, { display: string; tier: string }>();
  for (let i = flat.length - 1; i >= 0; i--) {
    const k = flat[i].keyword.trim();
    if (!k) continue;
    const low = k.toLowerCase();
    if (!resolved.has(low)) {
      resolved.set(low, { display: k.trim(), tier: flat[i].tier });
    }
  }

  const orderedUnique: string[] = [];
  const seen = new Set<string>();
  for (const row of flat) {
    const k = row.keyword.trim();
    if (!k) continue;
    const low = k.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    orderedUnique.push(low);
  }

  const tierOrder: string[] = [];
  const tierToMatches = new Map<string, string[]>();

  for (const low of orderedUnique) {
    const r = resolved.get(low);
    if (!r) continue;
    if (!tierToMatches.has(r.tier)) {
      tierOrder.push(r.tier);
      tierToMatches.set(r.tier, []);
    }
    tierToMatches.get(r.tier)!.push(r.display);
  }

  return tierOrder.map((tier) => ({
    tier,
    match: tierToMatches.get(tier) ?? [],
  }));
}

/** keywordPatterns (IP / system / art): một dòng UI = một từ khóa + điểm. */
export type FlatKeywordScoreRow = { keyword: string; score: number };

export function flattenKeywordScoreRows(
  patterns: Array<{ match: string[]; score: number }> | undefined,
): FlatKeywordScoreRow[] {
  const p = ensureArray<{ match: string[]; score: number }>(patterns);
  const out: FlatKeywordScoreRow[] = [];
  for (const row of p) {
    for (const raw of row.match) {
      const k = String(raw).trim();
      if (!k) continue;
      out.push({ keyword: k, score: row.score });
    }
  }
  return out;
}

/**
 * Gộp lại keywordPatterns. Trùng từ khóa (không phân biệt hoa thường): dòng sau ghi đè điểm.
 * Các từ khóa cùng một điểm nằm chung một object { match, score }.
 */
export function groupFlatToKeywordPatterns(flat: FlatKeywordScoreRow[]): Array<{ match: string[]; score: number }> {
  const resolved = new Map<string, { display: string; score: number }>();
  for (let i = flat.length - 1; i >= 0; i--) {
    const k = flat[i].keyword.trim();
    if (!k) continue;
    const low = k.toLowerCase();
    if (!resolved.has(low)) {
      resolved.set(low, { display: k.trim(), score: flat[i].score });
    }
  }

  const orderedUnique: string[] = [];
  const seen = new Set<string>();
  for (const row of flat) {
    const k = row.keyword.trim();
    if (!k) continue;
    const low = k.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    orderedUnique.push(low);
  }

  const scoreOrder: number[] = [];
  const scoreToMatches = new Map<number, string[]>();

  for (const low of orderedUnique) {
    const r = resolved.get(low);
    if (!r) continue;
    if (!scoreToMatches.has(r.score)) {
      scoreOrder.push(r.score);
      scoreToMatches.set(r.score, []);
    }
    scoreToMatches.get(r.score)!.push(r.display);
  }

  return scoreOrder.map((score) => ({
    score,
    match: scoreToMatches.get(score) ?? [],
  }));
}

/** studio-tiers: một dòng UI = một tên studio (alias). */
export type FlatStudioNameRow = { name: string; score: number; tier: string; roles: string };

export function flattenStudioNameRows(
  entries: Array<{ names: string[]; score: number; tier?: string; roles?: string[] }> | undefined,
): FlatStudioNameRow[] {
  const e = ensureArray<{ names: string[]; score: number; tier?: string; roles?: string[] }>(entries);
  const out: FlatStudioNameRow[] = [];
  for (const row of e) {
    for (const raw of row.names) {
      const n = String(raw).trim();
      if (!n) continue;
      out.push({
        name: n,
        score: row.score,
        tier: row.tier ?? "",
        roles: joinCsv(row.roles ?? []),
      });
    }
  }
  return out;
}

/**
 * Gộp entries. Trùng tên (không phân biệt hoa thường): dòng sau thắng.
 * Gộp các tên cùng score + tier + roles vào một entry.
 */
export function groupFlatToStudioEntries(
  flat: FlatStudioNameRow[],
): Array<{ names: string[]; score: number; tier?: string; roles?: string[] }> {
  const resolved = new Map<string, { display: string; score: number; tier: string; roles: string }>();
  for (let i = flat.length - 1; i >= 0; i--) {
    const k = flat[i].name.trim();
    if (!k) continue;
    const low = k.toLowerCase();
    if (!resolved.has(low)) {
      resolved.set(low, {
        display: k.trim(),
        score: flat[i].score,
        tier: flat[i].tier,
        roles: flat[i].roles,
      });
    }
  }

  const orderedUnique: string[] = [];
  const seen = new Set<string>();
  for (const row of flat) {
    const k = row.name.trim();
    if (!k) continue;
    const low = k.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    orderedUnique.push(low);
  }

  const keyOf = (score: number, tier: string, roles: string) => `${score}|${tier.trim()}|${roles.trim()}`;
  const order: string[] = [];
  const map = new Map<
    string,
    { names: string[]; score: number; tier?: string; roles?: string[] }
  >();

  for (const low of orderedUnique) {
    const r = resolved.get(low)!;
    const rk = r.roles.trim();
    const k = keyOf(r.score, r.tier, rk);
    if (!map.has(k)) {
      order.push(k);
      map.set(k, {
        names: [],
        score: r.score,
        tier: r.tier.trim() || undefined,
        roles: rk ? splitCsv(rk) : undefined,
      });
    }
    map.get(k)!.names.push(r.display);
  }

  return order.map((k) => map.get(k)!);
}
