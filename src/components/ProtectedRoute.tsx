import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { permissionForPath, PERMISSION_ROUTE_FALLBACK } from "@/types/auth";
import { hasPermission } from "@/lib/permissions";

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (user) {
    if (user.role === "TESTER") return <Navigate to="/tester/profile" replace />;
    if (user.status === "PENDING") {
      return <Navigate to="/waiting" replace />;
    }
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from || "/"} replace />;
  }

  return <Outlet />;
}

/** Các tab admin dành cho quyền tester.manage (không cần là Admin). */
const TESTER_ADMIN_PATH = /^\/admin\/(testers|test-campaigns|tester-benefits|tester-survey)(\/|$)/;

function firstAllowedPath(user: NonNullable<ReturnType<typeof useAuth>["user"]>): string {
  if (user.role === "TESTER") return "/tester/profile";
  if (user.isPanelAdmin) {
    const data = PERMISSION_ROUTE_FALLBACK.find((r) => hasPermission(user, r.perm));
    return data?.path ?? "/admin/users";
  }
  const hit = PERMISSION_ROUTE_FALLBACK.find((r) => hasPermission(user, r.perm));
  if (hit) return hit.path;
  return hasPermission(user, "tester.manage") ? "/admin/testers" : "/waiting";
}

export function ProtectedAppRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role === "TESTER") {
    return <Navigate to="/tester/profile" replace />;
  }

  if (user.status === "PENDING") {
    return <Navigate to="/waiting" replace />;
  }

  if (location.pathname.startsWith("/admin")) {
    const allowed =
      user.isPanelAdmin || (TESTER_ADMIN_PATH.test(location.pathname) && hasPermission(user, "tester.manage"));
    if (!allowed) {
      return <Navigate to={firstAllowedPath(user)} replace />;
    }
    return <Outlet />;
  }

  const perm = permissionForPath(location.pathname);
  if (perm && !hasPermission(user, perm)) {
    return <Navigate to={firstAllowedPath(user)} replace />;
  }

  return <Outlet />;
}

export function WaitingRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "TESTER") {
    return <Navigate to="/tester/profile" replace />;
  }

  if (user.status === "ACTIVE") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
