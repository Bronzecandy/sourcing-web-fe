import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Play, RefreshCw, Telescope } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnGhost, btnPrimary } from "@/lib/button-classes";
import { useUiCopy } from "@/lib/use-ui-copy";
import { continueDeepResearch, fetchAppOverview, fetchRun, startDeepResearch } from "./api";
import { runStatusLabel, timeAgo, VERDICT_STYLE, verdictLabel } from "./format";
import { MappingPanel } from "./MappingPanel";
import { Card, MarketSection, StageProgress, SteamSection, SummarySection, TapTapSection, WebSection } from "./ReportSections";
import type { AppOverview, MappingDto, RunContext, RunDto, RunStatus } from "./types";

const ACTIVE: RunStatus[] = ["queued", "running"];

function parseContext(params: URLSearchParams): RunContext | null {
  const days = Number(params.get("days"));
  const platform = params.get("platform");
  const segment = params.get("segment");
  if (![7, 14, 30].includes(days)) return null;
  if (platform !== "combined" && platform !== "android" && platform !== "ios") return null;
  if (segment !== "reserve" && segment !== "launched") return null;
  return { days, platform, segment };
}

function useElapsed(since: string | null, active: boolean): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!since || !active) return null;
  const s = Math.max(0, Math.round((now - new Date(since).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function DeepResearchPage() {
  const { appId: rawId } = useParams();
  const appId = Number(rawId);
  const valid = Number.isSafeInteger(appId) && appId > 0;
  const [params, setParams] = useSearchParams();
  const ctx = useMemo(() => parseContext(params), [params]);
  const runParam = params.get("run");
  const { t, lang } = useUiCopy();
  const qc = useQueryClient();
  const overviewKey = ["deep-research", "app", appId];

  const overview = useQuery({ queryKey: overviewKey, queryFn: () => fetchAppOverview(appId), enabled: valid });
  const runId = runParam ?? overview.data?.latest?.id ?? null;
  const run = useQuery({
    queryKey: ["deep-research", "run", runId],
    queryFn: () => fetchRun(runId!),
    enabled: Boolean(runId),
    initialData: overview.data?.latest && overview.data.latest.id === runId ? overview.data.latest : undefined,
    refetchInterval: (q) => (q.state.data && ACTIVE.includes(q.state.data.status) ? 3000 : false),
  });
  const r = run.data;
  const status = r?.status;

  useEffect(() => {
    if (status && !ACTIVE.includes(status)) {
      void qc.invalidateQueries({ queryKey: ["deep-research", "app", appId] });
      void qc.invalidateQueries({ queryKey: ["deep-research", "market-summary"] });
    }
  }, [status, appId, qc]);

  const selectRun = (id: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set("run", id);
        return next;
      },
      { replace: true },
    );

  const start = useMutation({
    mutationFn: () => startDeepResearch(appId, ctx ?? r?.context ?? null),
    onSuccess: (dto) => {
      qc.setQueryData(["deep-research", "run", dto.id], dto);
      selectRun(dto.id);
      void qc.invalidateQueries({ queryKey: overviewKey });
    },
  });
  const cont = useMutation({
    mutationFn: () => continueDeepResearch(r!.id),
    onSuccess: (dto) => qc.setQueryData(["deep-research", "run", dto.id], dto),
  });

  const onMappingSaved = (m: MappingDto) => {
    qc.setQueryData<AppOverview>(overviewKey, (old) => (old ? { ...old, mapping: m } : old));
    void qc.invalidateQueries({ queryKey: ["deep-research", "market-summary"] });
  };

  const elapsed = useElapsed(r?.startedAt ?? r?.createdAt ?? null, Boolean(status && ACTIVE.includes(status)));

  if (!valid) return <p className="text-sm text-muted-foreground">{t("appId không hợp lệ", "Invalid appId")}</p>;
  if (overview.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (overview.error || !overview.data) {
    return <p className="text-sm text-destructive">{(overview.error as Error | null)?.message ?? t("Không tải được dữ liệu", "Failed to load")}</p>;
  }

  const o = overview.data;
  const mapping = o.mapping;
  const busy = Boolean(status && ACTIVE.includes(status));
  const needsMapping = status === "needs_mapping";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/potential" className={cn(btnGhost, "mt-1 p-2")} title={t("Về Potential", "Back to Potential")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {o.iconUrl ? (
            <img src={o.iconUrl} alt="" className="h-14 w-14 rounded-xl" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-xl font-bold text-primary">{o.title.charAt(0)}</div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Telescope className="h-4 w-4" /> Deep Research
            </div>
            <h1 className="text-2xl font-bold truncate">{o.title}</h1>
            <p className="text-sm text-muted-foreground">
              {[o.developers.map((d) => d.name).join(" / "), o.releaseDate && `${t("ra mắt", "released")} ${o.releaseDate}`].filter(Boolean).join(" · ")}
              {" · "}
              <Link to={`/game/${appId}`} className="hover:underline">
                {t("Chi tiết TapTap", "TapTap detail")}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {o.runs.length > 0 && (
            <select
              value={runId ?? ""}
              onChange={(e) => selectRun(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              title={t("Lịch sử chạy", "Run history")}
            >
              {o.runs.map((x) => (
                <option key={x.id} value={x.id}>
                  {new Date(x.createdAt).toLocaleString(lang === "vi" ? "vi-VN" : "en-GB", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                  {x.verdict ? verdictLabel(x.verdict, t) : runStatusLabel(x.status, t)}
                  {x.createdByName ? ` · ${x.createdByName}` : ""}
                </option>
              ))}
            </select>
          )}
          <button type="button" className={cn(btnPrimary, "px-4 py-2")} disabled={busy || start.isPending} onClick={() => start.mutate()}>
            {busy || start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : r ? <RefreshCw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {r ? t("Chạy lại", "Run again") : t("Chạy Deep Research", "Run Deep Research")}
          </button>
        </div>
      </div>
      {start.error && <p className="text-sm text-destructive">{(start.error as Error).message}</p>}

      {!r && (
        <Card title={t("Chưa có lần chạy nào", "No runs yet")}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(
              "Deep Research ghép game với Sensor Tower / Steam (tự động hoặc bạn chọn), đọc xu hướng doanh thu, DAU, lượt tải và so với các game cùng subgenre theo pattern của genre, tìm báo cáo tài chính và bài báo về game cùng NPT/NPH bằng web search có nguồn, rồi AI tổng hợp kết luận. Mỗi lần chạy mất khoảng 1–3 phút và được lưu lại cho mọi người xem.",
              "Deep Research maps the game to Sensor Tower / Steam (automatically or with your pick), reads revenue, DAU and download trends against same-subgenre games using the genre pattern, finds financial reports and articles about the game and its developer/publisher via sourced web search, then has the AI synthesise an assessment. A run takes about 1–3 minutes and is saved for everyone.",
            )}
          </p>
        </Card>
      )}

      {r && (
        <Card
          title={
            <>
              {t("Tiến trình", "Progress")}
              <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", r.verdict ? VERDICT_STYLE[r.verdict] : "bg-muted text-muted-foreground")}>
                {runStatusLabel(r.status, t)}
                {elapsed && ` · ${elapsed}`}
              </span>
            </>
          }
          right={
            <span className="text-xs text-muted-foreground">
              {r.createdByName && `${r.createdByName} · `}
              {timeAgo(r.createdAt, t)}
              {r.context && ` · ${r.context.segment} · ${r.context.days} ${t("ngày", "days")} · ${r.context.platform}`}
            </span>
          }
        >
          <StageProgress run={r} t={t} />
          {r.error && <p className="mt-3 text-sm text-destructive">{r.error}</p>}
        </Card>
      )}

      {needsMapping && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/40">
          <span>
            {mapping.st.status === "unmapped"
              ? t("Chọn game Sensor Tower phù hợp bên dưới (hoặc “Không có trên Sensor Tower”) rồi tiếp tục.", "Pick the matching Sensor Tower game below (or “Not on Sensor Tower”), then continue.")
              : t("Đã chọn mapping. Có thể chọn thêm Steam rồi tiếp tục phân tích.", "Mapping chosen. Optionally pick Steam, then continue.")}
          </span>
          <button
            type="button"
            className={cn(btnPrimary, "px-4 py-2")}
            disabled={mapping.st.status === "unmapped" || cont.isPending}
            onClick={() => cont.mutate()}
          >
            {cont.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {t("Tiếp tục phân tích", "Continue analysis")}
          </button>
          {cont.error && <p className="w-full text-destructive">{(cont.error as Error).message}</p>}
        </div>
      )}

      <MappingPanel appId={appId} mapping={mapping} candidates={r?.candidates ?? null} needsMapping={needsMapping} onSaved={onMappingSaved} t={t} />

      {r && <RunReport run={r} lang={lang} t={t} />}
    </div>
  );
}

function RunReport({ run, lang, t }: { run: RunDto; lang: "vi" | "en"; t: (vi: string, en: string) => string }) {
  return (
    <>
      {run.summary && <SummarySection run={run} summary={run.summary} lang={lang} t={t} />}
      {run.taptap && <TapTapSection taptap={run.taptap} t={t} />}
      {run.market && <MarketSection market={run.market} lang={lang} t={t} />}
      {run.steam && <SteamSection steam={run.steam} lang={lang} t={t} />}
      {run.web && <WebSection web={run.web} t={t} />}
    </>
  );
}
