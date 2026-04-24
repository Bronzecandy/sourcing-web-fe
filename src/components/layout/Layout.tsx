import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ContentLangToggle from "@/components/ContentLangToggle";
import { useUiCopy } from "@/lib/use-ui-copy";

export default function Layout() {
  const { t } = useUiCopy();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-6">
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t("Nội dung", "Content")}</span>
            <ContentLangToggle />
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
