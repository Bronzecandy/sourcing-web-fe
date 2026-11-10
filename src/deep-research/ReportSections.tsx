import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Check, CircleDashed, ExternalLink, HelpCircle, Lightbulb, Loader2, Minus, ShieldAlert, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  compact,
  domainOf,
  metricValue,
  monthLabel,
  scoreTone,
  signedPct,
  stageLabel,
  usd,
  VERDICT_STYLE,
  verdictLabel,
} from "./format";
import type { Country, MarketReport, MetricScore, RunDto, StageState, SteamReport, SynthesisDto, SynthesisItem, TapTapSnapshot, WebReport } from "./types";

type T = (vi: string, en: string) => string;

export function Card({ title, right, children, className }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold flex items-center gap-2">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function ScoreBadge({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="text-right">
      <div className={cn("text-2xl font-bold leading-none", scoreTone(value))}>{value == null ? "—" : value.toFixed(0)}</div>
      <div className="text-[10px] uppercase text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Bar100({ value }: { value: number | null }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        {value != null && <div className={cn("h-full rounded-full", v >= 70 ? "bg-up" : v >= 45 ? "bg-stable" : "bg-down")} style={{ width: `${Math.min(100, Math.max(0, v))}%` }} />}
      </div>
      <span className="w-7 text-xs text-muted-foreground">{value == null ? "—" : v.toFixed(0)}</span>
    </div>
  );
}

const STAGE_ICON: Record<StageState["status"], ReactNode> = {
  pending: <CircleDashed className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  done: <Check className="h-4 w-4 text-up" />,
  skipped: <Minus className="h-4 w-4 text-muted-foreground" />,
  failed: <X className="h-4 w-4 text-down" />,
};

