import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchAdminMeta, fetchAdminUsers, patchAdminUser, createAdminUser } from "@/services/api";
import type { AdminUserRow } from "@/types/auth";
import { primaryRoleOf, roleHasAllPermissions, sourcingRoleOf } from "@/lib/user-roles";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/lib/button-classes";
import { useToast } from "@/components/ui/Toast";
import PendingApprovalQueue from "@/components/admin/PendingApprovalQueue";
import UsersTable from "@/components/admin/UsersTable";
import UserEditDrawer, { draftFromUser, type UserDraft, type UserDrawerTab } from "@/components/admin/UserEditDrawer";
import InviteUserCard, { type InviteUserPayload } from "@/components/admin/InviteUserCard";
import TesterRosterTable from "@/components/admin/tester/TesterRosterTable";
import { testerApi } from "@/tester/api";
import axios from "axios";

type RoleFilter = "all" | "sourcing" | "tester" | "pending";
const FILTERS: RoleFilter[] = ["all", "sourcing", "tester", "pending"];

function parseFilter(v: string | null): RoleFilter {
  return FILTERS.includes(v as RoleFilter) ? (v as RoleFilter) : "all";
}

export default function AdminUsersPage() {
  const { t } = useUiCopy();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get("role"));

  const { data: meta } = useQuery({
    queryKey: ["admin-meta"],
    queryFn: fetchAdminMeta,
  });

  const { data: users = [], isPending } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
  });

  const testers = useQuery({
    queryKey: ["tester-admin-testers"],
    queryFn: testerApi.adminTesters,
    enabled: filter === "tester",
  });
  const testerMeta = useQuery({
    queryKey: ["tester-admin-meta"],
    queryFn: testerApi.adminMeta,
    enabled: filter === "tester",
  });

  const [search, setSearch] = useState("");
  const [drawerUser, setDrawerUser] = useState<AdminUserRow | null>(null);
  const [drawerDraft, setDrawerDraft] = useState<UserDraft | null>(null);
  const [drawerTab, setDrawerTab] = useState<UserDrawerTab>("access");
  const [approveMode, setApproveMode] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof patchAdminUser>[1] }) =>
      patchAdminUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["tester-admin-testers"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (body: InviteUserPayload) => createAdminUser(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["tester-admin-testers"] });
    },
  });

  const pending = useMemo(() => users.filter((u) => u.status === "PENDING"), [users]);
  const sourcingUsers = useMemo(() => users.filter((u) => sourcingRoleOf(u.roles) !== null), [users]);
  const testerCount = useMemo(() => users.filter((u) => u.roles.includes("TESTER")).length, [users]);

  const tableUsers = useMemo(() => {
    if (filter === "pending") return pending;
    if (filter === "sourcing") return sourcingUsers;
    return users;
  }, [filter, users, pending, sourcingUsers]);

  function setFilter(next: RoleFilter) {
    const p = new URLSearchParams(params);
    if (next === "all") p.delete("role");
    else p.set("role", next);
    setParams(p, { replace: true });
  }

  function openDrawer(u: AdminUserRow, forApprove = false, tab: UserDrawerTab = "access") {
    setDrawerUser(u);
    setDrawerDraft(draftFromUser(u));
    setApproveMode(forApprove);
    setDrawerTab(tab);
  }

  // ?user=<id> mở sẵn drawer (link từ đợt test / chỗ khác)
  const openUserId = params.get("user");
  useEffect(() => {
    if (!openUserId || users.length === 0) return;
    const u = users.find((x) => x.id === openUserId);
    if (u) {
      setDrawerUser(u);
      setDrawerDraft(draftFromUser(u));
      setApproveMode(false);
      setDrawerTab(u.isTester ? "tester" : "access");
    }
    const p = new URLSearchParams(params);
    p.delete("user");
    setParams(p, { replace: true });
  }, [openUserId, users, params, setParams]);

  function closeDrawer() {
    setDrawerUser(null);
    setDrawerDraft(null);
    setApproveMode(false);
  }

  function buildPatchBody(d: UserDraft, includeActive?: boolean): Parameters<typeof patchAdminUser>[1] {
    const body: Parameters<typeof patchAdminUser>[1] = { roles: d.roles };
    if (includeActive) body.status = "ACTIVE";
    if (sourcingRoleOf(d.roles) && !roleHasAllPermissions(primaryRoleOf(d.roles))) body.permissions = d.permissions;
    return body;
  }

  function apiErr(e: unknown, fallback: string): string {
    if (axios.isAxiosError(e)) {
      const msg = (e.response?.data as { error?: string } | undefined)?.error;
      if (msg) return msg;
    }
    return e instanceof Error ? e.message : fallback;
  }

  async function handleSave() {
    if (!drawerUser || !drawerDraft) return;
    try {
      await saveMutation.mutateAsync({
        id: drawerUser.id,
        body: buildPatchBody(drawerDraft),
      });
      toast.success(t("Đã lưu thay đổi", "Changes saved"));
      closeDrawer();
    } catch (e) {
      toast.error(apiErr(e, t("Lưu thất bại", "Save failed")));
    }
  }

  async function handleApproveAndSave() {
    if (!drawerUser || !drawerDraft) return;
    try {
      await saveMutation.mutateAsync({
        id: drawerUser.id,
        body: buildPatchBody(drawerDraft, true),
      });
      toast.success(t("Đã duyệt và lưu", "Approved and saved"));
      closeDrawer();
    } catch (e) {
      toast.error(apiErr(e, t("Thất bại", "Failed")));
    }
  }

  async function quickApprove(u: AdminUserRow) {
    setApprovingId(u.id);
    try {
      await saveMutation.mutateAsync({ id: u.id, body: { status: "ACTIVE" } });
      toast.success(t("Đã duyệt tài khoản", "Account approved"));
    } catch (e) {
      toast.error(apiErr(e, t("Duyệt thất bại", "Approve failed")));
    } finally {
      setApprovingId(null);
    }
  }

  const assignable = meta?.assignableRoles ?? [];

  async function handleInvite(payload: InviteUserPayload) {
    try {
      await inviteMutation.mutateAsync(payload);
      toast.success(
        t(
          "Đã thêm người dùng. Họ login Google bằng đúng email này là vào được.",
          "User added. They can enter after signing in with this Google email.",
        ),
      );
    } catch (e) {
      toast.error(apiErr(e, t("Thêm thất bại", "Failed to add user")));
    }
  }

  function openTester(userId: string) {
    const u = users.find((x) => x.id === userId);
    if (u) openDrawer(u, false, "tester");
  }

  const filterButtons: Array<[RoleFilter, string, number]> = [
    ["all", t("Tất cả", "All"), users.length],
    ["sourcing", "Sourcing", sourcingUsers.length],
    ["tester", "Tester", testerCount],
    ["pending", t("Chờ duyệt", "Pending"), pending.length],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {filterButtons.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150",
              filter === key
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : cn(btnGhost, "border-border"),
            )}
          >
            {label}{" "}
            <span className={cn(filter === key ? "opacity-90" : "text-muted-foreground")}>({count})</span>
          </button>
        ))}
      </div>

      {filter !== "tester" && (
        <PendingApprovalQueue
          users={pending}
          onApprove={quickApprove}
          onConfigure={(u) => openDrawer(u, true)}
          approvingId={approvingId}
        />
      )}

      <InviteUserCard
        assignableRoles={assignable}
        submitting={inviteMutation.isPending}
        onSubmit={handleInvite}
      />

      <div className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            filter === "tester"
              ? t("Tìm tên, email, team…", "Search name, email, team…")
              : t("Tìm theo tên hoặc email…", "Search name or email…")
          }
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
        />
      </div>

      {isPending || (filter === "tester" && testers.isLoading) ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filter === "tester" ? (
        <TesterRosterTable
          rows={testers.data ?? []}
          genres={testerMeta.data?.genres ?? []}
          search={search}
          onOpen={openTester}
        />
      ) : (
        <UsersTable users={tableUsers} search={search} onManage={(u) => openDrawer(u, false)} />
      )}

      <UserEditDrawer
        user={drawerUser}
        open={!!drawerUser}
        onClose={closeDrawer}
        assignableRoles={assignable}
        draft={drawerDraft}
        onDraftChange={setDrawerDraft}
        onSave={handleSave}
        onApproveAndSave={approveMode ? handleApproveAndSave : undefined}
        saving={saveMutation.isPending}
        approveMode={approveMode}
        initialTab={drawerTab}
      />
    </div>
  );
}
