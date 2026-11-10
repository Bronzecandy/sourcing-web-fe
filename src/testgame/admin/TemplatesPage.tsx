import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Loader2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnDanger, btnGhost, btnPrimary } from "@/lib/button-classes";
import { testGameAdminApi } from "../api";
import { viDateTime } from "../labels";
import type { QuestionTemplate, TagDef } from "../types";
import TemplateEditor from "./templates-editor";
import { TEMPLATE_STATUS_CLASS, TEMPLATE_STATUS_LABEL } from "./templates-model";

const input = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm";
const th = "whitespace-nowrap px-4 py-3 font-medium";
const badge = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

type Tab = "templates" | "tags";

export default function TemplatesPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const templates = useQuery({ queryKey: ["testgame-templates"], queryFn: testGameAdminApi.templates });
  const tags = useQuery({ queryKey: ["testgame-tags"], queryFn: testGameAdminApi.tags });
  return (
    <div className="space-y-4">
      <Link to="/admin/test-campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách game test
      </Link>
      <Tabs
        tabs={[
          { id: "templates", label: "Template questionnaire", badge: templates.data?.length },
          { id: "tags", label: "Tag", badge: tags.data?.length },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />
      {tab === "templates" ? <TemplateList /> : <TagList />}
    </div>
  );
}

function GenreChips({ keys, label }: { keys: string[]; label: (key: string) => string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <span key={k} className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">
          {label(k)}
        </span>
      ))}
    </div>
  );
}

