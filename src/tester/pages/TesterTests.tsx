import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Gamepad2 } from "lucide-react";
import { testerApi } from "../api";
import type { TesterTest } from "../types";

const STATUS: Record<string, string> = {
  planned: "Sắp test",
  running: "Đang test",
  done: "Đã kết thúc",
  cancelled: "Đã hủy",
};

function dateRange(t: TesterTest): string {
  const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("vi-VN") : "?");
  if (!t.campaign.startDate && !t.campaign.endDate) return "Chưa chốt ngày";
  return `${fmt(t.campaign.startDate)} – ${fmt(t.campaign.endDate)}`;
}

export default function TesterTests() {
  const { data, isLoading, error } = useQuery({ queryKey: ["tester-tests"], queryFn: testerApi.tests });
  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (error) return <p className="text-sm text-destructive">Không tải được danh sách test.</p>;
  const rows = data ?? [];
  const active = rows.filter((t) => !t.completed && t.campaign.status !== "cancelled" && t.campaign.status !== "done");
  const history = rows.filter((t) => !active.includes(t));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-navy">Test của tôi</h1>
      {rows.length === 0 && (
        <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
          <Gamepad2 className="mx-auto mb-3 h-10 w-10 text-brand-violet" />
          Bạn chưa được gán đợt test nào. Khi có game phù hợp với điểm dòng game của bạn, team sẽ mời bạn.
        </div>
      )}
      {active.length > 0 && <TestList title="Đang và sắp test" rows={active} />}
      {history.length > 0 && <TestList title="Lịch sử" rows={history} />}
    </div>
  );
}

function TestList({ title, rows }: { title: string; rows: TesterTest[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-brand-navy">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{t.campaign.gameName}</p>
                <p className="text-xs text-muted-foreground">
                  {[t.campaign.genre, t.campaign.platform].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              {t.completed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-mint/40 px-2.5 py-1 text-xs font-medium text-brand-navy">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-lavender/50 px-2.5 py-1 text-xs font-medium text-brand-navy">
                  <Clock className="h-3.5 w-3.5" /> {STATUS[t.campaign.status] ?? t.campaign.status}
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Thời gian</p>
                <p>{dateRange(t)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Khối lượng</p>
                <p>{t.workloadHours} giờ</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
