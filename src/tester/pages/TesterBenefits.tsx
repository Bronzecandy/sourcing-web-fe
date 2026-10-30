import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Gift, Loader2, Lock, X, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { testerApi } from "../api";
import type { BenefitRedemption, RedeemTier, RedemptionStatus, TesterBenefits as BenefitsData } from "../types";
import PageHero, { PageBody } from "../components/PageHero";
import Reveal from "../components/Reveal";
import { card, ctaYellow, ghostOnLight } from "../components/styles";

const GAME_NAMES: Record<string, string> = {
  AOV: "Liên Quân Mobile",
  FF: "Free Fire",
  FCO: "FC Online",
  FCM: "FC Mobile",
  DF: "Delta Force",
};

const ACCOUNT_HINT: Record<string, string> = {
  AOV: "Tên nhân vật hoặc ID Liên Quân",
  FF: "UID Free Fire",
  FCO: "Tên tài khoản Garena chơi FC Online",
  FCM: "ID hoặc tên tài khoản FC Mobile",
  DF: "UID Delta Force",
};

const STATUS: Record<RedemptionStatus, { label: string; className: string; Icon: typeof Clock }> = {
  pending: { label: "Chờ PIC trao", className: "bg-brand-yellow/80 text-brand-navy", Icon: Clock },
  fulfilled: { label: "Đã trao", className: "bg-brand-mint/50 text-brand-navy", Icon: CheckCircle2 },
  rejected: { label: "Bị từ chối", className: "bg-brand-magenta/15 text-brand-magenta", Icon: XCircle },
  cancelled: { label: "Đã hủy", className: "bg-brand-navy/10 text-brand-navy/60", Icon: X },
};

const field =
  "w-full rounded-2xl border border-brand-navy/15 bg-white px-4 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20";

function rewardText(s: string): string {
  return s.replace(/\s*--\s*/g, ", ").replace(/\s+HOẶC\s+/g, " hoặc ");
}

function tierTitle(tier: RedeemTier): string {
  return tier.requirement ? "Quà tester tích cực" : "Quà mỗi game test";
}

function requirementText(req: RedeemTier["requirement"]): string | null {
  if (!req) return null;
  const parts = [
    req.minGamesPerMonth != null ? `${req.minGamesPerMonth} game` : null,
    req.minHoursPerMonth != null ? `${req.minHoursPerMonth} giờ test` : null,
  ].filter(Boolean);
  return parts.length ? `hoàn thành ${parts.join(" hoặc ")} trong tháng` : null;
}

function meetsRequirement(req: RedeemTier["requirement"], month: BenefitsData["month"]): boolean {
  if (!req) return true;
  return (
    (req.minGamesPerMonth != null && month.games >= req.minGamesPerMonth) ||
    (req.minHoursPerMonth != null && month.hours >= req.minHoursPerMonth)
  );
}

type Picked = { tier: RedeemTier; item: RedeemTier["items"][number] };

