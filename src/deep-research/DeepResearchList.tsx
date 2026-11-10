import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Telescope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";
import { fetchRuns } from "./api";
import { runStatusLabel, scoreTone, timeAgo, VERDICT_STYLE, verdictLabel } from "./format";

export default function DeepResearchList() {
  const { t } = useUiCopy();
  const runs = useQuery({
    queryKey: ["deep-research", "runs"],
    queryFn: () => fetchRuns(150),
    refetchInterval: (q) => (q.state.data?.some((r) => r.status === "queued" || r.status === "running") ? 5000 : false),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Telescope className="h-6 w-6 text-primary" /> Deep Research
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Các lần nghiên cứu sâu đã chạy (dùng chung cho mọi người). Chạy mới từ nút kính viễn vọng trên bảng Potential.",
            "All deep research runs (shared). Start a new one from the telescope button on the Potential board.",
          )}
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {runs.isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : runs.error ? (
          <p className="p-6 text-sm text-destructive">{(runs.error as Error).message}</p>
        ) : !runs.data?.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {t("Chưa có lần chạy nào. Vào ", "No runs yet. Go to ")}
            <Link to="/potential" className="text-primary hover:underline">
              Potential
            </Link>
            {t(" và bấm nút Deep Research ở một game.", " and press Deep Research on a game.")}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium">{t("Kết luận", "Verdict")}</th>
                <th className="px-4 py-3 font-medium text-right">Market score</th>
                <th className="px-4 py-3 font-medium">{t("Trạng thái", "Status")}</th>
                <th className="px-4 py-3 font-medium">{t("Người chạy", "By")}</th>
                <th className="px-4 py-3 font-medium">{t("Thời gian", "When")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.data.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <Link to={`/deep-research/${r.appId}?run=${r.id}`} className="flex items-center gap-2 font-medium hover:underline">
                      {r.iconUrl ? (
                        <img src={r.iconUrl} alt="" className="h-7 w-7 rounded-lg" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-muted" />
                      )}
                      <span className="max-w-[260px] truncate">{r.title}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.verdict ? (
                      <span className={cn("rounded border px-1.5 py-0.5 text-xs font-semibold", VERDICT_STYLE[r.verdict])}>{verdictLabel(r.verdict, t)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={cn("px-4 py-2.5 text-right font-semibold", scoreTone(r.marketScore))}>{r.marketScore?.toFixed(0) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{runStatusLabel(r.status, t)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.createdByName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{timeAgo(r.createdAt, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
