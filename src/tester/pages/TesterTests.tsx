import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Clock, Gamepad2, Loader2, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { testerApi } from "../api";
import type { TesterTest } from "../types";
import PageHero, { PageBody } from "../components/PageHero";
import Reveal from "../components/Reveal";
import { card, ghostOnLight } from "../components/styles";

const STATUS: Record<string, string> = {
  planned: "Sắp test",
  running: "Đang test",
  done: "Đã kết thúc",
  cancelled: "Đã hủy",
};

const PLATFORM_TEXT: Record<string, string> = { MB: "Di động", PC: "PC", CS: "Console" };

function dateRange(t: TesterTest): string {
  const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("vi-VN") : "?");
  if (!t.campaign.startDate && !t.campaign.endDate) return "Chưa chốt ngày";
  return `${fmt(t.campaign.startDate)} đến ${fmt(t.campaign.endDate)}`;
}

export default function TesterTests() {
  const { data, isLoading, error } = useQuery({ queryKey: ["tester-tests"], queryFn: testerApi.tests });
  const rows = data ?? [];
  const active = rows.filter((t) => !t.completed && t.campaign.status !== "cancelled" && t.campaign.status !== "done");
  const history = rows.filter((t) => !active.includes(t));

  return (
    <>
      <PageHero title="Test của tôi" subtitle="Các đợt test bạn được mời, thời gian và khối lượng giờ test." />
      <PageBody>
        {isLoading ? (
          <div className={cn(card, "flex justify-center p-10")}>
            <Loader2 className="h-6 w-6 animate-spin text-brand-violet" />
          </div>
        ) : error ? (
          <p className={cn(card, "p-6 text-brand-magenta")}>Không tải được danh sách test.</p>
        ) : rows.length === 0 ? (
          <Reveal className={cn(card, "flex flex-col items-center gap-4 px-6 py-12 text-center")}>
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy text-brand-yellow">
              <Gamepad2 className="h-8 w-8" />
            </span>
            <h2 className="tp-display text-2xl font-bold text-brand-navy">Chưa có đợt test nào</h2>
            <p className="max-w-md text-brand-navy/65">
              Khi có game hợp với điểm dòng game của bạn, team sẽ mời và đợt test hiện ở đây.
            </p>
            <Link to="/tester/profile" className={ghostOnLight}>
              Xem điểm dòng game
            </Link>
          </Reveal>
        ) : (
          <div className="space-y-10">
            {active.length > 0 && <TestList title="Đang và sắp test" rows={active} />}
            {history.length > 0 && <TestList title="Lịch sử" rows={history} />}
          </div>
        )}
      </PageBody>
    </>
  );
}

function TestList({ title, rows }: { title: string; rows: TesterTest[] }) {
  return (
    <section className={cn(card, "space-y-5 p-6")}>
      <h2 className="tp-display text-2xl font-bold text-brand-navy">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((t, i) => (
          <Reveal key={t.id} delay={(i % 4) * 80} className="rounded-[1.5rem] border border-brand-navy/10 bg-[#fbfaff] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="tp-display truncate text-xl font-bold text-brand-navy">{t.campaign.gameName}</p>
                <p className="text-sm text-brand-navy/60">
                  {[t.campaign.genre, t.campaign.platform ? PLATFORM_TEXT[t.campaign.platform] ?? t.campaign.platform : null]
                    .filter(Boolean)
                    .join(" · ") || "Chưa có mô tả"}
                </p>
              </div>
              {t.completed ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-mint/45 px-3 py-1 text-xs font-semibold text-brand-navy">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-lavender/60 px-3 py-1 text-xs font-semibold text-brand-navy">
                  <Clock className="h-3.5 w-3.5" /> {STATUS[t.campaign.status] ?? t.campaign.status}
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs text-brand-navy/55">
                  <CalendarDays className="h-3.5 w-3.5" /> Thời gian
                </p>
                <p className="mt-0.5 font-semibold">{dateRange(t)}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs text-brand-navy/55">
                  <Timer className="h-3.5 w-3.5" /> Khối lượng
                </p>
                <p className="mt-0.5 font-semibold">{t.workloadHours} giờ</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
