import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, ExternalLink, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnDanger, btnGhost, btnSuccess } from "@/lib/button-classes";
import { testFileUrl, testGameAdminApi } from "../api";
import {
  AI_VERDICT_CLASS,
  AI_VERDICT_LABEL,
  ASSIGNMENT_STATUS_CLASS,
  ASSIGNMENT_STATUS_LABEL,
  REVIEW_STATUS_CLASS,
  REVIEW_STATUS_LABEL,
  viDateTime,
} from "../labels";
import type { AnswerValue, CampaignAssignment, CampaignDetail, EvidenceDuplicate, EvidenceReview, TemplateQuestion } from "../types";

const DUP_KIND: Record<EvidenceDuplicate["kind"], string> = { exact: "Trùng hệt tệp", identical: "Giống hệt ảnh", similar: "Ảnh tương tự" };
const DUP_SCOPE: Record<EvidenceDuplicate["scope"], string> = {
  same_test_other_tester: "tester khác cùng đợt",
  own_old_test: "ảnh cũ của chính tester",
  other_test: "đợt test khác",
};

function isReview(x: CampaignAssignment["aiReview"]): x is EvidenceReview {
  return Boolean(x && "verdict" in x);
}

function answerText(q: TemplateQuestion, v: AnswerValue): string {
  if (v == null || (Array.isArray(v) && v.length === 0)) return "—";
  if (q.type === "yes_no") return v === "yes" ? "Có" : "Không";
  if (q.type === "scale") return `${v}/${q.scaleMax ?? 5}`;
  return Array.isArray(v) ? v.join(", ") : String(v);
}

function CheckIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === "warn") return <CircleAlert className="h-4 w-4 shrink-0 text-amber-600" />;
  return <XCircle className="h-4 w-4 shrink-0 text-rose-600" />;
}

