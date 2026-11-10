import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Clock, Gamepad2, Loader2, MonitorSmartphone, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import PageHero, { PageBody } from "@/tester/components/PageHero";
import Reveal from "@/tester/components/Reveal";
import { card, ctaYellow, ghostOnLight } from "@/tester/components/styles";
import { testGameApi } from "../api";
import { viDate } from "../labels";
import type { TesterTestGame } from "../types";
import { Chip, GameIcon, LoadError, RoundBadge, StatusPill } from "./ui";
import { countdownText, dateRange, primaryAction, testGroup, testPath } from "./utils";

const SECTIONS = [
  { key: "todo", title: "Cần bạn xử lý", hint: "Xác nhận lời mời hoặc nộp questionnaire trước hạn." },
  { key: "active", title: "Đang diễn ra", hint: "Chờ ngày bắt đầu hoặc chờ duyệt bài." },
  { key: "history", title: "Lịch sử", hint: null },
] as const;

export default function TesterTestGames() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["testgame-tests"], queryFn: testGameApi.tests });
  const rows = data ?? [];

  return (
    <>
      <PageHero title="Test của tôi" subtitle="Lời mời test game, lịch test, questionnaire và kết quả duyệt giờ test của bạn." />
      <PageBody>
        {isLoading ? (
          <div className={cn(card, "flex justify-center p-10")}>
            <Loader2 className="h-6 w-6 animate-spin text-brand-violet" />
          </div>
        ) : error && !data ? (
          <LoadError error={error} onRetry={() => void refetch()} title="Không tải được danh sách test" accountHint={false} />
        ) : rows.length === 0 ? (
          <Reveal className={cn(card, "flex flex-col items-center gap-4 px-6 py-12 text-center")}>
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy text-brand-yellow">
              <Gamepad2 className="h-8 w-8" />
            </span>
            <h2 className="tp-display text-2xl font-bold text-brand-navy">Chưa có đợt test nào</h2>
            <p className="max-w-md text-brand-navy/65">
              Khi có game hợp với điểm dòng game của bạn, team sẽ gửi lời mời qua email và đợt test hiện ở đây.
            </p>
            <Link to="/tester/profile" className={ghostOnLight}>
              Xem điểm dòng game
            </Link>
          </Reveal>
        ) : (
          <div className="space-y-10">
            {SECTIONS.map((s) => {
              const list = rows.filter((t) => testGroup(t) === s.key);
              if (list.length === 0) return null;
              return (
                <section key={s.key} className={cn(card, "space-y-5 p-5 sm:p-6")} aria-labelledby={`tg-${s.key}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id={`tg-${s.key}`} className="tp-display flex items-center gap-3 text-2xl font-bold text-brand-navy">
                      {s.title}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums",
                          s.key === "todo" ? "bg-brand-yellow text-brand-navy" : "bg-brand-navy/10 text-brand-navy/70",
                        )}
                      >
                        {list.length}
                      </span>
                    </h2>
                    {s.hint && <p className="text-sm text-brand-navy/55">{s.hint}</p>}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {list.map((t, i) => (
                      <TestCard key={t.id} t={t} delay={(i % 4) * 80} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}

function TestCard({ t, delay }: { t: TesterTestGame; delay: number }) {
  const c = t.campaign;
  const action = primaryAction(t);
  const tags = [...new Set([c.genre, ...c.mainTags].filter((x): x is string => Boolean(x)))];
  const deadline =
    t.nextAction.key === "respond"
      ? { label: "Hạn phản hồi", date: t.responseDeadline }
      : (t.nextAction.key === "survey" || t.nextAction.key === "resubmit") && c.endDate
        ? { label: "Hạn nộp", date: c.endDate }
        : null;

  return (
    <Reveal delay={delay} className="flex flex-col rounded-[1.5rem] border border-brand-navy/10 bg-[#fbfaff] p-5">
      <div className="flex items-start gap-3">
        <GameIcon url={c.iconUrl} className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={testPath(t.id)}
              className="tp-display min-w-0 truncate text-xl font-bold text-brand-navy transition-colors hover:text-brand-violet"
            >
              {c.gameName}
            </Link>
            <RoundBadge round={c.testRound} />
          </div>
          {c.originalName && c.originalName !== c.gameName && (
            <p className="truncate text-xs text-brand-navy/50">{c.originalName}</p>
          )}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((g) => (
                <Chip key={g}>{g}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-brand-navy/55">
            <CalendarDays className="h-3.5 w-3.5" /> Thời gian test
          </p>
          <p className="mt-0.5 font-semibold">{dateRange(c.startDate, c.endDate)}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-brand-navy/55">
            <Timer className="h-3.5 w-3.5" /> Khối lượng
          </p>
          <p className="mt-0.5 font-semibold">{t.hours} giờ</p>
        </div>
        {c.platforms.length > 0 && (
          <p className="col-span-2 flex items-center gap-1.5 text-xs text-brand-navy/60">
            <MonitorSmartphone className="h-3.5 w-3.5" /> {c.platforms.join(" · ")}
          </p>
        )}
      </div>

      {deadline && (
        <p className="mt-3 flex items-center gap-1.5 rounded-2xl bg-brand-yellow/35 px-4 py-2 text-sm text-brand-navy">
          <Clock className="h-4 w-4 shrink-0" />
          {deadline.label} <b>{viDate(deadline.date)}</b> · {countdownText(deadline.date)}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <StatusPill t={t} />
        {action ? (
          <Link to={action.to} className={cn(ctaYellow, "px-5 py-2 text-sm")}>
            {action.label} <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to={testPath(t.id)} className={cn(ghostOnLight, "px-4 py-2")}>
            Xem chi tiết
          </Link>
        )}
      </div>
    </Reveal>
  );
}
