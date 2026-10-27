import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { testerApi } from "../../api";
import CampaignForm, { draftFrom, draftPayload, type CampaignDraft } from "./CampaignForm";

export const CAMPAIGN_STATUS: Record<string, string> = {
  planned: "Lên plan",
  running: "Đang test",
  done: "Đã test xong",
  cancelled: "Hủy",
};

export default function AdminCampaigns() {
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
      navigate(`/tester/admin/campaigns/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tạo được đợt test");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setDraft(draftFrom());
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-violet px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Tạo đợt test
        </button>
      </div>
      {campaigns.isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : (campaigns.data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">Chưa có đợt test nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-brand-navy text-white">
              <tr>
                {["Game", "Tags", "Platform", "Thời gian", "Giờ/tester", "Tester", "Trạng thái", "Kết quả"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.data!.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-brand-lavender/20">
                  <td className="px-3 py-2">
                    <Link to={`/tester/admin/campaigns/${c.id}`} className="font-medium text-brand-violet hover:underline">
                      {c.gameName}
                    </Link>
                    {c.appId && <p className="text-xs text-muted-foreground">TapTap {c.appId}</p>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {c.mainTags.join(", ") || "—"}
                    {c.secondaryTags.length > 0 && <span className="text-muted-foreground"> · {c.secondaryTags.join(", ")}</span>}
                  </td>
                  <td className="px-3 py-2">{c.platform ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {c.startDate ?? "?"} – {c.endDate ?? "?"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{c.workloadHours}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {c.completedCount}/{c.assignedCount}
                  </td>
                  <td className="px-3 py-2">{CAMPAIGN_STATUS[c.status] ?? c.status}</td>
                  <td className="px-3 py-2">{c.result === "suitable" ? "Phù hợp" : c.result === "unsuitable" ? "Không phù hợp" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