export default function TesterBenefits() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["tester-benefits"], queryFn: testerApi.benefits });
  const [picked, setPicked] = useState<Picked | null>(null);

  const update = (next: BenefitsData) => {
    queryClient.setQueryData(["tester-benefits"], next);
    void queryClient.invalidateQueries({ queryKey: ["tester-me"] });
  };
  const cancel = useMutation({
    mutationFn: testerApi.cancelRedemption,
    onSuccess: (next) => {
      update(next);
      toast.success("Đã hủy yêu cầu, benefit được hoàn lại");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không hủy được yêu cầu"),
  });

  return (
    <>
      <PageHero
        title="Benefit"
        subtitle={
          data
            ? `Mỗi ${data.benefitHoursPerUnit} giờ test hoàn thành được 1 benefit. Chọn quà và gửi yêu cầu, PIC của game sẽ trao quà vào tài khoản của bạn.`
            : "Giờ test hoàn thành được quy đổi thành benefit để đổi quà in-game."
        }
      />
      <PageBody>
        {isLoading ? (
          <div className={cn(card, "flex justify-center p-10")}>
            <Loader2 className="h-6 w-6 animate-spin text-brand-violet" />
          </div>
        ) : error || !data ? (
          <p className={cn(card, "p-6 text-brand-magenta")}>Không tải được benefit.</p>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <Reveal className="rounded-[1.75rem] bg-brand-yellow p-6 text-brand-navy">
                <p className="text-sm font-semibold text-brand-navy/75">Benefit còn lại</p>
                <p className="tp-display mt-1 text-5xl font-extrabold tabular-nums">{data.stats.availableBenefits}</p>
                <p className="text-xs text-brand-navy/65">Dùng để đổi quà bên dưới</p>
              </Reveal>
              <Reveal delay={80} className={cn(card, "p-6")}>
                <p className="text-sm font-semibold text-brand-navy/60">Đã tích lũy</p>
                <p className="tp-display mt-1 text-5xl font-extrabold tabular-nums">{data.stats.earnedBenefits}</p>
                <p className="text-xs text-brand-navy/55">{data.stats.completedHours} giờ test hoàn thành</p>
              </Reveal>
              <Reveal delay={160} className={cn(card, "p-6")}>
                <p className="text-sm font-semibold text-brand-navy/60">Đã dùng</p>
                <p className="tp-display mt-1 text-5xl font-extrabold tabular-nums">{data.stats.usedBenefits}</p>
                <p className="text-xs text-brand-navy/55">
                  {data.stats.pendingBenefits > 0 ? `Gồm ${data.stats.pendingBenefits} đang chờ PIC trao` : "Đã trao xong"}
                </p>
              </Reveal>
            </div>

            <MonthProgress month={data.month} tiers={data.tiers} />

            <div className="grid gap-6 lg:grid-cols-2">
              {data.tiers.map((tier, i) => (
                <TierCard key={tier.index} tier={tier} delay={i * 100} onPick={(item) => setPicked({ tier, item })} />
              ))}
            </div>

            <History rows={data.redemptions} cancelling={cancel.isPending} onCancel={(id) => cancel.mutate(id)} />
          </div>
        )}
      </PageBody>
      {picked && data && (
        <RedeemDialog
          picked={picked}
          available={data.stats.availableBenefits}
          onClose={() => setPicked(null)}
          onDone={(next) => {
            update(next);
            setPicked(null);
            toast.success("Đã gửi yêu cầu đổi quà, PIC sẽ trao quà vào tài khoản của bạn");
          }}
        />
      )}
    </>
  );
}

