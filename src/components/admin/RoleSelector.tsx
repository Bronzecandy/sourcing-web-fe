import { SOURCING_ROLES, type SourcingRole, type UserRole } from "@/types/auth";
import { buildRoles, ROLE_LABELS, sourcingRoleOf } from "@/lib/user-roles";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { Ban, Crown, Gamepad2, Shield, Users } from "lucide-react";

function RoleIcon({ role }: { role: UserRole }) {
  if (role === "SUPER_ADMIN") return <Crown className="w-4 h-4" />;
  if (role === "ADMIN") return <Shield className="w-4 h-4" />;
  if (role === "TESTER") return <Gamepad2 className="w-4 h-4" />;
  return <Users className="w-4 h-4" />;
}

type RoleSelectorProps = {
  value: UserRole[];
  onChange: (roles: UserRole[]) => void;
  assignableRoles: UserRole[];
  disabled?: boolean;
};

const cardBase = "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors";
const cardOn = "border-primary bg-primary/10 ring-1 ring-primary/30";
const cardOff = "border-border hover:bg-muted/50";

/** 1 role Sourcing (hoặc không dùng Sourcing) + bật/tắt Tester. */
export default function RoleSelector({ value, onChange, assignableRoles, disabled }: RoleSelectorProps) {
  const { t, lang } = useUiCopy();
  const sourcing = sourcingRoleOf(value);
  const tester = value.includes("TESTER");
  const canTester = assignableRoles.includes("TESTER");
  const label = (r: UserRole) => (lang === "vi" ? ROLE_LABELS[r].vi : ROLE_LABELS[r].en);
  const desc = (r: UserRole) => (lang === "vi" ? ROLE_LABELS[r].descVi : ROLE_LABELS[r].descEn);

  const pickSourcing = (next: SourcingRole | null) => onChange(buildRoles(next, tester));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Web Sourcing</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SOURCING_ROLES.map((role) => {
            const canPick = assignableRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                disabled={disabled || !canPick}
                onClick={() => pickSourcing(role)}
                className={cn(
                  cardBase,
                  sourcing === role ? cardOn : cardOff,
                  (disabled || !canPick) && "opacity-50 cursor-not-allowed",
                )}
              >
                <RoleIcon role={role} />
                <span>
                  <span className="font-medium block">{label(role)}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">{desc(role)}</span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            disabled={disabled || !tester}
            onClick={() => pickSourcing(null)}
            title={tester ? undefined : t("Bật Tester trước để bỏ quyền Sourcing", "Enable Tester first")}
            className={cn(
              cardBase,
              sourcing === null ? cardOn : cardOff,
              (disabled || !tester) && "opacity-50 cursor-not-allowed",
            )}
          >
            <Ban className="w-4 h-4" />
            <span>
              <span className="font-medium block">{t("Không dùng Sourcing", "No Sourcing access")}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {t("Chỉ tham gia Tester Program", "Tester Program only")}
              </span>
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Tester Program</p>
        <button
          type="button"
          role="switch"
          aria-checked={tester}
          disabled={disabled || !canTester || (tester && sourcing === null)}
          onClick={() => onChange(buildRoles(sourcing, !tester))}
          className={cn(
            cardBase,
            "w-full items-center",
            tester ? cardOn : cardOff,
            (disabled || !canTester) && "opacity-50 cursor-not-allowed",
          )}
        >
          <RoleIcon role="TESTER" />
          <span className="flex-1">
            <span className="font-medium block">{label("TESTER")}</span>
            <span className="text-xs text-muted-foreground">{desc("TESTER")}</span>
          </span>
          <span
            aria-hidden
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              tester ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]",
                tester ? "left-[18px]" : "left-0.5",
              )}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
