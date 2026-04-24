import { useContentLang, type ContentLang } from "./content-language";

/** UI copy: Vietnamese when `lang === "vi"`, English when `lang === "en"`. Sidebar tab names stay English (unchanged there). */
export function useUiCopy() {
  const { lang } = useContentLang();
  const t = (vi: string, en: string) => (lang === "vi" ? vi : en);
  return { t, lang };
}

export function bucketDisplayName(key: string, lang: ContentLang): string {
  if (lang === "en") return key;
  const vi: Record<string, string> = {
    "Very Negative": "Rất tiêu cực",
    Negative: "Tiêu cực",
    Mixed: "Trung lập",
    Positive: "Tích cực",
    "Very Positive": "Rất tích cực",
    Unrated: "Chưa xếp sao",
  };
  return vi[key] ?? key;
}

export function topicKeyLabel(key: string, lang: ContentLang): string {
  const pairs: Record<string, [string, string]> = {
    gameplay: ["Lối chơi", "Gameplay"],
    graphics: ["Đồ họa", "Graphics"],
    story: ["Cốt truyện", "Story"],
    monetization: ["Mô hình thu phí", "Monetization"],
    performance: ["Hiệu năng", "Performance"],
    community: ["Cộng đồng", "Community"],
  };
  const p = pairs[key];
  if (!p) return key;
  return lang === "vi" ? p[0] : p[1];
}

export function potentialRadarMetric(metric: string, lang: ContentLang): string {
  const pairs: Record<string, [string, string]> = {
    Momentum: ["Đà tăng", "Momentum"],
    Engagement: ["Tương tác người chơi", "Engagement"],
    Stability: ["Ổn định xếp hạng", "Stability"],
  };
  const p = pairs[metric];
  if (!p) return metric;
  return lang === "vi" ? p[0] : p[1];
}

export function sentimentScoreUiLabel(score: number, lang: ContentLang): { text: string; cls: string } {
  const cls = (() => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-green-500";
    if (score >= 40) return "text-amber-500";
    if (score >= 20) return "text-orange-500";
    return "text-red-500";
  })();
  if (lang === "en") {
    if (score >= 80) return { text: "Very Positive", cls };
    if (score >= 60) return { text: "Positive", cls };
    if (score >= 40) return { text: "Mixed", cls };
    if (score >= 20) return { text: "Negative", cls };
    return { text: "Very Negative", cls };
  }
  if (score >= 80) return { text: "Rất tích cực", cls };
  if (score >= 60) return { text: "Tích cực", cls };
  if (score >= 40) return { text: "Trung lập", cls };
  if (score >= 20) return { text: "Tiêu cực", cls };
  return { text: "Rất tiêu cực", cls };
}

export function tierMentionLabel(tier: "frequent" | "moderate" | "rare", lang: ContentLang): string {
  const m: Record<typeof tier, [string, string]> = {
    frequent: ["Nhắc nhiều", "Frequently mentioned"],
    moderate: ["Nhắc vừa phải", "Moderately mentioned"],
    rare: ["Ít được nhắc", "Rarely mentioned"],
  };
  return lang === "vi" ? m[tier][0] : m[tier][1];
}
