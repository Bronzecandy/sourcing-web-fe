import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileSpreadsheet, FileText, Play } from "lucide-react";
import {
  downloadRadarFile,
  fetchRadarByDate,
  fetchRadarLatest,
  fetchRadarRuns,
  runRadarNow,
} from "@/services/api";
import type { RadarDigest, RadarRecapRow } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { actionFill, displayName, priorityRank } from "@/lib/radar";
import RadarHistory from "@/components/radar/RadarHistory";
import LegacyRecapView from "@/components/radar/LegacyRecapView";
import RadarExecutiveSummary from "@/components/radar/RadarExecutiveSummary";

const BOARDS = [
  { id: "reserve_growth", title: "Top 20 Reserve - Growth", actionHeader: "Next Action" },
  { id: "reserve_scale", title: "Top 20 Reserve - Scale", actionHeader: "Next Action" },
  { id: "new_launch", title: "Top 20 New Launch", actionHeader: "Recommend Next Action" },
] as const;

const LABEL_DEFINITIONS = [
  "Test Viable: Game có tiềm năng, đã ra mắt chính thức hoặc mở open beta, có thể lên lịch test ngay. Đi kèm sub-tier High/Medium/Low Potential.",
  "Monitor: Game có tiềm năng, nhưng hiện chưa thể test hoặc chưa công bố thời gian ra mắt cụ thể. Đi kèm sub-tier High/Mid/Low Potential.",
  "High Potential: Game có chỉ số cao (trên 1 triệu), NPH top-tier, dòng game phù hợp, không dính redflag, tiềm năng tốt — bao gồm cả game đã có lịch test/ra mắt cụ thể trong thời gian tới LẪN game chưa có lịch cụ thể nhưng đạt đủ tiêu chí điểm/chỉ số/NPH.",
  "Mid/Medium Potential: Điểm potential khá (trên 75), lượt tải/đặt trước ở mức khá (trên 500K), không có barrier lớn về nội dung, cấu hình, flag.",
  "Low Potential: Điểm potential và lượt tải/đặt trước ở mức trung bình (trên 65, trên 100K), hoặc dù điểm/chỉ số cao nhưng có barrier lớn về nội dung/cấu hình/flag (vd cấu hình yêu cầu quá cao, hoặc đã có bên phát hành/bản phát hành quốc tế-Steam tại Việt Nam).",
  "Temporary Ignore: Game thuộc dòng phù hợp nhưng chỉ số vẫn chưa cao, có thể tạm bỏ qua.",
  "Drop: Game có barrier rõ ràng (chủ đề nhạy cảm, gameplay niche hoặc không phù hợp với thị trường), khó có cơ hội phát hành thành công.",
];

function byPriority(a: RadarRecapRow, b: RadarRecapRow): number {
  return priorityRank(a.nextAction) - priorityRank(b.nextAction) || b.score - a.score;
}

function needsScreening(action: string): boolean {
  return action.startsWith("Test Viable") || action.startsWith("Monitor");
}

function screeningText(row: RadarRecapRow): string {
  if (row.screeningUrl && row.analysisScore != null) return `${Math.round(row.analysisScore)} — Xem chi tiết`;
  if (row.screeningUrl) return "Xem chi tiết";
  return needsScreening(row.nextAction) ? "Chưa có — cần screening" : "—";
}

