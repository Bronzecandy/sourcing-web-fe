import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  ListOrdered,
  Loader2,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnGhost, btnIcon, btnIconDanger, btnPrimary } from "@/lib/button-classes";
import { TesterApiError } from "@/tester/api";
import { testGameAdminApi } from "../api";
import { viDateTime } from "../labels";
import type { QuestionKey, QuestionRole, QuestionTemplate, QuestionType, TagDef } from "../types";
import TemplatePreview from "./templates-preview";
import {
  QUESTION_KEY_HINT,
  QUESTION_KEY_LABEL,
  QUESTION_ROLE_CLASS,
  QUESTION_ROLE_HINT,
  QUESTION_ROLE_LABEL,
  QUESTION_TYPE_LABEL,
  TEMPLATE_STATUS_LABEL,
  blankQuestion,
  draftFromTemplate,
  isChoice,
  newUid,
  nextCode,
  scoreTagsOf,
  toPayload,
  useUnsavedWarning,
  validateDraft,
  type DraftQuestion,
  type TemplateDraft,
} from "./templates-model";

const input = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm";
const badge = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium";

const sameList = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function TemplateEditor({ template, onClose }: { template: QuestionTemplate; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const meta = useQuery({ queryKey: ["testgame-meta"], queryFn: testGameAdminApi.meta });
  const tagsQuery = useQuery({ queryKey: ["testgame-tags"], queryFn: testGameAdminApi.tags });
  const [saved, setSaved] = useState(template);
  const [draft, setDraft] = useState(() => draftFromTemplate(template));
  const [baseline, setBaseline] = useState(() => toPayload(draftFromTemplate(template)));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [answers, setAnswers] = useState<Record<string, "yes" | "no">>({});
  const [serverError, setServerError] = useState<{ message: string; issues: string[] } | null>(null);

  const isBase = saved.isBase;
  const tags = tagsQuery.data ?? meta.data?.tags ?? null;
  const types = meta.data?.questionTypes ?? (Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]);
  const roles = meta.data?.questionRoles ?? (Object.keys(QUESTION_ROLE_LABEL) as QuestionRole[]);
  const keys = meta.data?.questionKeys ?? (Object.keys(QUESTION_KEY_LABEL) as QuestionKey[]);
  const genres = meta.data?.genres ?? [];

  const payload = toPayload(draft);
  const questionsChanged = !sameList(payload.questions, baseline.questions);
  const weightsChanged = !sameList(payload.tagWeights, baseline.tagWeights);
  const dirty =
    questionsChanged ||
    weightsChanged ||
    payload.name !== baseline.name ||
    payload.status !== baseline.status ||
    !sameList([...payload.genres].sort(), [...baseline.genres].sort());
  const issues = validateDraft(draft, tags, isBase);
  const scoreTags = scoreTagsOf(draft.questions);
  useUnsavedWarning(dirty);

  const save = useMutation({
    mutationFn: testGameAdminApi.saveTemplate,
    onSuccess: (t) => {
      const next = draftFromTemplate(t, draft.questions.map((q) => q.uid));
      setDraft(next);
      setBaseline(toPayload(next));
      setSaved(t);
      setServerError(null);
      queryClient.setQueryData<QuestionTemplate[]>(["testgame-templates"], (old) => old?.map((x) => (x.id === t.id ? t : x)));
      void queryClient.invalidateQueries({ queryKey: ["testgame-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["testgame-meta"] });
      toast.success(t.version !== saved.version ? `Đã lưu template — phiên bản mới v${t.version}` : "Đã lưu template");
    },
    onError: (err) => {
      if (err instanceof TesterApiError) setServerError({ message: err.message, issues: err.issues });
      toast.error(err instanceof Error ? err.message : "Không lưu được template");
    },
  });

  const set = <K extends keyof TemplateDraft>(key: K, value: TemplateDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setQuestions = (fn: (qs: DraftQuestion[]) => DraftQuestion[]) => setDraft((d) => ({ ...d, questions: fn(d.questions) }));
  const patch = (uid: string, p: Partial<DraftQuestion>) => setQuestions((qs) => qs.map((q) => (q.uid === uid ? { ...q, ...p } : q)));
  const expand = (uids: string[]) => setExpanded((s) => new Set([...s, ...uids]));
  const toggle = (uid: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const insertAt = (index: number, q: DraftQuestion) => {
    setQuestions((qs) => [...qs.slice(0, index), q, ...qs.slice(index)]);
    expand([q.uid]);
  };
  const move = (index: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const j = index + dir;
      if (j < 0 || j >= qs.length) return qs;
      const next = [...qs];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  const remove = (q: DraftQuestion) => {
    if (q.text.trim() && !window.confirm(`Xoá câu ${q.code || "này"}?`)) return;
    setQuestions((qs) => qs.filter((x) => x.uid !== q.uid));
  };
  const changeRole = (q: DraftQuestion, role: QuestionRole) => {
    const p: Partial<DraftQuestion> = { role };
    if (role === "score") p.type = "scale";
    if (role === "condition") p.type = "yes_no";
    patch(q.uid, p);
  };
  const renumber = () => {
    if (!window.confirm("Đánh lại mã câu Q2, Q3… theo thứ tự hiện tại? Câu trả lời vẫn gắn đúng câu, chỉ mã hiển thị đổi.")) return;
    setQuestions((qs) => qs.map((q, i) => ({ ...q, code: `Q${i + 2}` })));
  };

  const submit = () => {
    if (issues.count > 0) {
      expand(Object.keys(issues.rows));
      toast.error(`Còn ${issues.count} lỗi cần sửa trước khi lưu`);
      return;
    }
    const body: Partial<QuestionTemplate> = { id: saved.id, name: payload.name, status: payload.status };
    if (!isBase) body.genres = payload.genres;
    if (questionsChanged) body.questions = payload.questions;
    if (questionsChanged || weightsChanged) body.tagWeights = payload.tagWeights;
    setServerError(null);
    save.mutate(body);
  };

  const close = () => {
    if (dirty && !window.confirm("Template có thay đổi chưa lưu. Đóng và bỏ thay đổi?")) return;
    onClose();
  };

  const toggleGenre = (key: string) =>
    set("genres", draft.genres.includes(key) ? draft.genres.filter((g) => g !== key) : [...draft.genres, key]);

  const scoredWeightSum = scoreTags
    .filter((t) => tags?.find((x) => x.name === t)?.scored !== false)
    .reduce((s, t) => s + (Number(draft.weights[t] ?? "1") || 0), 0);

  return (
    <Drawer
      open
      onClose={close}
      size="full"
      className="sm:max-w-4xl lg:max-w-6xl 2xl:max-w-7xl"
      title={draft.name.trim() || "Template"}
      subtitle={`${isBase ? "Khung cơ bản · " : ""}${TEMPLATE_STATUS_LABEL[saved.status]} · v${saved.version} · ${draft.questions.length} câu`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Bản đã lưu v{saved.version} · {saved.updatedBy ?? "—"} · {viDateTime(saved.updatedAt)}
            {dirty && <span className="ml-2 font-medium text-amber-700">● Có thay đổi chưa lưu</span>}
            {issues.count > 0 && <span className="ml-2 font-medium text-destructive">{issues.count} lỗi</span>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={close} className={cn(btnGhost, "px-4 py-2")}>
              Đóng
            </button>
            <button type="button" disabled={!dirty || save.isPending} onClick={submit} className={cn(btnPrimary, "px-4 py-2")}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu template
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {serverError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">{serverError.message}</p>
            {serverError.issues.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {serverError.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <p className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Game test chốt bản template lúc Initiate — thay đổi ở đây chỉ áp dụng cho game test chưa Initiate. Lưu thay đổi câu hỏi
          hoặc trọng số sẽ tăng phiên bản template.
        </p>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="min-w-0 space-y-5">
            <section className="space-y-3 rounded-xl border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Tên template *</span>
                  <input
                    className={cn(input, issues.form.name && "border-destructive")}
                    value={draft.name}
                    maxLength={120}
                    onChange={(e) => set("name", e.target.value)}
                  />
                  {issues.form.name && <p className="text-xs text-destructive">{issues.form.name}</p>}
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Trạng thái</span>
                  <select
                    className={input}
                    value={draft.status}
                    disabled={isBase}
                    onChange={(e) => set("status", e.target.value as TemplateDraft["status"])}
                  >
                    {(Object.keys(TEMPLATE_STATUS_LABEL) as TemplateDraft["status"][]).map((s) => (
                      <option key={s} value={s}>
                        {TEMPLATE_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="space-y-1.5 text-sm">
                <span className="font-medium">Dòng game áp dụng</span>
                {isBase ? (
                  <p className="text-xs text-muted-foreground">
                    Khung cơ bản luôn Đang dùng và áp dụng cho game test mà dòng game chính đầu tiên chưa có template riêng.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {genres.map((g) => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => toggleGenre(g.key)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            draft.genres.includes(g.key)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted",
                          )}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                    {issues.form.genres && <p className="text-xs text-destructive">{issues.form.genres}</p>}
                    <p className="text-xs text-muted-foreground">
                      Game test lấy template Đang dùng theo dòng game chính đầu tiên; nhiều template cùng dòng game thì lấy bản cập nhật
                      gần nhất. Chỉ template Đang dùng mới được chọn tự động.
                    </p>
                  </>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Câu hỏi ({draft.questions.length})</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded.size > 0 ? new Set() : new Set(draft.questions.map((q) => q.uid)))}
                    className={cn(btnGhost, "px-3 py-1.5 text-xs")}
                  >
                    {expanded.size > 0 ? "Thu gọn tất cả" : "Mở tất cả"}
                  </button>
                  <button type="button" onClick={renumber} className={cn(btnGhost, "px-3 py-1.5 text-xs")}>
                    <ListOrdered className="h-3.5 w-3.5" /> Đánh lại mã
                  </button>
                  <button
                    type="button"
                    onClick={() => insertAt(draft.questions.length, blankQuestion(nextCode(draft.questions)))}
                    className={cn(btnGhost, "px-3 py-1.5 text-xs")}
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm câu cuối
                  </button>
                </div>
              </div>
              {issues.form.questions && <p className="text-sm text-destructive">{issues.form.questions}</p>}
              <div className="space-y-2">
                {draft.questions.map((q, i) => (
                  <QuestionRow
                    key={q.uid}
                    q={q}
                    first={i === 0}
                    last={i === draft.questions.length - 1}
                    expanded={expanded.has(q.uid)}
                    errors={issues.rows[q.uid] ?? []}
                    warnings={issues.warnings[q.uid] ?? []}
                    tags={tags}
                    types={types}
                    roles={roles}
                    keys={keys}
                    onToggle={() => toggle(q.uid)}
                    onPatch={(p) => patch(q.uid, p)}
                    onRole={(r) => changeRole(q, r)}
                    onMove={(dir) => move(i, dir)}
                    onAddAfter={() => insertAt(i + 1, blankQuestion(nextCode(draft.questions)))}
                    onDuplicate={() => insertAt(i + 1, { ...q, uid: newUid(), id: "", code: nextCode(draft.questions) })}
                    onRemove={() => remove(q)}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-border p-4">
              <div>
                <h3 className="font-semibold">Trọng số tag</h3>
                <p className="text-xs text-muted-foreground">
                  Điểm tổng của report = trung bình có trọng số điểm các tag tính điểm (mặc định 1). Chỉ tag có câu Điểm mới có trọng
                  số.
                </p>
              </div>
              {scoreTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Template chưa có câu Điểm nào.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {scoreTags.map((t) => {
                    const unscored = tags?.find((x) => x.name === t)?.scored === false;
                    const w = Number(draft.weights[t] ?? "1");
                    const share = !unscored && scoredWeightSum > 0 && w > 0 ? Math.round((w / scoredWeightSum) * 100) : null;
                    return (
                      <div key={t} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t}</p>
                          <p className={cn("text-[11px]", issues.weights[t] ? "text-destructive" : "text-muted-foreground")}>
                            {issues.weights[t] ?? (unscored ? "Tag không tính điểm — bỏ qua" : share != null ? `${share}% điểm tổng` : "")}
                          </p>
                        </div>
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={draft.weights[t] ?? "1"}
                          disabled={unscored}
                          onChange={(e) => set("weights", { ...draft.weights, [t]: e.target.value })}
                          className={cn(input, "w-20 text-right tabular-nums", issues.weights[t] && "border-destructive")}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-11rem)] lg:self-start lg:overflow-y-auto">
            <h3 className="font-semibold">Xem trước questionnaire</h3>
            <TemplatePreview
              questions={draft.questions}
              answers={answers}
              onAnswer={(uid, v) => setAnswers((a) => ({ ...a, [uid]: v }))}
            />
          </aside>
        </div>
      </div>
    </Drawer>
  );
}

function QuestionRow({
  q,
  first,
  last,
  expanded,
  errors,
  warnings,
  tags,
  types,
  roles,
  keys,
  onToggle,
  onPatch,
  onRole,
  onMove,
  onAddAfter,
  onDuplicate,
  onRemove,
}: {
  q: DraftQuestion;
  first: boolean;
  last: boolean;
  expanded: boolean;
  errors: string[];
  warnings: string[];
  tags: TagDef[] | null;
  types: QuestionType[];
  roles: QuestionRole[];
  keys: QuestionKey[];
  onToggle: () => void;
  onPatch: (p: Partial<DraftQuestion>) => void;
  onRole: (role: QuestionRole) => void;
  onMove: (dir: -1 | 1) => void;
  onAddAfter: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const unknownTag = Boolean(q.tag && tags && !tags.some((t) => t.name === q.tag));
  return (
    <div className={cn("rounded-lg border bg-card", errors.length > 0 ? "border-destructive/50" : "border-border")}>
      <div className="flex items-start gap-1 px-2 py-2">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-start gap-2 rounded-md px-1 py-0.5 text-left hover:bg-muted/40">
          {expanded ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="w-10 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">{q.code || "?"}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">
              {q.text || <span className="italic text-muted-foreground">(chưa có nội dung)</span>}
              {q.required && <span className="text-destructive"> *</span>}
            </span>
            <span className="mt-1 flex flex-wrap gap-1">
              <span className={cn(badge, "border-border bg-background text-muted-foreground")}>{QUESTION_TYPE_LABEL[q.type]}</span>
              <span className={cn(badge, QUESTION_ROLE_CLASS[q.role])}>{QUESTION_ROLE_LABEL[q.role]}</span>
              {q.tag && <span className={cn(badge, "border-primary/30 bg-primary/5 text-primary")}>{q.tag}</span>}
              {q.key && <span className={cn(badge, "border-border bg-muted text-foreground")}>{QUESTION_KEY_LABEL[q.key]}</span>}
              {errors.length > 0 && <span className={cn(badge, "border-destructive/40 bg-destructive/10 text-destructive")}>{errors.length} lỗi</span>}
              {errors.length === 0 && warnings.length > 0 && (
                <span className={cn(badge, "border-amber-200 bg-amber-50 text-amber-800")}>
                  <TriangleAlert className="mr-1 h-3 w-3" /> Lưu ý
                </span>
              )}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <button type="button" title="Lên" disabled={first} onClick={() => onMove(-1)} className={cn(btnIcon, "disabled:opacity-30")}>
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" title="Xuống" disabled={last} onClick={() => onMove(1)} className={cn(btnIcon, "disabled:opacity-30")}>
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" title="Thêm câu phía sau" onClick={onAddAfter} className={btnIcon}>
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" title="Nhân bản" onClick={onDuplicate} className={btnIcon}>
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" title="Xoá" onClick={onRemove} className={btnIconDanger}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border px-3 py-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <label className="space-y-1">
              <span className="font-medium">Mã câu *</span>
              <input className={cn(input, "font-mono")} value={q.code} maxLength={12} onChange={(e) => onPatch({ code: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="font-medium">Nội dung câu *</span>
              <textarea
                rows={2}
                maxLength={500}
                className={cn(input, "resize-y")}
                value={q.text}
                onChange={(e) => onPatch({ text: e.target.value })}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-medium">Gợi ý cho tester</span>
            <input className={input} value={q.help} maxLength={300} placeholder="Không bắt buộc" onChange={(e) => onPatch({ help: e.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="font-medium">Loại câu</span>
              <select className={input} value={q.type} onChange={(e) => onPatch({ type: e.target.value as QuestionType })}>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABEL[t] ?? t}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium">Vai trò</span>
              <select className={input} value={q.role} onChange={(e) => onRole(e.target.value as QuestionRole)}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {QUESTION_ROLE_LABEL[r] ?? r}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium">Tag{q.role !== "other" && " *"}</span>
              <select className={input} value={q.tag} onChange={(e) => onPatch({ tag: e.target.value })}>
                <option value="">— Không gắn tag —</option>
                {unknownTag && <option value={q.tag}>{q.tag} (không còn trong danh sách)</option>}
                {(tags ?? []).map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                    {t.scored ? "" : " (không tính điểm)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium">Ý nghĩa hệ thống</span>
              <select className={input} value={q.key} onChange={(e) => onPatch({ key: e.target.value as QuestionKey | "" })}>
                <option value="">— Không —</option>
                {keys.map((k) => (
                  <option key={k} value={k}>
                    {QUESTION_KEY_LABEL[k] ?? k}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{QUESTION_ROLE_LABEL[q.role]}:</span> {QUESTION_ROLE_HINT[q.role]}
            {q.key && (
              <>
                {" "}
                <span className="font-medium text-foreground">{QUESTION_KEY_LABEL[q.key]}:</span> {QUESTION_KEY_HINT[q.key]}
              </>
            )}
          </p>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={q.required} onChange={(e) => onPatch({ required: e.target.checked })} />
            <span>Bắt buộc trả lời</span>
            {q.key === "footage" && <span className="text-xs text-muted-foreground">(câu footage: bắt buộc hay không theo cài đặt của game test)</span>}
          </label>

          {isChoice(q.type) && (
            <label className="block space-y-1">
              <span className="font-medium">Lựa chọn (mỗi dòng một lựa chọn, 2–30)</span>
              <textarea
                rows={4}
                className={cn(input, "resize-y")}
                value={q.optionsText}
                onChange={(e) => onPatch({ optionsText: e.target.value })}
              />
            </label>
          )}
          {q.type === "scale" && (
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="space-y-1">
                <span className="font-medium">Điểm nhỏ nhất</span>
                <input type="number" step={1} className={input} value={q.scaleMin} onChange={(e) => onPatch({ scaleMin: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="font-medium">Điểm lớn nhất</span>
                <input type="number" step={1} className={input} value={q.scaleMax} onChange={(e) => onPatch({ scaleMax: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="font-medium">Nhãn điểm thấp</span>
                <input className={input} maxLength={40} value={q.minLabel} onChange={(e) => onPatch({ minLabel: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="font-medium">Nhãn điểm cao</span>
                <input className={input} maxLength={40} value={q.maxLabel} onChange={(e) => onPatch({ maxLabel: e.target.value })} />
              </label>
            </div>
          )}

          {errors.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
