import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  History,
  Info,
  LoaderCircle,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useContentLang } from "@/lib/content-language";
import { cn } from "@/lib/utils";
import { btnDanger, btnGhost, btnIcon, btnPrimary, btnSubtle, btnSuccess } from "@/lib/button-classes";
import { TesterApiError } from "@/tester/api";
import { testFileUrl, testGameAdminApi } from "../api";
import { CAMPAIGN_STATUS_LABEL, DECISION_CLASS, DECISION_LABEL, viDateTime } from "../labels";
import type { CampaignStatus, ConfigLevel, ConfigRequirement, Decision, ReportRun, SectionText, ShareKey, TestReport } from "../types";
import ReportView, { BulletText, ConfigView, LangToggle, type GeneralField, type ReportLang } from "../report/ReportView";

type SummaryOutput = {
  sections?: Record<string, SectionText>;
  usp?: string;
  pros?: string;
  cons?: string;
  conclusion?: string;
  overall?: number | null;
};
type ConfigOutput = { requirement?: ConfigRequirement | null; level?: ConfigLevel | null };
type ReportPatch = Parameters<typeof testGameAdminApi.updateReport>[1];
type SavePart = "sections" | "general";

const DECISIONS: Decision[] = ["drop", "monitor", "recommend"];
const GENERAL: Array<{ key: GeneralField; label: string }> = [
  { key: "usp", label: "USP" },
  { key: "pros", label: "Pros" },
  { key: "cons", label: "Cons" },
  { key: "conclusion", label: "Conclusion" },
];
const RUN_KIND: Record<ReportRun["kind"], { label: string; icon: typeof Sparkles }> = {
  summary: { label: "Tổng hợp AI", icon: Sparkles },
  config: { label: "Cấu hình", icon: Cpu },
};

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
const textarea = cn(input, "resize-y leading-relaxed");

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof TesterApiError && err.issues.length > 0) return `${err.message}: ${err.issues.join(", ")}`;
  return err instanceof Error ? err.message : fallback;
}

