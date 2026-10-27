import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { testerApi } from "../../api";
import type { AdminTesterRow } from "../../types";

const STATUS: Record<string, string> = { pending: "Chờ chấm", scoring: "Đang chấm", scored: "Đã chấm", failed: "Lỗi chấm" };

function topScores(row: AdminTesterRow, n = 3): Array<[string, number]> {
  return Object.entries(row.scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export default function AdminTesters() {
  const testers = useQuery({ queryKey: ["tester-admin-testers"], queryFn: testerApi.adminTesters });
  const meta = useQuery({ queryKey: ["tester-admin-meta"], queryFn: testerApi.adminMeta });
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const label = (key: string) => meta.data?.genres.find((g) => g.key === key)?.label ?? key;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (testers.data ?? [])
      .filter((r) => !q || `${r.name} ${r.email} ${r.team ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => (genre ? (b.scores[genre] ?? 0) - (a.scores[genre] ?? 0) : 0));
  }, [testers.data, query, genre]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên, email, team"
            className="w-64 rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm">
          <option value="">Sắp xếp theo dòng game…</option>
          {(meta.data?.genres ?? []).map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">{rows.length} tester</span>
      </div>

      {testers.isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-brand-navy text-white">
              <tr>
                {["Tester", "Team", "Nền tảng", "Thích nhất", genre ? label(genre) : "Điểm cao nhất", "Đang test", "Giờ test", "Benefit còn", "Chấm điểm"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.userId}
                  onClick={() => setOpenId(r.userId)}
                  className={cn("cursor-pointer border-t border-border hover:bg-brand-lavender/20", !r.active && "opacity-50")}
                >
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="px-3 py-2">{r.team ?? "—"}</td>
                  <td className="px-3 py-2">{r.platforms.join(", ") || "—"}</td>
                  <td className="px-3 py-2">{r.favoriteGenre ? label(r.favoriteGenre) : "—"}</td>
                  <td className="px-3 py-2">
                    {genre ? (
                      <span className="font-semibold tabular-nums">{r.scores[genre] ?? 0}</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {topScores(r).map(([g, s]) => (
                          <span key={g} className="rounded-full bg-brand-lavender/50 px-2 py-0.5 text-xs">
                            {label(g)} {s}
                          </span>
                        ))}
                        {topScores(r).length === 0 && "—"}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.stats.activeTests}</td>
                  <td className="px-3 py-2 tabular-nums">{r.stats.completedHours}</td>
                  <td className="px-3 py-2 tabular-nums">{r.stats.availableBenefits}</td>
                  <td className="px-3 py-2 text-xs">{STATUS[r.scoringStatus] ?? r.scoringStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <TesterDrawer userId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function TesterDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["tester-admin-tester", userId],
    queryFn: () => testerApi.adminTester(userId!),
    enabled: Boolean(userId),
  });
  const survey = useQuery({ queryKey: ["tester-survey"], queryFn: testerApi.survey, enabled: Boolean(userId) });
  const d = detail.data;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["tester-admin-testers"] });
    void queryClient.invalidateQueries({ queryKey: ["tester-admin-tester", userId] });
  };

  const rescore = async () => {
    if (!userId) return;
    await testerApi.adminRescore(userId);
    toast.success("Đã xếp lịch chấm lại");
    setTimeout(refresh, 1500);
  };

  const toggleActive = async () => {
    if (!d) return;
    await testerApi.adminUpdateTester(d.userId, { active: !d.active });
    refresh();
  };

  return (
    <Drawer open={Boolean(userId)} onClose={onClose} title={d?.name ?? "Tester"} subtitle={d?.email} size="wide">
      {!d ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void rescore()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5">
              <RefreshCw className="h-4 w-4" /> Chấm lại điểm
            </button>
            <button type="button" onClick={() => void toggleActive()} className="rounded-lg border border-border px-3 py-1.5">
              {d.active ? "Tạm ngưng tester" : "Kích hoạt lại"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Team" value={d.team} />
            <Info label="Văn phòng" value={d.office} />
            <Info label="Nền tảng" value={d.platforms.join(", ")} />
            <Info label="Giờ chơi / tuần" value={d.weeklyPlayLabel} />
            <Info label="Có thể test" value={d.testTimeLabel} />
            <Info label="Chi tiêu" value={d.payTier} />
          </div>

          <section>
            <h3 className="mb-2 font-semibold">Điểm theo dòng game</h3>
            {d.genreScores.length === 0 ? (
              <p className="text-muted-foreground">Chưa có điểm.</p>
            ) : (
              <div className="space-y-2">
                {d.genreScores.map((s) => (
                  <div key={s.genre} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-lg font-bold text-brand-navy">{s.finalScore}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Volume {s.volumeScore} ({s.hours} giờ, {s.matches} trận) · Rank {s.hasRank ? s.rankScore : "không có"}
                      {s.bestRank ? ` (${s.bestRank})` : ""} · Game chính {s.anchorGame || "—"} · Nguồn {s.source}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-xs">{s.rawText}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Đợt test</h3>
            {d.assignments.length === 0 ? (
              <p className="text-muted-foreground">Chưa được gán.</p>
            ) : (
              <ul className="divide-y divide-border">
                {d.assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-1.5">
                    <span>{a.campaign.gameName}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.workloadHours} giờ · {a.completed ? "Hoàn thành" : a.campaign.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {d.answers && survey.data && (
            <section>
              <h3 className="mb-2 font-semibold">Câu trả lời bảng hỏi</h3>
              <dl className="space-y-2">
                {survey.data.questions
                  .filter((q) => d.answers?.[q.code] != null && String(d.answers[q.code]).trim() !== "")
                  .map((q) => {
                    const raw = d.answers![q.code]!;
                    const vals = Array.isArray(raw) ? raw : [raw];
                    const text = vals.map((v) => q.options.find((o) => o.value === v)?.label ?? v).join(", ");
                    return (
                      <div key={q.code}>
                        <dt className="text-xs text-muted-foreground">
                          {q.code}. {q.text.slice(0, 90)}
                          {q.text.length > 90 ? "…" : ""}
                        </dt>
                        <dd className="whitespace-pre-line">{text}</dd>
                      </div>
                    );
                  })}
              </dl>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
