export const PERMISSION_KEYS = [
  "crawl.dashboard",
  "crawl.ranking",
  "crawl.game",
  "crawl.reviews",
  "analytics.potential",
  "analytics.distribution",
  "ai.read",
  "ai.run",
  "ai.delete",
  "libraries.read",
  "libraries.write",
  "translate.use",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type UserStatus = "PENDING" | "ACTIVE";

export const USER_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "USER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface PermissionMap {
  "crawl.dashboard": boolean;
  "crawl.ranking": boolean;
  "crawl.game": boolean;
  "crawl.reviews": boolean;
  "analytics.potential": boolean;
  "analytics.distribution": boolean;
  "ai.read": boolean;
  "ai.run": boolean;
  "ai.delete": boolean;
  "libraries.read": boolean;
  "libraries.write": boolean;
  "translate.use": boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  role: UserRole;
  isPanelAdmin: boolean;
  permissions: PermissionMap;
}

export interface AdminUserRow extends AuthUser {
  createdAt: string;
}

export interface AdminMeta {
  actorRole: UserRole;
  canAssignSuperAdmin: boolean;
  assignableRoles: UserRole[];
}

/** Minimum permission to open a route. */
export const ROUTE_PERMISSION: Record<string, PermissionKey | null> = {
  "/": "crawl.dashboard",
  "/ranking": "crawl.ranking",
  "/potential": "analytics.potential",
  "/distribution": "analytics.distribution",
  "/ai-analysis": "ai.read",
  "/libraries": "libraries.read",
};

export function permissionForPath(pathname: string): PermissionKey | null {
  if (pathname === "/" || pathname === "") return "crawl.dashboard";
  if (pathname.startsWith("/ranking")) return "crawl.ranking";
  if (pathname.startsWith("/game/")) return "crawl.game";
  if (pathname.startsWith("/potential")) return "analytics.potential";
  if (pathname.startsWith("/distribution")) return "analytics.distribution";
  if (pathname.startsWith("/ai-analysis")) return "ai.read";
  if (pathname.startsWith("/libraries")) return "libraries.read";
  if (pathname.startsWith("/admin")) return null;
  return null;
}

export const PERMISSION_ROUTE_FALLBACK: Array<{ perm: PermissionKey; path: string }> = [
  { perm: "crawl.dashboard", path: "/" },
  { perm: "crawl.ranking", path: "/ranking" },
  { perm: "crawl.game", path: "/ranking" },
  { perm: "analytics.potential", path: "/potential" },
  { perm: "analytics.distribution", path: "/distribution" },
  { perm: "ai.read", path: "/ai-analysis" },
  { perm: "libraries.read", path: "/libraries" },
];
