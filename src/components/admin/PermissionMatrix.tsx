import type { PermissionKey } from "@/types/auth";
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/lib/user-roles";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

type PermissionMatrixProps = {
  permissions: Record<PermissionKey, boolean>;
  onChange: (permissions: Record<PermissionKey, boolean>) => void;
  disabled?: boolean;
  readOnlyMessage?: string;
};

export function countGrantedPermissions(permissions: Record<PermissionKey, boolean>): number {
  return Object.values(permissions).filter(Boolean).length;
}

export default function PermissionMatrix({
  permissions,
  onChange,
  disabled,
  readOnlyMessage,
}: PermissionMatrixProps) {
  const { t, lang } = useUiCopy();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    crawl: true,
    analytics: true,
    ai: true,
    libraries: true,
  });

  const toggleGroup = (groupId: string, keys: PermissionKey[], grant: boolean) => {
    const next = { ...permissions };
    for (const k of keys) next[k] = grant;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {readOnlyMessage && (
        <p className="text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 px-3 py-2">
          {readOnlyMessage}
        </p>
      )}
      {PERMISSION_GROUPS.map((group) => {
        const open = openGroups[group.id] ?? true;
        const keys = group.keys;
        const allOn = keys.every((k) => permissions[k]);
        const someOn = keys.some((k) => permissions[k]);
        return (
          <div key={group.id} className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
              <button
                type="button"
                className="flex items-center gap-1 flex-1 text-left text-sm font-medium min-w-0"
                onClick={() => setOpenGroups((g) => ({ ...g, [group.id]: !open }))}
              >
                {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                <span className="truncate">{lang === "vi" ? group.labelVi : group.labelEn}</span>
              </button>
              {!disabled && (
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-background shrink-0"
                  onClick={() => toggleGroup(group.id, keys, !allOn)}
                >
                  {allOn
                    ? t("Tắt nhóm", "Clear group")
                    : someOn
                      ? t("Bật hết nhóm", "Enable all")
                      : t("Bật hết nhóm", "Enable all")}
                </button>
              )}
            </div>
            {open && (
              <div className="divide-y divide-border">
                {keys.map((key) => {
                  const lab = PERMISSION_LABELS[key];
                  return (
                    <label
                      key={key}
                      className={cn(
                        "flex items-start gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/20",
                        permissions[key] && "bg-primary/5",
                        disabled && "pointer-events-none opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="rounded mt-0.5"
                        checked={permissions[key]}
                        disabled={disabled}
                        onChange={(e) =>
                          onChange({ ...permissions, [key]: e.target.checked })
                        }
                      />
                      <span>
                        <span className="font-medium">{lang === "vi" ? lab.vi : lab.en}</span>
                        {(lab.hintVi || lab.hintEn) && (
                          <span className="block text-xs text-muted-foreground">
                            {lang === "vi" ? lab.hintVi : lab.hintEn}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
