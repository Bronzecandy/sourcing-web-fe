import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";

function Spinner() {
  return (
    <div className="brand-hero flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
    </div>
  );
}

export function TesterAuthRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/tester/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function TesterPublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/tester" replace />;
  return <Outlet />;
}

export function TesterAdminRoute() {
  const { user } = useAuth();
  if (!hasPermission(user, "tester.manage")) return <Navigate to="/tester" replace />;
  return <Outlet />;
}
