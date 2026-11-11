import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  Loader2,
  Mail,
  MoreHorizontal,
  Send,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnGhost, btnPrimary, btnSubtle, btnSuccess } from "@/lib/button-classes";
import { testFileUrl, testGameAdminApi } from "../api";
import {
  AI_VERDICT_CLASS,
  AI_VERDICT_LABEL,
  ASSIGNMENT_STATUS_CLASS,
  ASSIGNMENT_STATUS_LABEL,
  MAIL_LABEL,
  REVIEW_STATUS_CLASS,
  REVIEW_STATUS_LABEL,
  TESTER_TYPE_LABEL,
  viDateTime,
} from "../labels";
import type { CampaignAssignment, CampaignDetail, EmailPreview, EvidenceReview } from "../types";
import ReviewDrawer from "./ReviewDrawer";

type Group = "all" | "review" | "waiting" | "testing" | "approved" | "out";

const GROUPS: Array<{ key: Group; label: string; match: (a: CampaignAssignment) => boolean }> = [
  { key: "all", label: "Tất cả", match: () => true },
  { key: "review", label: "Chờ duyệt", match: (a) => a.status === "submitted" && a.reviewStatus === "pending" },
  { key: "waiting", label: "Chưa phản hồi", match: (a) => a.status === "added" || a.status === "invited" },
  { key: "testing", label: "Đang test", match: (a) => a.status === "confirmed" || a.status === "in_test" },
  { key: "approved", label: "Đã duyệt", match: (a) => a.completed },
  { key: "out", label: "Rút / không duyệt", match: (a) => a.status === "declined" || a.status === "no_response" || a.reviewStatus === "rejected" },
];

function verdictOf(a: CampaignAssignment): EvidenceReview["verdict"] | null {
  return a.aiReview && "verdict" in a.aiReview ? a.aiReview.verdict : null;
}

