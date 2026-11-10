import { useState, type ComponentType, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CalendarClock,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Gamepad2,
  KeyRound,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  MonitorSmartphone,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { TesterApiError } from "@/tester/api";
import PageHero, { PageBody } from "@/tester/components/PageHero";
import Reveal from "@/tester/components/Reveal";
import { card, ctaYellow, ghostOnDark, ghostOnLight } from "@/tester/components/styles";
import { testFileUrl, testGameApi } from "../api";
import { formatBytes, viDate, viDateTime } from "../labels";
import type { TesterTestGame as TestGame } from "../types";
import { Chip, CopyButton, GameIcon, LoadError, ReviewResult, RichText, RoundBadge, StatusPill } from "./ui";
import { countdownText, dateRange, daysUntil, errorText, fieldClass, isJoined, surveyPath, viDay } from "./utils";

export default function TesterTestGame() {
  const { id = "" } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["testgame-test", id],
    queryFn: () => testGameApi.test(id),
    enabled: Boolean(id),
    retry: (count, err) => !(err instanceof TesterApiError) && count < 2,
  });

  const back = (
    <Link to="/tester/tests" className={ghostOnDark}>
      <ArrowLeft className="h-4 w-4" /> Test của tôi
    </Link>
  );

  if (query.isLoading) {
    return (
      <PageHero title="Đợt test" actions={back}>
        <Loader2 className="mt-6 h-6 w-6 animate-spin text-white/80" />
      </PageHero>
    );
  }
  const t = query.data;
  if (!t) {
    return (
      <>
        <PageHero title="Đợt test" actions={back} />
        <PageBody>
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        </PageBody>
      </>
    );
  }

  const c = t.campaign;
  const joined = isJoined(t);
  const tags = [...new Set([c.genre, ...c.mainTags].filter((x): x is string => Boolean(x)))];
  const subtitle = [c.originalName && c.originalName !== c.gameName ? c.originalName : null, t.invitedAt ? `Mời ngày ${viDay(t.invitedAt)}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHero
        title={
          <span className="flex items-center gap-4">
            <GameIcon url={c.iconUrl} className="h-14 w-14 ring-2 ring-white/30 md:h-16 md:w-16" />
            <span className="min-w-0">
              {c.gameName}
              <RoundBadge round={c.testRound} className="ml-3 align-middle text-sm" />
            </span>
          </span>
        }
        subtitle={subtitle || undefined}
        actions={back}
      >
        <div className="tp-rise mt-6 flex flex-wrap items-center gap-2">
          {t.nextAction.label && (
            <span className="inline-flex rounded-full bg-white p-0.5">
              <StatusPill t={t} className="text-sm" />
            </span>
          )}
          {[...c.platforms, ...tags].map((x) => (
            <Chip key={x} dark>
              {x}
            </Chip>
          ))}
        </div>
      </PageHero>
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-6">
            <StatusSection t={t} />
            {joined && <InstallSection t={t} />}
            {joined && c.testerNote && (
              <Reveal className={cn(card, "border-l-8 border-l-brand-yellow p-6")}>
                <h2 className="flex items-center gap-2 font-semibold text-brand-violet">
                  <Lightbulb className="h-5 w-5" /> Nội dung cần tập trung khi test
                </h2>
                <RichText text={c.testerNote} className="mt-2 text-sm text-brand-navy/80" />
              </Reveal>
            )}
            {(c.background || c.taptapUrl) && (
              <Reveal className={cn(card, "p-6")}>
                <h2 className="tp-display text-xl font-bold text-brand-navy">Về game</h2>
                {c.background && <RichText text={c.background} className="mt-2 text-sm text-brand-navy/75" />}
                {c.taptapUrl && (
                  <a
                    href={c.taptapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-violet hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" /> Xem trên TapTap
                  </a>
                )}
              </Reveal>
            )}
          </div>

          <aside className="space-y-6">
            <Reveal className={cn(card, "p-6")}>
              <h2 className="tp-display text-xl font-bold text-brand-navy">Tiến trình</h2>
              <Timeline t={t} />
            </Reveal>
            <Reveal delay={80} className={cn(card, "p-6")}>
              <h2 className="tp-display text-xl font-bold text-brand-navy">Thông tin đợt test</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <InfoRow icon={CalendarDays} label="Thời gian test" value={dateRange(c.startDate, c.endDate)} />
                <InfoRow
                  icon={Timer}
                  label="Khối lượng cần chơi"
                  value={`${t.hours} giờ${c.hoursPerDay && c.testDays ? ` (${c.hoursPerDay} giờ/ngày × ${c.testDays} ngày)` : ""}`}
                />
                {c.evalFormat && <InfoRow icon={Gamepad2} label="Hình thức" value={c.evalFormat} />}
                {(c.focusedAt || c.focusedPlace) && (
                  <InfoRow
                    icon={MapPin}
                    label="Test tập trung"
                    value={[c.focusedAt ? viDateTime(c.focusedAt) : null, c.focusedPlace].filter(Boolean).join(" · ")}
                  />
                )}
                {c.platforms.length > 0 && <InfoRow icon={MonitorSmartphone} label="Platform" value={c.platforms.join(", ")} />}
              </dl>
            </Reveal>
            {(c.coordinatorName || c.coordinatorEmail) && (
              <Reveal delay={160} className={cn(card, "p-6")}>
                <h2 className="tp-display text-xl font-bold text-brand-navy">Người phụ trách</h2>
                <p className="mt-3 flex items-center gap-2 font-semibold">
                  <UserRound className="h-4 w-4 text-brand-violet" /> {c.coordinatorName || "Team New Game"}
                </p>
                {c.coordinatorEmail && (
                  <a
                    href={`mailto:${c.coordinatorEmail}?subject=${encodeURIComponent(`[Game Test] ${c.gameName}`)}`}
                    className={cn(ghostOnLight, "mt-3 w-full")}
                  >
                    <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{c.coordinatorEmail}</span>
                  </a>
                )}
                <p className="mt-2 text-xs text-brand-navy/55">
                  Liên hệ khi không cài được game, không vào được bản test hoặc cần đổi lịch.
                </p>
              </Reveal>
            )}
            {joined && t.whitelistInfo && (
              <Reveal className={cn(card, "p-6")}>
                <h2 className="tp-display text-xl font-bold text-brand-navy">Thông tin whitelist đã gửi</h2>
                <p className="mt-2 whitespace-pre-wrap break-words font-mono text-sm text-brand-navy/80">{t.whitelistInfo}</p>
                <p className="mt-2 text-xs text-brand-navy/55">Cần sửa? Gửi email cho người phụ trách.</p>
              </Reveal>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" />
      <div className="min-w-0">
        <dt className="text-xs text-brand-navy/55">{label}</dt>
        <dd className="font-semibold text-brand-navy">{value}</dd>
      </div>
    </div>
  );
}

function Notice({ icon: Icon, title, children }: { icon: ComponentType<{ className?: string }>; title: string; children: ReactNode }) {
  return (
    <div className={cn(card, "flex gap-4 p-6")}>
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5f4ff] text-brand-violet">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="font-semibold text-brand-navy">{title}</h2>
        <div className="mt-1 text-sm text-brand-navy/70">{children}</div>
      </div>
    </div>
  );
}

function StatusSection({ t }: { t: TestGame }) {
  const c = t.campaign;
  switch (t.nextAction.key) {
    case "respond":
      return <RespondPanel t={t} />;
    case "survey":
      return (
        <section className="rounded-[1.75rem] bg-brand-navy p-6 text-white sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-yellow">Đang trong thời gian test</p>
          <h2 className="tp-display mt-1 text-2xl font-bold sm:text-3xl">Chơi đủ {t.hours} giờ rồi làm questionnaire</h2>
          <p className="mt-2 text-sm text-white/75">
            {c.endDate ? (
              <>
                Hạn nộp <b className="text-white">{viDate(c.endDate)}</b> ({countdownText(c.endDate)}).{" "}
              </>
            ) : null}
            Khi nộp cần ảnh chụp màn hình trong game có UID và level / tiến trình nhân vật để xác nhận số giờ test.
          </p>
          {t.evidenceCount > 0 && <p className="mt-2 text-sm text-brand-mint">Đã tải {t.evidenceCount} ảnh bằng chứng.</p>}
          <Link to={surveyPath(t.id)} className={cn(ctaYellow, "mt-5 px-6 py-3 text-sm")}>
            Làm questionnaire <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      );
    case "resubmit":
    case "rejected":
    case "reviewing":
    case "approved":
      return <ReviewResult t={t} />;
    case "wait_start": {
      const left = c.startDate ? daysUntil(c.startDate) : null;
      return (
        <Notice icon={CalendarClock} title="Bạn đã xác nhận tham gia">
          {c.startDate ? (
            <>
              Đợt test bắt đầu ngày <b>{viDate(c.startDate)}</b>
              {left != null && left > 0 ? ` (còn ${left} ngày)` : ""}.{" "}
            </>
          ) : (
            "Team sẽ báo ngày bắt đầu test qua email. "
          )}
          Questionnaire mở khi đợt test bắt đầu — trong lúc chờ, bạn có thể cài game theo hướng dẫn bên dưới.
        </Notice>
      );
    }
    case "declined":
      return (
        <Notice icon={X} title="Bạn đã từ chối lời mời này">
          Cảm ơn bạn đã phản hồi. Team sẽ mời bạn ở các đợt test phù hợp sau.
        </Notice>
      );
    case "expired":
      return (
        <Notice icon={CalendarClock} title="Lời mời đã quá hạn phản hồi">
          Hạn phản hồi là {viDate(t.responseDeadline)}. Nếu vẫn muốn tham gia, hãy liên hệ người phụ trách.
        </Notice>
      );
    case "closed":
      return (
        <Notice icon={Ban} title="Đã đóng nhận bài">
          Đợt test đã kết thúc nhận questionnaire. Liên hệ người phụ trách nếu bạn cần trao đổi thêm.
        </Notice>
      );
    case "cancelled":
      return (
        <Notice icon={Ban} title="Đợt test đã huỷ">
          Đợt test này đã bị huỷ, bạn không cần làm gì thêm. Cảm ơn bạn đã quan tâm.
        </Notice>
      );
    default:
      return null;
  }
}

function RespondPanel({ t }: { t: TestGame }) {
  const c = t.campaign;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [whitelist, setWhitelist] = useState(t.whitelistInfo ?? "");
  const [declining, setDeclining] = useState(false);
  const respond = useMutation({
    mutationFn: (body: { action: "confirm" | "decline"; whitelistInfo?: string }) => testGameApi.respond(t.id, body),
    onSuccess: (next, body) => {
      queryClient.setQueryData(["testgame-test", t.id], next);
      void queryClient.invalidateQueries({ queryKey: ["testgame-tests"] });
      void queryClient.invalidateQueries({ queryKey: ["testgame-test", t.id] });
      void queryClient.invalidateQueries({ queryKey: ["testgame-survey", t.id] });
      toast.success(
        body.action === "confirm"
          ? "Đã xác nhận tham gia. Hướng dẫn cài đặt hiện bên dưới và được gửi qua email."
          : "Đã từ chối lời mời.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => toast.error(errorText(err, "Không gửi được phản hồi")),
  });
  const busy = respond.isPending;

  return (
    <section className="rounded-[1.75rem] bg-brand-navy p-6 text-white sm:p-7" aria-labelledby="respond-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-yellow">Lời mời test</p>
          <h2 id="respond-title" className="tp-display mt-1 text-2xl font-bold sm:text-3xl">
            Bạn tham gia test {c.gameName} chứ?
          </h2>
        </div>
        <div className="rounded-2xl bg-brand-yellow px-4 py-2 text-center text-brand-navy">
          <p className="text-[11px] font-semibold uppercase tracking-wide">Hạn phản hồi</p>
          <p className="tp-display text-xl font-extrabold tabular-nums">{viDate(t.responseDeadline)}</p>
          <p className="text-xs font-semibold">{countdownText(t.responseDeadline)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/75">
        {c.status === "testing"
          ? "Đợt test đã bắt đầu — xác nhận để vào test ngay. "
          : `Thời gian test ${dateRange(c.startDate, c.endDate)}, khối lượng ${t.hours} giờ. `}
        Sau khi xác nhận, hướng dẫn cài đặt, link tải và thông tin truy cập sẽ hiện ở trang này và được gửi qua email.
      </p>
      {t.status === "declined" && (
        <p className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-sm text-white/85">
          Bạn đã từ chối trước đó — vẫn có thể đổi ý trước hạn phản hồi.
        </p>
      )}

      {declining ? (
        <div role="alertdialog" aria-labelledby="decline-title" className="mt-5 rounded-2xl bg-white p-5 text-brand-navy">
          <p id="decline-title" className="font-semibold">
            Từ chối lời mời test {c.gameName}?
          </p>
          <p className="mt-1 text-sm text-brand-navy/65">
            Bạn vẫn có thể đổi ý trước hạn phản hồi ({viDate(t.responseDeadline)}).
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => respond.mutate({ action: "decline" })}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-magenta px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Từ chối lời mời
            </button>
            <button type="button" disabled={busy} onClick={() => setDeclining(false)} className={ghostOnLight}>
              Quay lại
            </button>
          </div>
        </div>
      ) : (
        <>
          <label className="mt-5 block space-y-1.5 text-sm">
            <span className="font-semibold">
              Thông tin whitelist <span className="font-normal text-white/55">(không bắt buộc)</span>
            </span>
            <textarea
              value={whitelist}
              rows={3}
              maxLength={1000}
              onChange={(e) => setWhitelist(e.target.value)}
              placeholder="VD: Device ID, UID / tên tài khoản game, email Google Play / Apple ID… mà studio cần whitelist để bạn vào được bản test"
              className={cn(fieldClass, "resize-y")}
            />
            <span className="block text-xs text-white/55">Chỉ cần điền khi đợt test yêu cầu whitelist thiết bị hoặc tài khoản.</span>
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => respond.mutate({ action: "confirm", whitelistInfo: whitelist.trim() || undefined })}
              className={cn(ctaYellow, "px-6 py-3 text-sm")}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Xác nhận tham gia
            </button>
            <button type="button" disabled={busy} onClick={() => setDeclining(true)} className={ghostOnDark}>
              Từ chối
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function InstallSection({ t }: { t: TestGame }) {
  const c = t.campaign;
  const empty = !c.apkFolderUrl && !c.installUrl && !c.guide && c.guideFiles.length === 0 && !c.accessInfo;
  return (
    <Reveal className={cn(card, "space-y-6 p-6")}>
      <h2 className="tp-display flex items-center gap-2 text-2xl font-bold text-brand-navy">
        <Download className="h-5 w-5 text-brand-violet" /> Cách cài & chơi
      </h2>
      {empty && (
        <p className="text-sm text-brand-navy/65">
          Hướng dẫn cài đặt sẽ được cập nhật. Kiểm tra email hoặc liên hệ người phụ trách.
        </p>
      )}

      {(c.apkFolderUrl || c.installUrl) && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            {c.apkFolderUrl && (
              <a href={c.apkFolderUrl} target="_blank" rel="noreferrer" className={cn(ctaYellow, "px-5 py-2.5 text-sm")}>
                <FolderOpen className="h-4 w-4" /> Mở folder tải game
              </a>
            )}
            {c.installUrl && (
              <a href={c.installUrl} target="_blank" rel="noreferrer" className={ghostOnLight}>
                <ExternalLink className="h-4 w-4" /> Link cài đặt
              </a>
            )}
          </div>
          {c.apkFolderUrl && (
            <p className="text-xs text-brand-navy/55">
              Folder Google Drive được chia sẻ riêng cho email nhận lời mời — mở bằng đúng tài khoản Google đó. Nếu chưa vào
              được, chờ vài phút rồi thử lại hoặc liên hệ người phụ trách.
            </p>
          )}
        </div>
      )}

      {c.guide && (
        <div>
          <h3 className="text-sm font-semibold text-brand-navy">Hướng dẫn</h3>
          <RichText text={c.guide} className="mt-1.5 text-sm text-brand-navy/80" />
        </div>
      )}

      {c.guideFiles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brand-navy">Tệp hướng dẫn</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {c.guideFiles.map((f) => (
              <li key={f.id}>
                <a
                  href={testFileUrl(f.id, true)}
                  download={f.fileName}
                  className="flex items-center gap-3 rounded-2xl bg-[#f5f4ff] px-4 py-3 transition-colors hover:bg-brand-lavender/40"
                >
                  <FileText className="h-5 w-5 shrink-0 text-brand-violet" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand-navy">{f.fileName}</span>
                    <span className="text-xs text-brand-navy/55">{formatBytes(f.size)}</span>
                  </span>
                  <Download className="h-4 w-4 shrink-0 text-brand-navy/50" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.accessInfo && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-brand-navy">
              <KeyRound className="h-4 w-4 text-brand-violet" /> Thông tin truy cập
            </h3>
            <CopyButton text={c.accessInfo} />
          </div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-brand-navy px-4 py-3 font-mono text-sm text-brand-yellow">
            {c.accessInfo}
          </pre>
          <p className="mt-1.5 text-xs text-brand-navy/55">Không chia sẻ bản test và thông tin truy cập ra ngoài.</p>
        </div>
      )}
    </Reveal>
  );
}

type StepState = "done" | "current" | "todo" | "error";

function timelineSteps(t: TestGame): Array<{ label: string; detail: string; state: StepState }> {
  const c = t.campaign;
  const joined = isJoined(t);
  const submitted = t.status === "submitted";
  const refused = t.status === "declined" || t.nextAction.key === "expired";
  return [
    { label: "Mời", detail: viDay(t.invitedAt), state: "done" },
    {
      label: "Xác nhận",
      detail: joined
        ? viDay(t.respondedAt)
        : t.status === "declined" && !t.canRespond
          ? "Đã từ chối"
          : t.nextAction.key === "expired"
            ? "Quá hạn phản hồi"
            : `Hạn ${viDate(t.responseDeadline)}`,
      state: joined ? "done" : t.canRespond ? "current" : refused ? "error" : "todo",
    },
    {
      label: "Bắt đầu",
      detail: viDate(c.startDate),
      state: t.status === "in_test" || submitted ? "done" : t.status === "confirmed" ? "current" : "todo",
    },
    {
      label: "Hạn test",
      detail: t.submittedAt ? `Đã nộp ${viDay(t.submittedAt)}` : c.endDate ? `Nộp trước ${viDate(c.endDate)}` : "—",
      state: submitted ? "done" : t.status === "in_test" ? (t.surveyOpen ? "current" : "error") : "todo",
    },
    {
      label: "Duyệt",
      detail:
        t.reviewStatus === "approved"
          ? `+${t.hours} giờ test`
          : t.reviewStatus === "rejected" && submitted
            ? t.surveyEditable
              ? "Cần nộp lại"
              : "Không được duyệt"
            : submitted
              ? "Đang chờ duyệt"
              : "Sau khi nộp",
      state: t.reviewStatus === "approved" ? "done" : t.reviewStatus === "rejected" && submitted ? "error" : submitted ? "current" : "todo",
    },
  ];
}

const DOT: Record<StepState, string> = {
  done: "bg-brand-mint text-brand-navy",
  current: "bg-brand-navy text-brand-yellow ring-4 ring-brand-yellow/50",
  error: "bg-brand-magenta text-white",
  todo: "bg-[#f5f4ff] text-brand-navy/45 ring-1 ring-brand-navy/10",
};

function Timeline({ t }: { t: TestGame }) {
  const steps = timelineSteps(t);
  return (
    <ol className="mt-4">
      {steps.map((s, i) => (
        <li key={s.label} aria-current={s.state === "current" ? "step" : undefined} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn("absolute bottom-0 left-[15px] top-8 w-0.5", s.state === "done" ? "bg-brand-mint" : "bg-brand-navy/10")}
            />
          )}
          <span className={cn("relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", DOT[s.state])}>
            {s.state === "done" ? <Check className="h-4 w-4" /> : s.state === "error" ? <X className="h-4 w-4" /> : i + 1}
          </span>
          <div className="min-w-0 pt-1">
            <p className={cn("text-sm font-semibold", s.state === "current" ? "text-brand-violet" : "text-brand-navy")}>
              {s.label}
              {s.state === "current" && (
                <span className="ml-2 rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-bold uppercase text-brand-navy">Hiện tại</span>
              )}
            </p>
            <p className={cn("text-xs", s.state === "error" ? "text-brand-magenta" : "text-brand-navy/55")}>{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
