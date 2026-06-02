import type { AdminUserRow } from "@/types/auth";
import { ROLE_LABELS } from "@/lib/user-roles";
import { countGrantedPermissions } from "./PermissionMatrix";
import UserAvatar from "@/components/UserAvatar";
import { useUiCopy } from "@/lib/use-ui-copy";
import { Check, Pencil, Loader2 } from "lucide-react";
import { btnGhost, btnSubtle, btnSuccess } from "@/lib/button-classes";
import { cn } from "@/lib/utils";

type PendingApprovalQueueProps = {
  users: AdminUserRow[];
  onApprove: (user: AdminUserRow) => void;
  onConfigure: (user: AdminUserRow) => void;
  approvingId: string | null;
};

export default function PendingApprovalQueue({
  users,
  onApprove,
  onConfigure,
  approvingId,
}: PendingApprovalQueueProps) {
  const { t, lang } = useUiCopy();

  if (users.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          {t("Chờ duyệt", "Pending approval")}{" "}
          <span className="text-amber-700 dark:text-amber-300">({users.length})</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t(
            "Duyệt nhanh hoặc mở cấu hình để gán role và quyền trước.",
            "Quick approve or configure role and permissions first.",
          )}
        </p>
      </div>
      <ul className="space-y-2">
        {users.map((u) => {
          const permCount = countGrantedPermissions(u.permissions);
          const roleLabel = lang === "vi" ? ROLE_LABELS[u.role].vi : ROLE_LABELS[u.role].en;
          const busy = approvingId === u.id;
          return (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar src={u.avatarUrl} name={u.name} email={u.email} className="w-10 h-10" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{u.name || u.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {roleLabel} · {permCount} {t("quyền", "permissions")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onConfigure(u)}
                  className={cn(btnSubtle, "px-3 py-2 text-sm")}
                >
                  <Pencil className="w-4 h-4" />
                  {t("Chỉnh sửa", "Edit")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onApprove(u)}
                  className={cn(btnSuccess, "px-4 py-2 text-sm")}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t("Duyệt", "Approve")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
