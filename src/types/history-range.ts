export type HistoryRange =
  | { kind: "days"; days: number }
  | { kind: "custom"; from: string; to: string };
