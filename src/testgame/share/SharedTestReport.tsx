import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, Link2Off, LoaderCircle, Printer, RefreshCw } from "lucide-react";
import { useDocumentBrand } from "@/lib/brand";
import { useContentLang } from "@/lib/content-language";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/lib/button-classes";
import { TesterApiError } from "@/tester/api";
import { sharedFileUrl, testGameShareApi } from "../api";
import { viDateTime } from "../labels";
import ReportView, { LangToggle, type ReportLang } from "../report/ReportView";

export default function SharedTestReport() {
  const { key = "" } = useParams();
  const { lang: preferred } = useContentLang();
  const [lang, setLang] = useState<ReportLang>(preferred);
  useDocumentBrand("sourcing");
  const report = useQuery({
    queryKey: ["testgame-share-report", key],
    queryFn: () => testGameShareApi.report(key),
    enabled: Boolean(key),
    retry: false,
    staleTime: 5 * 60_000,
  });
  const data = report.data;

  useEffect(() => {
    if (data) document.title = `${data.info.gameName} · Game Test Report`;
  }, [data]);

  const invalid = !key || report.error instanceof TesterApiError;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur print:static print:border-b-0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/brand/sourcing-icon.svg" alt="" className="h-8 w-8" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">Sourcing · Game Test Report</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" /> Bản xem chỉ đọc
              </p>
            </div>
          </div>
          {data && (
            <div className="flex items-center gap-2 print:hidden">
              <LangToggle value={lang} onChange={setLang} />
              <button type="button" onClick={() => window.print()} className={cn(btnGhost, "px-3 py-1.5")}>
                <Printer className="h-4 w-4" /> In / Lưu PDF
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8 print:max-w-none print:p-0">
        {data ? (
          <ReportView report={data} lang={lang} fileUrl={(id) => sharedFileUrl(key, id)} />
        ) : report.isLoading ? (
          <div className="flex justify-center py-24">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Link2Off className="h-6 w-6" />
            </div>
            {invalid ? (
              <>
                <h1 className="mt-4 text-lg font-semibold">Link chia sẻ không còn hiệu lực</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Link có thể đã hết hạn hoặc bị thu hồi. Liên hệ người gửi để nhận link mới.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-4 text-lg font-semibold">Không tải được report</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">Kiểm tra kết nối mạng rồi thử lại.</p>
                <button type="button" onClick={() => void report.refetch()} className={cn(btnGhost, "mt-4 px-3 py-1.5")}>
                  <RefreshCw className="h-4 w-4" /> Thử lại
                </button>
              </>
            )}
          </div>
        )}
      </main>

      {data && (
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-center text-xs text-muted-foreground print:pb-0 print:pt-6">
          Tổng hợp từ questionnaire của {data.info.submitted} tester · tên tester đã được ẩn ·{" "}
          {data.status === "locked" ? `Report chốt ${viDateTime(data.lockedAt)}` : "Report đang cập nhật — nội dung có thể thay đổi"}
        </footer>
      )}
    </div>
  );
}