function AddEmails({ campaign, onDone }: { campaign: CampaignDetail; onDone: (c: CampaignDetail) => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [adding, setAdding] = useState(false);
  const canInvite = Boolean(campaign.initiatedAt) && (campaign.status === "inviting" || campaign.status === "testing");
  const [invite, setInvite] = useState(canInvite);

  const check = async () => {
    setChecking(true);
    try {
      setPreview(await testGameAdminApi.previewEmails(campaign.id, text));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không kiểm tra được");
    } finally {
      setChecking(false);
    }
  };

  const fresh = preview?.rows.filter((r) => !r.exists) ?? [];
  const add = async () => {
    setAdding(true);
    try {
      const r = await testGameAdminApi.addTesters(campaign.id, { emails: fresh.map((x) => x.email), invite: canInvite && invite });
      toast.success(`Đã thêm ${r.added} tester${canInvite && invite ? " và gửi lời mời" : ""}`);
      setText("");
      setPreview(null);
      onDone(r.detail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thêm được");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
        placeholder={"Dán danh sách email (mỗi dòng một email, hoặc cách nhau bằng dấu phẩy / chấm phẩy)\nvd: an.nguyen@garena.vn, binh.tran@garena.vn"}
        className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
      />
      {preview && (
        <div className="space-y-2 text-sm">
          {(preview.invalid.length > 0 || preview.duplicates.length > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {preview.invalid.length > 0 && <p>Email sai định dạng (bỏ qua): {preview.invalid.join(", ")}</p>}
              {preview.duplicates.length > 0 && <p>Trùng trong danh sách: {preview.duplicates.join(", ")}</p>}
            </div>
          )}
          <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {preview.rows.map((r) => (
              <li key={r.email} className={cn("flex flex-wrap items-center gap-2 px-3 py-2 text-xs", r.exists && "opacity-50")}>
                <span className="font-mono">{r.email}</span>
                {r.name && <span className="text-muted-foreground">{r.name}</span>}
                {r.testerType && <span className="rounded bg-muted px-1.5 py-0.5">{TESTER_TYPE_LABEL[r.testerType] ?? r.testerType}</span>}
                {!r.hasAccount && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">chưa có tài khoản — đăng nhập bằng email này khi nhận mail</span>}
                {r.hasAccount && !r.hasProfile && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600">chưa làm khảo sát tester</span>}
                {r.securityWarning && (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">
                    <AlertTriangle className="h-3 w-3" /> {r.securityWarning}
                  </span>
                )}
                {r.exists && <span className="ml-auto text-muted-foreground">đã có trong game test</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {canInvite && (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} /> Gửi lời mời (M1) ngay
          </label>
        )}
        <div className="ml-auto flex gap-2">
          {!preview ? (
            <button type="button" disabled={!text.trim() || checking} onClick={() => void check()} className={cn(btnPrimary, "px-4 py-2")}>
              {checking && <Loader2 className="h-4 w-4 animate-spin" />} Kiểm tra danh sách
            </button>
          ) : (
            <button type="button" disabled={fresh.length === 0 || adding} onClick={() => void add()} className={cn(btnPrimary, "px-4 py-2")}>
              {adding && <Loader2 className="h-4 w-4 animate-spin" />} Thêm {fresh.length} tester
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Recommendations({ campaign, onDone }: { campaign: CampaignDetail; onDone: (c: CampaignDetail) => void }) {
  const toast = useToast();
  const [platformFilter, setPlatformFilter] = useState(true);
  const [securityFilter, setSecurityFilter] = useState(true);
  const [limit, setLimit] = useState(15);
  const [picked, setPicked] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const rec = useQuery({
    queryKey: ["testgame-recommend", campaign.id, platformFilter, securityFilter, limit, campaign.assignments.length],
    queryFn: () => testGameAdminApi.recommend(campaign.id, { limit, platformFilter, securityFilter }),
    retry: false,
  });
  const canInvite = Boolean(campaign.initiatedAt) && (campaign.status === "inviting" || campaign.status === "testing");

  const add = async () => {
    setAdding(true);
    try {
      const r = await testGameAdminApi.addTesters(campaign.id, { userIds: picked, invite: canInvite });
      toast.success(`Đã thêm ${r.added} tester${canInvite ? " và gửi lời mời" : ""}`);
      setPicked([]);
      onDone(r.detail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thêm được");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={platformFilter} onChange={(e) => setPlatformFilter(e.target.checked)} /> Đúng platform
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={securityFilter} onChange={(e) => setSecurityFilter(e.target.checked)} /> Theo mức bảo mật ({campaign.securityLevel})
        </label>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded border border-border bg-background px-2 py-1">
          {[10, 15, 25, 50].map((n) => (
            <option key={n} value={n}>
              Top {n}
            </option>
          ))}
        </select>
      </div>
      {rec.isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : rec.error ? (
        <p className="text-sm text-muted-foreground">{rec.error instanceof Error ? rec.error.message : "Không gợi ý được"}</p>
      ) : (rec.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có tester phù hợp với bộ lọc.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {rec.data!.map((r) => (
            <li key={r.userId}>
              <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40", r.assigned && "cursor-default opacity-50")}>
                <input
                  type="checkbox"
                  disabled={r.assigned}
                  checked={r.assigned || picked.includes(r.userId)}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, r.userId] : p.filter((x) => x !== r.userId)))}
                />
                <span className="w-10 text-right font-semibold tabular-nums">{r.score}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-medium">
                    {r.name}
                    {r.favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[r.email, TESTER_TYPE_LABEL[r.testerType] ?? r.testerType, r.platforms.join("/"), r.testTimeLabel, `${r.completedHours} giờ đã test`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {r.busyWith.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800" title={r.busyWith.join(", ")}>
                    <Clock className="h-3 w-3" /> Bận {r.busyWith.length} game
                  </span>
                )}
                {r.assigned && <span className="text-[11px] text-muted-foreground">đã thêm</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button type="button" disabled={picked.length === 0 || adding} onClick={() => void add()} className={cn(btnPrimary, "px-4 py-2")}>
          {adding && <Loader2 className="h-4 w-4 animate-spin" />} Thêm {picked.length || ""} tester đã chọn
        </button>
      </div>
    </div>
  );
}

function RowMenu({ a, campaign, onChanged }: { a: CampaignAssignment; campaign: CampaignDetail; onChanged: (c: CampaignDetail) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState<null | "menu" | "email" | "status" | "note" | "remove">(null);
  const [email, setEmail] = useState(a.email);
  const [note, setNote] = useState(a.note ?? "");
  const [status, setStatus] = useState<"confirmed" | "declined" | "no_response" | "in_test">("confirmed");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<CampaignDetail>, done: string) => {
    setBusy(true);
    try {
      onChanged(await fn());
      toast.success(done);
      setOpen(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác lỗi");
    } finally {
      setBusy(false);
    }
  };

  const resendCodes = a.status === "added" ? [] : a.status === "invited" || a.status === "no_response" ? ["M1", "M2"] : ["M1", "M3", "M4", "M5", "M6", "M7"];
  const item = "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted";

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(open === "menu" ? null : "menu")} className={cn(btnGhost, "px-2 py-1")} aria-label="Thao tác">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open === "menu" && (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Đóng" onClick={() => setOpen(null)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
            {resendCodes.length > 0 && campaign.status !== "cancelled" && (
              <>
                <p className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Gửi lại mail</p>
                {resendCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    disabled={busy}
                    className={item}
                    onClick={() => void run(() => testGameAdminApi.resendMail(a.id, code), `Đã gửi lại ${code}`)}
                  >
                    <Mail className="h-3.5 w-3.5" /> {code} · {MAIL_LABEL[code]}
                  </button>
                ))}
                <div className="my-1 border-t border-border" />
              </>
            )}
            {["added", "invited", "no_response"].includes(a.status) && (
              <button type="button" className={item} onClick={() => setOpen("email")}>
                Sửa email
              </button>
            )}
            {a.status !== "submitted" && a.status !== "added" && (
              <button type="button" className={item} onClick={() => setOpen("status")}>
                Đổi trạng thái thủ công
              </button>
            )}
            <button type="button" className={item} onClick={() => setOpen("note")}>
              Ghi chú
            </button>
            <button type="button" className={cn(item, "text-destructive")} onClick={() => setOpen("remove")}>
              <Trash2 className="h-3.5 w-3.5" /> Xoá khỏi game test
            </button>
          </div>
        </>
      )}
      <Modal
        open={open === "email"}
        onClose={() => setOpen(null)}
        title="Sửa email tester"
        description={a.status === "added" ? undefined : "Email mới sẽ nhận lại lời mời (M1)."}
        footer={
          <ModalFooterActions
            onCancel={() => setOpen(null)}
            onSubmit={() => void run(() => testGameAdminApi.updateAssignment(a.id, { email }), "Đã đổi email")}
            cancelLabel="Huỷ"
            submitLabel="Lưu"
            submitting={busy}
          />
        }
      >
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </Modal>
      <Modal
        open={open === "status"}
        onClose={() => setOpen(null)}
        title="Đổi trạng thái thủ công"
        description="Dùng khi tester phản hồi ngoài hệ thống (chat, gọi điện)."
        footer={
          <ModalFooterActions
            onCancel={() => setOpen(null)}
            onSubmit={() => void run(() => testGameAdminApi.updateAssignment(a.id, { status }), "Đã đổi trạng thái")}
            cancelLabel="Huỷ"
            submitLabel="Lưu"
            submitting={busy}
          />
        }
      >
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="confirmed">Đã xác nhận</option>
          <option value="in_test">Đang test</option>
          <option value="declined">Từ chối</option>
          <option value="no_response">Không phản hồi</option>
        </select>
      </Modal>
      <Modal
        open={open === "note"}
        onClose={() => setOpen(null)}
        title="Ghi chú tester"
        footer={
          <ModalFooterActions
            onCancel={() => setOpen(null)}
            onSubmit={() => void run(() => testGameAdminApi.updateAssignment(a.id, { note: note.trim() || null }), "Đã lưu ghi chú")}
            cancelLabel="Huỷ"
            submitLabel="Lưu"
            submitting={busy}
          />
        }
      >
        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </Modal>
      <Modal
        open={open === "remove"}
        onClose={() => setOpen(null)}
        title="Xoá tester khỏi game test?"
        description={`${a.email} — câu trả lời và ảnh đã nộp (nếu có) cũng bị xoá.`}
        footer={
          <ModalFooterActions
            onCancel={() => setOpen(null)}
            onSubmit={() => void run(() => testGameAdminApi.removeAssignment(a.id), "Đã xoá tester")}
            cancelLabel="Huỷ"
            submitLabel="Xoá"
            submitting={busy}
          />
        }
      >
        <p className="text-sm text-muted-foreground">Thao tác không hoàn tác được.</p>
      </Modal>
    </div>
  );
}

export default function TesterTab({ campaign, onChanged }: { campaign: CampaignDetail; onChanged: (c: CampaignDetail) => void }) {
  const toast = useToast();
  const [group, setGroup] = useState<Group>("all");
  const [panel, setPanel] = useState<null | "emails" | "recommend">(campaign.assignments.length === 0 ? "recommend" : null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => campaign.assignments.filter(GROUPS.find((g) => g.key === group)!.match), [campaign.assignments, group]);
  const added = campaign.assignments.filter((a) => a.status === "added").length;
  const aiApprove = campaign.assignments.filter((a) => a.status === "submitted" && a.reviewStatus === "pending" && a.aiStatus === "done" && verdictOf(a) === "approve").length;
  const reviewQueue = campaign.assignments.filter((a) => a.status === "submitted" && a.reviewStatus === "pending");
  const reviewing = campaign.assignments.find((a) => a.id === reviewId) ?? null;
  const canAdd = !["reporting", "done", "cancelled"].includes(campaign.status);
  const canInviteAdded = Boolean(campaign.initiatedAt) && (campaign.status === "inviting" || campaign.status === "testing") && added > 0;

  const nav = (() => {
    if (!reviewing) return { prev: null, next: null };
    const list = reviewQueue.some((a) => a.id === reviewing.id) ? reviewQueue : rows;
    const i = list.findIndex((a) => a.id === reviewing.id);
    const prev = i > 0 ? list[i - 1] : null;
    const next = list.slice(i + 1).find((a) => a.status === "submitted") ?? (list === reviewQueue ? reviewQueue.find((a) => a.id !== reviewing.id) : null) ?? null;
    return { prev: prev ? () => setReviewId(prev.id) : null, next: next ? () => setReviewId(next.id) : null };
  })();

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canAdd && (
          <>
            <button type="button" onClick={() => setPanel(panel === "recommend" ? null : "recommend")} className={cn(panel === "recommend" ? btnSubtle : btnGhost, "px-3 py-2")}>
              <Sparkles className="h-4 w-4" /> Gợi ý tester
            </button>
            <button type="button" onClick={() => setPanel(panel === "emails" ? null : "emails")} className={cn(panel === "emails" ? btnSubtle : btnGhost, "px-3 py-2")}>
              <UserPlus className="h-4 w-4" /> Thêm theo email
            </button>
          </>
        )}
        {canInviteAdded && (
          <button
            type="button"
            disabled={busy === "invite"}
            onClick={() => void run("invite", () => testGameAdminApi.inviteAdded(campaign.id), `Đang gửi lời mời cho ${added} tester`)}
            className={cn(btnPrimary, "px-3 py-2")}
          >
            {busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gửi mời {added} tester mới
          </button>
        )}
        {aiApprove > 0 && (
          <button
            type="button"
            disabled={busy === "bulk"}
            onClick={() =>
              void run(
                "bulk",
                async () => {
                  const r = await testGameAdminApi.approveRecommended(campaign.id);
                  return r.detail;
                },
                `Đã duyệt ${aiApprove} bài theo đề xuất AI`,
              )
            }
            className={cn(btnSuccess, "px-3 py-2")}
            title="Chỉ duyệt các bài AI đề xuất duyệt (không trùng ảnh, đọc được UID / level, tiến độ khớp số giờ)"
          >
            {busy === "bulk" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />} Duyệt {aiApprove} bài AI đề xuất
          </button>
        )}
        {reviewQueue.length > 0 && (
          <button type="button" onClick={() => setReviewId(reviewQueue[0].id)} className={cn(btnGhost, "px-3 py-2")}>
            Duyệt lần lượt ({reviewQueue.length})
          </button>
        )}
      </div>

      {panel && canAdd && (
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          {panel === "emails" ? (
            <AddEmails campaign={campaign} onDone={onChanged} />
          ) : (
            <Recommendations campaign={campaign} onDone={onChanged} />
          )}
          {!campaign.initiatedAt && (
            <p className="mt-3 text-xs text-muted-foreground">Tester mới thêm ở trạng thái “Chưa mời”; lời mời M1 được gửi khi bấm Initiate.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {GROUPS.map((g) => {
          const n = campaign.assignments.filter(g.match).length;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setGroup(g.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                group === g.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
                g.key === "review" && n > 0 && group !== g.key && "border-amber-300 text-amber-800",
              )}
            >
              {g.label} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {campaign.assignments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-sm text-muted-foreground">
          <Users className="h-6 w-6" />
          Chưa có tester. Dùng “Gợi ý tester” hoặc dán danh sách email.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {["Tester", "Trạng thái", "Bài nộp", "AI", "Duyệt", "Giờ", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((a) => {
                  const verdict = verdictOf(a);
                  const failedMail = a.mails.filter((m) => m.status === "failed" && m.trigger !== "test");
                  return (
                    <tr key={a.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {a.avatarUrl ? <img src={a.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" /> : <span className="h-8 w-8 rounded-full bg-muted" />}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{a.name ?? a.email.split("@")[0]}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {a.email}
                              {a.testerType && ` · ${TESTER_TYPE_LABEL[a.testerType] ?? a.testerType}`}
                            </p>
                            {a.busyWith.length > 0 && (
                              <p className="text-[11px] text-amber-700" title={a.busyWith.join("\n")}>
                                <Clock className="mr-0.5 inline h-3 w-3" /> Trùng lịch: {a.busyWith[0]}
                                {a.busyWith.length > 1 && ` +${a.busyWith.length - 1}`}
                              </p>
                            )}
                            {a.note && <p className="truncate text-[11px] text-muted-foreground">📝 {a.note}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className={cn("rounded-full px-2 py-0.5 font-medium", ASSIGNMENT_STATUS_CLASS[a.status])}>{ASSIGNMENT_STATUS_LABEL[a.status]}</span>
                        <p className="mt-1 text-muted-foreground">{a.respondedAt ? `Phản hồi ${viDateTime(a.respondedAt)}` : a.invitedAt ? `Mời ${viDateTime(a.invitedAt)}` : ""}</p>
                        {failedMail.length > 0 && (
                          <p className="text-destructive" title={failedMail.map((m) => `${m.code}: ${m.error}`).join("\n")}>
                            Mail lỗi: {failedMail.map((m) => m.code).join(", ")}
                          </p>
                        )}
                        {a.driveShare && a.driveShare !== "ok" && (
                          <p className="text-amber-700" title={a.driveShare}>
                            Chưa share được folder Drive
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {a.submittedAt ? (
                          <button type="button" onClick={() => setReviewId(a.id)} className="flex items-center gap-1.5 text-left hover:underline">
                            <span className="flex -space-x-2">
                              {a.evidence.slice(0, 3).map((f) => (
                                <img key={f.id} src={testFileUrl(f.id)} alt="" className="h-8 w-8 rounded border-2 border-card object-cover" />
                              ))}
                            </span>
                            <span className="text-muted-foreground">
                              <ImageIcon className="mr-0.5 inline h-3 w-3" />
                              {a.evidence.length} · {viDateTime(a.submittedAt)}
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {a.aiStatus === "queued" || a.aiStatus === "running" ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Đang kiểm tra
                          </span>
                        ) : verdict ? (
                          <span className={cn("inline-flex rounded-full border px-2 py-0.5 font-medium", AI_VERDICT_CLASS[verdict])}>{AI_VERDICT_LABEL[verdict]}</span>
                        ) : a.aiStatus === "failed" ? (
                          <span className="text-destructive">Lỗi AI</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {a.reviewStatus ? (
                          <button type="button" onClick={() => setReviewId(a.id)} className={cn("rounded-full px-2 py-0.5 font-medium hover:opacity-80", REVIEW_STATUS_CLASS[a.reviewStatus])}>
                            {REVIEW_STATUS_LABEL[a.reviewStatus]}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs tabular-nums">
                        <span className={cn(a.completed && "font-semibold text-emerald-700")}>{a.workloadHours}</span>
                        {a.customHours && <span className="text-muted-foreground"> (riêng)</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === "submitted" && a.reviewStatus === "pending" && (
                            <button type="button" onClick={() => setReviewId(a.id)} className={cn(btnPrimary, "px-2.5 py-1 text-xs")}>
                              Duyệt
                            </button>
                          )}
                          {a.status === "submitted" && a.reviewStatus !== "pending" && (
                            <button type="button" onClick={() => setReviewId(a.id)} className={cn(btnGhost, "px-2.5 py-1 text-xs")}>
                              Xem
                            </button>
                          )}
                          <RowMenu a={a} campaign={campaign} onChanged={onChanged} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      Không có tester trong nhóm này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reviewing && (
        <ReviewDrawer key={reviewing.id} campaign={campaign} assignment={reviewing} onClose={() => setReviewId(null)} onChanged={onChanged} onNavigate={nav} />
      )}
    </div>
  );
}
