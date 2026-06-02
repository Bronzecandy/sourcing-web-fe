import type { UserRole } from "@/types/auth";
import { ROLE_LABELS } from "@/lib/user-roles";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { Crown, Shield, Users } from "lucide-react";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "STAFF", "USER"];

function RoleIcon({ role }: { role: UserRole }) {
  if (role === "SUPER_ADMIN") return <Crown className="w-4 h-4" />;
  if (role === "ADMIN") return <Shield className="w-4 h-4" />;
  return <Users className="w-4 h-4" />;
}

type RoleSelectorProps = {
  value: UserRole;
  onChange: (role: UserRole) => void;
  assignableRoles: UserRole[];
  disabled?: boolean;
};

export default function RoleSelector({ value, onChange, assignableRoles, disabled }: RoleSelectorProps) {
  const { t, lang } = useUiCopy();
  const label = ROLE_LABELS[value];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ROLES.map((role) => {
          const canPick = assignableRoles.includes(role);
          const selected = value === role;
          return (
            <button
              key={role}
              type="button"
              disabled={disabled || !canPick}
              onClick={() => onChange(role)}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                selected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border hover:bg-muted/50",
                (disabled || !canPick) && "opacity-50 cursor-not-allowed",
              )}
            >
              <RoleIcon role={role} />
              <span>
                <span className="font-medium block">
                  {lang === "vi" ? ROLE_LABELS[role].vi : ROLE_LABELS[role].en}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {lang === "vi" ? ROLE_LABELS[role].descVi : ROLE_LABELS[role].descEn}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {lang === "vi" ? label.descVi : label.descEn}
      </p>
    </div>
  );
}