function formatScale(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(2)} triệu`;
  if (n >= 1_000) return `~${Math.round(n / 1_000)}K`;
  return String(n);
}

function scaleText(row: RadarRecapRow): string {
  const m = row.metrics;
  if (!m || m.scale == null) return "—";
  return m.scaleKind === "download" ? `${formatScale(m.scale)} lượt tải` : `đặt trước ${formatScale(m.scale)}`;
}

function trendText(trend: string | null | undefined): string {
  if (trend === "up") return "Tăng";
  if (trend === "down") return "Giảm";
  if (trend === "stable") return "Ổn định";
  return "—";
}

function uniqueByScore(rows: RadarRecapRow[]): RadarRecapRow[] {
  const byApp = new Map<number, RadarRecapRow>();
  for (const row of rows) {
    const prev = byApp.get(row.appId);
    if (!prev || row.score > prev.score) byApp.set(row.appId, row);
  }
  return [...byApp.values()];
}

function hasAlert(row: RadarRecapRow): boolean {
  return Boolean(row.firstInRecap) || (row.toolAdjustments ?? "").includes("ALERT");
}

export default function RadarRecap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "") ? params.get("date")! : "";
  const setSelected = (date: string) => setParams(date ? { date } : {});
  const runs = useQuery({ queryKey: ["radar-runs"], queryFn: fetchRadarRuns });
  const { data, isLoading, error } = useQuery({
    queryKey: ["radar", selected || "latest"],
    queryFn: () => (selected ? fetchRadarByDate(selected) : fetchRadarLatest()),
  });
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"docx" | "xlsx" | "run" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [boardSort, setBoardSort] = useState<"priority" | "rank">("priority");

  const rows = data?.rows ?? [];
  const unique = useMemo(() => uniqueByScore(rows), [rows]);
  const overview = unique.filter((r) => needsScreening(r.nextAction)).sort(byPriority);
  const legacy = data?.status === "imported";
  const summary = !legacy ? (data?.summary ?? null) : null;
  const digest = summary?.digest ?? null;
  const mentioned = new Set((digest?.groups ?? []).flatMap((g) => g.lines.map((l) => l.appId)));
  const carryOver = (summary?.carryOver ?? []).filter((c) => !mentioned.has(c.appId));
  const runInfo = (runs.data ?? []).find((r) => r.date === data?.date);
  const canDownload = Boolean(data && (summary || legacy));
  const hasDocx = runInfo ? runInfo.hasDocx : Boolean(summary);

  const copy = async () => {
    if (!summary?.copyText) return;
    await navigator.clipboard.writeText(summary.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const download = async (kind: "docx" | "xlsx") => {
    if (!data) return;
    setBusy(kind);
    setNote(null);
    try {
      await downloadRadarFile(data.date, kind);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Tải file thất bại");
    } finally {
      setBusy(null);
    }
  };

  const runNow = async () => {
    setBusy("run");
    setNote(null);
    try {
      await runRadarNow();
      setNote("Đã bắt đầu chạy kỳ Radar hôm nay. Kết quả có sau vài phút, kèm tin SeaTalk.");
      void queryClient.invalidateQueries({ queryKey: ["radar-runs"] });
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Không chạy được Radar");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">GAME RADAR & TESTING RECAP</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {summary
              ? `Executive Summary — kỳ ${data?.periodCode} (${summary.dateLabel}) · chạy mỗi tuần`
              : legacy
                ? `Báo cáo làm tay — kỳ ${data?.periodCode}`
                : "Executive Summary và 3 bảng Game Radar Recap, chạy mỗi tuần."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {summary?.copyText && (
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Đã copy" : "Copy để gửi"}
            </button>
          )}
          {canDownload && hasDocx && (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void download("docx")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {busy === "docx" ? "Đang tải…" : legacy ? "Tải Word gốc" : "Tải Word"}
            </button>
          )}
          {canDownload && (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void download("xlsx")}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {busy === "xlsx" ? "Đang tải…" : "Tải Excel"}
            </button>
          )}
          {user?.isPanelAdmin && (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void runNow()}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {busy === "run" ? "Đang gửi…" : "Chạy kỳ ngay"}
            </button>
          )}
        </div>
      </div>

      <RadarHistory runs={runs.data ?? []} activeDate={data?.date ?? null} onSelect={setSelected} />

      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Đang tải kỳ Radar…</p>}
      {error && (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Không tải được Radar"}</p>
      )}
      {!isLoading && !error && !data && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Chưa có kỳ nào. Kỳ Radar chạy mỗi Thứ Hai sau cron 10:15 (Reserve tăng trưởng, Reserve quy mô, New Launch).
        </div>
      )}

      {legacy && data && <LegacyRecapView data={data} />}

      {summary && !digest && <p className="text-sm text-muted-foreground">Kỳ này chưa có Executive Summary.</p>}

      {summary && digest && data && (
        <>
          <RadarExecutiveSummary
            digest={digest}
            periodCode={data.periodCode}
            dateLabel={summary.dateLabel}
            previousPeriodCode={summary.previousPeriodCode}
          />

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">2. Game Overview — High Potential</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Test Viable - High trước, rồi Monitor - High; trong mỗi nhóm xếp theo điểm Potential.
              </p>
            </div>
            <HighlightCards cards={digest.cards} rows={unique} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. Tổng quan kỳ</h2>
            <h3 className="text-sm font-semibold">Bảng đếm số lượng game theo Next Action</h3>
            <CountTable counts={digest.counts} />
            <h3 className="text-sm font-semibold">Bảng tổng quan — game Test Viable / Monitor, xếp theo mức ưu tiên</h3>
            <OverviewTable rows={overview} />
            {carryOver.length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
                <p className="font-semibold">Test Viable kỳ trước đã rời Top 20 (không đưa vào report)</p>
                <ul className="list-disc space-y-1 pl-5">
                  {carryOver.map((c) => (
                    <li key={c.appId}>
                      <a href={c.overviewUrl} className="font-medium text-primary hover:underline">
                        {displayName(c)}
                      </a>{" "}
                      — {c.nextAction} (kỳ {c.previousDate})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <details className="rounded-lg border border-border bg-card p-4 text-sm">
              <summary className="cursor-pointer font-medium">Định nghĩa các nhãn</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {LABEL_DEFINITIONS.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </details>
          </section>

          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">4. Game Radar Recap</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  3 bảng giống 3 sheet của file Excel: Reserve Growth, Reserve Scale, New Launch (game ra mắt trong 60 ngày).
                </p>
              </div>
              <div className="flex rounded-lg border border-border p-1 text-sm">
                {(
                  [
                    ["priority", "Theo mức ưu tiên"],
                    ["rank", "Theo hạng"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBoardSort(key)}
                    className={cn(
                      "rounded-md px-3 py-1.5 transition-colors",
                      boardSort === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {BOARDS.map((board) => (
              <BoardTable
                key={board.id}
                title={`${board.title} (${data.periodCode})`}
                launch={board.id === "new_launch"}
                actionHeader={board.actionHeader}
                rows={rows
                  .filter((row) => row.board === board.id)
                  .sort(
                    (a, b) =>
                      (boardSort === "priority" ? priorityRank(a.nextAction) - priorityRank(b.nextAction) : 0) ||
                      a.rank - b.rank,
                  )}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function GameLink({ row }: { row: { title: string; titleEn?: string; overviewUrl: string } }) {
  return (
    <a href={row.overviewUrl} className="font-semibold text-primary underline-offset-2 hover:underline">
      {displayName(row)}
    </a>
  );
}

const COUNT_GROUPS = [
  { label: "High Potential", actions: ["Test Viable - High Potential", "Monitor - High Potential"] },
  { label: "Mid / Medium", actions: ["Test Viable - Medium Potential", "Monitor - Mid Potential"] },
  { label: "Low", actions: ["Test Viable - Low Potential", "Monitor - Low Potential"] },
];

function CountTable({ counts }: { counts: RadarDigest["counts"] }) {
  const grouped = COUNT_GROUPS.flatMap((g) => g.actions);
  const single = counts.columns.filter((a) => !grouped.includes(a));
  const columns = [...grouped, ...single];
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-[#D9D9D9]">
          <tr>
            <th rowSpan={2} className="px-3 py-2 text-left font-semibold">
              Bảng
            </th>
            {COUNT_GROUPS.map((g) => (
              <th key={g.label} colSpan={2} className="border-l border-border px-3 py-1.5 text-center font-semibold">
                {g.label}
              </th>
            ))}
            {single.map((a) => (
              <th
                key={a}
                rowSpan={2}
                className="whitespace-nowrap border-l border-border px-3 py-2 text-right font-semibold"
                style={{ backgroundColor: actionFill(a) }}
              >
                {a === "Temporary Ignore" ? "Temp. Ignore" : a}
              </th>
            ))}
          </tr>
          <tr>
            {grouped.map((a) => (
              <th
                key={a}
                className="whitespace-nowrap border-l border-border px-3 py-1.5 text-right text-xs font-semibold"
                style={{ backgroundColor: actionFill(a) }}
              >
                {a.startsWith("Test Viable") ? "Test Viable" : "Monitor"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {counts.rows.map((row, i) => (
            <tr
              key={row.label}
              className={cn("border-t border-border", i === counts.rows.length - 1 && "bg-[#EDEDED] font-semibold")}
            >
              <td className="whitespace-nowrap px-3 py-2">{row.label}</td>
              {columns.map((a) => (
                <td
                  key={a}
                  className={cn("border-l border-border px-3 py-2 text-right tabular-nums", !row.counts[a] && "text-muted-foreground")}
                >
                  {row.counts[a] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewTable({ rows }: { rows: RadarRecapRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Không có game Test Viable hoặc Monitor trong kỳ này.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-[#D9D9D9]">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Tên game</th>
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">Next Action</th>
            <th className="px-3 py-2 text-right font-semibold">Điểm</th>
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">Lịch phát hành</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.appId} className={cn("border-t border-border", i % 2 === 1 && "bg-[#F7F7F7]")}>
              <td className="px-3 py-2">
                <GameLink row={row} />
              </td>
              <td className="whitespace-nowrap px-3 py-2" style={{ backgroundColor: actionFill(row.nextAction) }}>
                {row.nextAction}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{row.score.toFixed(1)}</td>
              <td className="px-3 py-2">{row.releaseLabel || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HighlightCards({ cards, rows }: { cards: RadarDigest["cards"]; rows: RadarRecapRow[] }) {
  const byApp = new Map(rows.map((r) => [r.appId, r]));
  const list = cards.flatMap((card) => {
    const row = byApp.get(card.appId);
    return row ? [{ card, row }] : [];
  });
  if (list.length === 0) return <p className="text-sm text-muted-foreground">Kỳ này không có game High Potential.</p>;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {list.map(({ card, row }) => (
        <div
          key={row.appId}
          id={`radar-game-${row.appId}`}
          className="scroll-mt-24 rounded-lg border border-border bg-card p-4 text-sm target:ring-2 target:ring-primary/40"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <GameLink row={row} />
            <span
              className="whitespace-nowrap rounded px-1.5 py-0.5 text-xs"
              style={{ backgroundColor: actionFill(row.nextAction) }}
            >
              {row.nextAction}
            </span>
          </div>
          {card.badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {card.badges.map((b) => (
                <span key={b} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {b}
                </span>
              ))}
            </div>
          )}
          <dl className="mt-3 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5">
            <Field label="Bảng">{card.boards}</Field>
            <Field label="Điểm Potential">{row.score.toFixed(1)}</Field>
            <Field label="AI Screening">
              {row.screeningUrl ? (
                <a href={row.screeningUrl} className="text-primary hover:underline">
                  {screeningText(row)}
                </a>
              ) : (
                screeningText(row)
              )}
            </Field>
            <Field label="Quy mô">{scaleText(row)}</Field>
            <Field label="Genre">{row.genre || "—"}</Field>
            <Field label="Nhà phát hành">
              <span className="font-semibold">{row.publisher || "—"}</span>
            </Field>
            <Field label="Lịch phát hành">{row.releaseLabel || "—"}</Field>
            <Field label="Test nội bộ">{row.internalTest?.label || "Chưa lên plan"}</Field>
            {row.reason && !(row.genre && row.reason.includes(row.genre)) && <Field label="Lý do">{row.reason}</Field>}
            <Field label="Video gameplay">
              {row.videoUrl ? (
                <a href={row.videoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  TapTap video
                </a>
              ) : (
                "Chưa tìm thấy"
              )}
            </Field>
            <Field label="Link TapTap">
              <a
                href={`https://www.taptap.cn/app/${row.appId}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                taptap.cn/app/{row.appId}
              </a>
            </Field>
          </dl>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function BoardTable({
  title,
  actionHeader,
  launch,
  rows,
}: {
  title: string;
  actionHeader: string;
  launch: boolean;
  rows: RadarRecapRow[];
}) {
  const headers = [
    "Game",
    "Tên (EN)",
    "Hạng",
    "Quy mô & TT",
    "Đánh giá",
    "Chất lượng hạng",
    "Tin cậy",
    "Điểm",
    "Xu hướng",
    "Đặt trước/Tải",
    "Insights",
    ...(launch ? ["Ngày ra mắt"] : []),
    actionHeader,
    "Tool Adjustments",
    "AI Screening",
    "Genre",
    "Nhà phát hành",
    ...(launch ? [] : ["Lịch phát hành"]),
  ];
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-[#1F4E79] text-white">
            <tr>
              {headers.map((label) => (
                <th key={label} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const m = row.metrics;
              return (
                <tr key={`${row.board}-${row.rank}`} className="border-t border-border align-top">
                  <td className={cn("px-3 py-2 font-medium whitespace-nowrap", row.firstInRecap && "bg-[#FFF2CC]")}>
                    <a
                      href={`https://www.taptap.cn/app/${row.appId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {row.title}
                    </a>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.titleEn || "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                  <td className="px-3 py-2 tabular-nums">{m?.audienceScore ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{m?.ratingScore ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{m?.rankQualityScore ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{m?.dataConfidence ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{row.score.toFixed(1)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{trendText(m?.trend)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{scaleText(row)}</td>
                  <td className="px-3 py-2 min-w-64">{row.insights || "—"}</td>
                  {launch && <td className="px-3 py-2 whitespace-nowrap">{row.releaseLabel || "—"}</td>}
                  <td className="px-3 py-2 whitespace-nowrap" style={{ backgroundColor: actionFill(row.nextAction) }}>
                    {row.nextAction}
                  </td>
                  <td className={cn("px-3 py-2 min-w-56", hasAlert(row) && "bg-[#FFF2CC]")}>
                    {row.toolAdjustments || "—"}
                  </td>
                  <td
                    className="px-3 py-2 whitespace-nowrap"
                    style={{
                      backgroundColor: !row.screeningUrl && needsScreening(row.nextAction) ? "#FFC7CE" : undefined,
                    }}
                  >
                    {row.screeningUrl ? (
                      <a href={row.screeningUrl} className="text-primary underline-offset-2 hover:underline">
                        {screeningText(row)}
                      </a>
                    ) : (
                      screeningText(row)
                    )}
                  </td>
                  <td className="px-3 py-2">{row.genre || "—"}</td>
                  <td className="px-3 py-2">{row.publisher || "—"}</td>
                  {!launch && <td className="px-3 py-2 whitespace-nowrap">{row.releaseLabel || "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
