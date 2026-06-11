import type { UserRole } from "@/types/auth";

export function isPanelAdmin(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function roleHasAllPermissions(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

export function canManageUser(_actor: UserRole, target: UserRole): boolean {
  if (target === "SUPER_ADMIN") return false;
  if (_actor === "SUPER_ADMIN") return true;
  if (_actor === "ADMIN") return true;
  return false;
}

export function isSuperAdminProtected(targetRole: UserRole): boolean {
  return targetRole === "SUPER_ADMIN";
}

export function protectedUserMessage(
  targetRole: UserRole,
  targetId: string,
  actorId: string | undefined,
  t: (vi: string, en: string) => string,
): string {
  if (targetRole !== "SUPER_ADMIN") {
    return t("Bạn không có quyền chỉnh user này", "You cannot edit this user");
  }
  if (actorId && targetId === actorId) {
    return t(
      "Tài khoản Super Admin không thể tự đổi role hoặc quyền tại đây.",
      "Super Admin accounts cannot change their own role or permissions here.",
    );
  }
  return t("Không thể chỉnh Super Admin khác.", "Cannot edit other Super Admin accounts.");
}

export const ROLE_LABELS: Record<
  UserRole,
  { vi: string; en: string; descVi: string; descEn: string }
> = {
  SUPER_ADMIN: {
    vi: "Super Admin",
    en: "Super Admin",
    descVi: "Toàn quyền dữ liệu + quản lý mọi user",
    descEn: "Full data access + manage all users",
  },
  ADMIN: {
    vi: "Admin",
    en: "Admin",
    descVi: "Panel quản trị + quyền dữ liệu được cấp (không sửa Super Admin)",
    descEn: "Admin panel + granted data permissions",
  },
  STAFF: {
    vi: "Staff",
    en: "Staff",
    descVi: "Quyền dữ liệu được cấp (dùng nội bộ sau này)",
    descEn: "Granted data permissions (reserved for internal use)",
  },
  USER: {
    vi: "User",
    en: "User",
    descVi: "Mặc định khi đăng nhập — cần được duyệt và cấp quyền",
    descEn: "Default on login — needs approval and permissions",
  },
};

export const PERMISSION_GROUPS: Array<{
  id: string;
  labelVi: string;
  labelEn: string;
  keys: import("@/types/auth").PermissionKey[];
}> = [
  {
    id: "crawl",
    labelVi: "Dữ liệu crawl (AppRank / AppReview)",
    labelEn: "Crawl data (AppRank / AppReview)",
    keys: ["crawl.dashboard", "crawl.ranking", "crawl.game", "crawl.reviews", "translate.use"],
  },
  {
    id: "analytics",
    labelVi: "Phân tích Potential",
    labelEn: "Potential analytics",
    keys: ["analytics.potential", "analytics.distribution"],
  },
  {
    id: "ai",
    labelVi: "AI Review",
    labelEn: "AI Review",
    keys: ["ai.read", "ai.run", "ai.delete"],
  },
  {
    id: "libraries",
    labelVi: "Rubric Libraries",
    labelEn: "Rubric Libraries",
    keys: ["libraries.read", "libraries.write"],
  },
];

export const PERMISSION_LABELS: Record<
  import("@/types/auth").PermissionKey,
  { vi: string; en: string; hintVi?: string; hintEn?: string }
> = {
  "crawl.dashboard": { vi: "Dashboard", en: "Dashboard" },
  "crawl.ranking": {
    vi: "Top Ranking (bảng)",
    en: "Top Ranking (list)",
    hintVi: "Tự bao gồm xem chi tiết game từ list",
    hintEn: "Includes game detail from list",
  },
  "crawl.game": { vi: "Chi tiết game", en: "Game detail" },
  "crawl.reviews": { vi: "Reviews (AppReview)", en: "Reviews (AppReview)" },
  "analytics.potential": { vi: "Potential & breakdown", en: "Potential & breakdown" },
  "analytics.distribution": { vi: "Phân phối số liệu", en: "Metric distribution" },
  "ai.read": { vi: "Xem AI Review", en: "View AI Review" },
  "ai.run": {
    vi: "Chạy phân tích AI",
    en: "Run AI analysis",
    hintVi: "Tự bao gồm xem",
    hintEn: "Includes view",
  },
  "ai.delete": { vi: "Xóa lịch sử AI", en: "Delete AI history" },
  "libraries.read": { vi: "Xem Libraries", en: "View Libraries" },
  "libraries.write": {
    vi: "Sửa Libraries",
    en: "Edit Libraries",
    hintVi: "Tự bao gồm xem",
    hintEn: "Includes read",
  },
  "translate.use": { vi: "Dịch EN", en: "Translate to EN" },
};
