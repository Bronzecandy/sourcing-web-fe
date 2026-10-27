import { useQuery } from "@tanstack/react-query";
import { testerApi } from "../api";

export default function TesterBenefits() {
  const { data, isLoading, error } = useQuery({ queryKey: ["tester-benefits"], queryFn: testerApi.benefits });
  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (error || !data) return <p className="text-sm text-destructive">Không tải được benefit.</p>;
  const { stats, catalog, redemptions } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Benefit</h1>
        <p className="text-sm text-muted-foreground">
          Mỗi {data.benefitHoursPerUnit} giờ test hoàn thành = 1 benefit. Liên hệ PIC của game để nhận quà.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Big label="Benefit còn lại" value={stats.availableBenefits} accent />
        <Big label="Đã tích lũy" value={stats.earnedBenefits} hint={`${stats.completedHours} giờ test`} />
        <Big label="Đã dùng" value={stats.usedBenefits} />
      </div>

      {catalog.tiers.map((tier) => (
        <section key={tier.condition} className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <h2 className="px-4 pt-4 font-semibold text-brand-navy">{tier.condition}</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="bg-brand-navy text-white">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Game</th>
                <th className="px-4 py-2 text-left font-medium">Phần quà</th>
                <th className="px-4 py-2 text-left font-medium">Game PIC</th>
              </tr>
            </thead>
            <tbody>
              {tier.items.map((it) => (
                <tr key={`${tier.condition}-${it.game}`} className="border-t border-border align-top">
                  <td className="px-4 py-2 font-medium">{it.game}</td>
                  <td className="px-4 py-2">{it.reward}</td>
                  <td className="whitespace-pre-line px-4 py-2 text-muted-foreground">{it.pic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-brand-navy">Lịch sử đổi benefit</h2>
        {redemptions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Chưa đổi lần nào.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {redemptions.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-medium">{r.item}</span>
                  {r.note && <span className="text-muted-foreground"> — {r.note}</span>}
                </span>
                <span className="whitespace-nowrap text-muted-foreground">
                  −{r.amount} · {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Big({ label, value, hint, accent }: { label: string; value: number; hint?: string; accent?: boolean }) {
  return (
    <div className={accent ? "brand-hero rounded-2xl p-5 text-white shadow-sm" : "rounded-2xl border border-border bg-white p-5 shadow-sm"}>
      <p className={accent ? "text-sm text-white/80" : "text-sm text-muted-foreground"}>{label}</p>
      <p className={accent ? "mt-1 text-4xl font-bold" : "mt-1 text-4xl font-bold text-brand-navy"}>{value}</p>
      {hint && <p className={accent ? "text-xs text-white/70" : "text-xs text-muted-foreground"}>{hint}</p>}
    </div>
  );
}
