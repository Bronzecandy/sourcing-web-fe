import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function Spinner() {
  return (
    <div className="brand-hero flex min-h-[70dvh] items-center justify-center pt-16">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
    </div>
  );
}

/** Trang cần đăng nhập: chưa đăng nhập thì về landing (hiện nhắc đăng nhập). */
export function TesterAuthRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/tester" replace state={{ needLogin: true, from: location.pathname }} />;
  return <Outlet />;
}

/** Link cũ /tester/login (vd ?error=domain) → landing, giữ query. */
export function TesterLoginRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/tester${search}`} replace />;
}
