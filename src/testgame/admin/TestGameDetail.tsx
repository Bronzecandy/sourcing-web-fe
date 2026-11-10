import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Gamepad2,
  Loader2,
  MessageSquare,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { TesterApiError } from "@/tester/api";
import { cn } from "@/lib/utils";
import { btnDanger, btnGhost, btnIconDanger, btnPrimary, btnSubtle } from "@/lib/button-classes";
import { testFileUrl, testGameAdminApi } from "../api";
import { CAMPAIGN_STATUS_CLASS, CAMPAIGN_STATUS_HINT, CAMPAIGN_STATUS_LABEL, DECISION_CLASS, DECISION_LABEL, formatBytes, viDate, viDateTime } from "../labels";
import type { CampaignDetail, CampaignStatus } from "../types";
import AuditTab from "./AuditTab";
import CampaignFormDrawer from "./CampaignFormDrawer";
import MailTab from "./MailTab";
import ReportTab from "./ReportTab";
import TesterTab from "./TesterTab";

const STEPS: CampaignStatus[] = ["pending", "inviting", "testing", "reporting", "done"];
const STEP_HINT: Record<string, string> = {
  pending: "Chuẩn bị thông tin, thêm tester",
  inviting: "Gửi lời mời, chờ xác nhận",
  testing: "Tester chơi và nộp bài",
  reporting: "Duyệt bài, tổng hợp report",
  done: "Chốt quyết định",
};

