import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ClipboardList, Gamepad2, Gift, Loader2, PencilLine, Timer, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { testerApi } from "../api";
import type { TesterGenreScore, TesterMe } from "../types";
import { STEPS } from "../survey-logic";
import PageHero, { PageBody } from "../components/PageHero";
import Reveal from "../components/Reveal";
import { card, ctaYellow, ghostOnDark } from "../components/styles";

const STATUS_TEXT: Record<string, string> = {
  pending: "Đang chờ chấm điểm",
  scoring: "Đang chấm điểm theo dòng game",
  scored: "Đã chấm điểm",
  failed: "Chấm điểm lỗi, team sẽ chấm lại",
};

const PLATFORM_TEXT: Record<string, string> = { MB: "Di động", PC: "PC", CS: "Console" };

function scoreColor(score: number): string {
  if (score >= 80) return "#3A20B3";
  if (score >= 60) return "#313BEE";
  if (score >= 40) return "#39CCFB";
  return "#CBCEFC";
}

export default function TesterProfile() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["tester-me"],
    queryFn: testerApi.me,
    refetchInterval: (q) => {
      const status = q.state.data?.profile?.scoringStatus;
      return status === "pending" || status === "scoring" ? 5000 : false;
    },
  });

  const displayName = user?.name?.trim() || "bạn";

  if (isLoading) {
    return (
      <PageHero title="Hồ sơ tester">
        <Loader2 className="mt-6 h-6 w-6 animate-spin text-white/80" />
      </PageHero>
    );
  }
  if (error || !data) {
    return (
      <>
        <PageHero title="Hồ sơ tester" />
        <PageBody>
          <p className={cn(card, "p-6 text-brand-magenta")}>Không tải được hồ sơ tester. Thử tải lại trang.</p>
        </PageBody>
      </>
    );
  }

  const { profile } = data;
  if (!profile) return <NoProfile displayName={displayName} />;

  return (
    <>
      <PageHero
        title={profile.name}
        subtitle={[profile.team, profile.office, data.user.email].filter(Boolean).join(" · ")}
        actions={
          <Link to="/tester/survey" className={ghostOnDark}>
            <PencilLine className="h-4 w-4" />
            Cập nhật khảo sát
          </Link>
        }
      />
      <PageBody>
        <ProfileDetail data={data} />
      </PageBody>
    </>
  );
}

