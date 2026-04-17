import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Brain, Search, Sparkles, ExternalLink, Clock, Trash2, Globe, Upload, FileSpreadsheet, X } from "lucide-react";
import { triggerExternalAnalysis, triggerCsvAnalysis, deleteAnalysis, fetchAllAnalyses } from "@/services/api";
import { cn, getScoreColor } from "@/lib/utils";
import type { AiAnalysis, AIFeedbackItem, SentimentBreakdown } from "@/types";

const BUCKET_COLORS: Record<string, string> = {
  "Very Negative": "bg-red-500",
  "Negative": "bg-orange-500",
  "Mixed": "bg-amber-500",
  "Positive": "bg-green-500",
  "Very Positive": "bg-emerald-500",
};

const TOPIC_LABELS: Record<string, { label: string; color: string }> = {
  gameplay: { label: "Gameplay", color: "bg-blue-500" },
  graphics: { label: "Graphics", color: "bg-purple-500" },
  story: { label: "Story", color: "bg-amber-500" },
  monetization: { label: "Monetization", color: "bg-red-500" },
  performance: { label: "Performance", color: "bg-emerald-500" },
  community: { label: "Community", color: "bg-cyan-500" },
};

const TIER_LABELS: Record<string, { label: string }> = {
  frequent: { label: "Frequently mentioned" },
  moderate: { label: "Moderately mentioned" },
  rare: { label: "Rarely mentioned" },
};

function sentimentLabel(score: number) {
  if (score >= 80) return { text: "Very Positive", cls: "text-emerald-500" };
  if (score >= 60) return { text: "Positive", cls: "text-green-500" };
  if (score >= 40) return { text: "Mixed", cls: "text-amber-500" };
  if (score >= 20) return { text: "Negative", cls: "text-orange-500" };
  return { text: "Very Negative", cls: "text-red-500" };
}