export function StageProgress({ run, t }: { run: RunDto; t: T }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {run.stages.map((s) => (
        <li key={s.key} className={cn("flex items-start gap-2 rounded-lg border p-2.5", s.status === "running" ? "border-primary/40 bg-primary/5" : "border-border")}>
          <span className="mt-0.5">{STAGE_ICON[s.status]}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium">{stageLabel(s.key, t)}</div>
            {s.note && <div className="text-xs text-muted-foreground break-words">{s.note}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

const TAPTAP_REF: Record<string, [string, string]> = {
  composite: ["TapTap: điểm tổng hợp", "TapTap: composite"],
  momentum: ["TapTap: điểm tăng trưởng", "TapTap: momentum"],
  audience: ["TapTap: quy mô", "TapTap: audience"],
  rating: ["TapTap: đánh giá", "TapTap: rating"],
  rankQuality: ["TapTap: chất lượng hạng", "TapTap: rank quality"],
  rank: ["TapTap: hạng", "TapTap: rank"],
  growth: ["TapTap: tăng trưởng", "TapTap: growth"],
  fans: ["TapTap: fans", "TapTap: fans"],
  reserve: ["TapTap: lượt đặt trước", "TapTap: reservations"],
  downloads: ["TapTap: lượt tải", "TapTap: downloads"],
};
const ST_REF: Record<string, [string, string]> = {
  rankRevenue: ["ST: hạng doanh thu", "ST: revenue rank"],
  rankDau: ["ST: hạng DAU", "ST: DAU rank"],
  share: ["ST: thị phần nhóm", "ST: group share"],
  trend: ["ST: xu hướng nhóm", "ST: group trend"],
  monthly: ["ST: số liệu tháng", "ST: monthly data"],
};

function useRefLabel(run: RunDto, lang: "vi" | "en") {
  return useMemo(() => {
    const metrics = new Map<string, MetricScore>();
    for (const m of run.market?.metrics ?? []) metrics.set(`st.${m.key}`, m);
    for (const m of run.steam?.metrics ?? []) metrics.set(`steam.${m.key}`, m);
    return (ref: string): string => {
      if (/^F\d+$/.test(ref)) return ref;
      const m = metrics.get(ref);
      if (m) return `${ref.startsWith("st.") ? "ST" : "Steam"}: ${lang === "vi" ? m.label : m.labelEn}`;
      const [src, key] = ref.split(".");
      const pair = src === "taptap" ? TAPTAP_REF[key] : src === "st" ? ST_REF[key] : undefined;
      return pair ? pair[lang === "vi" ? 0 : 1] : ref;
    };
  }, [run.market, run.steam, lang]);
}

function RefChips({ refs, label }: { refs: string[]; label: (r: string) => string }) {
  if (!refs.length) return null;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {refs.map((r) =>
        /^F\d+$/.test(r) ? (
          <a key={r} href={`#finding-${r}`} className="rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary hover:underline">
            {r}
          </a>
        ) : (
          <span key={r} className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
            {label(r)}
          </span>
        ),
      )}
    </span>
  );
}

function ItemList({ items, icon, label }: { items: SynthesisItem[]; icon: ReactNode; label: (r: string) => string }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0">{icon}</span>
          <span>
            {it.text}
            <RefChips refs={it.refs} label={label} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SummarySection({ run, summary, lang, t }: { run: RunDto; summary: SynthesisDto; lang: "vi" | "en"; t: T }) {
  const label = useRefLabel(run, lang);
  return (
    <Card
      title={
        <>
          <Sparkles className="h-5 w-5 text-primary" /> {t("Kết luận", "Assessment")}
        </>
      }
      right={<span className={cn("rounded-lg border px-3 py-1 text-sm font-semibold", VERDICT_STYLE[summary.verdict])}>{verdictLabel(summary.verdict, t)}</span>}
    >
      <p className="text-base font-medium leading-relaxed">{summary.headline}</p>
      {summary.patternRead && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{summary.patternRead}</p>}
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("Điểm chính", "Key insights")}</h3>
          <ItemList items={summary.insights} icon={<Check className="h-4 w-4 text-up" />} label={label} />
        </div>
        <div className="space-y-5">
          {summary.risks.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t("Rủi ro", "Risks")}</h3>
              <ItemList items={summary.risks} icon={<ShieldAlert className="h-4 w-4 text-down" />} label={label} />
            </div>
          )}
          {summary.opportunities.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t("Cơ hội", "Opportunities")}</h3>
              <ItemList items={summary.opportunities} icon={<Lightbulb className="h-4 w-4 text-amber-500" />} label={label} />
            </div>
          )}
        </div>
      </div>
      {summary.verify.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <HelpCircle className="h-4 w-4 text-amber-600" /> {t("Cần xác minh", "Please verify")}
          </h3>
          <ul className="space-y-1.5 text-sm">
            {summary.verify.map((v, i) => (
              <li key={i}>
                <span className="font-medium">{v.question}</span>
                {v.why && <span className="text-muted-foreground"> — {v.why}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.nextStep && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">{t("Bước tiếp theo:", "Next step:")}</span> {summary.nextStep}
        </p>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        {t("Mô hình", "Model")}: {summary.model} · {t("AI chỉ dùng số liệu bên dưới và finding có nguồn.", "The AI only uses the data below and sourced findings.")}
      </p>
    </Card>
  );
}

export function TapTapSection({ taptap, t }: { taptap: TapTapSnapshot; t: T }) {
  const p = taptap.potential;
  const stat = (label: string, value: ReactNode) => (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
  return (
    <Card title="TapTap" right={p && <span className="text-xs text-muted-foreground">{`${p.segment} · ${p.days} ${t("ngày", "days")} · ${p.platform}`}</span>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat(t("Điểm tổng hợp", "Composite"), p?.compositeScore?.toFixed(1) ?? "—")}
        {stat(t("Điểm tăng trưởng", "Momentum"), p?.momentumScore?.toFixed(1) ?? "—")}
        {stat(t("Hạng hiện tại", "Current rank"), p?.currentRank != null ? `#${p.currentRank}` : "—")}
        {stat(t("Tăng trưởng kỳ", "Period growth"), p?.audienceGrowthRate != null ? signedPct(p.audienceGrowthRate) : "—")}
        {stat(t("Đánh giá", "Rating"), taptap.rating ?? "—")}
        {stat("Fans", compact(taptap.fans))}
        {stat(t("Đặt trước", "Reservations"), compact(taptap.reserveCount))}
        {stat(t("Lượt tải", "Downloads"), compact(taptap.downloadCount))}
      </div>
      {!p && <p className="mt-2 text-xs text-muted-foreground">{t("Game không có trong bảng Potential lúc chạy.", "Game was not on the Potential board at run time.")}</p>}
      {taptap.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {taptap.tags.slice(0, 12).map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function MetricTable({ metrics, showCohort, lang, t }: { metrics: MetricScore[]; showCohort: boolean; lang: "vi" | "en"; t: T }) {
  const sorted = [...metrics].sort((a, b) => b.weight - a.weight);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase text-muted-foreground">
            <th className="py-1.5 pr-3 font-medium">{t("Chỉ số", "Metric")}</th>
            <th className="py-1.5 pr-3 text-right font-medium">{t("Giá trị", "Value")}</th>
            {showCohort && <th className="py-1.5 pr-3 text-right font-medium">{t("Trung vị nhóm", "Cohort median")}</th>}
            {showCohort && <th className="py-1.5 pr-3 text-right font-medium">Percentile</th>}
            <th className="py-1.5 pr-3 font-medium">{t("Điểm", "Score")}</th>
            <th className="py-1.5 text-right font-medium">{t("Trọng số", "Weight")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((m) => (
            <tr key={m.key} className={cn(m.weight === 0 && "text-muted-foreground")}>
              <td className="py-1.5 pr-3">
                {lang === "vi" ? m.label : m.labelEn}
                {m.note && <div className="text-[11px] text-muted-foreground">{m.note}</div>}
              </td>
              <td className="py-1.5 pr-3 text-right font-medium whitespace-nowrap">{metricValue(m)}</td>
              {showCohort && (
                <td className="py-1.5 pr-3 text-right text-muted-foreground whitespace-nowrap">
                  {m.cohortMedian == null ? "—" : metricValue({ unit: m.unit, value: m.cohortMedian })}
                </td>
              )}
              {showCohort && <td className="py-1.5 pr-3 text-right whitespace-nowrap">{m.percentile == null ? "—" : `P${m.percentile.toFixed(0)}`}</td>}
              <td className="py-1.5 pr-3">
                <Bar100 value={m.score} />
              </td>
              <td className="py-1.5 text-right text-xs">{m.weight > 0 ? `${Math.round(m.weight * 100)}%` : t("tham khảo", "info")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const axisTick = { fontSize: 11 };

export function MarketSection({ market, lang, t }: { market: MarketReport; lang: "vi" | "en"; t: T }) {
  const countries = (Object.keys(market.countries) as Country[]).filter((c) => (market.countries[c]?.monthly.length ?? 0) > 0);
  const [country, setCountry] = useState<Country>(market.primaryCountry);
  const series = market.countries[country];
  const monthly = (series?.monthly ?? []).map((m) => ({ ...m, label: monthLabel(m.month) }));
  const daily = series?.daily ?? [];
  const b = market.benchmark;
  const p = market.pattern;
  const tax = market.taxonomy;

  return (
    <Card
      title={
        <>
          {market.iconUrl && <img src={market.iconUrl} alt="" className="h-6 w-6 rounded" referrerPolicy="no-referrer" />}
          Sensor Tower — {market.name}
        </>
      }
      right={
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {t("Độ tin cậy", "Confidence")}: {market.confidence}
          </span>
          <ScoreBadge value={market.marketScore} label="Market score" />
        </div>
      }
    >
      <p className="text-xs text-muted-foreground">
        {[market.publisher, [tax.class, tax.genre, tax.subgenre].filter(Boolean).join(" › "), tax.artStyle, tax.setting].filter(Boolean).join(" · ")}
        {market.releaseDates.earliest && ` · ${t("ra mắt", "released")} ${market.releaseDates.earliest}`}
      </p>

      <div className="mt-4 rounded-lg border border-border p-3">
        <div className="text-sm font-semibold">
          Pattern: {lang === "vi" ? p.label : p.labelEn}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{lang === "vi" ? p.summary : p.summaryEn}</p>
        {(lang === "vi" ? p.watch : p.watchEn).length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            {(lang === "vi" ? p.watch : p.watchEn).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("Theo tháng", "Monthly")}</h3>
            {countries.length > 1 && (
              <div className="flex overflow-hidden rounded-lg border border-border text-xs">
                {countries.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCountry(c)}
                    className={cn("px-2.5 py-1 font-medium", c === country ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          {monthly.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={monthly} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis yAxisId="rev" tick={axisTick} tickFormatter={(v: number) => usd(v)} width={60} />
                <YAxis yAxisId="dau" orientation="right" tick={axisTick} tickFormatter={(v: number) => compact(v)} width={50} />
                <Tooltip formatter={(v, name) => (name === t("Doanh thu", "Revenue") ? usd(Number(v)) : compact(Number(v)))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="rev" dataKey="revenueUsd" name={t("Doanh thu", "Revenue")} fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Line yAxisId="dau" dataKey="avgDau" name="DAU" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                <Line yAxisId="dau" dataKey="downloads" name={t("Lượt tải", "Downloads")} stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">{t("Không có số liệu tháng.", "No monthly data.")}</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("Theo ngày (120 ngày)", "Daily (120 days)")}</h3>
          {daily.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
                <YAxis yAxisId="rev" tick={axisTick} tickFormatter={(v: number) => usd(v)} width={60} />
                <YAxis yAxisId="dau" orientation="right" tick={axisTick} tickFormatter={(v: number) => compact(v)} width={50} />
                <Tooltip formatter={(v, name) => (name === t("Doanh thu", "Revenue") ? usd(Number(v)) : compact(Number(v)))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="rev" dataKey="revenueUsd" name={t("Doanh thu", "Revenue")} stroke="#6366f1" dot={false} connectNulls />
                <Line yAxisId="dau" dataKey="dau" name="DAU" stroke="#10b981" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">{t("Không có số liệu ngày cho thị trường này.", "No daily data for this market.")}</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">
          {t("Chỉ số so với nhóm", "Metrics vs cohort")}
          {b && (
            <span className="ml-2 font-normal text-xs text-muted-foreground">
              {b.level === "subgenre" ? "Subgenre" : "Genre"} “{b.group}” · {b.country} · {monthLabel(b.month)} · {b.cohortSize} game
            </span>
          )}
        </h3>
        <MetricTable metrics={market.metrics} showCohort lang={lang} t={t} />
      </div>

      {b && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t("Vị trí trong nhóm", "Position in cohort")}</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/40 p-2">
                <div className="text-lg font-bold">{b.rankRevenue != null ? `#${b.rankRevenue}` : "—"}</div>
                <div className="text-[11px] text-muted-foreground">{t("Hạng doanh thu", "Revenue rank")}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <div className="text-lg font-bold">{b.rankDau != null ? `#${b.rankDau}` : "—"}</div>
                <div className="text-[11px] text-muted-foreground">{t("Hạng DAU", "DAU rank")}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <div className="text-lg font-bold">{b.shareOfRevenue != null ? `${b.shareOfRevenue.toFixed(1)}%` : "—"}</div>
                <div className="text-[11px] text-muted-foreground">{t("Thị phần doanh thu", "Revenue share")}</div>
              </div>
            </div>
            <ol className="mt-3 space-y-1 text-sm">
              {b.top.map((g, i) => (
                <li key={g.unifiedId} className={cn("flex justify-between gap-2", g.unifiedId === market.unifiedId && "font-semibold text-primary")}>
                  <span className="truncate">
                    {i + 1}. {g.name}
                  </span>
                  <span className="whitespace-nowrap text-muted-foreground">
                    {usd(g.revenueUsd)} · DAU {compact(g.avgDau)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {b.trend.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t("Doanh thu cả nhóm theo tháng", "Cohort revenue by month")}</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={b.trend.map((x) => ({ ...x, label: monthLabel(x.month) }))} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={axisTick} />
                  <YAxis tick={axisTick} tickFormatter={(v: number) => usd(v)} width={60} />
                  <Tooltip formatter={(v) => usd(Number(v))} />
                  <Line dataKey="revenueUsd" name={t("Doanh thu", "Revenue")} stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {market.notes.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          {market.notes.map((n) => (
            <li key={n} className="flex gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" /> {n}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SteamSection({ steam, lang, t }: { steam: SteamReport; lang: "vi" | "en"; t: T }) {
  const ccu = steam.ccuDaily;
  return (
    <Card
      title={
        <a href={`https://store.steampowered.com/app/${steam.ref.steamAppId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
          Steam — {steam.ref.name} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      }
      right={<ScoreBadge value={steam.steamScore} label="Steam score" />}
    >
      <p className="text-xs text-muted-foreground">
        {[...steam.ref.developers, steam.ref.releaseDate, steam.isFree ? "Free to play" : steam.priceUsd != null ? `$${steam.priceUsd.toFixed(2)}` : null].filter(Boolean).join(" · ")}
        {steam.reviews?.label && ` · ${steam.reviews.label}`}
      </p>
      <div className="mt-4 grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("CCU theo ngày", "Daily CCU")}</h3>
          {ccu.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ccu} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
                <YAxis tick={axisTick} tickFormatter={(v: number) => compact(v)} width={50} />
                <Tooltip formatter={(v) => compact(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="avg" name={t("Trung bình", "Average")} stroke="#6366f1" dot={false} connectNulls />
                <Line dataKey="max" name={t("Cao nhất", "Peak")} stroke="#f59e0b" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">{t("Không có số liệu CCU.", "No CCU data.")}</p>
          )}
          {steam.ranks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {steam.ranks.map((r) => (
                <span key={`${r.name}-${r.scope}`} className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {r.name} ({r.scope}) #{r.value}
                </span>
              ))}
            </div>
          )}
        </div>
        <MetricTable metrics={steam.metrics} showCohort={false} lang={lang} t={t} />
      </div>
      {steam.notes.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          {steam.notes.map((n) => (
            <li key={n} className="flex gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" /> {n}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const SENTIMENT_DOT: Record<string, string> = { positive: "bg-up", negative: "bg-down", neutral: "bg-muted-foreground/50" };

export function WebSection({ web, t }: { web: WebReport; t: T }) {
  const groups: Array<["game" | "company", string]> = [
    ["game", t("Về game", "About the game")],
    ["company", t("Về NPT / NPH", "About the developer / publisher")],
  ];
  return (
    <Card title={t("Báo cáo & bài báo (web search)", "Reports & articles (web search)")} right={<span className="text-xs text-muted-foreground">{web.findings.length} finding</span>}>
      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map(([subject, title]) => {
          const list = web.findings.filter((f) => f.subject === subject);
          return (
            <div key={subject}>
              <h3 className="mb-2 text-sm font-semibold">{title}</h3>
              {list.length === 0 && <p className="text-sm text-muted-foreground">{t("Không có finding có nguồn.", "No sourced findings.")}</p>}
              <ul className="space-y-2.5">
                {list.map((f) => (
                  <li key={f.id} id={`finding-${f.id}`} className="scroll-mt-24 rounded-lg border border-border p-2.5 target:border-primary target:bg-primary/5">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded bg-primary/10 px-1 font-semibold text-primary">{f.id}</span>
                      <span className={cn("h-2 w-2 rounded-full", SENTIMENT_DOT[f.sentiment])} />
                      <span>{f.date}</span>
                      <span className="rounded bg-muted px-1">{categoryLabel(f.category, t)}</span>
                      <a href={f.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-0.5 hover:text-foreground hover:underline">
                        {domainOf(f.url)} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-sm leading-relaxed">{f.claim}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {web.errors.length > 0 && (
        <p className="mt-3 text-xs text-amber-600">
          {t("Một phần tìm kiếm lỗi:", "Some searches failed:")} {web.errors.join(" · ")}
        </p>
      )}
      {web.queries.length > 0 && (
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            {t("Truy vấn đã dùng", "Queries used")} ({web.queries.length})
          </summary>
          <ul className="mt-1 list-disc pl-5">
            {web.queries.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
