export type ReviewWindowDays = 7 | 14 | 30 | 60;

export type ReviewWindow =
  | { mode: "all" }
  | { mode: "days"; days: ReviewWindowDays }
  | { mode: "range"; from: string; to: string };

export const DEFAULT_REVIEW_WINDOW: ReviewWindow = { mode: "all" };
