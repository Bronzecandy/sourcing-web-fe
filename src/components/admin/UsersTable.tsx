import type { AdminUserRow, UserRole } from "@/types/auth";
import { canManageUser, isSuperAdminProtected, ROLE_LABELS } from "@/lib/user-roles";
import { countGrantedPermissions } from "./PermissionMatrix";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { Crown, Shield, Users, Pencil, Eye } from "lucide-react";
import { btnSubtle, btnGhost } from "@/lib/button-classes";

function roleBadgeClass(role: UserRole): string {
  if (role === "SUPER_ADMIN") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  if (role === "ADMIN") return "bg-primary/15 text-primary";
  if (role === "STAFF") return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
  return "bg-muted text-muted-foreground";
}

function RoleIcon({ role }: { role: UserRole }) {
  if (role === "SUPER_ADMIN") return <Crown className="w-3.5 h-3.5" />;
  if (role === "ADMIN") return <Shield className="w-3.5 h-3.5" />;
  return <Users className="w-3.5 h-3.5" />;
}

type UsersTableProps = {
  users: AdminUserRow[];
  onManage: (user: AdminUserRow) => void;
  search: string;
};

export default function UsersTable({ users, onManage, search }: UsersTableProps) {
  const { t, lang } = useUiCopy();
  const { user: actor } = useAuth();

  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name?.toLowerCase().includes(q) ?? false)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === "PENDING" ? -1 : 1;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  if (sorted.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12 text-sm">
        {t("Không có người dùng phù hợp", "No matching users")}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">{t("Người dùng", "User")}</th>
              <th className="px-4 py-3 font-medium">{t("Vai trò", "Role")}</th>
              <th className="px-4 py-3 font-medium">{t("Quyền", "Permissions")}</th>
              <th className="px-4 py-3 font-medium">{t("Trạng thái", "Status")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("Thao tác", "Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((u) => {
              const editable = actor ? canManageUser(actor.role, u.role) : false;
              const protectedRow = isSuperAdminProtected(u.role);
              const permCount = u.role === "SUPER_ADMIN" ? "—" : String(countGrantedPermissions(u.permissions));
              return (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar src={u.avatarUrl} name={u.name} email={u.email} className="w-8 h-8" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        roleBadgeClass(u.role),
                      )}
                    >
                      <RoleIcon role={u.role} />
                      {lang === "vi" ? ROLE_LABELS[u.role].vi : ROLE_LABELS[u.role].en}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{permCount}</td>
                  <td className="px-4 py-3">
                    {u.status === "PENDING" ? (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {t("Chờ duyệt", "Pending")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("Đã duyệt", "Active")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onManage(u)}
                      className={cn(
                        "px-3 py-1.5 text-xs",
                        protectedRow || !editable ? btnGhost : btnSubtle,
                      )}
                    >
                      {protectedRow || !editable ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          {t("Xem", "View")}
                        </>
                      ) : (
                        <>
                          <Pencil className="w-3.5 h-3.5" />
                          {t("Chỉnh sửa", "Edit")}
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
