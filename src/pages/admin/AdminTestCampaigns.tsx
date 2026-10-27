import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnPrimary } from "@/lib/button-classes";
import { testerApi } from "@/tester/api";
import CampaignForm, { CAMPAIGN_STATUS, draftFrom, draftPayload, type CampaignDraft } from "@/components/admin/tester/CampaignForm";

const th = "whitespace-nowrap px-4 py-3 font-medium";

export default function AdminTestCampaigns() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const campaigns = useQuery({ queryKey: ["tester-admin-campaigns"], queryFn: testerApi.adminCampaigns });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft>(draftFrom());
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!draft.gameName.trim()) {
      toast.error("Cần tên game");
      return;
    }
    setSaving(true);
    try {
      const created = await testerApi.adminSaveCampaign(draftPayload(draft));
      await queryClient.invalidateQueries({ queryKey: ["tester-admin-campaigns"] });
      setOpen(false);
      navigate(`/admin/test-campaigns/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tạo được đợt test");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Gắn TapTap ID để Game Radar tự cập nhật tình trạng test nội bộ. Kết quả "Không phù hợp" sẽ Drop game trên Radar.
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft(draftFrom());
            setOpen(true);
          }}
          className={cn(btnPrimary, "px-4 py-2")}
        >
          <Plus className="h-4 w-4" /> Tạo đợt test
        </button>
      </div>
      {campaigns.isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (campaigns.data ?? []).length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Chưa có đợt test nào.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {["Game", "Tags", "Platform", "Thời gian", "Giờ/tester", "Tester", "Trạng thái", "Kết quả"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.data!.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/admin/test-campaigns/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.gameName}
                      </Link>
                      {c.appId && <p className="text-xs text-muted-foreground">TapTap {c.appId}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.mainTags.join(", ") || "—"}
                      {c.secondaryTags.length > 0 && <span className="text-muted-foreground"> · {c.secondaryTags.join(", ")}</span>}
                    </td>
                    <td className="px-4 py-3">{c.platform ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {c.startDate ?? "?"} → {c.endDate ?? "?"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{c.workloadHours}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.completedCount}/{c.assignedCount}
                    </td>
                    <td className="px-4 py-3">{CAMPAIGN_STATUS[c.status] ?? c.status}</td>
                    <td className="px-4 py-3">
                      {c.result === "suitable" ? (
                        <span className="text-emerald-700">Phù hợp</span>
                      ) : c.result === "unsuitable" ? (
                        <span className="text-destructive">Không phù hợp</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo đợt test"
        description="Gắn TapTap ID để Radar tự cập nhật tình trạng test nội bộ."
        footer={
          <ModalFooterActions
            onCancel={() => setOpen(false)}
            onSubmit={() => void create()}
            cancelLabel="Hủy"
            submitLabel={saving ? "Đang lưu…" : "Tạo"}
            submitting={saving}
          />
        }
      >
        <CampaignForm value={draft} onChange={setDraft} />
      </Modal>
    </div>
  );
}
