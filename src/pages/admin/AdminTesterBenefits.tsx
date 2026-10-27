import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnPrimary } from "@/lib/button-classes";
import { testerApi } from "@/tester/api";

const input = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm";

export default function AdminTesterBenefits() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const testers = useQuery({ queryKey: ["tester-admin-testers"], queryFn: testerApi.adminTesters });
  const meta = useQuery({ queryKey: ["tester-admin-meta"], queryFn: testerApi.adminMeta });
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("1");
  const [item, setItem] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const rewards = useMemo(
    () => (meta.data?.catalog.tiers ?? []).flatMap((t) => t.items.map((i) => `${i.game}: ${i.reward}`)),
    [meta.data],
  );
  const rows = useMemo(
    () => [...(testers.data ?? [])].sort((a, b) => b.stats.availableBenefits - a.stats.availableBenefits),
    [testers.data],
  );

  const redeem = async () => {
    setSaving(true);
    try {
      await testerApi.adminRedeem({ userId, amount: Number(amount), item, note: note || undefined });
      toast.success("Đã ghi nhận đổi benefit");
      setItem("");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["tester-admin-testers"] });
      void queryClient.invalidateQueries({ queryKey: ["tester-admin-tester", userId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không ghi nhận được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="space-y-3 rounded-xl border border-border bg-card p-5 lg:col-span-2 h-fit">
        <h2 className="font-semibold flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" /> Ghi nhận đổi benefit
        </h2>
        <p className="text-xs text-muted-foreground">
          Benefit có = round(giờ test hoàn thành / {meta.data?.benefitHoursPerUnit ?? 3}). Đổi quà sẽ trừ vào benefit còn lại.
        </p>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className={input}>
          <option value="">Chọn tester…</option>
          {rows.map((r) => (
            <option key={r.userId} value={r.userId}>
              {r.name} (còn {r.stats.availableBenefits})
            </option>
          ))}
        </select>
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={input} placeholder="Số benefit" />
        <input list="benefit-rewards" value={item} onChange={(e) => setItem(e.target.value)} className={input} placeholder="Phần quà" />
        <datalist id="benefit-rewards">
          {rewards.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={input} placeholder="Ghi chú (không bắt buộc)" />
        <button
          type="button"
          disabled={saving || !userId || !item}
          onClick={() => void redeem()}
          className={cn(btnPrimary, "w-full px-4 py-2")}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Ghi nhận
        </button>
      </section>

      <section className="rounded-xl border border-border overflow-hidden lg:col-span-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {["Tester", "Giờ test", "Đã có", "Đã dùng", "Còn lại"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.userId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.stats.completedHours}</td>
                  <td className="px-4 py-3 tabular-nums">{r.stats.earnedBenefits}</td>
                  <td className="px-4 py-3 tabular-nums">{r.stats.usedBenefits}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{r.stats.availableBenefits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
