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
  "tester.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type UserStatus = "PENDING" | "ACTIVE";

export const USER_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "USER", "TESTER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Role cho web Sourcing — mỗi user tối đa 1, có thể kèm TESTER. */
export const SOURCING_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "USER"] as const;
export type SourcingRole = (typeof SOURCING_ROLES)[number];

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
  "tester.manage": boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  /** Role cao nhất trong `roles`; TESTER nghĩa là chỉ là tester (không có role Sourcing). */
  role: UserRole;
  roles: UserRole[];
  isPanelAdmin: boolean;
  isTester: boolean;
  permissions: PermissionMap;
}

export function emptyPermissions(): PermissionMap {
  return {
    "crawl.dashboard": false,
    "crawl.ranking": false,
    "crawl.game": false,
    "crawl.reviews": false,
    "analytics.potential": false,
    "analytics.distribution": false,
    "ai.read": false,
    "ai.run": false,
    "ai.delete": false,
    "libraries.read": false,
    "libraries.write": false,
    "translate.use": false,
    "tester.manage": false,
  };
}

export interface AdminUserRow extends AuthUser {
  createdAt: string;
  /** False until the person signs in with Google (pre-invited by email). */
  googleLinked: boolean;
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
  "/compare": "crawl.ranking",
  "/potential": "analytics.potential",
  "/distribution": "analytics.distribution",
  "/ai-analysis": "ai.read",
  "/libraries": "libraries.read",
};

export function permissionForPath(pathname: string): PermissionKey | null {
  if (pathname === "/" || pathname === "") return "crawl.dashboard";
  if (pathname.startsWith("/ranking")) return "crawl.ranking";
  if (pathname.startsWith("/compare")) return "crawl.ranking";
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
