import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Paperclip, Send, XCircle } from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/lib/button-classes";
import { testGameAdminApi } from "../api";
import { MAIL_LABEL, viDate, viDateTime } from "../labels";
import type { CampaignAssignment, CampaignDetail } from "../types";

const CODES = ["M1", "M2", "M3", "M4", "M5", "M6", "M7"];

export default function MailTab({ campaign, onChanged }: { campaign: CampaignDetail; onChanged: (c: CampaignDetail) => void }) {
  const toast = useToast();
  const [code, setCode] = useState("M1");
  const [assignmentId, setAssignmentId] = useState<string>(campaign.assignments[0]?.id ?? "");
  const [sendingTest, setSendingTest] = useState(false);
  const [resend, setResend] = useState<{ a: CampaignAssignment; code: string } | null>(null);
  const [resending, setResending] = useState(false);

  const preview = useQuery({
    queryKey: ["testgame-mail-preview", campaign.id, code, assignmentId, campaign.updatedAt],
    queryFn: () => testGameAdminApi.mailPreview({ code, campaignId: campaign.id, assignmentId: assignmentId || null }),
  });

  const sendTest = async () => {
    setSendingTest(true);
    try {
      await testGameAdminApi.mailTest(campaign.id, code);
      toast.success("Đã gửi thử về email của bạn");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi thử lỗi");
    } finally {
      setSendingTest(false);
    }
  };

  const doResend = async () => {
    if (!resend) return;
    setResending(true);
    try {
      onChanged(await testGameAdminApi.resendMail(resend.a.id, resend.code));
      toast.success(`Đã gửi ${resend.code} cho ${resend.a.email}`);
      setResend(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi lỗi");
    } finally {
      setResending(false);
    }
  };

  const invited = campaign.assignments.filter((a) => a.status !== "added");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Mail theo tester</h3>
          <p className="text-xs text-muted-foreground">
            Mail kế tiếp:{" "}
            {campaign.nextMail ? (
              <b>
                {campaign.nextMail.code} {MAIL_LABEL[campaign.nextMail.code]} · {viDate(campaign.nextMail.date)}
              </b>
            ) : (
              "—"
            )}
          </p>
        </div>
        {invited.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Chưa gửi lời mời nào. Mail M1 được gửi khi Initiate.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Tester</th>
                  {CODES.map((c) => (
                    <th key={c} className="px-2 py-2 text-center font-medium" title={MAIL_LABEL[c]}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invited.map((a) => (
                  <tr key={a.id}>
                    <td className="max-w-48 truncate px-3 py-2" title={a.email}>
                      {a.name ?? a.email}
                    </td>
                    {CODES.map((c) => {
                      const logs = a.mails.filter((m) => m.code === c && m.trigger !== "test");
                      const last = logs[logs.length - 1];
                      return (
                        <td key={c} className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setResend({ a, code: c })}
                            className="rounded p-1 hover:bg-muted"
                            title={
                              last
                                ? `${last.status === "sent" ? "Đã gửi" : "Lỗi"} ${viDateTime(last.sentAt)}${last.error ? `\n${last.error}` : ""}\nBấm để gửi lại`
                                : "Chưa gửi — bấm để gửi"
                            }
                          >
                            {!last ? (
                              <span className="text-muted-foreground/50">·</span>
                            ) : last.status === "sent" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Lịch tự động chạy mỗi ngày theo giờ cấu hình: M2 nhắc người chưa phản hồi, M4 ngày bắt đầu, M5 trước hạn, M6 ngày cuối cho người chưa nộp, M7 sau hạn. Mỗi mốc chỉ gửi một lần;
          mail lỗi tự thử lại tối đa 3 lần.{" "}
          <Link to="/admin/test-settings" className="text-primary hover:underline">
            Sửa mẫu mail
          </Link>
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto text-sm font-semibold">Xem trước</h3>
          <select value={code} onChange={(e) => setCode(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
            {CODES.map((c) => (
              <option key={c} value={c}>
                {c} · {MAIL_LABEL[c]}
              </option>
            ))}
          </select>
          <select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className="max-w-48 rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
            {campaign.assignments.length === 0 && <option value="">(tester mẫu)</option>}
            {campaign.assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name ?? a.email}
              </option>
            ))}
          </select>
          <button type="button" disabled={sendingTest} onClick={() => void sendTest()} className={cn(btnGhost, "px-2.5 py-1.5 text-xs")}>
            {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Gửi thử cho tôi
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          {preview.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : preview.error ? (
            <p className="p-4 text-sm text-destructive">{preview.error instanceof Error ? preview.error.message : "Không xem trước được"}</p>
          ) : preview.data ? (
            <>
              <div className="space-y-0.5 border-b border-border bg-muted/30 px-4 py-2.5 text-xs">
                <p>
                  <span className="text-muted-foreground">Tới:</span> {preview.data.to ?? "(tester)"}
                </p>
                <p>
                  <span className="text-muted-foreground">Tiêu đề:</span> <b>{preview.data.subject}</b>
                </p>
                {preview.data.attachments && preview.data.attachments.length > 0 && (
                  <p className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {preview.data.attachments.join(", ")}
                  </p>
                )}
              </div>
              <iframe title="Xem trước mail" sandbox="" srcDoc={preview.data.html} className="h-[28rem] w-full bg-white" />
            </>
          ) : null}
        </div>
      </section>

      <Modal
        open={Boolean(resend)}
        onClose={() => setResend(null)}
        title={`Gửi ${resend?.code} · ${resend ? MAIL_LABEL[resend.code] : ""}`}
        description={resend ? `Gửi lại cho ${resend.a.email}. Mail gửi tay không làm thay đổi lịch tự động.` : undefined}
        footer={
          <ModalFooterActions onCancel={() => setResend(null)} onSubmit={() => void doResend()} cancelLabel="Huỷ" submitLabel="Gửi" submitting={resending} />
        }
      >
        <p className="text-sm text-muted-foreground">Nội dung lấy theo mẫu hiện tại và thông tin game test mới nhất.</p>
      </Modal>
    </div>
  );
}