function NoProfile({ displayName }: { displayName: string }) {
  return (
    <>
      <PageHero
        title={`Chào ${displayName}!`}
        subtitle="Hoàn thành khảo sát để nhận lời mời test đúng dòng game bạn giỏi."
        actions={
          <Link to="/tester/survey" className={cn(ctaYellow, "px-6 py-3 text-base")}>
            Bắt đầu làm khảo sát
            <ArrowRight className="h-5 w-5" />
          </Link>
        }
      />
      <PageBody>
        <Reveal className={cn(card, "grid items-center gap-8 overflow-hidden p-6 md:grid-cols-[0.9fr_1.1fr] md:p-10")}>
          <img
            src="/tester/profile-640.webp"
            srcSet="/tester/profile-640.webp 640w, /tester/profile-1024.webp 1024w"
            sizes="(min-width: 768px) 24rem, 80vw"
            width={640}
            height={640}
            alt="Điện thoại hiển thị hồ sơ tester với biểu đồ điểm và huy hiệu dòng game"
            className="mx-auto w-full max-w-sm rounded-[1.5rem] bg-[#eeedff]"
          />
          <div>
            <h2 className="tp-display text-3xl font-extrabold text-brand-navy">Khảo sát gồm 3 phần</h2>
            <p className="mt-2 text-brand-navy/70">
              Khoảng 10 phút. Câu trả lời giúp hệ thống chấm điểm từng dòng game để mời bạn test đúng sở trường.
            </p>
            <ol className="mt-6 space-y-3">
              {STEPS.map((s, i) => (
                <li key={s.id} className="flex gap-4 rounded-2xl bg-[#f5f4ff] px-4 py-3">
                  <span className="tp-display inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-lg font-extrabold text-brand-yellow">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-brand-navy">{s.title}</span>
                    <span className="block text-sm text-brand-navy/65">{s.description}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/tester/survey" className={cn(ctaYellow, "px-6 py-3 text-base")}>
                Bắt đầu làm khảo sát
                <ArrowRight className="h-5 w-5" />
              </Link>
              <span className="text-sm text-brand-navy/60">Cập nhật lại được bất cứ lúc nào.</span>
            </div>
          </div>
        </Reveal>
      </PageBody>
    </>
  );
}

function ProfileDetail({ data }: { data: TesterMe }) {
  const profile = data.profile!;
  const { stats } = data;
  const scoring = profile.scoringStatus === "pending" || profile.scoringStatus === "scoring";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Gamepad2} label="Đang test" value={stats.activeTests} hint={stats.activeGames.join(", ") || "Chưa có"} delay={0} />
        <StatCard icon={ClipboardList} label="Game đã test" value={stats.completedTests} delay={80} />
        <StatCard icon={Timer} label="Giờ test hoàn thành" value={stats.completedHours} delay={160} />
        <StatCard
          icon={Gift}
          label="Benefit còn lại"
          value={stats.availableBenefits}
          hint={`Đã có ${stats.earnedBenefits}, đã dùng ${stats.usedBenefits}`}
          delay={240}
          accent
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Reveal className={cn(card, "p-6 lg:col-span-2")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="tp-display text-2xl font-bold text-brand-navy">Điểm hardcore theo dòng game</h2>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                profile.scoringStatus === "scored" && "bg-brand-mint/40 text-brand-navy",
                scoring && "bg-brand-lavender/60 text-brand-navy",
                profile.scoringStatus === "failed" && "bg-brand-magenta/15 text-brand-magenta",
              )}
            >
              {scoring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {STATUS_TEXT[profile.scoringStatus] ?? profile.scoringStatus}
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-navy/60">
            Thang 0 đến 100: volume (số giờ hoặc số trận) cộng trình độ (rank). Không có rank thì volume được tính gấp đôi.
          </p>
          {profile.genreScores.length === 0 ? (
            <p className="mt-8 rounded-2xl bg-[#f5f4ff] p-6 text-sm text-brand-navy/70">
              {scoring ? "Đang chấm điểm, kết quả hiện ở đây sau vài phút." : "Chưa có điểm."}
            </p>
          ) : (
            <ScoreChart scores={profile.genreScores} />
          )}
        </Reveal>

        <Reveal delay={120} className={cn(card, "space-y-4 p-6 text-sm")}>
          <h2 className="tp-display text-2xl font-bold text-brand-navy">Hồ sơ</h2>
          <Info label="Dòng game thích nhất" value={profile.favoriteGenreLabel} />
          <Info label="Nền tảng" value={profile.platforms.map((p) => PLATFORM_TEXT[p] ?? p).join(", ")} />
          <Info label="Thời gian chơi mỗi tuần" value={profile.weeklyPlayLabel} />
          <Info label="Có thể hỗ trợ test" value={profile.testTimeLabel} />
          <Info label="Độ tuổi" value={profile.ageRange} />
          <Info label="Chi tiêu cho game" value={profile.payLabel} />
          {data.submittedAt && (
            <p className="border-t border-brand-navy/10 pt-3 text-xs text-brand-navy/55">
              Cập nhật {new Date(data.submittedAt).toLocaleString("vi-VN")}
            </p>
          )}
        </Reveal>
      </div>

      {profile.genreScores.length > 0 && (
        <Reveal className={cn(card, "overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f5f4ff] text-left text-xs uppercase tracking-wide text-brand-navy/60">
                  {["Dòng game", "Điểm", "Volume", "Rank", "Game chính", "Rank cao nhất"].map((h) => (
                    <th key={h} className="px-5 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-navy/10">
                {profile.genreScores.map((s) => (
                  <tr key={s.genre}>
                    <td className="px-5 py-3 font-semibold">{s.label}</td>
                    <td className="px-5 py-3">
                      <span className="tp-display text-lg font-extrabold text-brand-violet tabular-nums">{s.finalScore}</span>
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {s.volumeScore === 0 && !s.hours && !s.matches ? (
                        "—"
                      ) : (
                        <>
                          {s.volumeScore}
                          <span className="text-xs text-brand-navy/55">
                            {" "}
                            ({[s.hours ? `${s.hours} giờ` : "", s.matches ? `${s.matches} trận` : ""].filter(Boolean).join(", ") || "không rõ"})
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{s.hasRank ? s.rankScore : "—"}</td>
                    <td className="px-5 py-3">{s.anchorGame || "—"}</td>
                    <td className="px-5 py-3">{s.bestRank || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}

      <Reveal className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] bg-brand-navy px-6 py-5 text-white">
        <p className="text-white/80">Chơi thêm game mới hoặc lên rank? Cập nhật khảo sát để điểm luôn đúng.</p>
        <Link to="/tester/survey" className={cn(ctaYellow, "px-5 py-2.5 text-sm")}>
          <PencilLine className="h-4 w-4" />
          Cập nhật khảo sát
        </Link>
      </Reveal>
    </div>
  );
}

function ScoreChart({ scores }: { scores: TesterGenreScore[] }) {
  return (
    <div className="mt-5" style={{ height: Math.max(220, scores.length * 38) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={scores} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e3fb" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#09026b99", fontSize: 12 }} />
          <YAxis type="category" dataKey="label" width={130} tick={{ fill: "#09026b", fontSize: 12 }} />
          <Tooltip formatter={(v) => [v, "Điểm"]} cursor={{ fill: "#cbcefc33" }} />
          <Bar dataKey="finalScore" radius={[0, 8, 8, 0]} barSize={18}>
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
  delay,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <Reveal delay={delay} className={cn(accent ? "rounded-[1.75rem] bg-brand-yellow p-5 text-brand-navy" : cn(card, "p-5"))}>
      <div className={cn("flex items-center gap-2 text-xs font-semibold", accent ? "text-brand-navy/75" : "text-brand-navy/60")}>
        <Icon className={cn("h-4 w-4", accent ? "text-brand-navy" : "text-brand-violet")} />
        {label}
      </div>
      <p className="tp-display mt-2 text-4xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className={cn("mt-1 truncate text-xs", accent ? "text-brand-navy/70" : "text-brand-navy/55")}>{hint}</p>}
    </Reveal>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-brand-navy/55">{label}</p>
      <p className="font-semibold">{value || "—"}</p>
    </div>
  );
}
