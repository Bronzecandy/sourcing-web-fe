import { useEffect, useState } from "react";
import type { AdminUserRow, PermissionKey, UserRole } from "@/types/auth";
import {
  canManageUser,
  primaryRoleOf,
  protectedUserMessage,
  roleHasAllPermissions,
  sourcingRoleOf,
} from "@/lib/user-roles";
import { useAuth } from "@/contexts/AuthContext";
import { useUiCopy } from "@/lib/use-ui-copy";
import Drawer from "@/components/ui/Drawer";
import UserAvatar from "@/components/UserAvatar";
import RoleSelector from "./RoleSelector";
import PermissionMatrix from "./PermissionMatrix";
import TesterProfilePanel from "./tester/TesterProfilePanel";
import { RoleChips } from "./UsersTable";
import { ROLE_LABELS } from "@/lib/user-roles";
import { Save, Check, Loader2, Shield, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSuccess, btnGhost } from "@/lib/button-classes";

export type UserDraft = {
  roles: UserRole[];
  permissions: Record<PermissionKey, boolean>;
};

export type UserDrawerTab = "access" | "tester";

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
  initialTab?: UserDrawerTab;
};

export function draftFromUser(u: AdminUserRow): UserDraft {
  return { roles: [...u.roles], permissions: { ...u.permissions } };
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
  initialTab = "access",
}: UserEditDrawerProps) {
  const { t, lang } = useUiCopy();
  const { user: actor } = useAuth();
  const [guideOpen, setGuideOpen] = useState(false);
  const [tab, setTab] = useState<UserDrawerTab>(initialTab);

  useEffect(() => {
    if (!open) setGuideOpen(false);
    else setTab(initialTab);
  }, [open, initialTab]);

  if (!user || !draft) return null;

  const editable = actor ? canManageUser(actor.role, user.role) : false;
  const draftPrimary = primaryRoleOf(draft.roles);
  const fullAccess = roleHasAllPermissions(draftPrimary);
  const hasSourcing = sourcingRoleOf(draft.roles) !== null;
  const showTesterTab = user.isTester;
  const protectedMsg =
    actor && !editable
      ? protectedUserMessage(user.role, user.id, actor.id, t)
      : undefined;

  const footer = editable && tab === "access" ? (
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
        <div className="flex flex-wrap items-center gap-3">
          <UserAvatar src={user.avatarUrl} name={user.name} email={user.email} className="w-12 h-12" />
          <div className="space-y-1">
            <RoleChips roles={user.roles} />
            <p className="text-sm text-muted-foreground">
              {user.status === "PENDING"
                ? t("Trạng thái: Chờ duyệt", "Status: Pending")
                : t("Trạng thái: Đã duyệt", "Status: Active")}
            </p>
          </div>
        </div>

        {showTesterTab && (
          <div className="flex gap-1 border-b border-border">
            {(
              [
                ["access", t("Vai trò & quyền", "Roles & permissions"), Shield],
                ["tester", t("Hồ sơ tester", "Tester profile"), Gamepad2],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === "tester" && showTesterTab ? (
          <TesterProfilePanel userId={user.id} />
        ) : (
          <>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {t("Vai trò", "Roles")}
              </h3>
              <RoleSelector
                value={draft.roles}
                onChange={(roles) => onDraftChange({ ...draft, roles })}
                assignableRoles={assignableRoles}
                disabled={!editable}
              />
              {draft.roles.includes("TESTER") && !user.isTester && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    "Sau khi lưu, người dùng vào Tester Program và làm khảo sát ở trang Hồ sơ.",
                    "After saving, the user opens Tester Program and takes the survey from their profile.",
                  )}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {t("Quyền dữ liệu Sourcing", "Sourcing data permissions")}
              </h3>
              {!hasSourcing ? (
                <p className="text-sm rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-muted-foreground flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  {t(
                    "Chỉ là tester: không vào được web Sourcing. Chọn role Sourcing để cấp quyền.",
                    "Tester only: no Sourcing access. Pick a Sourcing role to grant permissions.",
                  )}
                </p>
              ) : fullAccess ? (
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
                {(["SUPER_ADMIN", "ADMIN", "STAFF", "USER", "TESTER"] as const).map((r) => (
                  <li key={r}>
                    <span className="font-medium text-foreground">
                      {lang === "vi" ? ROLE_LABELS[r].vi : ROLE_LABELS[r].en}:
                    </span>{" "}
                    {lang === "vi" ? ROLE_LABELS[r].descVi : ROLE_LABELS[r].descEn}
                  </li>
                ))}
                <li>
                  {t(
                    "Một người có thể vừa có role Sourcing vừa là Tester (vd Staff + Tester).",
                    "One person can hold a Sourcing role and Tester at the same time (e.g. Staff + Tester).",
                  )}
                </li>
              </ul>
            </details>
          </>
        )}
      </div>
    </Drawer>
  );
}
