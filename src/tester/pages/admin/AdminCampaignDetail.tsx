import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Star, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { testerApi } from "../../api";
import CampaignForm, { draftFrom, draftPayload, type CampaignDraft } from "./CampaignForm";

export default function AdminCampaignDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ["tester-admin-campaign", id], queryFn: () => testerApi.adminCampaign(id) });
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [platformFilter, setPlatformFilter] = useState(true);
  const [limit, setLimit] = useState(7);
  const [saving, setSaving] = useState(false);
  const recommend = useQuery({
    queryKey: ["tester-admin-recommend", id, platformFilter, limit],
    queryFn: () => testerApi.adminRecommend(id, { platformFilter, limit }),
    enabled: Boolean(detail.data && (detail.data.mainTags.length > 0 || detail.data.secondaryTags.length > 0)),
  });

  useEffect(() => {
    if (detail.data && !draft) setDraft(draftFrom(detail.data));
  }, [detail.data, draft]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["tester-admin-campaign", id] });
    void queryClient.invalidateQueries({ queryKey: ["tester-admin-campaigns"] });
    void queryClient.invalidateQueries({ queryKey: ["tester-admin-recommend", id] });
    void queryClient.invalidateQueries({ queryKey: ["tester-admin-testers"] });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await testerApi.adminSaveCampaign({ ...draftPayload(draft), id });
      toast.success("Đã lưu đợt test");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Xóa đợt test này và toàn bộ phân công?")) return;
    await testerApi.adminDeleteCampaign(id);
    void queryClient.invalidateQueries({ queryKey: ["tester-admin-campaigns"] });
    navigate("/tester/admin/campaigns");
  };

  const assign = async (userIds: string[]) => {
    try {
      await testerApi.adminAssign(id, userIds);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gán được");
    }
  };

  if (detail.isLoading || !draft) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (!detail.data) return <p className="text-sm text-destructive">Không tìm thấy đợt test.</p>;
  const c = detail.data;
  const unassigned = (recommend.data ?? []).filter((r) => !r.assigned);

  return (
    <div className="space-y-6">
      <Link to="/tester/admin/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách đợt test
      </Link>
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-semibold text-brand-navy">{c.gameName}</h2>
          <CampaignForm value={draft} onChange={setDraft} />
          <div className="flex justify-between">
            <button type="button" onClick={() => void remove()} className="inline-flex items-center gap-1 text-sm text-destructive hover:underline">
              <Trash2 className="h-4 w-4" /> Xóa đợt test
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-brand-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-brand-navy">Gợi ý tester</h2>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-lg border border-border px-2 py-1 text-xs">
              {[7, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Điểm = trung bình điểm dòng game (Main ×1.0, Secondary ×0.5). Sao = dòng game thích nhất trùng Main tag.
          </p>
          {c.platform && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={platformFilter} onChange={(e) => setPlatformFilter(e.target.checked)} />
              Chỉ tester chơi trên {c.platform}
            </label>
          )}
          {c.mainTags.length === 0 && c.secondaryTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chọn Main/Secondary tag rồi lưu để có gợi ý.</p>
          ) : recommend.isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tính…</p>
          ) : (recommend.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có tester phù hợp.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {recommend.data!.map((r) => (
                <li key={r.userId} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-medium">
                      {r.name}
                      {r.favorite && <Star className="h-3.5 w-3.5 fill-brand-yellow text-brand-yellow" />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.platforms.join(", ") || "—"} · đang test {r.activeTests} · {r.testTimeLabel ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-brand-navy tabular-nums">{r.score}</span>
                    {r.assigned ? (
                      <span className="text-xs text-muted-foreground">Đã gán</span>
                    ) : (
                      <button
                        type="button"
                        aria-label="Gán"
                        onClick={() => void assign([r.userId])}
                        className="rounded-lg border border-border p-1.5 hover:bg-muted"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {unassigned.length > 1 && (
            <button
              type="button"
              onClick={() => void assign(unassigned.map((r) => r.userId))}
              className="w-full rounded-lg border border-brand-violet px-3 py-2 text-sm font-medium text-brand-violet hover:bg-brand-lavender/30"
            >
              Gán tất cả {unassigned.length} tester gợi ý
            </button>
          )}
        </section>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <h2 className="px-5 pt-4 font-semibold text-brand-navy">
          Tester trong đợt ({c.completedCount}/{c.assignedCount} hoàn thành)
        </h2>
        {c.assignments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Chưa gán tester.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="bg-brand-navy text-white">
              <tr>
                {["Tester", "Giờ test", "Hoàn thành", ""].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.assignments.map((a) => (
                <AssignmentRow key={a.id} assignment={a} defaultHours={c.workloadHours} onChanged={refresh} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function AssignmentRow({
  assignment: a,
  defaultHours,
  onChanged,
}: {
  assignment: { id: string; name: string; email: string; workloadHours: number; completed: boolean };
  defaultHours: number;
  onChanged: () => void;
}) {
  const [hours, setHours] = useState(String(a.workloadHours));
  const update = async (body: { completed?: boolean; workloadHours?: number | null }) => {
    await testerApi.adminUpdateAssignment(a.id, body);
    onChanged();
  };
  return (
    <tr className={cn("border-t border-border", a.completed && "bg-brand-mint/15")}>
      <td className="px-4 py-2">
        <p className="font-medium">{a.name}</p>
        <p className="text-xs text-muted-foreground">{a.email}</p>
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={0}
          step={0.5}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={() => {
            const n = hours === "" ? null : Number(hours);
            if (n !== a.workloadHours) void update({ workloadHours: n === defaultHours ? null : n });
          }}
          className="w-24 rounded-lg border border-border px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-2">
        <input type="checkbox" checked={a.completed} onChange={(e) => void update({ completed: e.target.checked })} />
      </td>
      <td className="px-4 py-2 text-right">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Bỏ ${a.name} khỏi đợt test?`)) void testerApi.adminRemoveAssignment(a.id).then(onChanged);
          }}
          className="text-xs text-destructive hover:underline"
        >
          Bỏ gán
        </button>
      </td>
    </tr>
  );
}