function TemplateList() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const templates = useQuery({ queryKey: ["testgame-templates"], queryFn: testGameAdminApi.templates });
  const meta = useQuery({ queryKey: ["testgame-meta"], queryFn: testGameAdminApi.meta });
  const [editing, setEditing] = useState<QuestionTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGenres, setNewGenres] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<QuestionTemplate | null>(null);
  const [showRetired, setShowRetired] = useState(false);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["testgame-templates"] });
    void queryClient.invalidateQueries({ queryKey: ["testgame-meta"] });
  };

  const clone = useMutation({
    mutationFn: testGameAdminApi.cloneTemplate,
    onSuccess: (t) => {
      refresh();
      setCreating(false);
      setEditing(t);
      toast.success(`Đã tạo “${t.name}” ở trạng thái Nháp`);
    },
    onError: (err) => toast.error(errorText(err, "Không tạo được template")),
  });

  const remove = useMutation({
    mutationFn: (t: QuestionTemplate) => testGameAdminApi.deleteTemplate(t.id),
    onSuccess: (r) => {
      refresh();
      setDeleting(null);
      toast.success(r.retired ? "Template đã có game test dùng nên được chuyển sang Ngừng dùng thay vì xoá" : "Đã xoá template");
    },
    onError: (err) => toast.error(errorText(err, "Không xoá được template")),
  });

  const genres = meta.data?.genres ?? [];
  const genreLabel = (key: string) => genres.find((g) => g.key === key)?.label ?? key;
  const list = templates.data ?? [];
  const retiredCount = list.filter((t) => t.status === "retired").length;
  const visible = showRetired ? list : list.filter((t) => t.status !== "retired");

  const activeByGenre = new Map<string, QuestionTemplate[]>();
  for (const t of list) {
    if (t.isBase || t.status !== "active") continue;
    for (const g of t.genres) activeByGenre.set(g, [...(activeByGenre.get(g) ?? []), t]);
  }
  const shadowedBy = (t: QuestionTemplate) =>
    t.isBase || t.status !== "active"
      ? []
      : t.genres.flatMap((g) => {
          const winner = [...(activeByGenre.get(g) ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
          return winner && winner.id !== t.id ? [{ genre: g, winner }] : [];
        });

  const openCreate = () => {
    setNewName("");
    setNewGenres([]);
    setCreating(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Game test dùng template Đang dùng của dòng game chính đầu tiên; không có thì dùng Khung cơ bản. Template được chốt vào game
          test lúc Initiate — sửa template chỉ ảnh hưởng game test chưa Initiate.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {retiredCount > 0 && (
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />
              Hiện template ngừng dùng ({retiredCount})
            </label>
          )}
          <button type="button" onClick={openCreate} className={cn(btnPrimary, "px-4 py-2")}>
            <Plus className="h-4 w-4" /> Tạo template
          </button>
        </div>
      </div>

      {templates.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : templates.error ? (
        <p className="text-sm text-destructive">{errorText(templates.error, "Không tải được danh sách template.")}</p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Chưa có template nào.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => {
            const scoredTags = new Set(t.questions.filter((q) => q.role === "score" && q.tag).map((q) => q.tag)).size;
            const shadowed = shadowedBy(t);
            return (
              <div key={t.id} className={cn("rounded-xl border border-border bg-card p-4", t.status === "retired" && "opacity-70")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{t.name}</h3>
                      {t.isBase && <span className={cn(badge, "border-primary/30 bg-primary/10 text-primary")}>Khung cơ bản</span>}
                      <span className={cn(badge, TEMPLATE_STATUS_CLASS[t.status])}>{TEMPLATE_STATUS_LABEL[t.status]}</span>
                    </div>
                    {t.isBase ? (
                      <p className="text-xs text-muted-foreground">Mọi dòng game chưa có template Đang dùng riêng</p>
                    ) : t.genres.length > 0 ? (
                      <GenreChips keys={t.genres} label={genreLabel} />
                    ) : (
                      <p className="text-xs text-muted-foreground">Chưa gắn dòng game</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t.questions.length} câu · {scoredTags} tag tính điểm · v{t.version} · Cập nhật bởi {t.updatedBy ?? "—"} lúc{" "}
                      {viDateTime(t.updatedAt)}
                    </p>
                    {shadowed.map(({ genre, winner }) => (
                      <p key={genre} className="flex items-center gap-1.5 text-xs text-amber-700">
                        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                        {genreLabel(genre)}: game test mới đang lấy “{winner.name}” (cập nhật gần hơn)
                      </p>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setEditing(t)} className={cn(btnGhost, "px-3 py-1.5")}>
                      <Pencil className="h-3.5 w-3.5" /> Sửa
                    </button>
                    <button
                      type="button"
                      disabled={clone.isPending}
                      onClick={() => clone.mutate({ fromId: t.id })}
                      className={cn(btnGhost, "px-3 py-1.5")}
                    >
                      {clone.isPending && clone.variables?.fromId === t.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Nhân bản
                    </button>
                    {!t.isBase && (
                      <button type="button" onClick={() => setDeleting(t)} className={cn(btnDanger, "px-3 py-1.5")}>
                        <Trash2 className="h-3.5 w-3.5" /> Xoá
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <TemplateEditor key={editing.id} template={editing} onClose={() => setEditing(null)} />}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo template"
        description="Template mới là bản sao của Khung cơ bản, ở trạng thái Nháp. Sửa câu hỏi rồi chuyển sang Đang dùng."
        className="max-w-lg"
        footer={
          <ModalFooterActions
            onCancel={() => setCreating(false)}
            onSubmit={() => clone.mutate({ name: newName.trim(), genres: newGenres })}
            cancelLabel="Huỷ"
            submitLabel={clone.isPending ? "Đang tạo…" : "Tạo và mở"}
            submitting={clone.isPending}
            submitDisabled={!newName.trim()}
          />
        }
      >
        <div className="space-y-4 text-sm">
          <label className="block space-y-1">
            <span className="font-medium">Tên template *</span>
            <input
              autoFocus
              className={input}
              value={newName}
              maxLength={120}
              placeholder="vd Template MOBA"
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <div className="space-y-1.5">
            <span className="font-medium">Dòng game áp dụng</span>
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setNewGenres((s) => (s.includes(g.key) ? s.filter((x) => x !== g.key) : [...s, g.key]))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    newGenres.includes(g.key) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Có thể chọn sau. Template Đang dùng cần ít nhất một dòng game.</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleting != null}
        onClose={() => setDeleting(null)}
        title="Xoá template"
        description={deleting?.name}
        footer={
          <>
            <button type="button" onClick={() => setDeleting(null)} className={cn(btnGhost, "px-4 py-2")}>
              Huỷ
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting)}
              className={cn(btnDanger, "px-4 py-2")}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Xoá
            </button>
          </>
        }
      >
        <p className="text-sm">
          Template chưa có game test nào dùng sẽ bị xoá hẳn. Nếu đã có game test dùng, template được chuyển sang{" "}
          <span className="font-medium">Ngừng dùng</span> — game test cũ vẫn giữ bản đã chốt.
        </p>
      </Modal>
    </div>
  );
}

type TagForm = { mode: "create" | "edit"; name: string; scored: boolean; description: string };

function TagList() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const tags = useQuery({ queryKey: ["testgame-tags"], queryFn: testGameAdminApi.tags });
  const templates = useQuery({ queryKey: ["testgame-templates"], queryFn: testGameAdminApi.templates });
  const [form, setForm] = useState<TagForm | null>(null);
  const [deleting, setDeleting] = useState<TagDef | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const applyList = (list: TagDef[]) => {
    queryClient.setQueryData(["testgame-tags"], list);
    void queryClient.invalidateQueries({ queryKey: ["testgame-meta"] });
  };

  const save = useMutation({
    mutationFn: testGameAdminApi.saveTag,
    onSuccess: (list, v) => {
      applyList(list);
      setForm(null);
      toast.success(`Đã lưu tag “${v.name}”`);
    },
    onError: (err) => toast.error(errorText(err, "Không lưu được tag")),
  });

  const remove = useMutation({
    mutationFn: (name: string) => testGameAdminApi.deleteTag(name),
    onSuccess: (list, name) => {
      applyList(list);
      setDeleting(null);
      toast.success(`Đã xoá tag “${name}”`);
    },
    onError: (err) => setDeleteError(errorText(err, "Không xoá được tag")),
  });

  const live = (templates.data ?? []).filter((t) => t.status !== "retired");
  const usedIn = (name: string) => live.filter((t) => t.questions.some((q) => q.tag === name)).map((t) => t.name);
  const scoredIn = (name: string) => live.filter((t) => t.questions.some((q) => q.tag === name && q.role === "score")).map((t) => t.name);

  const list = tags.data ?? [];
  const name = form?.name.trim() ?? "";
  const nameError =
    form?.mode === "create" && name && list.some((t) => t.name === name) ? "Tag này đã có — bấm Sửa ở danh sách để đổi" : null;
  const scoreUsage = form?.mode === "edit" && !form.scored ? scoredIn(form.name) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Tag gom câu hỏi thành từng phần của report. Tag tính điểm có trọng số trong template; tag không tính điểm (vd Red Flag) chỉ
          gom câu Lý do. Tên tag là khoá nên không đổi được sau khi tạo.
        </p>
        <button
          type="button"
          onClick={() => setForm({ mode: "create", name: "", scored: true, description: "" })}
          className={cn(btnPrimary, "px-4 py-2")}
        >
          <Plus className="h-4 w-4" /> Thêm tag
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {tags.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Chưa có tag nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {["Tag", "Tính điểm", "Mô tả", "Dùng trong", ""].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((t) => {
                  const used = usedIn(t.name);
                  return (
                    <tr key={t.name} className="align-top transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3">
                        {t.scored ? (
                          <span className="text-emerald-700">Có</span>
                        ) : (
                          <span className="text-muted-foreground">Không</span>
                        )}
                      </td>
                      <td className="max-w-md px-4 py-3 text-muted-foreground">{t.description || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground" title={used.join(", ")}>
                        {used.length === 0 ? "—" : `${used.length} template`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setForm({ mode: "edit", name: t.name, scored: t.scored, description: t.description })}
                            className={cn(btnGhost, "px-3 py-1.5 text-xs")}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(t);
                            }}
                            className={cn(btnDanger, "px-3 py-1.5 text-xs")}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={form != null}
        onClose={() => setForm(null)}
        title={form?.mode === "edit" ? `Sửa tag “${form.name}”` : "Thêm tag"}
        className="max-w-lg"
        footer={
          <ModalFooterActions
            onCancel={() => setForm(null)}
            onSubmit={() => form && save.mutate({ name, scored: form.scored, description: form.description.trim() })}
            cancelLabel="Huỷ"
            submitLabel={save.isPending ? "Đang lưu…" : "Lưu"}
            submitting={save.isPending}
            submitDisabled={!name || Boolean(nameError)}
          />
        }
      >
        {form && (
          <div className="space-y-4 text-sm">
            <label className="block space-y-1">
              <span className="font-medium">Tên tag *</span>
              <input
                autoFocus={form.mode === "create"}
                className={cn(input, nameError && "border-destructive")}
                value={form.name}
                maxLength={60}
                disabled={form.mode === "edit"}
                placeholder="vd Gacha"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5" checked={form.scored} onChange={(e) => setForm({ ...form, scored: e.target.checked })} />
              <span>
                <span className="font-medium">Tính điểm</span>
                <span className="block text-xs text-muted-foreground">
                  Câu Điểm của tag được tính vào điểm phần và điểm tổng có trọng số.
                </span>
              </span>
            </label>
            {scoreUsage.length > 0 && (
              <p className="flex gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Tag đang có câu Điểm trong {scoreUsage.join(", ")} — bỏ tính điểm thì các câu này không còn tính vào điểm tổng.
              </p>
            )}
            <label className="block space-y-1">
              <span className="font-medium">Mô tả</span>
              <textarea
                rows={3}
                maxLength={300}
                className={cn(input, "resize-none")}
                value={form.description}
                placeholder="Phần này đánh giá điều gì — hiện trong report và giúp AI tóm tắt đúng ý"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <span className="block text-right text-xs text-muted-foreground">{form.description.length}/300</span>
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={deleting != null}
        onClose={() => setDeleting(null)}
        title="Xoá tag"
        description={deleting?.name}
        footer={
          <>
            <button type="button" onClick={() => setDeleting(null)} className={cn(btnGhost, "px-4 py-2")}>
              Huỷ
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.name)}
              className={cn(btnDanger, "px-4 py-2")}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Xoá
            </button>
          </>
        }
      >
        <div className="space-y-2 text-sm">
          <p>Chỉ xoá được tag không còn dùng trong template nào (trừ template Ngừng dùng).</p>
          {deleting && usedIn(deleting.name).length > 0 && (
            <p className="text-xs text-muted-foreground">Đang dùng trong: {usedIn(deleting.name).join(", ")}</p>
          )}
          {deleteError && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive">{deleteError}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