function Stepper({ status }: { status: CampaignStatus }) {
  const idx = STEPS.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs">
      {STEPS.map((s, i) => {
        const done = idx > i || status === "done";
        const current = idx === i && status !== "done";
        return (
          <li key={s} className="flex items-center gap-1" title={STEP_HINT[s]}>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
                done && "border-emerald-200 bg-emerald-50 text-emerald-700",
                current && "border-primary bg-primary text-primary-foreground",
                !done && !current && "border-border text-muted-foreground",
                status === "cancelled" && "opacity-50",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
              {CAMPAIGN_STATUS_LABEL[s]}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? "—"}</dd>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function NextStep({ c, onTab, onEdit, onInitiate, onFinish, onReopen }: {
  c: CampaignDetail;
  onTab: (t: string) => void;
  onEdit: () => void;
  onInitiate: () => void;
  onFinish: () => void;
  onReopen: () => void;
}) {
  const n = c.counts;
  const added = c.assignments.filter((a) => a.status === "added").length;
  let tone: "info" | "warn" | "ok" = "info";
  let title = "";
  let body: ReactNode = null;
  let action: ReactNode = null;
  const btn = (label: string, onClick: () => void, primary = true) => (
    <button type="button" onClick={onClick} className={cn(primary ? btnPrimary : btnGhost, "px-3 py-1.5 text-sm")}>
      {label}
    </button>
  );

  if (c.status === "cancelled") {
    tone = "warn";
    title = "Game test đã huỷ";
    body = "Mail tự động đã dừng. Mở lại nếu cần tiếp tục.";
    action = btn("Mở lại", onReopen, false);
  } else if (c.noTest) {
    if (c.status === "done") {
      tone = "ok";
      title = `Đã chốt: ${c.decision ? DECISION_LABEL[c.decision] : "không có quyết định"}`;
      body = c.conclusion;
    } else {
      title = "Game không test nội bộ";
      body = "Chọn quyết định (dựa trên screening / thông tin ngoài) rồi chuyển Done.";
      action = btn("Chốt & chuyển Done", onFinish);
    }
  } else if (c.status === "pending") {
    const missing = c.initiateIssues.filter((i) => i !== "Ít nhất một tester");
    if (missing.length > 0) {
      tone = "warn";
      title = "Cần bổ sung thông tin trước khi Initiate";
      body = (
        <ul className="mt-1 list-inside list-disc text-sm">
          {missing.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      );
      action = btn("Sửa thông tin", onEdit);
    } else if (n.total === 0) {
      title = "Thêm tester";
      body = "Dùng gợi ý tester theo dòng game / platform / mức bảo mật, hoặc dán danh sách email.";
      action = btn("Mở tab Tester", () => onTab("testers"));
    } else {
      tone = "ok";
      title = `Sẵn sàng Initiate — ${added} tester sẽ nhận lời mời`;
      body = "Initiate chốt template questionnaire, gửi M1 cho tester và báo nhóm SeaTalk vận hành.";
      action = btn("Initiate", onInitiate);
    }
  } else if (c.status === "inviting") {
    title = `Chờ tester xác nhận — ${n.confirmed}/${n.invited} đã xác nhận`;
    body = `Tự chuyển Testing vào ngày bắt đầu (${viDate(c.startDate)}). Người chưa phản hồi sẽ được nhắc (M2).`;
    if (added > 0) action = btn(`Gửi mời ${added} tester mới`, () => onTab("testers"));
  } else if (c.status === "testing" || c.status === "reporting") {
    if (n.pendingReview > 0) {
      tone = "warn";
      title = `${n.pendingReview} bài nộp chờ duyệt`;
      body = "AI đã kiểm tra ảnh bằng chứng (UID, level, trùng ảnh, tiến độ so với số giờ). Duyệt để tính giờ và benefit cho tester.";
      action = btn("Duyệt bài", () => onTab("testers"));
    } else if (c.status === "testing") {
      title = `Đang test — ${n.submitted}/${n.active + n.submitted} tester đã nộp`;
      body = `Hạn test ${viDate(c.endDate)}. Hệ thống nhắc trước hạn (M5) và ngày cuối (M6).`;
    } else {
      title = "Tổng hợp report và chốt quyết định";
      body = `Hạn report ${viDate(c.reportDeadline)}${c.overdue ? " — đã quá hạn" : ""}. Chạy AI tổng hợp, chỉnh nội dung rồi Chốt report.`;
      tone = c.overdue ? "warn" : "info";
      action = btn("Mở Report", () => onTab("report"));
    }
  } else if (c.status === "done") {
    tone = "ok";
    title = `Đã chốt: ${c.decision ? DECISION_LABEL[c.decision] : "—"}`;
    body = `${n.approved} tester được duyệt hoàn thành.`;
    action = btn("Xem report", () => onTab("report"), false);
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3",
        tone === "warn" && "border-amber-300 bg-amber-50/70",
        tone === "ok" && "border-emerald-200 bg-emerald-50/60",
        tone === "info" && "border-sky-200 bg-sky-50/60",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Việc cần làm</p>
        <p className="font-semibold">{title}</p>
        {body && <div className="mt-0.5 text-sm text-muted-foreground">{body}</div>}
      </div>
      {action}
    </div>
  );
}

function GuideFiles({ c, onChanged }: { c: CampaignDetail; onChanged: () => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      for (const f of Array.from(files)) {
        setProgress(0);
        await testGameAdminApi.uploadGuideFile(c.id, f, setProgress);
      }
      toast.success("Đã tải lên");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tải lên lỗi");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await testGameAdminApi.deleteFile(id);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xoá lỗi");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-2">
      {c.guideFiles.map((f) => (
        <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <a href={testFileUrl(f.id, true)} className="min-w-0 flex-1 truncate hover:underline">
            {f.fileName}
          </a>
          <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
          <a href={testFileUrl(f.id, true)} className={cn(btnGhost, "px-1.5 py-1")} aria-label="Tải xuống">
            <Download className="h-3.5 w-3.5" />
          </a>
          <button type="button" disabled={deleting === f.id} onClick={() => void remove(f.id)} className={btnIconDanger} aria-label="Xoá tệp">
            {deleting === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      ))}
      <input ref={input} type="file" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
      <button type="button" disabled={progress !== null} onClick={() => input.current?.click()} className={cn(btnGhost, "w-full justify-center border-dashed px-3 py-2 text-sm")}>
        {progress !== null ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lên {progress}%
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> Thêm tệp hướng dẫn (PDF, ảnh, doc…)
          </>
        )}
      </button>
      <p className="text-xs text-muted-foreground">Tester thấy tệp sau khi xác nhận tham gia; mail M3 đính kèm tệp nhỏ hơn 10 MB.</p>
    </div>
  );
}

function Overview({ c, onRefresh, onChanged, meta }: {
  c: CampaignDetail;
  onRefresh: () => void;
  onChanged: (c: CampaignDetail) => void;
  meta: { sources: Array<{ key: string; label: string }>; evalFormats: Array<{ key: string; label: string }> } | undefined;
}) {
  const toast = useToast();
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<CampaignDetail>, done: string) => {
    setBusy(key);
    try {
      onChanged(await fn());
      toast.success(done);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác lỗi");
    } finally {
      setBusy(null);
    }
  };

  const evalLabel = meta?.evalFormats.find((f) => f.key === c.evalFormat)?.label ?? c.evalFormat;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Game">
        <dl>
          <Field label="Tên gốc">{c.originalName}</Field>
          <Field label="Dòng game">{[...c.mainTags, ...c.secondaryTags.map((t) => `${t} (phụ)`)].join(", ") || "—"}</Field>
          <Field label="Thể loại">{c.genre}</Field>
          <Field label="Platform">{c.platforms.join(", ") || "—"}</Field>
          <Field label="Developer">{c.developer}</Field>
          <Field label="IP">{c.ipName}</Field>
          <Field label="Giai đoạn">{c.devStage}</Field>
          <Field label="Link">
            <span className="flex flex-wrap gap-x-3">
              {c.taptapUrl && <ExtLink href={c.taptapUrl}>TapTap</ExtLink>}
              {c.googlePlayUrl && <ExtLink href={c.googlePlayUrl}>Google Play</ExtLink>}
              {c.steamUrl && <ExtLink href={c.steamUrl}>Steam</ExtLink>}
              {c.appId && (
                <Link to={`/game/${c.appId}`} className="text-primary hover:underline">
                  Trang game Sourcing
                </Link>
              )}
              {!c.taptapUrl && !c.googlePlayUrl && !c.steamUrl && !c.appId && "—"}
            </span>
          </Field>
          {c.background && <Field label="Bối cảnh">{c.background}</Field>}
        </dl>
      </Card>

      <Card title="Thiết lập test">
        <dl>
          <Field label="Thời gian">
            {viDate(c.startDate)} – {viDate(c.endDate)}
          </Field>
          <Field label="Hạn report">
            <span className={cn(c.overdue && "font-medium text-destructive")}>{viDate(c.reportDeadline)}</span>
          </Field>
          <Field label="Hình thức">
            {evalLabel ?? "—"}
            {c.evalFormat === "daily" && c.hoursPerDay && c.testDays ? ` · ${c.hoursPerDay} giờ/ngày × ${c.testDays} ngày` : ""}
            {c.evalFormat === "focused" && c.focusedAt ? ` · ${viDateTime(c.focusedAt)}${c.focusedPlace ? ` tại ${c.focusedPlace}` : ""}` : ""}
          </Field>
          <Field label="Workload">{c.workloadHours} giờ / tester</Field>
          <Field label="Questionnaire">
            {c.template ? (
              <>
                {c.template.name} v{c.template.version} · {c.template.questionCount} câu
                {c.template.locked ? (
                  <span className="ml-1 text-xs text-muted-foreground">(đã chốt khi Initiate)</span>
                ) : (
                  c.template.latestVersion &&
                  c.template.latestVersion !== c.template.version && <span className="ml-1 text-xs text-amber-700">(có bản v{c.template.latestVersion})</span>
                )}
              </>
            ) : (
              <span className="text-amber-700">Chưa chọn template</span>
            )}
          </Field>
          <Field label="Footage">{c.footageRequired ? "Bắt buộc nộp" : "Không bắt buộc"}</Field>
          <Field label="Nguồn">
            {c.sourceLabel}
            {c.requester ? ` · ${c.requester}` : ""}
            {c.sourceDetail ? ` · ${c.sourceDetail}` : ""}
          </Field>
          <Field label="Bảo mật">{c.securityLevel}</Field>
        </dl>
      </Card>

      <Card title="File cài & hướng dẫn cho tester" className="lg:row-span-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Folder Drive (APK / bản build)</p>
            {c.apkFolderUrl ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <a href={c.apkFolderUrl} target="_blank" rel="noreferrer" className={cn(btnSubtle, "px-3 py-1.5")}>
                  <FolderOpen className="h-4 w-4" /> Mở folder & upload file cài
                </a>
                <span className="text-xs text-muted-foreground">Tester xác nhận tham gia được share quyền xem tự động.</span>
              </div>
            ) : c.noTest ? (
              <p className="text-sm text-muted-foreground">Không áp dụng.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">{c.apkFolderError ?? "Chưa tạo folder Drive"}</span>
                <button type="button" disabled={busy === "drive"} onClick={() => void run("drive", () => testGameAdminApi.retryDriveFolder(c.id), "Đã thử tạo lại folder")} className={cn(btnGhost, "bg-white px-2.5 py-1 text-xs")}>
                  {busy === "drive" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Tạo lại
                </button>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Link cài đặt khác</p>
            <p className="text-sm">{c.installUrl ? <ExtLink href={c.installUrl}>{c.installUrl}</ExtLink> : <span className="text-muted-foreground">Không có (tuỳ chọn)</span>}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ghi chú cho tester</p>
            <p className="whitespace-pre-wrap text-sm">{c.testerNote || <span className="text-muted-foreground">—</span>}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hướng dẫn</p>
            <p className="whitespace-pre-wrap text-sm">{c.guide || <span className="text-muted-foreground">—</span>}</p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Thông tin truy cập (tài khoản / mã)
              {c.accessInfo && (
                <button type="button" onClick={() => setReveal((v) => !v)} className="inline-flex items-center gap-1 normal-case text-primary">
                  {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {reveal ? "Ẩn" : "Hiện"}
                </button>
              )}
            </p>
            <p className="whitespace-pre-wrap font-mono text-sm">{c.accessInfo ? (reveal ? c.accessInfo : "••••••••") : <span className="font-sans text-muted-foreground">—</span>}</p>
          </div>
          {!c.noTest && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tệp hướng dẫn</p>
              <GuideFiles c={c} onChanged={onRefresh} />
            </div>
          )}
        </div>
      </Card>

      <Card title="Phụ trách & thông báo">
        <dl>
          <Field label="Người phụ trách">
            {c.coordinatorName ?? "—"}
            {c.coordinatorEmail && <span className="text-muted-foreground"> · {c.coordinatorEmail}</span>}
          </Field>
          {c.team && <Field label="Team">{c.team}</Field>}
          <Field label="Initiate">{c.initiatedAt ? `${viDateTime(c.initiatedAt)} · ${c.initiatedBy ?? ""}` : "Chưa"}</Field>
          <Field label="SeaTalk">
            {c.seatalkStatus ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className={cn(c.seatalkStatus === "sent" ? "text-emerald-700" : c.seatalkStatus === "failed" ? "text-destructive" : "text-muted-foreground")}>
                  {c.seatalkStatus === "sent" ? "Đã báo nhóm vận hành" : c.seatalkStatus === "failed" ? "Gửi lỗi" : "Bỏ qua"}
                </span>
                {c.seatalkError && <span className="text-xs text-muted-foreground">{c.seatalkError}</span>}
                {c.seatalkStatus !== "sent" && (
                  <button type="button" disabled={busy === "seatalk"} onClick={() => void run("seatalk", () => testGameAdminApi.resendSeaTalk(c.id), "Đã gửi lại SeaTalk")} className={cn(btnGhost, "px-2 py-0.5 text-xs")}>
                    {busy === "seatalk" ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />} Gửi lại
                  </button>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Gửi khi Initiate</span>
            )}
          </Field>
          {c.previousId && (
            <Field label="Lần test trước">
              <Link to={`/admin/test-campaigns/${c.previousId}`} className="text-primary hover:underline">
                Mở game test lần trước
              </Link>
            </Field>
          )}
          {c.legacyReportUrl && (
            <Field label="Report cũ">
              <ExtLink href={c.legacyReportUrl}>Mở</ExtLink>
            </Field>
          )}
          <Field label="Tạo / sửa">
            <span className="text-xs text-muted-foreground">
              {c.createdBy ?? "—"} · {viDateTime(c.createdAt)}
              {c.updatedBy && ` · sửa bởi ${c.updatedBy} ${viDateTime(c.updatedAt)}`}
            </span>
          </Field>
        </dl>
      </Card>

      {c.conclusion && (
        <Card title="Kết luận" className="lg:col-span-2">
          <p className="whitespace-pre-wrap text-sm">{c.conclusion}</p>
        </Card>
      )}
    </div>
  );
}

type Dialog = null | "initiate" | "cancel" | "delete" | "finish";

export default function TestGameDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [decision, setDecision] = useState("");
  const [conclusion, setConclusion] = useState("");

  const key = ["testgame-campaign", id];
  const meta = useQuery({ queryKey: ["testgame-meta"], queryFn: testGameAdminApi.meta, staleTime: 60_000 });
  const q = useQuery({
    queryKey: key,
    queryFn: () => testGameAdminApi.campaign(id),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.assignments.some((a) => a.aiStatus === "queued" || a.aiStatus === "running") ? 5000 : false),
  });
  const c = q.data;

  const tabParam = params.get("tab") ?? "overview";
  const tab = c?.noTest && (tabParam === "report" || tabParam === "testers" || tabParam === "mail") ? "overview" : tabParam;
  const setTab = (t: string) => {
    const next = new URLSearchParams(params);
    if (t === "overview") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };

  const onChanged = (d: CampaignDetail) => {
    queryClient.setQueryData(key, d);
    void queryClient.invalidateQueries({ queryKey: ["testgame-campaigns"] });
  };
  const refresh = () => void q.refetch();

  const act = async (fn: () => Promise<CampaignDetail>, done: string) => {
    setBusy(true);
    setIssues([]);
    try {
      onChanged(await fn());
      toast.success(done);
      setDialog(null);
    } catch (err) {
      if (err instanceof TesterApiError && err.issues.length > 0) setIssues(err.issues);
      toast.error(err instanceof Error ? err.message : "Thao tác lỗi");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await testGameAdminApi.deleteCampaign(id);
      void queryClient.invalidateQueries({ queryKey: ["testgame-campaigns"] });
      toast.success("Đã xoá game test");
      navigate("/admin/test-campaigns");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xoá lỗi");
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!c)
    return (
      <div className="space-y-3 py-16 text-center text-sm text-muted-foreground">
        <p>{q.error instanceof Error ? q.error.message : "Không tìm thấy game test"}</p>
        <Link to="/admin/test-campaigns" className="text-primary hover:underline">
          Về danh sách
        </Link>
      </div>
    );

  const added = c.assignments.filter((a) => a.status === "added").length;
  const failedMails = Object.values(c.mails).reduce((s, m) => s + m.failed, 0);
  const canDelete = ["pending", "cancelled", "done"].includes(c.status);
  const canCancel = !["done", "cancelled"].includes(c.status);
  const openFinish = () => {
    setDecision(c.decision ?? "");
    setConclusion(c.conclusion ?? "");
    setDialog("finish");
  };

  return (
    <div className="space-y-4">
      <Link to="/admin/test-campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách game test
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        {c.iconUrl ? (
          <img src={c.iconUrl} alt="" className="h-14 w-14 rounded-xl border border-border object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
            <Gamepad2 className="h-6 w-6 text-muted-foreground" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{c.gameName}</h2>
            {c.testRound > 1 && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Lần {c.testRound}</span>}
            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", CAMPAIGN_STATUS_CLASS[c.status])} title={CAMPAIGN_STATUS_HINT[c.status]}>
              {CAMPAIGN_STATUS_LABEL[c.status]}
            </span>
            {c.decision && <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", DECISION_CLASS[c.decision])}>{DECISION_LABEL[c.decision]}</span>}
            {c.noTest && <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">Không test</span>}
          </div>
          {c.originalName && c.originalName !== c.gameName && <p className="text-sm text-muted-foreground">{c.originalName}</p>}
          {!c.noTest && c.status !== "cancelled" && <Stepper status={c.status} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {c.status === "pending" && !c.noTest && (
            <button
              type="button"
              onClick={() => {
                setIssues([]);
                setDialog("initiate");
              }}
              className={cn(btnPrimary, "px-4 py-2")}
            >
              <Play className="h-4 w-4" /> Initiate
            </button>
          )}
          {c.noTest && c.status !== "done" && c.status !== "cancelled" && (
            <button type="button" onClick={openFinish} className={cn(btnPrimary, "px-4 py-2")}>
              <Check className="h-4 w-4" /> Chốt & chuyển Done
            </button>
          )}
          {c.status !== "cancelled" && (
            <button type="button" onClick={() => setEditing(true)} className={cn(btnGhost, "px-3 py-2")}>
              <Pencil className="h-4 w-4" /> Sửa
            </button>
          )}
          {c.status === "cancelled" && (
            <button type="button" disabled={busy} onClick={() => void act(() => testGameAdminApi.reopen(id), "Đã mở lại game test")} className={cn(btnGhost, "px-3 py-2")}>
              <RotateCcw className="h-4 w-4" /> Mở lại
            </button>
          )}
          {canCancel && (
            <button type="button" onClick={() => setDialog("cancel")} className={cn(btnGhost, "px-3 py-2")}>
              <Ban className="h-4 w-4" /> Huỷ
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={() => setDialog("delete")} className={cn(btnGhost, "px-3 py-2 text-destructive")}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <NextStep
        c={c}
        onTab={setTab}
        onEdit={() => setEditing(true)}
        onInitiate={() => {
          setIssues([]);
          setDialog("initiate");
        }}
        onFinish={openFinish}
        onReopen={() => void act(() => testGameAdminApi.reopen(id), "Đã mở lại game test")}
      />

      <Tabs
        tabs={[
          { id: "overview", label: "Tổng quan" },
          ...(c.noTest
            ? []
            : [
                { id: "testers", label: "Tester", badge: c.counts.pendingReview || c.counts.total },
                { id: "mail", label: failedMails > 0 ? <span className="text-destructive">Mail ({failedMails} lỗi)</span> : "Mail" },
                { id: "report", label: "Report" },
              ]),
          { id: "audit", label: "Nhật ký" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && <Overview c={c} meta={meta.data} onRefresh={refresh} onChanged={onChanged} />}
      {tab === "testers" && <TesterTab campaign={c} onChanged={onChanged} />}
      {tab === "mail" && <MailTab campaign={c} onChanged={onChanged} />}
      {tab === "report" && <ReportTab campaignId={c.id} campaignStatus={c.status} />}
      {tab === "audit" && <AuditTab campaignId={c.id} />}

      {editing && <CampaignFormDrawer campaign={c} onClose={() => setEditing(false)} onSaved={(d) => { onChanged(d); setEditing(false); }} />}

      <Modal
        open={dialog === "initiate"}
        onClose={() => setDialog(null)}
        title="Initiate game test?"
        description="Sau khi Initiate, template questionnaire được chốt và lời mời được gửi ngay."
        footer={
          <ModalFooterActions
            onCancel={() => setDialog(null)}
            onSubmit={() => void act(() => testGameAdminApi.initiate(id), `Đã Initiate — đang gửi lời mời cho ${added} tester`)}
            cancelLabel="Để sau"
            submitLabel="Initiate"
            submitting={busy}
            submitDisabled={c.initiateIssues.length > 0}
          />
        }
      >
        <div className="space-y-3 text-sm">
          {(issues.length > 0 ? issues : c.initiateIssues).length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              <p className="font-medium">Còn thiếu:</p>
              <ul className="mt-1 list-inside list-disc">
                {(issues.length > 0 ? issues : c.initiateIssues).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <ul className="space-y-1.5">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 text-emerald-600" /> Gửi lời mời (M1) cho <b>{added}</b> tester; người chưa phản hồi được nhắc (M2).
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 text-emerald-600" /> Chốt questionnaire <b>{c.template ? `${c.template.name} v${c.template.version}` : "—"}</b> — sửa template sau không ảnh hưởng game test này.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 text-emerald-600" /> Test từ <b>{viDate(c.startDate)}</b> đến <b>{viDate(c.endDate)}</b>, hạn report {viDate(c.reportDeadline)}.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 text-emerald-600" /> Báo nhóm SeaTalk vận hành.
            </li>
            {!c.apkFolderUrl && !c.installUrl && (
              <li className="flex gap-2 text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4" /> Chưa có folder Drive / link cài — tester sẽ chỉ thấy hướng dẫn và ghi chú.
              </li>
            )}
          </ul>
        </div>
      </Modal>

      <Modal
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        title="Huỷ game test?"
        description="Mail tự động dừng; tester thấy game test đã huỷ. Có thể mở lại sau."
        footer={
          <ModalFooterActions onCancel={() => setDialog(null)} onSubmit={() => void act(() => testGameAdminApi.cancel(id), "Đã huỷ game test")} cancelLabel="Không" submitLabel="Huỷ game test" submitting={busy} />
        }
      >
        <p className="text-sm text-muted-foreground">Bài đã nộp và giờ đã duyệt vẫn được giữ.</p>
      </Modal>

      <Modal
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title="Xoá game test?"
        description={`${c.gameName}${c.testRound > 1 ? ` (lần ${c.testRound})` : ""} cùng toàn bộ tester, bài nộp, ảnh và report sẽ bị xoá vĩnh viễn.`}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDialog(null)} className={cn(btnGhost, "px-4 py-2")}>
              Huỷ
            </button>
            <button type="button" disabled={busy} onClick={() => void remove()} className={cn(btnDanger, "px-4 py-2")}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Xoá vĩnh viễn
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {c.counts.approved > 0 ? `${c.counts.approved} tester đã được duyệt — giờ và benefit của họ từ game này sẽ mất. ` : ""}Thao tác không hoàn tác được.
        </p>
      </Modal>

      <Modal
        open={dialog === "finish"}
        onClose={() => setDialog(null)}
        title="Chốt game không test"
        footer={
          <ModalFooterActions
            onCancel={() => setDialog(null)}
            onSubmit={() => void act(() => testGameAdminApi.finishNoTest(id, { decision: decision || null, conclusion: conclusion.trim() || null }), "Đã chuyển Done")}
            cancelLabel="Huỷ"
            submitLabel="Chuyển Done"
            submitting={busy}
          />
        }
      >
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="font-medium">Quyết định</span>
            <select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2">
              <option value="">(Chưa có quyết định)</option>
              {(meta.data?.decisions ?? []).map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-medium">Kết luận</span>
            <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
        </div>
      </Modal>
    </div>
  );
}
