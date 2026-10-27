import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import { testerApi } from "../../api";

export default function AdminBenefits() {
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
    () => (meta.data?.catalog.tiers ?? []).flatMap((t) => t.items.map((i) => `${i.game} — ${i.reward}`)),
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không ghi nhận được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="font-semibold text-brand-navy">Ghi nhận đổi benefit</h2>
        <p className="text-xs text-muted-foreground">
          Benefit có = round(giờ test hoàn thành / {meta.data?.benefitHoursPerUnit ?? 3}). Đổi quà sẽ trừ vào benefit còn lại.
        </p>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm">
          <option value="">Chọn tester…</option>
          {rows.map((r) => (
            <option key={r.userId} value={r.userId}>
              {r.name} — còn {r.stats.availableBenefits}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Số benefit"
        />
        <input
          list="benefit-rewards"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Phần quà"
        />
        <datalist id="benefit-rewards">
          {rewards.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Ghi chú (không bắt buộc)"
        />
        <button
          type="button"
          disabled={saving || !userId || !item}
          onClick={() => void redeem()}
          className="w-full rounded-lg bg-brand-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : "Ghi nhận"}
        </button>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm lg:col-span-3">
        <table className="w-full text-sm">
          <thead className="bg-brand-navy text-white">
            <tr>
              {["Tester", "Giờ test", "Đã có", "Đã dùng", "Còn lại"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-t border-border">
                <td className="px-3 py-2">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </td>
                <td className="px-3 py-2 tabular-nums">{r.stats.completedHours}</td>
                <td className="px-3 py-2 tabular-nums">{r.stats.earnedBenefits}</td>
                <td className="px-3 py-2 tabular-nums">{r.stats.usedBenefits}</td>
                <td className="px-3 py-2 font-semibold tabular-nums">{r.stats.availableBenefits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
