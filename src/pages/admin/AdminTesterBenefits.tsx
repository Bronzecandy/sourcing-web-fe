import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Gift, Loader2, X } from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnDanger, btnSuccess } from "@/lib/button-classes";
import { testerApi } from "@/tester/api";
import type { AdminRedemption } from "@/tester/types";

type Filter = "pending" | "fulfilled" | "closed" | "all";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "pending", label: "Chờ trao" },
  { key: "fulfilled", label: "Đã trao" },
  { key: "closed", label: "Từ chối / hủy" },
  { key: "all", label: "Tất cả" },
];

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ trao", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  fulfilled: { label: "Đã trao", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "Từ chối", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Tester hủy", className: "bg-muted text-muted-foreground" },
};

const input = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm";
const th = "whitespace-nowrap px-4 py-3 font-medium";

function rewardText(s: string): string {
  return s.replace(/\s*--\s*/g, ", ").replace(/\s+HOẶC\s+/g, " hoặc ");
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminTesterBenefits() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [rejecting, setRejecting] = useState<AdminRedemption | null>(null);
  const [reason, setReason] = useState("");
  const requests = useQuery({
    queryKey: ["tester-admin-redemptions", filter],
    queryFn: () => testerApi.adminRedemptions(filter),
  });
  const testers = useQuery({ queryKey: ["tester-admin-testers"], queryFn: testerApi.adminTesters });
  const meta = useQuery({ queryKey: ["tester-admin-meta"], queryFn: testerApi.adminMeta });

  const process = useMutation({
    mutationFn: (v: { id: string; status: "fulfilled" | "rejected"; adminNote?: string }) =>
      testerApi.adminProcessRedemption(v.id, { status: v.status, adminNote: v.adminNote }),
    onSuccess: (_, v) => {
      toast.success(v.status === "fulfilled" ? "Đã đánh dấu trao quà" : "Đã từ chối, benefit được hoàn lại cho tester");
      setRejecting(null);
      void queryClient.invalidateQueries({ queryKey: ["tester-admin-redemptions"] });
      void queryClient.invalidateQueries({ queryKey: ["tester-admin-testers"] });
      void queryClient.invalidateQueries({ queryKey: ["tester-admin-tester"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không cập nhật được yêu cầu"),
  });

  const balances = useMemo(
    () => [...(testers.data ?? [])].sort((a, b) => b.stats.availableBenefits - a.stats.availableBenefits),
    [testers.data],
  );
  const counts = requests.data?.counts ?? {};
  const items = requests.data?.items ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Gift className="h-4 w-4 text-primary" /> Yêu cầu đổi quà
            </h2>
            <p className="text-xs text-muted-foreground">
              Tester tự đổi quà ở trang Benefit (mỗi {meta.data?.benefitHoursPerUnit ?? 3} giờ test hoàn thành = 1 benefit). Trao quà
              xong bấm "Đã trao"; từ chối thì benefit được hoàn lại cho tester.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  filter === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {f.label}
                {counts[f.key] != null && <span className="tabular-nums opacity-75">{counts[f.key]}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          {requests.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {filter === "pending" ? "Không có yêu cầu nào đang chờ trao." : "Chưa có yêu cầu nào."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    {["Tester", "Phần quà", "Tài khoản nhận quà", "Gửi lúc", "Trạng thái"].map((h) => (
                      <th key={h} className={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((r) => (
                    <RequestRow
                      key={r.id}
                      r={r}
                      busy={process.isPending && process.variables?.id === r.id}
                      onFulfil={() => process.mutate({ id: r.id, status: "fulfilled" })}
                      onReject={() => {
                        setReason("");
                        setRejecting(r);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Số dư benefit theo tester</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {["Tester", "Giờ test", "Đã có", "Đã dùng", "Chờ trao", "Còn lại"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {balances.map((r) => (
                  <tr key={r.userId} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.stats.completedHours}</td>
                    <td className="px-4 py-3 tabular-nums">{r.stats.earnedBenefits}</td>
                    <td className="px-4 py-3 tabular-nums">{r.stats.usedBenefits}</td>
                    <td className="px-4 py-3 tabular-nums">{r.stats.pendingBenefits || "—"}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{r.stats.availableBenefits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Modal
        open={rejecting != null}
        onClose={() => setRejecting(null)}
        title="Từ chối yêu cầu đổi quà"
        description={rejecting ? `${rejecting.name}: ${rejecting.game ?? ""} ${rewardText(rejecting.reward ?? rejecting.item)}` : undefined}
        footer={
          <ModalFooterActions
            onCancel={() => setRejecting(null)}
            onSubmit={() => rejecting && process.mutate({ id: rejecting.id, status: "rejected", adminNote: reason.trim() })}
            cancelLabel="Hủy"
            submitLabel={process.isPending ? "Đang lưu…" : "Từ chối"}
            submitting={process.isPending}
            submitDisabled={!reason.trim()}
          />
        }
      >
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Lý do (tester sẽ thấy) *</span>
          <textarea
            autoFocus
            rows={3}
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="vd Sai UID, quà đã hết trong tháng…"
            className={cn(input, "resize-none")}
          />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">Benefit của yêu cầu này được hoàn lại cho tester.</p>
      </Modal>
    </div>
  );
}

function RequestRow({
  r,
  busy,
  onFulfil,
  onReject,
}: {
  r: AdminRedemption;
  busy: boolean;
  onFulfil: () => void;
  onReject: () => void;
}) {
  const s = STATUS[r.status] ?? STATUS.fulfilled;
  return (
    <tr className="align-top transition-colors hover:bg-muted/30">
      <td className="px-4 py-3">
        <p className="font-medium">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.email}</p>
      </td>
      <td className="max-w-sm px-4 py-3">
        <p>
          {r.game && <span className="font-semibold">{r.game}: </span>}
          {rewardText(r.reward ?? r.item)}
        </p>
        <p className="text-xs text-muted-foreground">{r.amount} benefit</p>
        {r.note && <p className="mt-1 text-xs text-muted-foreground">Ghi chú: {r.note}</p>}
      </td>
      <td className="px-4 py-3 font-mono text-xs">{r.gameAccount ?? "—"}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{when(r.createdAt)}</td>
      <td className="px-4 py-3">
        {r.status === "pending" ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={onFulfil} className={cn(btnSuccess, "px-3 py-1.5 text-xs")}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Đã trao
            </button>
            <button type="button" disabled={busy} onClick={onReject} className={cn(btnDanger, "px-3 py-1.5 text-xs")}>
              <X className="h-3.5 w-3.5" /> Từ chối
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", s.className)}>{s.label}</span>
            {r.processedAt && (
              <p className="text-xs text-muted-foreground">
                {r.processedBy ?? ""} · {when(r.processedAt)}
              </p>
            )}
            {r.adminNote && <p className="text-xs text-muted-foreground">{r.adminNote}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}
