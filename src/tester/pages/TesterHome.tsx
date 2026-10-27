import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardList, Gamepad2, Gift, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { testerApi } from "../api";
import type { TesterGenreScore } from "../types";

const STATUS_TEXT: Record<string, string> = {
  pending: "Đang chờ chấm điểm",
  scoring: "Đang chấm điểm theo dòng game…",
  scored: "Đã chấm điểm",
  failed: "Chấm điểm lỗi — admin sẽ chấm lại",
};

const PLATFORM_TEXT: Record<string, string> = { MB: "Di động", PC: "PC", CS: "Console" };

function scoreColor(score: number): string {
  if (score >= 80) return "#3A20B3";
  if (score >= 60) return "#313BEE";
  if (score >= 40) return "#39CCFB";
  return "#CBCEFC";
}

export default function TesterHome() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tester-me"],
    queryFn: testerApi.me,
    refetchInterval: (q) => {
      const status = q.state.data?.profile?.scoringStatus;
      return status === "pending" || status === "scoring" ? 5000 : false;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải hồ sơ…</p>;
  if (error || !data) return <p className="text-sm text-destructive">Không tải được hồ sơ tester.</p>;

  const { profile, stats } = data;

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
        <ClipboardList className="mx-auto h-12 w-12 text-brand-violet" />
        <h1 className="mt-4 text-2xl font-bold text-brand-navy">Chào {data.user.name ?? "bạn"}!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Làm bảng hỏi khoảng 10 phút để team New Games biết bạn mạnh dòng game nào và mời bạn test đúng game.
        </p>
        <Link
          to="/tester/survey"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-violet px-5 py-3 font-semibold text-white"
        >
          Bắt đầu bảng hỏi
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[profile.team, profile.office, data.user.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Link to="/tester/survey" className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted">
          Cập nhật bảng hỏi
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Gamepad2} label="Đang test" value={stats.activeTests} hint={stats.activeGames.join(", ") || "Chưa có"} />
        <StatCard icon={ClipboardList} label="Game đã test" value={stats.completedTests} />
        <StatCard icon={Timer} label="Giờ test đã hoàn thành" value={stats.completedHours} />
        <StatCard icon={Gift} label="Benefit còn lại" value={stats.availableBenefits} hint={`Đã có ${stats.earnedBenefits}, đã dùng ${stats.usedBenefits}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-brand-navy">Điểm hardcore theo dòng game</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                profile.scoringStatus === "scored" ? "bg-brand-mint/40 text-brand-navy" : "bg-brand-lavender/50 text-brand-navy",
                profile.scoringStatus === "failed" && "bg-destructive/15 text-destructive",
              )}
            >
              {STATUS_TEXT[profile.scoringStatus] ?? profile.scoringStatus}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            0–100: volume (số giờ/trận) + trình độ (rank). Không có rank thì tính gấp đôi volume.
          </p>
          {profile.genreScores.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Chưa có điểm. Kết quả hiện ở đây sau khi chấm xong.</p>
          ) : (
            <ScoreChart scores={profile.genreScores} />
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-white p-5 text-sm shadow-sm">
          <h2 className="font-semibold text-brand-navy">Hồ sơ</h2>
          <Info label="Dòng game thích nhất" value={profile.favoriteGenreLabel} />
          <Info label="Nền tảng" value={profile.platforms.map((p) => PLATFORM_TEXT[p] ?? p).join(", ")} />
          <Info label="Thời gian chơi mỗi tuần" value={profile.weeklyPlayLabel} />
          <Info label="Có thể hỗ trợ test" value={profile.testTimeLabel} />
          <Info label="Độ tuổi" value={profile.ageRange} />
          <Info label="Chi tiêu cho game" value={profile.payLabel} />
          {data.submittedAt && (
            <p className="pt-2 text-xs text-muted-foreground">Cập nhật {new Date(data.submittedAt).toLocaleString("vi-VN")}</p>
          )}
        </section>
      </div>

      {profile.genreScores.length > 0 && (
        <section className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-brand-navy text-white">
              <tr>
                {["Dòng game", "Điểm", "Volume", "Rank", "Game chính", "Rank cao nhất"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.genreScores.map((s) => (
                <tr key={s.genre} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{s.label}</td>
                  <td className="px-3 py-2 font-semibold tabular-nums">{s.finalScore}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {s.volumeScore}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({s.hours ? `${s.hours} giờ` : ""}
                      {s.hours && s.matches ? ", " : ""}
                      {s.matches ? `${s.matches} trận` : ""})
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{s.hasRank ? s.rankScore : "—"}</td>
                  <td className="px-3 py-2">{s.anchorGame || "—"}</td>
                  <td className="px-3 py-2">{s.bestRank || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function ScoreChart({ scores }: { scores: TesterGenreScore[] }) {
  return (
    <div className="mt-4 h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={scores} layout="vertical" margin={{ left: 24, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [v, "Điểm"]} />
          <Bar dataKey="finalScore" radius={[0, 6, 6, 0]}>
            {scores.map((s) => (
              <Cell key={s.genre} fill={scoreColor(s.finalScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Gamepad2;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4 text-brand-violet" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold text-brand-navy tabular-nums">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
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
