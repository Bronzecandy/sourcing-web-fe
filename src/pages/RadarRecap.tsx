import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, FileSpreadsheet, FileText } from "lucide-react";
import { downloadRadarFile, fetchRadarLatest } from "@/services/api";
import { cn } from "@/lib/utils";

const COUNT_KEYS = ["Test Viable", "Monitor - High", "Monitor - Mid", "Monitor - Low", "Temp. Ignore", "Drop"];

export default function RadarRecap() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["radar-latest"],
    queryFn: fetchRadarLatest,
  });
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"docx" | "xlsx" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const copyText = data?.summary?.copyText ?? "";

  const copy = async () => {
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Game Radar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Executive Summary và recap top 20 Reserve / New Launch. Kỳ mới chạy sau precompute 10:15.
          </p>
        </div>
        {data?.summary && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Đã copy" : "Copy để gửi"}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void download("docx")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {busy === "docx" ? "Đang tải…" : "Tải Word"}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void download("xlsx")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60",
              )}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {busy === "xlsx" ? "Đang tải…" : "Tải Excel"}
            </button>
          </div>
        )}
      </div>

      {note && <p className="text-sm text-destructive">{note}</p>}

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải kỳ mới nhất…</p>}
      {error && (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Không tải được Radar"}</p>
      )}
      {!isLoading && !error && !data && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Chưa có kỳ nào. Bản đầu tiên được tạo sau cron 10:15 (Reserve tăng trưởng, Reserve quy mô, New Launch).
        </div>
      )}

      {data?.summary && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kỳ {data.summary.dateLabel} · mã {data.periodCode}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Bảng</th>
                  {COUNT_KEYS.map((k) => (
                    <th key={k} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.summary.counts.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <td className="px-3 py-2">{row.label}</td>
                    {COUNT_KEYS.map((k) => (
                      <td key={k} className="px-3 py-2 text-right tabular-nums">
                        {row.counts[k] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <article className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Download className="h-4 w-4" />
              Nội dung gửi
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{copyText}</pre>
          </article>
        </div>
      )}
    </div>
  );
}
