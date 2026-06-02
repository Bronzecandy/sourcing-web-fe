import { useEffect, useState } from "react";
import type { AdminUserRow, PermissionKey, UserRole } from "@/types/auth";
import { PERMISSION_KEYS } from "@/types/auth";
import {
  canManageUser,
  protectedUserMessage,
  roleHasAllPermissions,
} from "@/lib/user-roles";
import { useAuth } from "@/contexts/AuthContext";
import { useUiCopy } from "@/lib/use-ui-copy";
import Drawer from "@/components/ui/Drawer";
import UserAvatar from "@/components/UserAvatar";
import RoleSelector from "./RoleSelector";
import PermissionMatrix from "./PermissionMatrix";
import { ROLE_LABELS } from "@/lib/user-roles";
import { Save, Check, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSuccess, btnGhost } from "@/lib/button-classes";

export type UserDraft = {
  role: UserRole;
  permissions: Record<PermissionKey, boolean>;
};

type UserEditDrawerProps = {
  user: AdminUserRow | null;
  open: boolean;
  onClose: () => void;
  assignableRoles: UserRole[];
  draft: UserDraft | null;
  onDraftChange: (draft: UserDraft) => void;
  onSave: () => Promise<void>;
  onApproveAndSave?: () => Promise<void>;
  saving: boolean;
  approveMode?: boolean;
};

export function draftFromUser(u: AdminUserRow): UserDraft {
  return { role: u.role, permissions: { ...u.permissions } };
}

export default function UserEditDrawer({
  user,
  open,
  onClose,
  assignableRoles,
  draft,
  onDraftChange,
  onSave,
  onApproveAndSave,
  saving,
  approveMode,
}: UserEditDrawerProps) {
  const { t, lang } = useUiCopy();
  const { user: actor } = useAuth();
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (!open) setGuideOpen(false);
  }, [open]);

  if (!user || !draft) return null;

  const editable = actor ? canManageUser(actor.role, user.role) : false;
  const fullAccess = roleHasAllPermissions(draft.role);
  const protectedMsg =
    actor && !editable
      ? protectedUserMessage(user.role, user.id, actor.id, t)
      : undefined;

  const footer = editable ? (
    <div className="flex flex-wrap gap-2 justify-end">
      {approveMode && onApproveAndSave && (
        <button
          type="button"
          disabled={saving}
          onClick={() => onApproveAndSave()}
          className={cn(btnSuccess, "px-4 py-2")}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t("Duyệt & lưu", "Approve & save")}
        </button>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave()}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 text-sm",
          approveMode ? btnGhost : btnPrimary,
          saving && "opacity-50",
        )}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {approveMode ? t("Lưu nháp", "Save draft") : t("Lưu thay đổi", "Save changes")}
      </button>
    </div>
  ) : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editable ? t("Chỉnh sửa người dùng", "Edit user") : t("Xem người dùng", "View user")}
      subtitle={user.name ? `${user.name} · ${user.email}` : user.email}
      footer={footer}
      size="full"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <UserAvatar src={user.avatarUrl} name={user.name} email={user.email} className="w-12 h-12" />
          <div className="text-sm text-muted-foreground">
            {user.status === "PENDING"
              ? t("Trạng thái: Chờ duyệt", "Status: Pending")
              : t("Trạng thái: Đã duyệt", "Status: Active")}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t("Vai trò", "Role")}
          </h3>
          <RoleSelector
            value={draft.role}
            onChange={(role) => onDraftChange({ ...draft, role })}
            assignableRoles={assignableRoles}
            disabled={!editable}
          />
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t("Quyền dữ liệu", "Data permissions")}
          </h3>
          {fullAccess ? (
            <p className="text-sm rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t("Super Admin có toàn quyền dữ liệu (không cấp từng quyền).", "Super Admin has full data access.")}
            </p>
          ) : (
            <PermissionMatrix
              permissions={draft.permissions}
              onChange={(permissions) => onDraftChange({ ...draft, permissions })}
              disabled={!editable}
              readOnlyMessage={protectedMsg}
            />
          )}
        </div>

        <details
          open={guideOpen}
          onToggle={(e) => setGuideOpen((e.target as HTMLDetailsElement).open)}
          className="rounded-lg border border-border text-sm"
        >
          <summary className="cursor-pointer px-3 py-2 font-medium text-muted-foreground">
            {t("Hướng dẫn vai trò", "Role guide")}
          </summary>
          <ul className="px-3 pb-3 space-y-2 text-muted-foreground list-disc pl-5">
            {(["SUPER_ADMIN", "ADMIN", "STAFF", "USER"] as const).map((r) => (
              <li key={r}>
                <span className="font-medium text-foreground">
                  {lang === "vi" ? ROLE_LABELS[r].vi : ROLE_LABELS[r].en}:
                </span>{" "}
                {lang === "vi" ? ROLE_LABELS[r].descVi : ROLE_LABELS[r].descEn}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </Drawer>
  );
}
