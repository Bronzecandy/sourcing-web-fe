import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Search } from "lucide-react";
import { fetchAdminMeta, fetchAdminUsers, patchAdminUser } from "@/services/api";
import type { AdminUserRow } from "@/types/auth";
import { roleHasAllPermissions } from "@/lib/user-roles";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/lib/button-classes";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import PendingApprovalQueue from "@/components/admin/PendingApprovalQueue";
import UsersTable from "@/components/admin/UsersTable";
import UserEditDrawer, { draftFromUser, type UserDraft } from "@/components/admin/UserEditDrawer";

export default function AdminUsersPage() {
  const { t } = useUiCopy();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: meta } = useQuery({
    queryKey: ["admin-meta"],
    queryFn: fetchAdminMeta,
  });

  const { data: users = [], isPending } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
  });

  const [filter, setFilter] = useState<"all" | "pending" | "active">("all");
  const [search, setSearch] = useState("");
  const [drawerUser, setDrawerUser] = useState<AdminUserRow | null>(null);
  const [drawerDraft, setDrawerDraft] = useState<UserDraft | null>(null);
  const [approveMode, setApproveMode] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof patchAdminUser>[1] }) =>
      patchAdminUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const pending = useMemo(() => users.filter((u) => u.status === "PENDING"), [users]);
  const active = useMemo(() => users.filter((u) => u.status === "ACTIVE"), [users]);

  const tableUsers = useMemo(() => {
    if (filter === "pending") return pending;
    if (filter === "active") return active;
    return users;
  }, [filter, users, pending, active]);

  function openDrawer(u: AdminUserRow, forApprove = false) {
    setDrawerUser(u);
    setDrawerDraft(draftFromUser(u));
    setApproveMode(forApprove);
  }

  function closeDrawer() {
    setDrawerUser(null);
    setDrawerDraft(null);
    setApproveMode(false);
  }

  function buildPatchBody(d: UserDraft, includeActive?: boolean): Parameters<typeof patchAdminUser>[1] {
    const body: Parameters<typeof patchAdminUser>[1] = { role: d.role };
    if (includeActive) body.status = "ACTIVE";
    if (!roleHasAllPermissions(d.role)) body.permissions = d.permissions;
    return body;
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
      toast.error(e instanceof Error ? e.message : t("Lưu thất bại", "Save failed"));
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
      toast.error(e instanceof Error ? e.message : t("Thất bại", "Failed"));
    }
  }

  async function quickApprove(u: AdminUserRow) {
    setApprovingId(u.id);
    try {
      await saveMutation.mutateAsync({ id: u.id, body: { status: "ACTIVE" } });
      toast.success(t("Đã duyệt tài khoản", "Account approved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Duyệt thất bại", "Approve failed"));
    } finally {
      setApprovingId(null);
    }
  }

  const assignable = meta?.assignableRoles ?? [];

  return (
    <div className="space-y-6 w-full min-h-[calc(100vh-8rem)]">
      <PageHeader
        icon={<Shield className="w-8 h-8" />}
        title={t("Quản lý người dùng", "User management")}
        description={t(
          "Duyệt tài khoản, gán vai trò và cấp quyền theo domain dữ liệu.",
          "Approve accounts, assign roles and grant data-domain permissions.",
        )}
        stats={
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["all", t("Tất cả", "All"), users.length],
                ["pending", t("Chờ duyệt", "Pending"), pending.length],
                ["active", t("Đã duyệt", "Active"), active.length],
              ] as const
            ).map(([key, label, count]) => (
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
                <span className={cn(filter === key ? "opacity-90" : "text-muted-foreground")}>
                  ({count})
                </span>
              </button>
            ))}
          </div>
        }
      />

      <PendingApprovalQueue
        users={pending}
        onApprove={quickApprove}
        onConfigure={(u) => openDrawer(u, true)}
        approvingId={approvingId}
      />

      <div className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Tìm theo tên hoặc email…", "Search name or email…")}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
        />
      </div>

      {isPending ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
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
      />
    </div>
  );
}
