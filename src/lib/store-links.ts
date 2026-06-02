import type { AiAnalysis } from "@/types";

/** TapTap CN store page for a game (appId from crawl DB is TapTap id). */
export function buildTapTapAppUrl(appId: number): string {
  return `https://www.taptap.cn/app/${appId}`;
}

/** Steam store page. */
export function buildSteamStoreUrl(steamAppId: number): string {
  return `https://store.steampowered.com/app/${steamAppId}`;
}

export type StoreLink = {
  platform: "taptap" | "steam";
  href: string;
  labelVi: string;
  labelEn: string;
};

/** External store links for a crawled TapTap game (list / detail from DB). */
export function gameStoreLinks(appId: number): StoreLink[] {
  if (!Number.isFinite(appId) || appId <= 0) return [];
  return [
    {
      platform: "taptap",
      href: buildTapTapAppUrl(appId),
      labelVi: "TapTap",
      labelEn: "TapTap",
    },
  ];
}

/** Store links for a saved AI analysis (TapTap vs Steam by source). */
export function analysisStoreLinks(analysis: Pick<AiAnalysis, "appId" | "source">): StoreLink[] {
  const { appId, source } = analysis;
  if (!Number.isFinite(appId) || appId <= 0) return [];

  if (source === "steam") {
    return [
      {
        platform: "steam",
        href: buildSteamStoreUrl(appId),
        labelVi: "Steam",
        labelEn: "Steam",
      },
    ];
  }

  if (source === "database" || source === "external" || source === "csv-upload" || !source) {
    return [
      {
        platform: "taptap",
        href: buildTapTapAppUrl(appId),
        labelVi: "TapTap",
        labelEn: "TapTap",
      },
    ];
  }

  return [];
}
