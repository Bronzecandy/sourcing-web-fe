import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, Star, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { btnDanger, btnIcon, btnPrimary, btnSubtle } from "@/lib/button-classes";
import { testerApi } from "@/tester/api";
import CampaignForm, { draftFrom, draftPayload, type CampaignDraft } from "@/components/admin/tester/CampaignForm";

export default function AdminTestCampaignDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
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
    navigate("/admin/test-campaigns");
  };

  const assign = async (userIds: string[]) => {
    try {
      await testerApi.adminAssign(id, userIds);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gán được");
    }
  };

  const profileHref = (userId: string) =>
    user?.isPanelAdmin ? `/admin/users?role=tester&user=${userId}` : `/admin/testers?user=${userId}`;

  if (detail.isLoading || (detail.data && !draft)) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!detail.data || !draft) return <p className="text-sm text-destructive">Không tìm thấy đợt test.</p>;
  const c = detail.data;
  const unassigned = (recommend.data ?? []).filter((r) => !r.assigned);

  return (
    <div className="space-y-6">
      <Link to="/admin/test-campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách đợt test
      </Link>
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-4 rounded-xl border border-border bg-card p-5 lg:col-span-3">
          <div className="flex items-center gap-3">
            {c.iconUrl && <img src={c.iconUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-muted object-cover" />}
            <h2 className="text-lg font-semibold">{c.gameName}</h2>
          </div>
          <CampaignForm value={draft} onChange={setDraft} />
          <div className="flex justify-between gap-2">
            <button type="button" onClick={() => void remove()} className={cn(btnDanger, "px-3 py-2")}>
              <Trash2 className="h-4 w-4" /> Xóa đợt test
            </button>
            <button type="button" disabled={saving} onClick={() => void save()} className={cn(btnPrimary, "px-4 py-2")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu
            </button>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Gợi ý tester</h2>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
            >
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
                    <Link to={profileHref(r.userId)} className="flex items-center gap-1 font-medium hover:text-primary">
                      {r.name}
                      {r.favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.platforms.join(", ") || "—"} · đang test {r.activeTests} · {r.testTimeLabel ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tabular-nums">{r.score}</span>
                    {r.assigned ? (
                      <span className="text-xs text-muted-foreground">Đã gán</span>
                    ) : (
                      <button type="button" aria-label="Gán" onClick={() => void assign([r.userId])} className={btnIcon}>
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
              className={cn(btnSubtle, "w-full px-3 py-2")}
            >
              Gán tất cả {unassigned.length} tester gợi ý
            </button>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border overflow-hidden">
        <h2 className="px-5 py-4 font-semibold border-b border-border">
          Tester trong đợt ({c.completedCount}/{c.assignedCount} hoàn thành)
        </h2>
        {c.assignments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Chưa gán tester.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {["Tester", "Giờ test", "Hoàn thành", ""].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {c.assignments.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    defaultHours={c.workloadHours}
                    profileHref={profileHref(a.userId)}
                    onChanged={refresh}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function AssignmentRow({
  assignment: a,
  defaultHours,
  profileHref,
  onChanged,
}: {
  assignment: { id: string; name: string; email: string; workloadHours: number; completed: boolean };
  defaultHours: number;
  profileHref: string;
  onChanged: () => void;
}) {
  const [hours, setHours] = useState(String(a.workloadHours));
  const update = async (body: { completed?: boolean; workloadHours?: number | null }) => {
    await testerApi.adminUpdateAssignment(a.id, body);
    onChanged();
  };
  return (
    <tr className={cn("transition-colors", a.completed && "bg-emerald-500/5")}>
      <td className="px-4 py-3">
        <Link to={profileHref} className="font-medium hover:text-primary">
          {a.name}
        </Link>
        <p className="text-xs text-muted-foreground">{a.email}</p>
      </td>
      <td className="px-4 py-3">
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
          className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <input type="checkbox" checked={a.completed} onChange={(e) => void update({ completed: e.target.checked })} />
      </td>
      <td className="px-4 py-3 text-right">
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
