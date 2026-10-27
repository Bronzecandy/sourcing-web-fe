import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { btnSubtle } from "@/lib/button-classes";
import type { AdminTesterRow } from "@/tester/types";

export const SCORING_STATUS: Record<string, { label: string; cls: string }> = {
  no_survey: { label: "Chưa làm khảo sát", cls: "bg-muted text-muted-foreground" },
  pending: { label: "Chờ chấm", cls: "bg-amber-500/15 text-amber-700" },
  scoring: { label: "Đang chấm", cls: "bg-sky-500/15 text-sky-700" },
  scored: { label: "Đã chấm", cls: "bg-emerald-500/15 text-emerald-700" },
  failed: { label: "Lỗi chấm", cls: "bg-destructive/10 text-destructive" },
};

export function ScoringBadge({ status }: { status: string }) {
  const s = SCORING_STATUS[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", s.cls)}>{s.label}</span>;
}

function topScores(row: AdminTesterRow, n = 3): Array<[string, number]> {
  return Object.entries(row.scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

type TesterRosterTableProps = {
  rows: AdminTesterRow[];
  genres: Array<{ key: string; label: string }>;
  search: string;
  onOpen: (userId: string) => void;
};

export default function TesterRosterTable({ rows, genres, search, onOpen }: TesterRosterTableProps) {
  const [genre, setGenre] = useState("");
  const label = (key: string) => genres.find((g) => g.key === key)?.label ?? key;

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => !q || `${r.name} ${r.email} ${r.team ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) =>
        genre
          ? (b.scores[genre] ?? 0) - (a.scores[genre] ?? 0)
          : Number(b.hasProfile) - Number(a.hasProfile) || Number(b.active) - Number(a.active),
      );
  }, [rows, search, genre]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Sắp xếp theo dòng game…</option>
          {genres.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground">{sorted.length} tester</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Không có tester phù hợp</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {[
                    "Tester",
                    "Team",
                    "Nền tảng",
                    genre ? label(genre) : "Điểm dòng game",
                    "Đang test",
                    "Giờ test",
                    "Benefit",
                    "Hồ sơ",
                    "",
                  ].map((h, i) => (
                    <th key={`${h}-${i}`} className="whitespace-nowrap px-3 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((r) => (
                  <tr
                    key={r.userId}
                    onClick={() => onOpen(r.userId)}
                    className={cn("cursor-pointer hover:bg-muted/30 transition-colors", !r.active && "opacity-60")}
                  >
                    <td className="px-3 py-3 max-w-[15rem]">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar src={r.avatarUrl} name={r.name} email={r.email} className="w-8 h-8" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {r.name}
                            {r.roles.some((x) => x !== "TESTER") && (
                              <span className="ml-1.5 rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                                Staff
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 min-w-[7rem]">{r.team ?? "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{r.platforms.join(", ") || "—"}</td>
                    <td className="px-3 py-3 min-w-[11rem]">
                      {genre ? (
                        <span className="font-semibold tabular-nums">{r.scores[genre] ?? 0}</span>
                      ) : topScores(r).length === 0 ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {topScores(r).map(([g, s]) => (
                            <span key={g} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              {label(g)} <span className="font-semibold tabular-nums">{s}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{r.stats.activeTests}</td>
                    <td className="px-3 py-3 tabular-nums">{r.stats.completedHours}</td>
                    <td className="px-3 py-3 tabular-nums">{r.stats.availableBenefits}</td>
                    <td className="px-3 py-3">
                      {!r.active ? (
                        <span className="whitespace-nowrap text-xs text-muted-foreground">Tạm ngưng</span>
                      ) : (
                        <ScoringBadge status={r.scoringStatus} />
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Xem hồ sơ ${r.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(r.userId);
                        }}
                        className={cn(btnSubtle, "p-1.5")}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