function AiPanel({ a, onRerun, rerunning }: { a: CampaignAssignment; onRerun: () => void; rerunning: boolean }) {
  const r = a.aiReview;
  if (a.aiStatus === "queued" || a.aiStatus === "running") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        AI đang kiểm tra ảnh bằng chứng (so trùng ảnh, đọc UID / level, đối chiếu tiến độ với số giờ)…
      </div>
    );
  }
  if (!r || !isReview(r)) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        {a.aiStatus === "failed" ? `AI kiểm tra lỗi: ${(r as { error?: string } | null)?.error ?? "không rõ"}` : "Chưa có kết quả AI."}
        <button type="button" disabled={rerunning} onClick={onRerun} className={cn(btnGhost, "ml-auto px-2.5 py-1 text-xs")}>
          <RefreshCw className={cn("h-3.5 w-3.5", rerunning && "animate-spin")} /> Chạy AI
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", AI_VERDICT_CLASS[r.verdict])}>
          <ShieldCheck className="h-3.5 w-3.5" /> {AI_VERDICT_LABEL[r.verdict]}
        </span>
        <span className="text-xs text-muted-foreground">Độ tin cậy {Math.round(r.confidence * 100)}%</span>
        <button type="button" disabled={rerunning} onClick={onRerun} className={cn(btnGhost, "ml-auto px-2.5 py-1 text-xs")}>
          <RefreshCw className={cn("h-3.5 w-3.5", rerunning && "animate-spin")} /> Chạy lại
        </button>
      </div>
      {r.summary && <p className="text-sm">{r.summary}</p>}
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          ["UID đọc được", r.uid],
          ["Level / tiến trình", [r.level, r.progress].filter(Boolean).join(" · ") || null],
          ["Tester khai", [r.claimedHours != null ? `${r.claimedHours} giờ` : null, r.claimedLevel].filter(Boolean).join(" · ") || null],
          ["Yêu cầu", `${r.requiredHours} giờ`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-muted/40 px-2.5 py-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 font-medium">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
      {r.checks.length > 0 && (
        <ul className="space-y-1.5">
          {r.checks.map((c) => (
            <li key={c.key} className="flex gap-2 text-sm">
              <CheckIcon status={c.status} />
              <span>
                <span className="font-medium">{c.label}</span>
                {c.note && <span className="text-muted-foreground"> — {c.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {r.duplicates.length > 0 && (
        <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Ảnh trùng</p>
          {r.duplicates.map((d) => (
            <div key={`${d.fileId}-${d.matchFileId}`} className="flex items-center gap-3 text-xs">
              <a href={testFileUrl(d.fileId)} target="_blank" rel="noreferrer">
                <img src={testFileUrl(d.fileId)} alt="" className="h-12 w-12 rounded object-cover" />
              </a>
              <span>≈</span>
              <a href={testFileUrl(d.matchFileId)} target="_blank" rel="noreferrer">
                <img src={testFileUrl(d.matchFileId)} alt="" className="h-12 w-12 rounded object-cover" />
              </a>
              <span>
                <b>{DUP_KIND[d.kind]}</b> với {DUP_SCOPE[d.scope]}: {d.email} ({d.gameName})
                {d.sameScreenshot === false && <span className="text-muted-foreground"> — AI xác nhận không phải cùng ảnh</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {r.research && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            Tiến độ kỳ vọng tra trên web {r.research.grounded ? "" : "(không có nguồn — chỉ tham khảo)"}
          </summary>
          <p className="mt-1 whitespace-pre-line">{r.research.brief}</p>
          {r.research.sources.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {r.research.sources.slice(0, 6).map((s) => (
                <li key={s}>
                  <a href={s} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
      <p className="text-[11px] text-muted-foreground">
        {r.model} · {viDateTime(r.at)} · AI chỉ đề xuất, Admin quyết định.
      </p>
    </div>
  );
}

export default function ReviewDrawer({
  campaign,
  assignment: a,
  onClose,
  onChanged,
  onNavigate,
}: {
  campaign: CampaignDetail;
  assignment: CampaignAssignment;
  onClose: () => void;
  onChanged: (c: CampaignDetail) => void;
  /** Chuyển sang bài chờ duyệt trước / sau (null = không có). */
  onNavigate: { prev: (() => void) | null; next: (() => void) | null };
}) {
  const toast = useToast();
  const [note, setNote] = useState(a.reviewNote ?? "");
  const [hours, setHours] = useState(String(a.workloadHours));
  const [busy, setBusy] = useState<string | null>(null);
  const questions = campaign.template?.questions ?? [];
  const answers = a.answers ?? {};
  const footageLinks = questions.filter((q) => q.key === "footage").flatMap((q) => (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : []));
  const submitted = a.status === "submitted";

  const run = async (key: string, fn: () => Promise<CampaignDetail>, done: string, goNext = false) => {
    setBusy(key);
    try {
      onChanged(await fn());
      toast.success(done);
      if (goNext && onNavigate.next) onNavigate.next();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác lỗi");
    } finally {
      setBusy(null);
    }
  };

  const hoursValue = hours.trim() === "" ? null : Number(hours);
  const approve = (goNext: boolean) =>
    run("approve", () => testGameAdminApi.review(a.id, { decision: "approve", note: note.trim() || undefined, workloadHours: hoursValue }), "Đã duyệt — giờ test được cộng vào hồ sơ", goNext);
  const reject = () => {
    if (!note.trim()) {
      toast.error("Nhập lý do không duyệt (tester sẽ thấy để nộp lại)");
      return;
    }
    void run("reject", () => testGameAdminApi.review(a.id, { decision: "reject", note: note.trim() }), "Đã đánh dấu không duyệt");
  };

  return (
    <Drawer
      open
      onClose={onClose}
      size="full"
      title={a.name ?? a.email}
      subtitle={`${a.email} · ${campaign.gameName}`}
      footer={
        submitted ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <label className="space-y-1 text-xs">
                <span className="font-medium">Giờ được tính</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="font-medium">Ghi chú / lý do (bắt buộc khi không duyệt — tester sẽ thấy)</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="vd: Ảnh không thấy UID, vui lòng chụp lại màn hình hồ sơ nhân vật"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={!onNavigate.prev} onClick={() => onNavigate.prev?.()} className={cn(btnGhost, "px-2.5 py-2")} title="Bài trước">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" disabled={!onNavigate.next} onClick={() => onNavigate.next?.()} className={cn(btnGhost, "px-2.5 py-2")} title="Bài sau">
                <ChevronRight className="h-4 w-4" />
              </button>
              {a.reviewStatus && a.reviewStatus !== "pending" && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void run("reset", () => testGameAdminApi.review(a.id, { decision: "reset" }), "Đã đặt lại về Chờ duyệt")}
                  className={cn(btnGhost, "px-3 py-2")}
                >
                  Đặt lại
                </button>
              )}
              <div className="ml-auto flex flex-wrap gap-2">
                <button type="button" disabled={Boolean(busy)} onClick={reject} className={cn(btnDanger, "px-4 py-2")}>
                  {busy === "reject" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Không duyệt
                </button>
                <button type="button" disabled={Boolean(busy)} onClick={() => void approve(false)} className={cn(btnSuccess, "px-4 py-2")}>
                  {busy === "approve" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Duyệt hoàn thành
                </button>
                {onNavigate.next && (
                  <button type="button" disabled={Boolean(busy)} onClick={() => void approve(true)} className={cn(btnSuccess, "px-4 py-2")}>
                    Duyệt & bài tiếp <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={cn("rounded-full px-2 py-0.5 font-medium", ASSIGNMENT_STATUS_CLASS[a.status])}>{ASSIGNMENT_STATUS_LABEL[a.status]}</span>
          {a.reviewStatus && <span className={cn("rounded-full px-2 py-0.5 font-medium", REVIEW_STATUS_CLASS[a.reviewStatus])}>{REVIEW_STATUS_LABEL[a.reviewStatus]}</span>}
          {a.submittedAt && <span className="text-muted-foreground">Nộp {viDateTime(a.submittedAt)}</span>}
          {a.reviewedAt && (
            <span className="text-muted-foreground">
              · Duyệt bởi {a.reviewedBy} lúc {viDateTime(a.reviewedAt)}
            </span>
          )}
          {a.completed && <span className="font-medium text-emerald-700">· Đã cộng {a.workloadHours} giờ</span>}
        </div>
        {a.reviewNote && (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Ghi chú duyệt: </span>
            {a.reviewNote}
          </p>
        )}

        {submitted && (
          <AiPanel
            a={a}
            rerunning={busy === "ai"}
            onRerun={() => void run("ai", () => testGameAdminApi.rerunAiReview(a.id), "Đã xếp hàng kiểm tra lại bằng AI")}
          />
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Ảnh bằng chứng ({a.evidence.length})</h3>
          {a.evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có ảnh.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {a.evidence.map((f) => (
                <a key={f.id} href={testFileUrl(f.id)} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-lg border border-border bg-muted">
                  <img src={testFileUrl(f.id)} alt={f.fileName} className="aspect-[4/3] w-full object-contain transition-transform group-hover:scale-[1.02]" />
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    <ExternalLink className="inline h-3 w-3" /> Mở
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>

        {(a.footage.length > 0 || footageLinks.length > 0) && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Footage</h3>
            <ul className="space-y-1 text-sm">
              {a.footage.map((f) => (
                <li key={f.id}>
                  <a href={testFileUrl(f.id)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {f.fileName}
                  </a>
                </li>
              ))}
              {footageLinks.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {a.whitelistInfo && (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold">Thông tin whitelist</h3>
            <p className="whitespace-pre-line rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs">{a.whitelistInfo}</p>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Câu trả lời {a.status === "in_test" && <span className="font-normal text-muted-foreground">(bản nháp, chưa nộp)</span>}</h3>
          {!a.answers ? (
            <p className="text-sm text-muted-foreground">Chưa có câu trả lời.</p>
          ) : (
            <dl className="divide-y divide-border rounded-lg border border-border text-sm">
              {questions
                .filter((q) => q.type !== "file")
                .map((q) => (
                  <div key={q.id} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <dt className="text-muted-foreground">
                      <span className="font-mono text-xs">{q.code}</span> {q.text}
                      {q.tag && <span className="ml-1 rounded bg-muted px-1 text-[10px]">{q.tag}</span>}
                    </dt>
                    <dd className={cn("whitespace-pre-line", answers[q.id] == null && "text-muted-foreground")}>{answerText(q, answers[q.id] ?? null)}</dd>
                  </div>
                ))}
            </dl>
          )}
        </section>
      </div>
    </Drawer>
  );
}
