import type { AuthUser, PermissionKey } from "@/types/auth";

export function isSuperAdmin(role: AuthUser["role"]): boolean {
  return role === "SUPER_ADMIN";
}

export function hasPermission(user: AuthUser | null | undefined, key: PermissionKey): boolean {
  if (!user) return false;
  if (isSuperAdmin(user.role)) return true;
  return user.permissions[key] === true;
}

export function hasAnyPermission(user: AuthUser | null | undefined, keys: PermissionKey[]): boolean {
  return keys.some((k) => hasPermission(user, k));
}
