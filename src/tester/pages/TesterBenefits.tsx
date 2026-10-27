import { useQuery } from "@tanstack/react-query";
import { Gift, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { testerApi } from "../api";
import PageHero, { PageBody } from "../components/PageHero";
import Reveal from "../components/Reveal";
import { card } from "../components/styles";

const GAME_NAMES: Record<string, string> = {
  AOV: "Liên Quân Mobile",
  FF: "Free Fire",
  FCO: "FC Online",
  FCM: "FC Mobile",
  DF: "Delta Force",
};

function rewardText(s: string): string {
  return s.replace(/\s*--\s*/g, ", ").replace(/\s+HOẶC\s+/g, " hoặc ");
}

export default function TesterBenefits() {
  const { data, isLoading, error } = useQuery({ queryKey: ["tester-benefits"], queryFn: testerApi.benefits });

  return (
    <>
      <PageHero
        title="Benefit"
        subtitle={
          data
            ? `Mỗi ${data.benefitHoursPerUnit} giờ test hoàn thành được 1 benefit. Liên hệ PIC của game để nhận quà.`
            : "Giờ test hoàn thành được quy đổi thành benefit để nhận quà in-game."
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
              </Reveal>
              <Reveal delay={80} className={cn(card, "p-6")}>
                <p className="text-sm font-semibold text-brand-navy/60">Đã tích lũy</p>
                <p className="tp-display mt-1 text-5xl font-extrabold tabular-nums">{data.stats.earnedBenefits}</p>
                <p className="text-xs text-brand-navy/55">{data.stats.completedHours} giờ test hoàn thành</p>
              </Reveal>
              <Reveal delay={160} className={cn(card, "p-6")}>
                <p className="text-sm font-semibold text-brand-navy/60">Đã dùng</p>
                <p className="tp-display mt-1 text-5xl font-extrabold tabular-nums">{data.stats.usedBenefits}</p>
              </Reveal>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {data.catalog.tiers.map((tier, i) => {
                const top = i === data.catalog.tiers.length - 1 && data.catalog.tiers.length > 1;
                return (
                  <Reveal
                    key={tier.condition}
                    delay={i * 100}
                    className={cn("rounded-[1.75rem] p-6", top ? "bg-brand-navy text-white" : cn(card))}
                  >
                    <h2 className="tp-display text-2xl font-bold">{top ? "Quà tester tích cực" : "Quà mỗi game test"}</h2>
                    <p className={cn("mt-1 text-sm", top ? "text-white/65" : "text-brand-navy/60")}>{tier.condition}</p>
                    <ul className="mt-5 space-y-3">
                      {tier.items.map((it) => (
                        <li key={`${tier.condition}-${it.game}`} className={cn("rounded-2xl px-4 py-3", top ? "bg-white/10" : "bg-[#f5f4ff]")}>
                          <p className={cn("text-xs font-semibold uppercase tracking-wide", top ? "text-brand-yellow" : "text-brand-violet")}>
                            {GAME_NAMES[it.game] ?? it.game}
                          </p>
                          <p className="mt-0.5 text-sm">{rewardText(it.reward)}</p>
                          {it.pic && (
                            <p className={cn("mt-1 whitespace-pre-line text-xs", top ? "text-white/55" : "text-brand-navy/50")}>
                              PIC: {it.pic.replace(/\n/g, ", ")}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                );
              })}
            </div>

            <Reveal className={cn(card, "p-6")}>
              <h2 className="tp-display flex items-center gap-2 text-2xl font-bold text-brand-navy">
                <Gift className="h-5 w-5 text-brand-violet" />
                Lịch sử đổi benefit
              </h2>
              {data.redemptions.length === 0 ? (
                <p className="mt-3 text-sm text-brand-navy/60">Chưa đổi lần nào.</p>
              ) : (
                <ul className="mt-3 divide-y divide-brand-navy/10 text-sm">
                  {data.redemptions.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                      <span>
                        <span className="font-semibold">{r.item}</span>
                        {r.note && <span className="text-brand-navy/55">, {r.note}</span>}
                      </span>
                      <span className="whitespace-nowrap text-brand-navy/55">
                        −{r.amount} · {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>
          </div>
        )}
      </PageBody>
    </>
  );
}
