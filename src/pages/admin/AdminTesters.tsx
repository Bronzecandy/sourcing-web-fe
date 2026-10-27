import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { useAuth } from "@/contexts/AuthContext";
import TesterRosterTable from "@/components/admin/tester/TesterRosterTable";
import TesterProfilePanel from "@/components/admin/tester/TesterProfilePanel";
import { testerApi } from "@/tester/api";

/** Danh sách tester cho người có quyền tester.manage nhưng không phải Admin (Admin xem ở tab Người dùng, lọc Tester). */
export default function AdminTesters() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const testers = useQuery({ queryKey: ["tester-admin-testers"], queryFn: testerApi.adminTesters, enabled: !user?.isPanelAdmin });
  const meta = useQuery({ queryKey: ["tester-admin-meta"], queryFn: testerApi.adminMeta, enabled: !user?.isPanelAdmin });
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const linked = params.get("user");
  useEffect(() => {
    if (!linked) return;
    setOpenId(linked);
    const p = new URLSearchParams(params);
    p.delete("user");
    setParams(p, { replace: true });
  }, [linked, params, setParams]);

  if (user?.isPanelAdmin) {
    const userParam = linked ? `&user=${linked}` : "";
    return <Navigate to={`/admin/users?role=tester${userParam}`} replace />;
  }

  const open = (testers.data ?? []).find((r) => r.userId === openId);

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên, email, team…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
        />
      </div>
      {testers.isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <TesterRosterTable rows={testers.data ?? []} genres={meta.data?.genres ?? []} search={search} onOpen={setOpenId} />
      )}
      <Drawer open={Boolean(openId)} onClose={() => setOpenId(null)} title={open?.name ?? "Tester"} subtitle={open?.email} size="full">
        {openId && <TesterProfilePanel userId={openId} />}
      </Drawer>
    </div>
  );
}
