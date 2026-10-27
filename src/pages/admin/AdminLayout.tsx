import { Suspense, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ClipboardList, ExternalLink, FileQuestion, FileSpreadsheet, Gamepad2, Gift, Loader2, Shield, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/lib/button-classes";
import { testerApi } from "@/tester/api";

/** Khung admin Sourcing: người dùng + phân quyền và Tester Program chung một chỗ. */
export default function AdminLayout() {
  const { t } = useUiCopy();
  const { user } = useAuth();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const canTester = hasPermission(user, "tester.manage");

  const tabs = [
    user?.isPanelAdmin
      ? { to: "/admin/users", label: t("Người dùng & phân quyền", "Users & permissions"), icon: Users }
      : { to: "/admin/testers", label: "Testers", icon: Gamepad2 },
    ...(canTester
      ? [
          { to: "/admin/test-campaigns", label: t("Đợt test", "Test campaigns"), icon: ClipboardList },
          { to: "/admin/tester-benefits", label: t("Benefit tester", "Tester benefits"), icon: Gift },
          { to: "/admin/tester-survey", label: t("Bảng hỏi tester", "Tester survey"), icon: FileQuestion },
        ]
      : []),
  ];

  const exportXlsx = async () => {
    setExporting(true);
    try {
      await testerApi.adminExport();
    } catch {
      toast.error(t("Xuất Excel thất bại", "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 w-full min-h-[calc(100vh-8rem)]">
      <PageHeader
        icon={<Shield className="w-8 h-8" />}
        title={t("Quản trị", "Admin")}
        description={t(
          "Người dùng, vai trò, quyền dữ liệu và Tester Program. Một người có thể vừa là Staff vừa là Tester.",
          "Users, roles, data permissions and the Tester Program. One person can be Staff and Tester at once.",
        )}
        actions={
          canTester && (
            <>
              <button type="button" disabled={exporting} onClick={() => void exportXlsx()} className={cn(btnGhost, "px-3 py-2")}>
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                {t("Xuất Excel tester", "Export testers")}
              </button>
              <a href="/tester" target="_blank" rel="noreferrer" className={cn(btnGhost, "px-3 py-2")}>
                <ExternalLink className="w-4 h-4" />
                {t("Trang Tester Program", "Tester Program site")}
              </a>
            </>
          )
        }
      />
      <nav className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  );
}
