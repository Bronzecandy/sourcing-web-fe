import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { testerApi } from "../../api";
import AdminTesters from "./AdminTesters";
import AdminCampaigns from "./AdminCampaigns";
import AdminCampaignDetail from "./AdminCampaignDetail";
import AdminBenefits from "./AdminBenefits";
import AdminSurvey from "./AdminSurvey";

const TABS = [
  { to: "/tester/admin", label: "Testers", end: true },
  { to: "/tester/admin/campaigns", label: "Đợt test", end: false },
  { to: "/tester/admin/benefits", label: "Benefit", end: false },
  { to: "/tester/admin/survey", label: "Bảng hỏi", end: false },
];

export default function TesterAdmin() {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  const exportXlsx = async () => {
    setExporting(true);
    try {
      await testerApi.adminExport();
    } catch {
      toast.error("Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Quản lý Tester Program</h1>
          <p className="text-sm text-muted-foreground">Tester, đợt test, gợi ý tester theo dòng game và benefit.</p>
        </div>
        <button
          type="button"
          disabled={exporting}
          onClick={() => void exportXlsx()}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {exporting ? "Đang xuất…" : "Xuất Excel"}
        </button>
      </div>
      <nav className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
                isActive ? "border-brand-violet text-brand-navy" : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<AdminTesters />} />
        <Route path="campaigns" element={<AdminCampaigns />} />
        <Route path="campaigns/:id" element={<AdminCampaignDetail />} />
        <Route path="benefits" element={<AdminBenefits />} />
        <Route path="survey" element={<AdminSurvey />} />
        <Route path="*" element={<AdminTesters />} />
      </Routes>
    </div>
  );
}
