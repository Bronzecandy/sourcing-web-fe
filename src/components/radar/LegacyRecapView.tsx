import type { RadarLegacySummary, RadarRecapLatest, RadarRecapRow } from "@/types";
import { actionFill, viDate } from "@/lib/radar";

const BOARDS = [
  { id: "reserve_growth", title: "Top 20 Reserve - Growth" },
  { id: "reserve_scale", title: "Top 20 Reserve - Scale" },
  { id: "new_launch", title: "Top 20 New Launch" },
] as const;

type Column = {
  label: string;
  value: (row: RadarRecapRow) => string;
  className?: string;
};

const COLUMNS: Column[] = [
  { label: "Hạng BXH", value: (r) => r.chartRank ?? "", className: "whitespace-nowrap" },
  { label: "Điểm", value: (r) => (r.score ? r.score.toFixed(1) : ""), className: "tabular-nums" },
  { label: "Xu hướng", value: (r) => r.trend ?? "" },
  { label: "Chỉ số", value: (r) => r.metricsText ?? "", className: "min-w-40" },
  { label: "Ngày ra mắt", value: (r) => r.releaseLabel ?? "", className: "min-w-32" },
  { label: "Insights", value: (r) => r.insights ?? "", className: "min-w-72" },
  { label: "Tool Adjustments", value: (r) => r.toolAdjustments ?? "", className: "min-w-56" },
  { label: "Genre", value: (r) => r.genre ?? "", className: "min-w-40" },
  { label: "NPH", value: (r) => r.publisher ?? "", className: "min-w-40" },
];

function uniqueCounts(rows: RadarRecapRow[]): Array<[string, number]> {
  const byApp = new Map<number, string>();
  for (const r of rows) if (!byApp.has(r.appId)) byApp.set(r.appId, r.nextAction);
  const counts = new Map<string, number>();
  for (const action of byApp.values()) counts.set(action, (counts.get(action) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Kỳ Radar nhập từ báo cáo làm tay: hiển thị đúng các cột có trong sheet gốc. */
export default function LegacyRecapView({ data }: { data: RadarRecapLatest }) {
  const meta = data.summary as unknown as RadarLegacySummary | null;
  const counts = uniqueCounts(data.rows);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm space-y-2">
        <p className="font-semibold">
          Báo cáo làm tay · kỳ {data.periodCode} ({viDate(data.date)})
        </p>
        <p className="text-muted-foreground">
          Nhập từ file {meta?.source ?? "Game Radar Recap.xlsx"}
          {meta?.sheets?.length ? `, sheet: ${meta.sheets.join(", ")}` : ""}. Kỳ này làm trước khi có tool nên không
          có Executive Summary tự động
          {meta?.docx ? "; bấm Tải Word để lấy bản Executive Summary gốc." : "."}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {counts.map(([action, n]) => (
            <span
              key={action}
              className="rounded border border-border px-2 py-0.5 text-xs"
              style={{ backgroundColor: actionFill(action) }}
            >
              {action}: <span className="font-semibold tabular-nums">{n}</span>
            </span>
          ))}
        </div>
      </div>

      {BOARDS.map((board) => {
        const rows = data.rows.filter((r) => r.board === board.id).sort((a, b) => a.rank - b.rank);
        if (rows.length === 0) return null;
        const columns = COLUMNS.filter((c) => rows.some((r) => c.value(r).trim() !== ""));
        const hasScreening = rows.some((r) => r.screeningUrl || (r.screeningText ?? "").trim());
        return (
          <div key={board.id} className="space-y-2">
            <h3 className="text-sm font-semibold">
              {board.title} ({data.periodCode})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-[#1F4E79] text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Game</th>
                    {columns.map((c) => (
                      <th key={c.label} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Next Action</th>
                    {hasScreening && <th className="px-3 py-2 text-left font-medium whitespace-nowrap">AI Screening</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.board}-${row.rank}`} className="border-t border-border align-top">
                      <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                      <td className="px-3 py-2 min-w-44">
                        <a
                          href={`https://www.taptap.cn/app/${row.appId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:underline"
                        >
                          {row.title}
                        </a>
                        {row.titleEn && <p className="text-xs text-muted-foreground">{row.titleEn}</p>}
                      </td>
                      {columns.map((c) => (
                        <td key={c.label} className={`px-3 py-2 ${c.className ?? ""}`}>
                          {c.value(row) || "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2 min-w-48" style={{ backgroundColor: actionFill(row.nextAction) }}>
                        {row.nextActionRaw || row.nextAction}
                      </td>
                      {hasScreening && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.screeningUrl ? (
                            <a href={row.screeningUrl} className="text-primary underline-offset-2 hover:underline">
                              {row.analysisScore != null ? `${Math.round(row.analysisScore)} · Xem chi tiết` : "Xem chi tiết"}
                            </a>
                          ) : (
                            row.screeningText || "—"
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