function MonthProgress({ month, tiers }: { month: BenefitsData["month"]; tiers: RedeemTier[] }) {
  const gated = tiers.find((t) => t.requirement);
  const req = gated?.requirement ?? null;
  const [y, m] = month.month.split("-");
  const unlocked = meetsRequirement(req, month);
  return (
    <Reveal className={cn(card, "p-6")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="tp-display text-2xl font-bold text-brand-navy">
          Tháng {Number(m)}/{y}
        </h2>
        <p className="text-sm text-brand-navy/60">
          {month.games} game · {month.hours} giờ test hoàn thành
        </p>
      </div>
      {gated && req && (
        <>
          <p className="mt-2 text-sm text-brand-navy/70">
            {unlocked
              ? `Bạn đã mở khóa ${tierTitle(gated)} tháng này.`
              : `Chỉ cần ${requirementText(req)} để mở khóa ${tierTitle(gated)}.`}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {req.minGamesPerMonth != null && (
              <Progress label="Game đã test" value={month.games} target={req.minGamesPerMonth} unit="game" />
            )}
            {req.minHoursPerMonth != null && (
              <Progress label="Giờ test" value={month.hours} target={req.minHoursPerMonth} unit="giờ" />
            )}
          </div>
        </>
      )}
    </Reveal>
  );
}

function Progress({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 100;
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-brand-navy/60">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}/{target} {unit}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-brand-navy/10">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", pct >= 100 ? "bg-brand-mint" : "bg-brand-violet")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TierCard({
  tier,
  delay,
  onPick,
}: {
  tier: RedeemTier;
  delay: number;
  onPick: (item: RedeemTier["items"][number]) => void;
}) {
  const dark = Boolean(tier.requirement);
  const rules = [
    tier.requirement ? `Mở khi ${requirementText(tier.requirement)}` : "Đổi bất cứ lúc nào khi còn benefit",
    tier.monthlyLimit != null
      ? `tối đa ${tier.monthlyLimit} lần/tháng (đã đổi ${tier.usedThisMonth})`
      : "không giới hạn số lần",
  ];
  return (
    <Reveal delay={delay} className={cn("rounded-[1.75rem] p-6", dark ? "bg-brand-navy text-white" : card)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="tp-display text-2xl font-bold">{tierTitle(tier)}</h2>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            dark ? "bg-brand-yellow text-brand-navy" : "bg-brand-lavender/60 text-brand-navy",
          )}
        >
          {tier.cost} benefit / lần
        </span>
      </div>
      <p className={cn("mt-1 text-sm", dark ? "text-white/65" : "text-brand-navy/60")}>{rules.join(" · ")}</p>
      {tier.lockedReason && (
        <p
          className={cn(
            "mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm",
            dark ? "bg-white/10 text-white/80" : "bg-[#f5f4ff] text-brand-navy/70",
          )}
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0" /> {tier.lockedReason}
        </p>
      )}
      <ul className="mt-5 space-y-3">
        {tier.items.map((it) => (
          <li
            key={it.index}
            className={cn("flex items-start justify-between gap-3 rounded-2xl px-4 py-3", dark ? "bg-white/10" : "bg-[#f5f4ff]")}
          >
            <div className="min-w-0">
              <p className={cn("text-xs font-semibold uppercase tracking-wide", dark ? "text-brand-yellow" : "text-brand-violet")}>
                {GAME_NAMES[it.game] ?? it.game}
              </p>
              <p className="mt-0.5 text-sm">{rewardText(it.reward)}</p>
              {it.pic && (
                <p className={cn("mt-1 text-xs", dark ? "text-white/55" : "text-brand-navy/50")}>
                  PIC: {it.pic.replace(/\n/g, ", ")}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={Boolean(tier.lockedReason)}
              onClick={() => onPick(it)}
              className={cn(ctaYellow, "shrink-0 px-4 py-2 text-sm")}
            >
              Đổi quà
            </button>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

function RedeemDialog({
  picked,
  available,
  onClose,
  onDone,
}: {
  picked: Picked;
  available: number;
  onClose: () => void;
  onDone: (next: BenefitsData) => void;
}) {
  const { tier, item } = picked;
  const choose = item.options.length > 1;
  const [option, setOption] = useState(choose ? -1 : 0);
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  const redeem = useMutation({
    mutationFn: () =>
      testerApi.redeem({
        tier: tier.index,
        item: item.index,
        option: choose ? option : undefined,
        gameAccount: account.trim(),
        note: note.trim() || undefined,
      }),
    onSuccess: onDone,
  });
  const busy = redeem.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const canSubmit = (!choose || option >= 0) && account.trim().length >= 2 && !busy;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm" onClick={() => !busy && onClose()} aria-hidden />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="redeem-title"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) redeem.mutate();
        }}
        className={cn(card, "relative max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto p-6 text-brand-navy")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-violet">{tierTitle(tier)}</p>
            <h2 id="redeem-title" className="tp-display text-2xl font-bold">
              Đổi quà {GAME_NAMES[item.game] ?? item.game}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="rounded-full p-1.5 text-brand-navy/50 transition-colors hover:bg-brand-navy/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {choose ? (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Chọn 1 phần quà</legend>
            {item.options.map((o, i) => (
              <label
                key={o}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
                  option === i ? "border-brand-violet bg-brand-lavender/30" : "border-brand-navy/10 hover:bg-[#f5f4ff]",
                )}
              >
                <input
                  type="radio"
                  name="reward-option"
                  className="mt-0.5 accent-brand-violet"
                  checked={option === i}
                  onChange={() => setOption(i)}
                />
                {rewardText(o)}
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="rounded-2xl bg-[#f5f4ff] px-4 py-3 text-sm">{rewardText(item.reward)}</p>
        )}
        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold">Tài khoản nhận quà *</span>
          <input
            autoFocus
            value={account}
            maxLength={120}
            onChange={(e) => setAccount(e.target.value)}
            placeholder={ACCOUNT_HINT[item.game] ?? "UID hoặc tên nhân vật trong game"}
            className={field}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold">
            Ghi chú cho PIC <span className="font-normal text-brand-navy/50">(không bắt buộc)</span>
          </span>
          <textarea
            value={note}
            rows={2}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            className={cn(field, "resize-none")}
          />
        </label>
        <p className="text-sm text-brand-navy/65">
          Dùng <b>{tier.cost}</b> benefit, còn lại <b>{Math.max(0, available - tier.cost)}</b> sau khi đổi. Nếu yêu cầu bị từ chối
          hoặc bạn hủy trước khi PIC trao, benefit được hoàn lại.
        </p>
        {redeem.error && (
          <p className="text-sm text-brand-magenta">
            {redeem.error instanceof Error ? redeem.error.message : "Không gửi được yêu cầu"}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className={ghostOnLight}>
            Hủy
          </button>
          <button type="submit" disabled={!canSubmit} className={cn(ctaYellow, "px-6 py-2.5 text-sm")}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Gửi yêu cầu
          </button>
        </div>
      </form>
    </div>
  );
}

function History({
  rows,
  cancelling,
  onCancel,
}: {
  rows: BenefitRedemption[];
  cancelling: boolean;
  onCancel: (id: string) => void;
}) {
  return (
    <Reveal className={cn(card, "p-6")}>
      <h2 className="tp-display flex items-center gap-2 text-2xl font-bold text-brand-navy">
        <Gift className="h-5 w-5 text-brand-violet" />
        Lịch sử đổi quà
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-brand-navy/60">Chưa đổi lần nào.</p>
      ) : (
        <ul className="mt-3 divide-y divide-brand-navy/10 text-sm">
          {rows.map((r) => {
            const s = STATUS[r.status] ?? STATUS.fulfilled;
            const refunded = r.status === "rejected" || r.status === "cancelled";
            return (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold">
                    {r.game ? `${GAME_NAMES[r.game] ?? r.game}: ${rewardText(r.reward ?? "")}` : r.item}
                  </p>
                  {r.gameAccount && <p className="text-brand-navy/60">Tài khoản: {r.gameAccount}</p>}
                  {r.note && <p className="text-brand-navy/55">Ghi chú: {r.note}</p>}
                  {r.adminNote && (
                    <p className={r.status === "rejected" ? "text-brand-magenta" : "text-brand-navy/60"}>
                      {r.status === "rejected" ? "Lý do: " : "PIC: "}
                      {r.adminNote}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", s.className)}>
                    <s.Icon className="h-3.5 w-3.5" /> {s.label}
                  </span>
                  <span className="text-xs tabular-nums text-brand-navy/55">
                    {refunded ? `Hoàn ${r.amount}` : `−${r.amount}`} · {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                  {r.status === "pending" && (
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => {
                        if (window.confirm("Hủy yêu cầu đổi quà này? Benefit sẽ được hoàn lại.")) onCancel(r.id);
                      }}
                      className="text-xs font-semibold text-brand-magenta hover:underline disabled:opacity-50"
                    >
                      Hủy yêu cầu
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Reveal>
  );
}
