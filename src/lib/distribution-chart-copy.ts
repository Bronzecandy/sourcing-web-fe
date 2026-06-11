import type { DistributionMetric } from "@/types";
import { formatNumber } from "@/lib/utils";

type TFn = (vi: string, en: string) => string;

const METRIC: Record<
  DistributionMetric,
  { vi: string; en: string; unitVi: string; unitEn: string }
> = {
  reserve: {
    vi: "Đăng ký trước",
    en: "Reserve",
    unitVi: "lượt đăng ký trước",
    unitEn: "reserve count",
  },
  fans: {
    vi: "Fans",
    en: "Fans",
    unitVi: "Fans",
    unitEn: "fans",
  },
  download: {
    vi: "Download",
    en: "Download",
    unitVi: "lượt tải",
    unitEn: "downloads",
  },
  rating: {
    vi: "Rating",
    en: "Rating",
    unitVi: "điểm rating",
    unitEn: "rating score",
  },
  reviewCount: {
    vi: "Bình luận",
    en: "Reviews",
    unitVi: "bình luận",
    unitEn: "review count",
  },
};

export function formatDistributionMetricValue(metric: DistributionMetric, value: number): string {
  if (metric === "rating") {
    if (Math.abs(value) < 10 && !Number.isInteger(value)) return value.toFixed(2);
    return value.toFixed(1);
  }
  return formatNumber(value);
}

export function getMetricChartCopy(metric: DistributionMetric, t: TFn) {
  const m = METRIC[metric];

  return {
    count: t("Số game (cột)", "Games (bars)"),
    countDelta: t("Chuyển bucket (đường)", "Bucket change (line)"),
    reserve: t("Chưa ra mắt", "Pre-launch"),
    new: t("Mới", "New"),
    old: t("Cũ", "Old"),
    unknown: t("Chưa rõ", "Unknown"),
    games: t("Số game", "Games"),
    metricSum: t(`Tổng ${m.vi} cuối kỳ`, `Total ${m.en} at period end`),
    metricDelta: t(`Tổng Δ ${m.vi}`, `Total ${m.en} change`),
    guide: {
      count: t(
        `Số game có ${m.unitVi} thuộc khoảng này tại ngày cuối kỳ (mỗi game đếm 1 lần).`,
        `Games whose ${m.unitEn} falls in this band on the last day of the period.`,
      ),
      countDelta: t(
        `So với đầu kỳ: số game trong khoảng này tăng/giảm bao nhiêu (game chuyển sang khoảng khác khi ${m.unitVi} thay đổi).`,
        `Versus period start: net change in how many games sit in this band (games moving between bands).`,
      ),
      metricSum: t(
        `Cộng ${m.unitVi} của mọi game trong khoảng — giá trị tại cuối kỳ.`,
        `Sum of ${m.unitEn} for all games in the band at period end.`,
      ),
      metricDelta: t(
        `Tổng (cuối kỳ − đầu kỳ) của ${m.unitVi} cho từng game trong khoảng, rồi cộng lại.`,
        `Sum of per-game (${m.unitEn} at end minus start) for games in the band.`,
      ),
    },
    absoluteIntro: t(
      `Xếp game theo mức ${m.unitVi} tại ngày cuối kỳ (vd ${metric === "rating" ? "7–8 điểm" : "10K–50K"}).`,
      `Group games by ${m.unitEn} at period end.`,
    ),
    growthIntro:
      metric === "rating"
        ? t(
            "Mỗi game: rating cuối kỳ trừ đầu kỳ — vd bao nhiêu game tăng 0.2~0.5 điểm trong kỳ.",
            "Per game: end rating minus start — e.g. how many gained 0.2–0.5 points.",
          )
        : t(
            `Mỗi game: ${m.unitVi} cuối kỳ trừ đầu kỳ — vd bao nhiêu game tăng thêm 5K~10K.`,
            `Per game: end minus start — e.g. how many gained 5K–10K.`,
          ),
    absoluteTable: {
      range: t("Khoảng giá trị", "Value range"),
      games: t("Số game", "Games"),
      share: t("Tỷ lệ", "Share"),
      metricTotal: t(`Tổng ${m.vi}`, `Total ${m.en}`),
    },
    growthTable: {
      range: t("Khoảng tăng/giảm", "Change range"),
      games: t("Số game", "Games"),
      share: t("Tỷ lệ", "Share"),
      totalChange: t(`Tổng Δ ${m.vi}`, `Total ${m.en} Δ`),
    },
    trendLabels: {
      games: t("Số game", "Games"),
      metricSum: t(`Tổng ${m.vi}`, `Total ${m.en}`),
      metricDelta: t(`Tăng ${m.vi}`, `${m.en} growth`),
    },
  };
}
