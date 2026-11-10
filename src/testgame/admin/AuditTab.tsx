import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { testGameAdminApi } from "../api";
import { CAMPAIGN_STATUS_LABEL, MAIL_LABEL, viDateTime } from "../labels";
import type { AuditEntry, CampaignStatus } from "../types";

const ACTION_LABEL: Record<string, string> = {
  "campaign.create": "Tạo game test",
  "campaign.update": "Sửa thông tin",
  "campaign.status": "Đổi tiến độ",
  "campaign.initiate": "Initiate",
  "drive.folder_created": "Tạo folder Drive",
  "seatalk.resend": "Gửi lại SeaTalk",
  "testers.add": "Thêm tester",
  "testers.invite": "Gửi lời mời",
  "testers.remove": "Xoá tester",
  "tester.update": "Sửa tester",
  "tester.respond": "Tester phản hồi",
  "tester.review": "Duyệt bài nộp",
  "tester.ai_review": "Chạy lại AI kiểm tra",
  "survey.submit": "Tester nộp questionnaire",
  "survey.resubmit": "Tester nộp lại",
  "mail.resend": "Gửi lại mail",
  "mail.test": "Gửi thử mail",
  "report.update": "Sửa report",
  "report.summarize": "Tổng hợp report bằng AI",
  "report.save_run": "Lưu bản tổng hợp",
  "report.config_run": "Cập nhật cấu hình",
  "report.lock": "Chốt report",
  "report.unlock": "Mở lại report",
  "share.create": "Tạo link chia sẻ",
  "share.revoke": "Thu hồi link chia sẻ",
};

const FIELD_LABEL: Record<string, string> = {
  gameName: "tên game",
  startDate: "ngày bắt đầu",
  endDate: "hạn test",
  reportDeadline: "hạn report",
  guide: "hướng dẫn",
  installUrl: "link cài",
  testerNote: "ghi chú tester",
  platforms: "platform",
  mainTags: "dòng game chính",
  workloadHours: "workload",
};

function describe(e: AuditEntry): string {
  const d = (e.detail ?? {}) as Record<string, unknown>;
  switch (e.action) {
    case "campaign.status":
      return `${CAMPAIGN_STATUS_LABEL[d.from as CampaignStatus] ?? d.from} → ${CAMPAIGN_STATUS_LABEL[d.to as CampaignStatus] ?? d.to}${d.decision ? ` · ${d.decision}` : ""}`;
    case "campaign.update":
      return Array.isArray(d.fields) ? (d.fields as string[]).map((f) => FIELD_LABEL[f] ?? f).join(", ") : "";
    case "campaign.initiate":
      return `${d.testers} tester · ${d.template ?? ""} · SeaTalk ${d.seatalk ?? ""}`;
    case "testers.add":
    case "testers.invite":
      return Array.isArray(d.emails) ? (d.emails as string[]).join(", ") : "";
    case "tester.review":
      return `${d.email}: ${d.decision === "approve" ? "duyệt" : d.decision === "reject" ? "không duyệt" : "đặt lại"}${d.note ? ` — ${d.note}` : ""}${d.hours != null ? ` · ${d.hours} giờ` : ""}`;
    case "tester.respond":
      return `${d.email}: ${d.action === "confirm" ? "xác nhận" : "từ chối"}`;
    case "mail.resend":
    case "mail.test":
      return `${d.code} → ${d.to} (${d.status})`;
    case "report.lock":
      return `Decision: ${d.decision}`;
    default:
      return typeof d.email === "string" ? d.email : "";
  }
}

export default function AuditTab({ campaignId }: { campaignId: string }) {
  const q = useQuery({ queryKey: ["testgame-audit", campaignId], queryFn: () => testGameAdminApi.audit(campaignId) });
  if (q.isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  const data = q.data ?? { actions: [], mails: [] };
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Thao tác ({data.actions.length})</h3>
        <ol className="space-y-0 rounded-xl border border-border">
          {data.actions.map((e) => (
            <li key={e.id} className="border-b border-border px-4 py-2.5 text-sm last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{ACTION_LABEL[e.action] ?? e.action}</span>
                <span className="text-xs text-muted-foreground">
                  {e.actor ?? "system"} · {viDateTime(e.createdAt)}
                </span>
              </div>
              {describe(e) && <p className="mt-0.5 break-words text-xs text-muted-foreground">{describe(e)}</p>}
            </li>
          ))}
          {data.actions.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Chưa có thao tác.</li>}
        </ol>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Mail đã gửi ({data.mails.length})</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                {["Lúc", "Mẫu", "Tới", "Kết quả"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.mails.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap px-3 py-2">{viDateTime(m.sentAt)}</td>
                  <td className="px-3 py-2">
                    {m.code} <span className="text-muted-foreground">{MAIL_LABEL[m.code]}</span>
                    {m.trigger !== "auto" && <span className="ml-1 rounded bg-muted px-1">{m.trigger === "test" ? "thử" : "tay"}</span>}
                  </td>
                  <td className="px-3 py-2">{m.toEmail}</td>
                  <td className={cn("px-3 py-2", m.status === "failed" && "text-destructive")} title={m.error ?? undefined}>
                    {m.status === "sent" ? "Đã gửi" : `Lỗi${m.attempts > 1 ? ` (${m.attempts} lần)` : ""}`}
                  </td>
                </tr>
              ))}
              {data.mails.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    Chưa gửi mail nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
