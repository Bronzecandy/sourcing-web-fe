import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, Copy, Gamepad2, Hourglass, LogIn, RotateCcw, ShieldAlert, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { card, ctaYellow, ghostOnLight, TESTER_LOGIN_URL } from "@/tester/components/styles";
import type { TesterTestGame } from "../types";
import { ACTION_TONE, errorText, isNotInvited, surveyPath, TONE_CLASS, viDay } from "./utils";

export function GameIcon({ url, className }: { url: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-brand-yellow", className)}>
        <Gamepad2 className="h-1/2 w-1/2" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn("shrink-0 rounded-2xl bg-white object-cover", className)}
    />
  );
}

export function RoundBadge({ round, className }: { round: number; className?: string }) {
  if (round <= 1) return null;
  return (
    <span className={cn("inline-flex shrink-0 rounded-full bg-brand-violet px-2.5 py-0.5 text-xs font-bold text-white", className)}>
      Lần {round}
    </span>
  );
}

const TONE_ICON = { todo: Clock, progress: Hourglass, success: CheckCircle2, danger: XCircle, muted: Clock } as const;

export function StatusPill({ t, className }: { t: TesterTestGame; className?: string }) {
  const tone = ACTION_TONE[t.nextAction.key] ?? "muted";
  const Icon = TONE_ICON[tone];
  if (!t.nextAction.label) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        TONE_CLASS[tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {t.nextAction.label}
    </span>
  );
}

export function Chip({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        dark ? "bg-white/12 text-white/85 ring-1 ring-white/20" : "bg-white text-brand-navy/70 ring-1 ring-brand-navy/10",
      )}
    >
      {children}
    </span>
  );
}

const URL_SPLIT = /(https?:\/\/[^\s<>"')\]]+)/g;

/** Văn bản admin nhập: giữ xuống dòng, link bấm được. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_SPLIT);
  return (
    <p className={cn("whitespace-pre-line break-words", className)}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noreferrer"
            className="break-all font-medium text-brand-violet underline underline-offset-2"
          >
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </p>
  );
}

export function CopyButton({ text, label = "Sao chép" }: { text: string; label?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => toast.success("Đã sao chép"))
          .catch(() => toast.error("Trình duyệt không cho sao chép — hãy bôi đen và copy thủ công"));
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-brand-navy/15 bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy transition-colors hover:bg-brand-lavender/30"
    >
      <Copy className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

/** Lỗi tải đợt test: BE trả 404 khi đăng nhập sai email nhận lời mời. */
export function LoadError({
  error,
  onRetry,
  title = "Không mở được đợt test",
  accountHint = true,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  accountHint?: boolean;
}) {
  const { user, logout } = useAuth();
  const wrongAccount = accountHint && isNotInvited(error) && Boolean(user);
  return (
    <div className={cn(card, "mx-auto max-w-2xl space-y-5 p-6 text-center sm:p-8")}>
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-magenta/10 text-brand-magenta">
        <ShieldAlert className="h-7 w-7" />
      </span>
      <div className="space-y-2">
        <h2 className="tp-display text-2xl font-bold text-brand-navy">{title}</h2>
        <p className="text-brand-navy/70">{errorText(error, "Có lỗi khi tải dữ liệu. Thử tải lại trang.")}</p>
      </div>
      {wrongAccount && user && (
        <p className="rounded-2xl bg-[#f5f4ff] px-4 py-3 text-left text-sm text-brand-navy/75">
          Bạn đang đăng nhập bằng <b className="break-all">{user.email}</b>. Lời mời test chỉ mở được bằng đúng tài khoản Google
          nhận mail mời — nếu mail được gửi tới email khác, hãy đăng nhập bằng email đó rồi mở lại link trong mail.
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {wrongAccount ? (
          <button
            type="button"
            onClick={() =>
              void logout()
                .catch(() => undefined)
                .then(() => window.location.assign(TESTER_LOGIN_URL))
            }
            className={cn(ctaYellow, "px-5 py-2.5 text-sm")}
          >
            <LogIn className="h-4 w-4" /> Đăng nhập tài khoản khác
          </button>
        ) : (
          onRetry && (
            <button type="button" onClick={onRetry} className={cn(ctaYellow, "px-5 py-2.5 text-sm")}>
              <RotateCcw className="h-4 w-4" /> Thử lại
            </button>
          )
        )}
        <Link to="/tester/tests" className={ghostOnLight}>
          Về Test của tôi
        </Link>
      </div>
    </div>
  );
}

/** Kết quả duyệt bài nộp; null khi chưa nộp. */
export function ReviewResult({ t, showLink = true }: { t: TesterTestGame; showLink?: boolean }) {
  if (t.status !== "submitted") return null;

  if (t.reviewStatus === "approved") {
    return (
      <div className="rounded-[1.75rem] bg-brand-mint/40 p-6 text-brand-navy ring-1 ring-brand-mint">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-5 w-5" /> Đã duyệt hoàn thành
        </p>
        <p className="tp-display mt-2 text-4xl font-extrabold tabular-nums">+{t.hours} giờ test</p>
        <p className="mt-1 text-sm text-brand-navy/70">Số giờ này đã được cộng vào hồ sơ và quy đổi thành benefit.</p>
        {showLink && (
          <Link to="/tester/benefits" className={cn(ghostOnLight, "mt-4")}>
            Xem benefit <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    );
  }

  if (t.reviewStatus === "rejected") {
    return (
      <div className="rounded-[1.75rem] border-2 border-brand-magenta/40 bg-white p-6 text-brand-navy">
        <p className="flex items-center gap-2 font-semibold text-brand-magenta">
          <XCircle className="h-5 w-5" /> Bài nộp chưa được duyệt
        </p>
        {t.reviewNote && (
          <div className="mt-3 rounded-2xl bg-brand-magenta/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-magenta">Lý do</p>
            <RichText text={t.reviewNote} className="mt-1 text-sm" />
          </div>
        )}
        {t.surveyEditable ? (
          <>
            <p className="mt-3 text-sm text-brand-navy/70">
              Sửa câu trả lời hoặc tải ảnh bằng chứng mới (có UID và level / tiến trình rõ ràng) rồi nộp lại để được duyệt.
            </p>
            {showLink && (
              <Link to={surveyPath(t.id)} className={cn(ctaYellow, "mt-4 px-5 py-2.5 text-sm")}>
                Sửa & nộp lại <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-brand-navy/70">Đợt test đã đóng nhận bài. Liên hệ người phụ trách nếu bạn cần trao đổi thêm.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] bg-brand-lavender/45 p-6 text-brand-navy ring-1 ring-brand-lavender">
      <p className="flex items-center gap-2 font-semibold">
        <Hourglass className="h-5 w-5 text-brand-violet" /> Đang chờ duyệt
      </p>
      <p className="mt-2 text-sm text-brand-navy/75">
        AI kiểm tra ảnh bằng chứng, admin sẽ duyệt. Khi được duyệt, {t.hours} giờ test được cộng vào hồ sơ để đổi benefit.
      </p>
      {t.submittedAt && <p className="mt-1 text-xs text-brand-navy/55">Nộp ngày {viDay(t.submittedAt)}</p>}
      {showLink && t.surveyEditable && (
        <Link to={surveyPath(t.id)} className={cn(ghostOnLight, "mt-4")}>
          Xem / sửa bài đã nộp
        </Link>
      )}
    </div>
  );
}
