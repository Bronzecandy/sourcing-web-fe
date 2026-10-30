import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pause, Play, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/lib/button-classes";
import { testerApi } from "@/tester/api";
import { ScoringBadge } from "./TesterRosterTable";

const CAMPAIGN_STATUS: Record<string, string> = {
  planned: "Lên plan",
  running: "Đang test",
  done: "Đã test xong",
  cancelled: "Hủy",
};

const REDEMPTION_STATUS: Record<string, string> = {
  pending: "chờ trao",
  fulfilled: "đã trao",
  rejected: "từ chối",
  cancelled: "tester hủy",
};

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{children}</h3>;
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

/** Hồ sơ tester trong drawer người dùng (admin Sourcing). */
export default function TesterProfilePanel({ userId }: { userId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ["tester-admin-tester", userId], queryFn: () => testerApi.adminTester(userId) });
  const survey = useQuery({ queryKey: ["tester-survey"], queryFn: testerApi.survey, enabled: Boolean(detail.data?.answers) });
  const d = detail.data;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["tester-admin-testers"] });
    void queryClient.invalidateQueries({ queryKey: ["tester-admin-tester", userId] });
  };

  const rescore = async () => {
    await testerApi.adminRescore(userId);
    toast.success("Đã xếp lịch chấm lại điểm");
    setTimeout(refresh, 1500);
  };

  const toggleActive = async () => {
    if (!d) return;
    try {
      await testerApi.adminUpdateTester(d.userId, { active: !d.active });
      toast.success(d.active ? "Đã tạm ngưng tester" : "Đã kích hoạt lại tester");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không cập nhật được");
    }
  };

  if (detail.isLoading) return <p className="text-sm text-muted-foreground">Đang tải hồ sơ tester…</p>;
  if (!d) return <p className="text-sm text-destructive">Không tải được hồ sơ tester.</p>;

  if (!d.hasProfile) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-center space-y-2">
        <p className="font-medium">Chưa làm khảo sát phân loại</p>
        <p className="text-muted-foreground">
          Người dùng đăng nhập Tester Program và bấm "Bắt đầu làm khảo sát" ở trang Hồ sơ. Điểm dòng game sẽ được chấm tự động sau khi gửi.
        </p>
        <a href="/tester" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          Mở Tester Program <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  const maxScore = Math.max(100, ...d.genreScores.map((s) => s.finalScore));

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {d.active ? <ScoringBadge status={d.scoringStatus} /> : <span className="text-xs text-muted-foreground">Tạm ngưng</span>}
        {d.submittedAt && (
          <span className="text-xs text-muted-foreground">
            Khảo sát lúc {new Date(d.submittedAt).toLocaleString("vi-VN")}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => void rescore()} className={cn(btnGhost, "px-3 py-1.5 text-xs")}>
            <RefreshCw className="w-3.5 h-3.5" /> Chấm lại điểm
          </button>
          <button type="button" onClick={() => void toggleActive()} className={cn(btnGhost, "px-3 py-1.5 text-xs")}>
            {d.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {d.active ? "Tạm ngưng" : "Kích hoạt lại"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Info label="Team" value={d.team} />
        <Info label="Văn phòng" value={d.office} />
        <Info label="Nền tảng" value={d.platforms.join(", ")} />
        <Info label="Giờ chơi / tuần" value={d.weeklyPlayLabel} />
        <Info label="Có thể test" value={d.testTimeLabel} />
        <Info label="Chi tiêu" value={d.payTier} />
      </div>

      <section>
        <SectionTitle>Điểm theo dòng game</SectionTitle>
        {d.genreScores.length === 0 ? (
          <p className="text-muted-foreground">Chưa có điểm.</p>
        ) : (
          <ul className="space-y-2">
            {d.genreScores.map((s) => (
              <li key={s.genre} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <span className="w-40 shrink-0 font-medium truncate">{s.label}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(s.finalScore / maxScore) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right font-bold tabular-nums">{s.finalScore}</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {s.source === "sheet" ? (
                    "Điểm nhập từ sheet cũ (bấm Chấm lại điểm để có chi tiết volume/rank)"
                  ) : (
                    <>
                      Volume {s.volumeScore} ({s.hours} giờ, {s.matches} trận) · Rank {s.hasRank ? s.rankScore : "không có"}
                      {s.bestRank ? ` (${s.bestRank})` : ""} · Game chính {s.anchorGame || "—"}
                    </>
                  )}
                </p>
                {s.rawText && <p className="mt-1 whitespace-pre-line text-xs">{s.rawText}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <SectionTitle>Đợt test</SectionTitle>
          {d.assignments.length === 0 ? (
            <p className="text-muted-foreground">Chưa được gán.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {d.assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <Link to={`/admin/test-campaigns/${a.campaign.id}`} className="font-medium text-primary hover:underline truncate">
                    {a.campaign.gameName}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {a.workloadHours} giờ · {a.completed ? "Hoàn thành" : CAMPAIGN_STATUS[a.campaign.status] ?? a.campaign.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <SectionTitle>Benefit</SectionTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Đã có", d.stats.earnedBenefits],
              ["Đã dùng", d.stats.usedBenefits],
              ["Còn lại", d.stats.availableBenefits],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border py-2">
                <p className="text-lg font-bold tabular-nums">{v}</p>
                <p className="text-xs text-muted-foreground">{k}</p>
              </div>
            ))}
          </div>
          {d.redemptions.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {d.redemptions.map((r) => (
                <li key={r.id}>
                  {new Date(r.createdAt).toLocaleDateString("vi-VN")}: {r.item} (
                  {r.status === "rejected" || r.status === "cancelled" ? "hoàn" : "−"}
                  {r.amount}) · {REDEMPTION_STATUS[r.status] ?? r.status}
                  {r.gameAccount && <> · {r.gameAccount}</>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {d.answers && survey.data && (
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 font-medium text-muted-foreground">Câu trả lời khảo sát</summary>
          <dl className="space-y-2 px-3 pb-3">
            {survey.data.questions
              .filter((q) => d.answers?.[q.code] != null && String(d.answers[q.code]).trim() !== "")
              .map((q) => {
                const raw = d.answers![q.code]!;
                const vals = Array.isArray(raw) ? raw : [raw];
                const text = vals.map((v) => q.options.find((o) => o.value === v)?.label ?? v).join(", ");
                return (
                  <div key={q.code}>
                    <dt className="text-xs text-muted-foreground">
                      {q.code}. {q.text.length > 90 ? `${q.text.slice(0, 90)}…` : q.text}
                    </dt>
                    <dd className="whitespace-pre-line">{text}</dd>
                  </div>
                );
              })}
          </dl>
        </details>
      )}
    </div>
  );
}
