import { useState, type FormEvent } from "react";
import { UserPlus, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import type { PermissionKey, UserRole } from "@/types/auth";
import { emptyPermissions } from "@/types/auth";
import { primaryRoleOf, roleHasAllPermissions, sourcingRoleOf } from "@/lib/user-roles";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { btnPrimary } from "@/lib/button-classes";
import RoleSelector from "./RoleSelector";
import PermissionMatrix from "./PermissionMatrix";

export type InviteUserPayload = {
  email: string;
  name?: string | null;
  status: "PENDING" | "ACTIVE";
  roles: UserRole[];
  permissions?: Partial<Record<PermissionKey, boolean>>;
};

function grantsPermissions(roles: UserRole[]): boolean {
  return sourcingRoleOf(roles) !== null && !roleHasAllPermissions(primaryRoleOf(roles));
}

type InviteUserCardProps = {
  assignableRoles: UserRole[];
  submitting: boolean;
  onSubmit: (payload: InviteUserPayload) => Promise<void>;
};

export default function InviteUserCard({ assignableRoles, submitting, onSubmit }: InviteUserCardProps) {
  const { t } = useUiCopy();
  const defaultRoles: UserRole[] = ["USER"];
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<UserRole[]>(defaultRoles);
  const [activeNow, setActiveNow] = useState(true);
  const [permissions, setPermissions] = useState(emptyPermissions());
  const [permsOpen, setPermsOpen] = useState(true);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    const body: InviteUserPayload = {
      email: trimmed,
      name: name.trim() || null,
      status: activeNow ? "ACTIVE" : "PENDING",
      roles,
    };
    if (grantsPermissions(roles)) body.permissions = permissions;
    await onSubmit(body);
    setEmail("");
    setName("");
    setRoles(defaultRoles);
    setActiveNow(true);
    setPermissions(emptyPermissions());
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/40"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <UserPlus className="w-4 h-4" />
        {t("Thêm người dùng bằng email", "Add user by email")}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="border-t border-border px-4 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t(
              "Tạo tài khoản trước khi họ đăng nhập Google. Lần login đầu sẽ gắn đúng email này — không cần chờ họ login rồi mới duyệt.",
              "Create the account before they sign in with Google. First login with this email links the profile — no need for them to log in once first.",
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("Email Google", "Google email")}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">
                {t("Tên (tuỳ chọn)", "Name (optional)")}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </label>
          </div>

          <RoleSelector value={roles} onChange={setRoles} assignableRoles={assignableRoles} />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activeNow}
              onChange={(e) => setActiveNow(e.target.checked)}
            />
            {t("Duyệt ngay (ACTIVE) — vào app sau khi login Google", "Approve now (ACTIVE) — they enter the app after Google login")}
          </label>

          {grantsPermissions(roles) && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPermsOpen((v) => !v)}
                className="text-sm font-medium flex items-center gap-1"
              >
                {permsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {t("Cấp quyền dữ liệu", "Grant data permissions")}
              </button>
              {permsOpen && (
                <PermissionMatrix permissions={permissions} onChange={setPermissions} />
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className={cn(btnPrimary, "px-4 py-2")}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {t("Thêm người dùng", "Add user")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