export default function ReportTab({ campaignId, campaignStatus }: { campaignId: string; campaignStatus: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { lang, setLang } = useContentLang();
  const queryKey = ["testgame-report", campaignId];
  const report = useQuery({
    queryKey,
    queryFn: () => testGameAdminApi.report(campaignId),
    refetchInterval: (q) => (q.state.data?.runs.some((r) => r.status === "running") ? 4000 : false),
  });

  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState<SectionText>({ vi: "", en: "" });
  const [previewRunId, setPreviewRunId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockDecision, setLockDecision] = useState<Decision | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);

  const runs = report.data?.runs;
  const runningIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!runs) return;
    for (const r of runs) {
      if (!runningIds.current.has(r.id) || r.status === "running") continue;
      if (r.status === "failed") toast.error(`${RUN_KIND[r.kind].label} lỗi: ${r.error ?? "không rõ nguyên nhân"}`);
      else toast.success(r.kind === "summary" ? "Tổng hợp AI xong — xem lại rồi bấm Lưu" : r.savedAt ? "Đã cập nhật cấu hình" : "Tìm cấu hình xong (chưa lưu vì report đã chốt)");
    }
    runningIds.current = new Set(runs.filter((r) => r.status === "running").map((r) => r.id));
  }, [runs, toast]);

  const setReport = (r: TestReport) => queryClient.setQueryData(queryKey, r);
  const refreshCampaign = () =>
    void queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey[0];
        return typeof k === "string" && k.startsWith("testgame") && k !== "testgame-report" && k !== "testgame-share-keys";
      },
    });
  const onFail = (fallback: string) => (err: unknown) => toast.error(errMsg(err, fallback));

  const update = useMutation({
    mutationFn: (body: ReportPatch) => testGameAdminApi.updateReport(campaignId, body),
    onSuccess: setReport,
    onError: onFail("Không lưu được report"),
  });
  const summarize = useMutation({
    mutationFn: () => testGameAdminApi.summarize(campaignId),
    onSuccess: (r) => {
      setReport(r);
      toast.success("Đang tổng hợp bằng AI — kết quả hiện ở Lịch sử chạy AI khi xong");
    },
    onError: onFail("Không chạy được tổng hợp AI"),
  });
  const runConfig = useMutation({
    mutationFn: () => testGameAdminApi.runConfig(campaignId),
    onSuccess: () => {
      toast.success("Đang tìm cấu hình bằng AI web search…");
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: onFail("Không chạy được cập nhật cấu hình"),
  });
  const saveRun = useMutation({
    mutationFn: (v: { runId: string; parts?: SavePart[] }) => testGameAdminApi.saveRun(campaignId, v.runId, v.parts),
    onSuccess: (r, v) => {
      setReport(r);
      setPreviewRunId(null);
      toast.success(
        !v.parts ? "Đã lưu bản tổng hợp vào report" : v.parts.includes("sections") ? "Đã lưu phần section" : "Đã lưu phần chung",
      );
    },
    onError: onFail("Không lưu được bản tổng hợp"),
  });
  const lock = useMutation({
    mutationFn: async (v: { decision: Decision; changed: boolean }) => {
      if (v.changed) await testGameAdminApi.updateReport(campaignId, { decision: v.decision });
      return testGameAdminApi.lockReport(campaignId);
    },
    onSuccess: (r) => {
      setReport(r);
      setLockOpen(false);
      refreshCampaign();
      toast.success("Đã chốt report — game test chuyển sang Done");
    },
    onError: (err) => {
      toast.error(errMsg(err, "Không chốt được report"));
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const unlock = useMutation({
    mutationFn: () => testGameAdminApi.unlockReport(campaignId),
    onSuccess: (r) => {
      setReport(r);
      setUnlockOpen(false);
      refreshCampaign();
      toast.success("Đã mở lại report");
    },
    onError: onFail("Không mở lại được report"),
  });
  const exportXlsx = useMutation({
    mutationFn: () => testGameAdminApi.exportReport(campaignId),
    onError: onFail("Không xuất được Excel"),
  });

  if (report.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!report.data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
        <CircleAlert className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{errMsg(report.error, "Không tải được report")}</p>
        <button type="button" onClick={() => void report.refetch()} className={cn(btnGhost, "px-3 py-1.5")}>
          <RefreshCw className="h-4 w-4" /> Thử lại
        </button>
      </div>
    );
  }

  const r = report.data;
  const locked = r.status === "locked";
  const summaryRunning = r.runs.some((x) => x.kind === "summary" && x.status === "running");
  const configRunning = r.runs.some((x) => x.kind === "config" && x.status === "running");
  const latestSummary = r.runs.find((x) => x.kind === "summary");
  const latestDoneSummary = r.runs.find((x) => x.kind === "summary" && x.status === "done");
  const lastSavedSummary = r.runs.find((x) => x.kind === "summary" && x.savedAt);
  const pendingRun = latestSummary?.status === "done" && !latestSummary.savedAt ? latestSummary : null;
  const savedCount = lastSavedSummary?.nSubmitted ?? null;
  const submissionsChanged = savedCount != null && savedCount !== r.info.submitted;
  const previewRun = r.runs.find((x) => x.id === previewRunId) ?? null;
  const statusLabel = CAMPAIGN_STATUS_LABEL[campaignStatus as CampaignStatus] ?? campaignStatus;

  const summarizeBlock = locked
    ? "Report đã chốt — mở lại để tổng hợp"
    : !r.template
      ? "Game test chưa có template"
      : r.info.submitted === 0
        ? "Chưa có tester nộp questionnaire"
        : summaryRunning
          ? "Đang tổng hợp — đợi bản hiện tại xong"
          : null;
  const configTitle = configRunning
    ? "Đang tìm cấu hình…"
    : locked
      ? "Report đã chốt — kết quả tìm được sẽ không tự lưu vào report"
      : "AI tìm cấu hình tối thiểu / đề xuất trên web rồi xếp mức theo Config library; tự lưu khi xong";

  const openSectionEditor = (tag: string) => {
    const s = r.sections.find((x) => x.tag === tag);
    setSectionDraft({ vi: s?.summary.vi ?? "", en: s?.summary.en ?? "" });
    setEditingTag(tag);
  };
  const saveSection = () => {
    if (!editingTag) return;
    update.mutate(
      { sections: { [editingTag]: sectionDraft } },
      {
        onSuccess: () => {
          setEditingTag(null);
          toast.success(`Đã lưu tổng kết ${editingTag}`);
        },
      },
    );
  };
  const saveGeneral = (field: GeneralField, value: string) =>
    update.mutateAsync({ [field]: value }).then(() => toast.success(`Đã lưu ${GENERAL.find((g) => g.key === field)?.label ?? field}`));
  const setDecision = (d: Decision | null) => {
    if (d === r.general.decision) return;
    update.mutate({ decision: d }, { onSuccess: () => toast.success(d ? `Decision: ${DECISION_LABEL[d]}` : "Đã bỏ Decision") });
  };
  const editingSection = editingTag ? r.sections.find((s) => s.tag === editingTag) : undefined;
  const aiSection = editingTag ? (latestDoneSummary?.output as SummaryOutput | null)?.sections?.[editingTag] : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <LangToggle value={lang} onChange={setLang} />
          <span className="text-xs text-muted-foreground">Ngôn ngữ tổng kết section</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span title={summarizeBlock ?? "Chạy AI-01 → AI-05 → AI-02 trên các bài đã nộp; xem lại rồi bấm Lưu mới vào report"}>
            <button
              type="button"
              disabled={Boolean(summarizeBlock) || summarize.isPending}
              onClick={() => summarize.mutate()}
              className={cn(btnPrimary, "px-3 py-2")}
            >
              {summaryRunning || summarize.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Tổng hợp bằng AI
            </button>
          </span>
          <span title={configTitle}>
            <button
              type="button"
              disabled={configRunning || runConfig.isPending}
              onClick={() => runConfig.mutate()}
              className={cn(btnSubtle, "px-3 py-2")}
            >
              {configRunning || runConfig.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
              Cập nhật cấu hình
            </button>
          </span>
          <button type="button" disabled={exportXlsx.isPending} onClick={() => exportXlsx.mutate()} className={cn(btnGhost, "px-3 py-2")}>
            {exportXlsx.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Xuất Excel
          </button>
          <button type="button" onClick={() => setShareOpen(true)} className={cn(btnGhost, "px-3 py-2")}>
            <Share2 className="h-4 w-4" /> Chia sẻ
          </button>
          {locked ? (
            <button type="button" onClick={() => setUnlockOpen(true)} className={cn(btnGhost, "px-3 py-2")}>
              <LockOpen className="h-4 w-4" /> Mở lại
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLockDecision(r.general.decision);
                setLockOpen(true);
              }}
              className={cn(btnSuccess, "px-3 py-2")}
            >
              <Lock className="h-4 w-4" /> Chốt report
            </button>
          )}
        </div>
      </div>

      {locked && (
        <Callout tone="success" icon={<Lock className="h-4 w-4" />}>
          Report đã chốt {viDateTime(r.lockedAt)}
          {r.lockedBy ? ` bởi ${r.lockedBy}` : ""} — game test ở trạng thái Done. Bấm "Mở lại" để chỉnh sửa hoặc tổng hợp lại.
        </Callout>
      )}
      {!locked && campaignStatus === "testing" && (
        <Callout tone="info" icon={<Info className="h-4 w-4" />}>
          Game test còn trong thời gian test — tester có thể nộp thêm bài, nhớ tổng hợp lại trước khi chốt.
        </Callout>
      )}
      {summaryRunning && (
        <Callout tone="info" icon={<LoaderCircle className="h-4 w-4 animate-spin" />}>
          AI đang tổng hợp từng section (AI-01 → AI-05 → AI-02). Trang tự cập nhật khi xong.
        </Callout>
      )}
      {configRunning && (
        <Callout tone="info" icon={<LoaderCircle className="h-4 w-4 animate-spin" />}>
          AI đang tìm cấu hình trên web và xếp mức theo Config library.
        </Callout>
      )}
      {!locked && pendingRun && (
        <Callout
          tone="warn"
          icon={<Sparkles className="h-4 w-4" />}
          action={
            <button type="button" onClick={() => setPreviewRunId(pendingRun.id)} className={cn(btnPrimary, "px-3 py-1.5 text-xs")}>
              <Eye className="h-3.5 w-3.5" /> Xem & lưu
            </button>
          }
        >
          Bản tổng hợp AI lúc {viDateTime(pendingRun.finishedAt ?? pendingRun.createdAt)} ({pendingRun.nSubmitted ?? "?"} bài nộp) đã xong nhưng chưa
          lưu vào report.
        </Callout>
      )}
      {!locked && submissionsChanged && (
        <Callout tone="warn" icon={<TriangleAlert className="h-4 w-4" />}>
          {r.info.submitted > (savedCount ?? 0) ? "Có bài nộp mới sau lần tổng hợp gần nhất" : "Số bài nộp đã thay đổi sau lần tổng hợp gần nhất"} (lúc
          tổng hợp: {savedCount}, hiện tại: {r.info.submitted}). Bấm "Tổng hợp bằng AI" để cập nhật tổng kết.
        </Callout>
      )}
      {!locked && !lastSavedSummary && !pendingRun && !summaryRunning && r.info.submitted > 0 && (
        <Callout tone="info" icon={<Info className="h-4 w-4" />}>
          Đã có {r.info.submitted} bài nộp nhưng chưa lưu bản tổng hợp AI nào. Điểm section đã tính sẵn; tổng kết và USP / Pros / Cons /
          Conclusion cần chạy "Tổng hợp bằng AI" hoặc tự nhập.
        </Callout>
      )}

      <RunsPanel runs={r.runs} onPreview={setPreviewRunId} />

      <ReportView
        report={r}
        lang={lang}
        fileUrl={(id) => testFileUrl(id)}
        editable={!locked}
        onEditSection={openSectionEditor}
        renderGeneralField={(field, view, label) => (
          <GeneralFieldEditor label={label} value={r.general[field]} view={view} disabled={locked} onSave={(v) => saveGeneral(field, v)} />
        )}
        decisionSlot={
          <div className="flex flex-wrap items-center gap-2">
            <DecisionPicker value={r.general.decision} disabled={locked || update.isPending} onChange={setDecision} />
            {!locked && r.general.decision && (
              <button type="button" onClick={() => setDecision(null)} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Bỏ chọn
              </button>
            )}
          </div>
        }
      />

      <Drawer
        open={editingTag != null}
        onClose={() => setEditingTag(null)}
        title={`Tổng kết · ${editingTag ?? ""}`}
        subtitle={
          editingSection?.scored ? `Điểm ${editingSection.score ?? "-"}/5 · ${editingSection.answered} tester chấm` : "Section không chấm điểm"
        }
        size="wide"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditingTag(null)} className={cn(btnGhost, "px-4 py-2")}>
              Hủy
            </button>
            <button type="button" disabled={update.isPending} onClick={saveSection} className={cn(btnPrimary, "px-4 py-2")}>
              {update.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Mỗi ý một dòng, bắt đầu bằng "- ".</p>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Tiếng Việt</span>
            <textarea
              rows={8}
              value={sectionDraft.vi}
              onChange={(e) => setSectionDraft((d) => ({ ...d, vi: e.target.value }))}
              className={textarea}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">English</span>
            <textarea
              rows={8}
              value={sectionDraft.en}
              onChange={(e) => setSectionDraft((d) => ({ ...d, en: e.target.value }))}
              className={textarea}
            />
          </label>
          {aiSection && (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-primary">
                  Bản AI gần nhất · {viDateTime(latestDoneSummary?.finishedAt ?? latestDoneSummary?.createdAt)}
                </p>
                <button type="button" onClick={() => setSectionDraft({ vi: aiSection.vi ?? "", en: aiSection.en ?? "" })} className={cn(btnSubtle, "px-2.5 py-1 text-xs")}>
                  Dùng bản AI
                </button>
              </div>
              <BulletText text={aiSection[lang]} empty="Trống" />
            </div>
          )}
        </div>
      </Drawer>

      {previewRun && (
        <RunPreview
          run={previewRun}
          report={r}
          lang={lang}
          locked={locked}
          saving={saveRun.isPending}
          onSave={(parts) => saveRun.mutate({ runId: previewRun.id, parts })}
          onClose={() => setPreviewRunId(null)}
        />
      )}

      {shareOpen && <ShareModal campaignId={campaignId} onClose={() => setShareOpen(false)} />}

      <Modal
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        title="Chốt report"
        description="Sau khi chốt, report không sửa / tổng hợp được cho tới khi mở lại."
        className="max-w-lg"
        footer={
          <ModalFooterActions
            onCancel={() => setLockOpen(false)}
            onSubmit={() => lockDecision && lock.mutate({ decision: lockDecision, changed: lockDecision !== r.general.decision })}
            cancelLabel="Hủy"
            submitLabel={lock.isPending ? "Đang chốt…" : "Chốt report"}
            submitting={lock.isPending}
            submitDisabled={!lockDecision}
          />
        }
      >
        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium">Decision *</p>
            <DecisionPicker value={lockDecision} onChange={setLockDecision} />
          </div>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Game test chuyển từ <span className="font-medium text-foreground">{statusLabel}</span> sang{" "}
              <span className="font-medium text-foreground">Done</span>; Conclusion và Decision được ghi về game test.
            </li>
            <li>Radar đồng bộ theo Decision{lockDecision === "drop" ? " — game sẽ chuyển sang Drop trên Radar" : " (Drop → Radar Drop)"}.</li>
            <li>Link chia sẻ đang hoạt động sẽ hiển thị bản đã chốt.</li>
          </ul>
          {(pendingRun || submissionsChanged || !r.general.conclusion) && (
            <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {pendingRun && <p>• Có bản tổng hợp AI chưa lưu vào report.</p>}
              {submissionsChanged && <p>• Có bài nộp thay đổi sau lần tổng hợp gần nhất.</p>}
              {!r.general.conclusion && <p>• Chưa có Conclusion.</p>}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        title="Mở lại report"
        description="Report chuyển về Đang cập nhật để chỉnh sửa và tổng hợp lại."
        footer={
          <ModalFooterActions
            onCancel={() => setUnlockOpen(false)}
            onSubmit={() => unlock.mutate()}
            cancelLabel="Hủy"
            submitLabel={unlock.isPending ? "Đang mở…" : "Mở lại"}
            submitting={unlock.isPending}
          />
        }
      >
        <p className="text-sm text-muted-foreground">
          Game test quay về Testing (nếu chưa hết ngày test) hoặc Reporting. Decision vẫn giữ trong report để chọn sẵn khi chốt lại, nhưng Radar
          sẽ không hiện kết quả test cho tới khi chốt lại và game test về Done.
        </p>
      </Modal>
    </div>
  );
}

const CALLOUT_TONE = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
} as const;

function Callout({ tone, icon, action, children }: { tone: keyof typeof CALLOUT_TONE; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm", CALLOUT_TONE[tone])}>
      <span className="shrink-0">{icon}</span>
      <p className="min-w-0 flex-1">{children}</p>
      {action}
    </div>
  );
}

function DecisionPicker({ value, onChange, disabled }: { value: Decision | null; onChange: (d: Decision) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Decision" className="flex flex-wrap gap-1.5">
      {DECISIONS.map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={value === d}
          disabled={disabled}
          onClick={() => onChange(d)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            value === d ? cn(DECISION_CLASS[d], "ring-2 ring-primary/20") : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {value === d && <Check className="h-3.5 w-3.5" />}
          {DECISION_LABEL[d]}
        </button>
      ))}
    </div>
  );
}

function GeneralFieldEditor({
  label,
  value,
  view,
  disabled,
  onSave,
}: {
  label: string;
  value: string | null;
  view: ReactNode;
  disabled: boolean;
  onSave: (value: string) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (draft == null || disabled) {
    return (
      <div className="space-y-3">
        {view}
        {!disabled && (
          <button type="button" onClick={() => setDraft(value ?? "")} className={cn(btnGhost, "px-2.5 py-1 text-xs")}>
            <Pencil className="h-3.5 w-3.5" /> Sửa
          </button>
        )}
      </div>
    );
  }
  const save = () => {
    setSaving(true);
    void onSave(draft)
      .then(
        () => setDraft(null),
        () => undefined,
      )
      .finally(() => setSaving(false));
  };
  return (
    <div className="space-y-2">
      <textarea
        autoFocus
        rows={label === "Conclusion" ? 6 : 5}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={label === "Conclusion" ? "Một đoạn kết luận…" : '- Mỗi ý một dòng, bắt đầu bằng "- "'}
        className={textarea}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setDraft(null)} className={cn(btnGhost, "px-3 py-1.5 text-xs")}>
          Hủy
        </button>
        <button type="button" disabled={saving} onClick={save} className={cn(btnPrimary, "px-3 py-1.5 text-xs")}>
          {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Lưu {label}
        </button>
      </div>
    </div>
  );
}

function RunStatus({ run }: { run: ReportRun }) {
  if (run.status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
        <LoaderCircle className="h-3 w-3 animate-spin" /> Đang chạy
      </span>
    );
  }
  if (run.status === "failed") {
    return <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">Lỗi</span>;
  }
  return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Xong</span>;
}

function RunsPanel({ runs, onPreview }: { runs: ReportRun[]; onPreview: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const th = "whitespace-nowrap px-4 py-2.5 font-medium";
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-2 font-semibold">
          <History className="h-4 w-4 text-primary" /> Lịch sử chạy AI ({runs.length})
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open &&
        (runs.length === 0 ? (
          <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground">Chưa chạy tổng hợp AI hay cập nhật cấu hình lần nào.</p>
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {["Loại", "Trạng thái", "Chạy bởi", "Bài nộp", "Lưu vào report", ""].map((h, i) => (
                    <th key={i} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((run) => {
                  const kind = RUN_KIND[run.kind];
                  return (
                    <Fragment key={run.id}>
                      <tr className="align-top transition-colors hover:bg-muted/60">
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <kind.icon className="h-3.5 w-3.5 text-muted-foreground" /> {kind.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <RunStatus run={run} />
                        </td>
                        <td className="px-4 py-2.5">
                          <p>{run.createdBy ?? "Hệ thống"}</p>
                          <p className="text-xs text-muted-foreground">{viDateTime(run.createdAt)}</p>
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">{run.kind === "summary" ? (run.nSubmitted ?? "—") : "—"}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {run.savedAt ? (
                            <span className="text-emerald-700">
                              Đã lưu · {viDateTime(run.savedAt)}
                              {run.savedBy ? ` · ${run.savedBy}` : ""}
                            </span>
                          ) : run.status === "done" ? (
                            <span className="font-medium text-amber-700">Chưa lưu</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {run.status === "done" && run.output && (
                            <button type="button" onClick={() => onPreview(run.id)} className={cn(btnGhost, "px-2.5 py-1 text-xs")}>
                              <Eye className="h-3.5 w-3.5" /> Xem
                            </button>
                          )}
                        </td>
                      </tr>
                      {run.status === "failed" && run.error && (
                        <tr>
                          <td colSpan={6} className="bg-rose-50 px-4 py-2 text-xs text-rose-700">
                            {run.error}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}

function Compare({ title, current, next, meta }: { title: string; current: string | null | undefined; next: string | null | undefined; meta?: ReactNode }) {
  const changed = (current ?? "").trim() !== (next ?? "").trim();
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {meta}
        </span>
        <span className={cn("text-xs", changed ? "font-medium text-amber-700" : "text-muted-foreground")}>{changed ? "Có thay đổi" : "Giống hiện tại"}</span>
      </div>
      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="space-y-1 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Hiện tại</p>
          <BulletText text={current} empty="Trống" />
        </div>
        <div className="space-y-1 bg-primary/5 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary">Bản AI</p>
          <BulletText text={next} empty="Trống" />
        </div>
      </div>
    </div>
  );
}

function RunPreview({
  run,
  report,
  lang,
  locked,
  saving,
  onSave,
  onClose,
}: {
  run: ReportRun;
  report: TestReport;
  lang: ReportLang;
  locked: boolean;
  saving: boolean;
  onSave: (parts?: SavePart[]) => void;
  onClose: () => void;
}) {
  const saveDisabled = locked || saving;
  const lockedNote = locked && <p className="text-xs text-muted-foreground">Report đã chốt — mở lại để lưu.</p>;
  const meta = (
    <p className="text-sm text-muted-foreground">
      Chạy {viDateTime(run.createdAt)}
      {run.createdBy ? ` bởi ${run.createdBy}` : ""}
      {run.savedAt ? ` · đã lưu ${viDateTime(run.savedAt)}${run.savedBy ? ` bởi ${run.savedBy}` : ""}` : " · chưa lưu vào report"}
    </p>
  );

  if (run.kind === "config") {
    const out = (run.output ?? {}) as ConfigOutput;
    return (
      <Drawer
        open
        onClose={onClose}
        title="Kết quả cập nhật cấu hình"
        subtitle={viDateTime(run.finishedAt ?? run.createdAt)}
        size="full"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {lockedNote}
            <button type="button" onClick={onClose} className={cn(btnGhost, "px-4 py-2")}>
              Đóng
            </button>
            {!run.savedAt && (
              <button type="button" disabled={saveDisabled} onClick={() => onSave()} className={cn(btnPrimary, "px-4 py-2")}>
                <Save className="h-4 w-4" /> Lưu vào report
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {meta}
          <ConfigView requirement={out.requirement ?? null} level={out.level ?? null} />
        </div>
      </Drawer>
    );
  }

  const out = (run.output ?? {}) as SummaryOutput;
  const tags = [...new Set([...report.sections.map((s) => s.tag), ...Object.keys(out.sections ?? {})])];
  return (
    <Drawer
      open
      onClose={onClose}
      title="Bản tổng hợp AI"
      subtitle={`${run.nSubmitted ?? "?"} bài nộp lúc chạy · hiện có ${report.info.submitted}`}
      size="full"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {lockedNote}
          <button type="button" disabled={saveDisabled} onClick={() => onSave(["sections"])} className={cn(btnGhost, "px-3 py-2")}>
            Chỉ lưu phần section
          </button>
          <button type="button" disabled={saveDisabled} onClick={() => onSave(["general"])} className={cn(btnGhost, "px-3 py-2")}>
            Chỉ lưu phần chung
          </button>
          <button type="button" disabled={saveDisabled} onClick={() => onSave()} className={cn(btnPrimary, "px-4 py-2")}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu tất cả
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="space-y-1">
          {meta}
          {out.overall !== undefined && (
            <p className="text-sm text-muted-foreground">
              Điểm tổng lúc chạy: <span className="font-semibold text-foreground">{out.overall ?? "-"}</span> · hiện tại:{" "}
              <span className="font-semibold text-foreground">{report.overall ?? "-"}</span>
            </p>
          )}
          {run.nSubmitted != null && run.nSubmitted !== report.info.submitted && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700">
              <TriangleAlert className="h-3.5 w-3.5" /> Số bài nộp đã thay đổi kể từ lần chạy này.
            </p>
          )}
        </div>
        <section className="space-y-3">
          <h3 className="font-semibold">Section ({lang.toUpperCase()})</h3>
          {tags.map((tag) => {
            const s = report.sections.find((x) => x.tag === tag);
            return (
              <Compare
                key={tag}
                title={tag}
                current={s?.summary[lang]}
                next={out.sections?.[tag]?.[lang]}
                meta={s?.scored ? <span className="text-xs font-normal text-muted-foreground">{s.score ?? "-"}/5</span> : undefined}
              />
            );
          })}
        </section>
        <section className="space-y-3">
          <h3 className="font-semibold">Phần chung (tiếng Anh)</h3>
          {GENERAL.map((g) => (
            <Compare key={g.key} title={g.label} current={report.general[g.key]} next={out[g.key]} />
          ))}
        </section>
      </div>
    </Drawer>
  );
}

const EXPIRY_OPTIONS = [
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "none", label: "Không hết hạn" },
];

function shareState(k: ShareKey): { label: string; className: string } {
  if (k.revokedAt) return { label: "Đã thu hồi", className: "bg-muted text-muted-foreground" };
  if (!k.active) return { label: "Hết hạn", className: "bg-amber-50 text-amber-800" };
  return { label: "Đang hiệu lực", className: "bg-emerald-50 text-emerald-700" };
}

function ShareModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["testgame-share-keys", campaignId];
  const keys = useQuery({ queryKey, queryFn: () => testGameAdminApi.shareKeys(campaignId) });
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("30");
  const [copied, setCopied] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      testGameAdminApi.createShareKey(campaignId, { label: label.trim() || undefined, expiresInDays: expiry === "none" ? null : Number(expiry) }),
    onSuccess: (list) => {
      queryClient.setQueryData(queryKey, list);
      setLabel("");
      toast.success("Đã tạo link chia sẻ");
    },
    onError: (err) => toast.error(errMsg(err, "Không tạo được link")),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => testGameAdminApi.revokeShareKey(campaignId, id),
    onSuccess: (list) => {
      queryClient.setQueryData(queryKey, list);
      toast.success("Đã thu hồi link");
    },
    onError: (err) => toast.error(errMsg(err, "Không thu hồi được link")),
  });

  const copy = (k: ShareKey) => {
    if (!navigator.clipboard) {
      toast.error("Trình duyệt không cho copy — hãy copy thủ công");
      return;
    }
    navigator.clipboard.writeText(k.url).then(
      () => {
        setCopied(k.id);
        window.setTimeout(() => setCopied((c) => (c === k.id ? null : c)), 1500);
      },
      () => toast.error("Không copy được — hãy copy thủ công"),
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Chia sẻ report"
      description="Người có link xem được report (chỉ đọc, ẩn tên / email tester) mà không cần đăng nhập."
      className="max-w-2xl"
      footer={
        <button type="button" onClick={onClose} className={cn(btnGhost, "px-4 py-2")}>
          Đóng
        </button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
          <p className="text-sm font-medium">Tạo link mới</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={label}
              maxLength={120}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !create.isPending && create.mutate()}
              placeholder="Nhãn (vd Gửi team Publishing)"
              className={cn(input, "min-w-0 flex-1")}
            />
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm" aria-label="Thời hạn">
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="button" disabled={create.isPending} onClick={() => create.mutate()} className={cn(btnPrimary, "px-3 py-2")}>
              {create.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tạo link
            </button>
          </div>
        </div>

        {keys.isLoading ? (
          <div className="flex justify-center py-6">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : keys.error ? (
          <p className="text-sm text-destructive">{errMsg(keys.error, "Không tải được danh sách link")}</p>
        ) : (keys.data ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Chưa có link chia sẻ nào.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {keys.data!.map((k) => {
              const st = shareState(k);
              return (
                <li key={k.id} className={cn("space-y-2 p-3", !k.active && "opacity-70")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">{k.label || "Không có nhãn"}</span>
                      <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", st.className)}>{st.label}</span>
                    </span>
                    {k.active && (
                      <button
                        type="button"
                        disabled={revoke.isPending}
                        onClick={() => {
                          if (window.confirm(`Thu hồi link "${k.label || k.key}"? Người đang có link sẽ không xem được nữa.`)) revoke.mutate(k.id);
                        }}
                        className={cn(btnDanger, "px-2.5 py-1 text-xs")}
                      >
                        <X className="h-3.5 w-3.5" /> Thu hồi
                      </button>
                    )}
                  </div>
                  {k.active && (
                    <div className="flex items-center gap-1.5">
                      <input readOnly value={k.url} onFocus={(e) => e.target.select()} className={cn(input, "min-w-0 flex-1 py-1.5 font-mono text-xs")} />
                      <button type="button" onClick={() => copy(k)} className={btnIcon} aria-label="Copy link" title="Copy link">
                        {copied === k.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <a href={k.url} target="_blank" rel="noreferrer" className={btnIcon} aria-label="Mở link" title="Mở link">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Tạo {viDateTime(k.createdAt)}
                    {k.createdBy ? ` · ${k.createdBy}` : ""} · {k.expiresAt ? `hết hạn ${viDateTime(k.expiresAt)}` : "không hết hạn"}
                    {k.revokedAt ? ` · thu hồi ${viDateTime(k.revokedAt)}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