function FeedbackSection({ items, type }: { items: AIFeedbackItem[]; type: "strength" | "weakness" }) {
  const isStrength = type === "strength";
  const grouped = {
    frequent: items.filter((i) => i.tier === "frequent"),
    moderate: items.filter((i) => i.tier === "moderate"),
    rare: items.filter((i) => i.tier === "rare"),
  };

  return (
    <div className="border border-border/50 rounded-lg p-4">
      <h4 className={cn("text-sm font-medium mb-3 flex items-center gap-1", isStrength ? "text-emerald-500" : "text-red-500")}>
        <span className={cn("w-2 h-2 rounded-full", isStrength ? "bg-emerald-500" : "bg-red-500")} />
        {isStrength ? "Strengths" : "Weaknesses"}
      </h4>
      <div className="space-y-3">
        {(["frequent", "moderate", "rare"] as const).map((tier) => {
          const group = grouped[tier];
          if (group.length === 0) return null;
          return (
            <div key={tier}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{TIER_LABELS[tier].label}</p>
              <ul className="space-y-1.5">
                {group.map((item, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className={cn("mt-0.5 shrink-0", isStrength ? "text-emerald-500" : "text-red-500")}>
                      {isStrength ? "✓" : "✗"}
                    </span>
                    <span className="flex-1 text-muted-foreground">{item.point}</span>
                    <span className={cn(
                      "text-xs font-semibold px-1.5 py-0.5 rounded shrink-0",
                      item.mentionRate >= 30 ? "bg-primary/10 text-primary" :
                      item.mentionRate >= 10 ? "bg-muted text-muted-foreground" :
                      "bg-muted/50 text-muted-foreground/70"
                    )}>
                      {item.mentionRate}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AIAnalysisPage() {
  const [input, setInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<AiAnalysis | null>(null);
  const queryClient = useQueryClient();

  const { data: savedAnalyses = [] } = useQuery({
    queryKey: ["all-analyses"],
    queryFn: fetchAllAnalyses,
    staleTime: 30_000,
  });

  const analyzeMutation = useMutation({
    mutationFn: (val: string) => triggerExternalAnalysis(val),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
      setSelected(data);
    },
  });

  const csvMutation = useMutation({
    mutationFn: (file: File) => triggerCsvAnalysis(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
      setSelected(data);
      setCsvFile(null);
    },
  });

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    analyzeMutation.mutate(trimmed);
  };

  const handleCsvSubmit = () => {
    if (!csvFile) return;
    csvMutation.mutate(csvFile);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.name.endsWith(".txt"))) {
      setCsvFile(file);
    }
  };

  const handleDelete = (idx: number) => {
    const a = savedAnalyses[idx];
    if (!a) return;
    if (a.analyzedAt) {
      deleteAnalysis(a.appId, a.analyzedAt).then(() => {
        queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
        if (selected?.analyzedAt === a.analyzedAt) setSelected(null);
      }).catch(() => {});
    }
  };

  const analyses = savedAnalyses;

  const topicData = selected
    ? Object.entries(selected.topics).map(([key, value]) => ({
        name: TOPIC_LABELS[key]?.label ?? key,
        value,
      }))
    : [];

  const radarData = selected
    ? Object.entries(selected.topics).map(([key, value]) => ({
        subject: TOPIC_LABELS[key]?.label ?? key,
        A: value,
        fullMark: 100,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> AI Review Analysis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Analyze reviews of any TapTap game — enter a URL or App ID to fetch reviews directly from TapTap.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-500" /> Analyze Any Game
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter TapTap URL or App ID (e.g. https://www.taptap.cn/app/209601 or 209601)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={analyzeMutation.isPending || !input.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
          >
            {analyzeMutation.isPending ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Fetching & Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" /> Analyze
              </>
            )}
          </button>
        </div>
        {analyzeMutation.isError && (
          <p className="text-red-500 text-xs mt-2">Error: {(analyzeMutation.error as Error).message}</p>
        )}
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Reviews are fetched live from TapTap's API — this may take 1-2 minutes depending on the number of reviews.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-5 mb-4">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground font-medium">OR</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* CSV Upload */}
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-blue-500" /> Upload a Review File
          </h3>
          {!csvFile ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop a CSV/TSV file here, or <span className="text-primary font-medium">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Supports Google Play, AppFollow, or any CSV with Content, Rating, Date columns
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCsvFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{csvFile.name}</p>
                <p className="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => setCsvFile(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleCsvSubmit}
                disabled={csvMutation.isPending}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
              >
                {csvMutation.isPending ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" /> Analyze File
                  </>
                )}
              </button>
            </div>
          )}
          {csvMutation.isError && (
            <p className="text-red-500 text-xs mt-2">Error: {(csvMutation.error as Error).message}</p>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Analysis List */}
        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Results ({analyses.length})
          </h2>
          {analyses.length > 0 ? (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {analyses.map((a, idx) => (
                <div
                  key={`${a.appId}-${a.analyzedAt}`}
                  className={cn(
                    "bg-card rounded-xl border border-border p-4 cursor-pointer transition-all hover:shadow-md group",
                    selected === a && "ring-2 ring-primary/50 border-primary/30"
                  )}
                  onClick={() => setSelected(a)}
                >
                  <div className="flex items-start gap-3">
                    {a.iconUrl ? (
                      <img
                        src={a.iconUrl}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Brain className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {a.gameName || `App #${a.appId}`}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs font-bold", getScoreColor(a.sentimentScore))}>
                          {a.sentimentScore}/100
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {a.reviewsAnalyzed} reviews
                        </span>
                        {a.source === "external" && (
                          <span className="text-[10px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded">
                            External
                          </span>
                        )}
                        {a.source === "csv-upload" && (
                          <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                            CSV Upload
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No analyses yet.</p>
              <p className="text-muted-foreground text-xs mt-1">Enter a TapTap URL or App ID above to get started.</p>
            </div>
          )}
        </div>

        {/* Right: Detail View */}
        {selected ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Header */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start gap-4">
                {selected.iconUrl ? (
                  <img
                    src={selected.iconUrl}
                    alt=""
                    className="w-16 h-16 rounded-2xl object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                    <Brain className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {selected.gameName || `App #${selected.appId}`}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>App ID: {selected.appId}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selected.analyzedAt ? new Date(selected.analyzedAt).toLocaleString() : "N/A"}
                    </span>
                    {selected.dateRangeStart && selected.dateRangeEnd && (
                      <span>Reviews: {selected.dateRangeStart} — {selected.dateRangeEnd}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-2xl font-bold", sentimentLabel(selected.sentimentScore).cls)}>
                    {selected.sentimentScore}
                  </div>
                  <div className={cn("text-xs font-medium", sentimentLabel(selected.sentimentScore).cls)}>
                    {sentimentLabel(selected.sentimentScore).text}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Reviews Analyzed" value={selected.reviewsAnalyzed} />
              <StatCard label="Sentiment Score" value={`${selected.sentimentScore}/100`} />
              <StatCard label="Strengths" value={selected.strengths.length} />
              <StatCard label="Weaknesses" value={selected.weaknesses.length} />
            </div>

            {/* Bucket Distribution */}
            {selected.bucketCounts && Object.keys(selected.bucketCounts).length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h4 className="text-sm font-medium mb-3">Review Distribution</h4>
                <div className="flex rounded-lg overflow-hidden h-6">
                  {Object.entries(selected.bucketCounts).map(([bucket, count]) => {
                    const total = Object.values(selected.bucketCounts).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={bucket}
                        className={cn("flex items-center justify-center text-[10px] text-white font-medium", BUCKET_COLORS[bucket] ?? "bg-gray-500")}
                        style={{ width: `${pct}%` }}
                        title={`${bucket}: ${count} (${pct.toFixed(1)}%)`}
                      >
                        {pct >= 8 ? count : ""}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {Object.entries(selected.bucketCounts).filter(([, c]) => c > 0).map(([bucket, count]) => (
                    <span key={bucket} className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className={cn("w-2 h-2 rounded-full", BUCKET_COLORS[bucket] ?? "bg-gray-500")} />
                      {bucket}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sentiment Breakdown */}
            {selected.sentimentBreakdown && (
              <SentimentBreakdownCard breakdown={selected.sentimentBreakdown} score={selected.sentimentScore} />
            )}

            {/* Summary + Trend */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h4 className="text-sm font-medium mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">{selected.summary}</p>
              {selected.recentTrend && (
                <>
                  <h4 className="text-sm font-medium mt-4 mb-2">Recent Trend</h4>
                  <p className="text-sm text-muted-foreground">{selected.recentTrend}</p>
                </>
              )}
            </div>

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeedbackSection items={selected.strengths} type="strength" />
              <FeedbackSection items={selected.weaknesses} type="weakness" />
            </div>

            {/* Topics */}
            {topicData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card rounded-xl border border-border p-5">
                  <h4 className="text-sm font-medium mb-3">Topic Relevance</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topicData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card rounded-xl border border-border p-5">
                  <h4 className="text-sm font-medium mb-3">Topic Radar</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-purple-500/60" />
              </div>
              <p className="text-muted-foreground text-sm">Select an analysis result to view details</p>
              <p className="text-muted-foreground text-xs mt-1">or analyze a new game above</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

const CRITERIA_META = [
  { key: "ratingDistribution" as const, label: "Rating Distribution", weight: "30%", icon: "⭐", desc: "Weighted average of star ratings" },
  { key: "textSentiment" as const, label: "Text Sentiment", weight: "35%", icon: "💬", desc: "Tone and language in review text" },
  { key: "issueSeverity" as const, label: "Issue Severity", weight: "20%", icon: "🔧", desc: "How critical are reported issues (higher = less severe)" },
  { key: "trendMomentum" as const, label: "Trend Momentum", weight: "15%", icon: "📈", desc: "Are recent reviews improving?" },
];

function criterionColor(score: number) {
  if (score >= 75) return "text-emerald-500";
  if (score >= 50) return "text-green-500";
  if (score >= 35) return "text-amber-500";
  return "text-red-500";
}

function criterionBg(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-green-500";
  if (score >= 35) return "bg-amber-500";
  return "bg-red-500";
}

function SentimentBreakdownCard({ breakdown, score }: { breakdown: SentimentBreakdown; score: number }) {
  const sent = sentimentLabel(score);
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Sentiment Score Breakdown</h4>
        <div className="flex items-center gap-2">
          <span className={cn("text-xl font-bold", sent.cls)}>{score}/100</span>
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
            score >= 60 ? "bg-emerald-500/10 text-emerald-500" : score >= 40 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
          )}>{sent.text}</span>
        </div>
      </div>
      <div className="space-y-3">
        {CRITERIA_META.map((c) => {
          const criterion = breakdown[c.key];
          if (!criterion) return null;
          return (
            <div key={c.key} className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  <span>{c.icon}</span> {c.label}
                  <span className="text-muted-foreground font-normal">({c.weight})</span>
                </span>
                <span className={cn("text-sm font-bold", criterionColor(criterion.score))}>
                  {criterion.score}/100
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                <div className={cn("h-full rounded-full transition-all", criterionBg(criterion.score))} style={{ width: `${criterion.score}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{criterion.reasoning}</p>
            </div>
          );
        })}
        {breakdown.formula && (
          <p className="text-[11px] text-muted-foreground/80 italic border-t border-border/30 pt-2">
            {breakdown.formula}
          </p>
        )}
      </div>
    </div>
  );
}
