/** Màu ô Next Action theo bảng Excel Game Radar Recap. */
export function actionFill(action: string): string {
  if (action.startsWith("Test Viable")) return "#9DC3E6";
  if (action.includes("High")) return "#A9D18E";
  if (action.includes("Mid") || action.includes("Medium")) return "#C6E0B4";
  if (action.includes("Low")) return "#FFE699";
  if (action.startsWith("Monitor")) return "#C6E0B4";
  if (action.startsWith("Temporary")) return "#FFD9A0";
  if (action === "Drop") return "#FFC7CE";
  return "transparent";
}

/** Thứ tự trình bày: theo mức potential, trong cùng mức Test Viable trước Monitor. */
export const PRIORITY_ORDER = [
  "Test Viable - High Potential",
  "Monitor - High Potential",
  "Test Viable - Medium Potential",
  "Monitor - Mid Potential",
  "Test Viable - Low Potential",
  "Monitor - Low Potential",
  "Temporary Ignore",
  "Drop",
];

export function priorityRank(action: string): number {
  const i = PRIORITY_ORDER.indexOf(action);
  return i === -1 ? PRIORITY_ORDER.length : i;
}

export function displayName(row: { title: string; titleEn?: string }): string {
  return row.titleEn ? `${row.title} (${row.titleEn})` : row.title;
}

/** YYYY-MM-DD → DD/MM/YYYY */
export function viDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** YYYY-MM-DD → DD/MM */
export function viDayMonth(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
